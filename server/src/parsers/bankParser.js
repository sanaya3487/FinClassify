const fs = require('fs');
const { parse } = require('csv-parse');
const crypto = require('crypto');
const { normalizeNarration } = require('../engine/categorizer');

/**
 * Standardize date formats to YYYY-MM-DD
 */
function parseDate(dateStr) {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  const clean = dateStr.trim().replace(/\//g, '-');
  
  // DD-MM-YYYY or DD-MM-YY
  const parts = clean.split('-');
  if (parts.length === 3) {
    let [day, month, year] = parts;
    if (day.length === 4) {
      // YYYY-MM-DD
      return `${day}-${month.padStart(2, '0')}-${year.padStart(2, '0')}`;
    }
    if (year.length === 2) year = '20' + year;
    
    // Convert month name (e.g. Jan, Feb) to number if necessary
    const monthNames = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    if (isNaN(month)) {
      const lower = month.substring(0, 3).toLowerCase();
      month = monthNames[lower] || '01';
    }

    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return new Date().toISOString().split('T')[0];
}

/**
 * Auto-detect Bank format from CSV headers
 */
function detectBankFormat(headers) {
  const normHeaders = headers.map((h) => h.trim().toLowerCase());
  const hJoined = normHeaders.join(' | ');

  if (hJoined.includes('narration') && (hJoined.includes('withdrawal amt.') || hJoined.includes('withdrawal'))) {
    return { bank: 'HDFC Bank', dateCol: 'Date', narrationCol: 'Narration', debitCol: 'Withdrawal Amt.', creditCol: 'Deposit Amt.' };
  }

  if (hJoined.includes('description') && hJoined.includes('debit') && hJoined.includes('credit')) {
    return { bank: 'SBI Bank', dateCol: 'Txn Date', narrationCol: 'Description', debitCol: 'Debit', creditCol: 'Credit' };
  }

  if (hJoined.includes('transaction remarks') || (hJoined.includes('remarks') && hJoined.includes('withdrawal amount'))) {
    return { bank: 'ICICI Bank', dateCol: 'Value Date', narrationCol: 'Transaction Remarks', debitCol: 'Withdrawal Amount (INR )', creditCol: 'Deposit Amount (INR )' };
  }

  if (hJoined.includes('particulars') && (hJoined.includes('debit') || hJoined.includes('withdrawal'))) {
    return { bank: 'Axis Bank', dateCol: 'Tran Date', narrationCol: 'Particulars', debitCol: 'Debit', creditCol: 'Credit' };
  }

  // Generic heuristic fallback
  let dateCol = headers.find((h) => /date/i.test(h));
  let narrationCol = headers.find((h) => /(narration|description|particulars|remarks|details|memo)/i.test(h));
  let debitCol = headers.find((h) => /(debit|withdrawal|spent|amount)/i.test(h));
  let creditCol = headers.find((h) => /(credit|deposit|received)/i.test(h));
  let amountCol = headers.find((h) => /^amount$/i.test(h));

  if (dateCol && narrationCol && (debitCol || amountCol)) {
    return {
      bank: 'Generic Bank',
      dateCol,
      narrationCol,
      debitCol: debitCol || amountCol,
      creditCol: creditCol || null,
      amountCol: amountCol || null
    };
  }

  return null; // Unknown / ambiguous format -> trigger manual column mapping modal
}

/**
 * Stream and parse CSV file
 */
function parseCsvFile(filePath, customMapping = null) {
  return new Promise((resolve, reject) => {
    const rows = [];
    let headers = null;
    let bankConfig = null;

    const parser = fs.createReadStream(filePath).pipe(
      parse({
        columns: true,
        trim: true,
        skip_empty_lines: true,
        relax_column_count: true
      })
    );

    parser.on('data', (row) => {
      if (!headers) {
        headers = Object.keys(row);
        bankConfig = customMapping || detectBankFormat(headers);
      }

      if (!bankConfig) {
        // Can't auto-detect, reject with headers so UI can ask user
        parser.destroy();
        return reject({ needsMapping: true, headers });
      }

      const rawDate = row[bankConfig.dateCol];
      const rawNarration = row[bankConfig.narrationCol];
      const debitRaw = bankConfig.debitCol ? row[bankConfig.debitCol] : '0';
      const creditRaw = bankConfig.creditCol ? row[bankConfig.creditCol] : '0';
      const amountRaw = bankConfig.amountCol ? row[bankConfig.amountCol] : '0';

      if (!rawNarration && !rawDate) return; // Skip empty header/footer lines

      const debitVal = parseFloat((debitRaw || '0').replace(/,/g, '')) || 0;
      const creditVal = parseFloat((creditRaw || '0').replace(/,/g, '')) || 0;
      const amountVal = parseFloat((amountRaw || '0').replace(/,/g, '')) || 0;

      let amount = 0;
      let txnType = 'debit';

      if (debitVal > 0) {
        amount = debitVal;
        txnType = 'debit';
      } else if (creditVal > 0) {
        amount = creditVal;
        txnType = 'credit';
      } else if (amountVal !== 0) {
        amount = Math.abs(amountVal);
        txnType = amountVal < 0 ? 'debit' : 'credit';
      }

      if (amount <= 0 && !rawNarration) return;

      const parsedDate = parseDate(rawDate);
      const normNarration = normalizeNarration(rawNarration || '');

      rows.push({
        txn_date: parsedDate,
        narration_raw: (rawNarration || 'Unknown Transaction').trim(),
        narration_norm: normNarration,
        amount: amount || 0,
        txn_type: txnType
      });
    });

    parser.on('end', () => {
      resolve({
        bankDetected: bankConfig ? bankConfig.bank : 'Generic Bank',
        rows
      });
    });

    parser.on('error', (err) => {
      reject({ message: 'CSV parse error: ' + err.message });
    });
  });
}

/**
 * Generate unique hash for duplicate detection
 */
function generateTxnHash(userId, txnDate, amount, narrationNorm) {
  const data = `${userId}_${txnDate}_${amount}_${narrationNorm}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

module.exports = {
  detectBankFormat,
  parseCsvFile,
  generateTxnHash,
  parseDate
};
