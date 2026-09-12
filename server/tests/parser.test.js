const { detectBankFormat, parseDate, generateTxnHash } = require('../src/parsers/bankParser');

describe('Bank CSV Parser & Utilities', () => {
  test('parses various date formats to YYYY-MM-DD', () => {
    expect(parseDate('15-08-2024')).toBe('2024-08-15');
    expect(parseDate('2024/09/10')).toBe('2024-09-10');
    expect(parseDate('12-Jan-2025')).toBe('2025-01-12');
  });

  test('auto-detects HDFC Bank CSV headers', () => {
    const headers = ['Date', 'Narration', 'Chq/Ref Number', 'Value Date', 'Withdrawal Amt.', 'Deposit Amt.'];
    const detected = detectBankFormat(headers);
    expect(detected).not.toBeNull();
    expect(detected.bank).toBe('HDFC Bank');
    expect(detected.narrationCol).toBe('Narration');
  });

  test('auto-detects SBI Bank CSV headers', () => {
    const headers = ['Txn Date', 'Value Date', 'Description', 'Ref No.', 'Debit', 'Credit', 'Balance'];
    const detected = detectBankFormat(headers);
    expect(detected).not.toBeNull();
    expect(detected.bank).toBe('SBI Bank');
    expect(detected.debitCol).toBe('Debit');
  });

  test('generates deterministic SHA-256 hash for duplicate detection', () => {
    const hash1 = generateTxnHash('user1', '2025-01-01', 500, 'SWIGGY ORDER');
    const hash2 = generateTxnHash('user1', '2025-01-01', 500, 'SWIGGY ORDER');
    const hash3 = generateTxnHash('user2', '2025-01-01', 500, 'SWIGGY ORDER');

    expect(hash1).toBe(hash2); // same inputs -> same hash
    expect(hash1).not.toBe(hash3); // different user -> different hash
  });
});
