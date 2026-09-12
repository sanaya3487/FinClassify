const express = require('express');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/authMiddleware');
const { generatePdfReport } = require('../utils/pdfGenerator');

const router = express.Router();

// GET /api/export/csv - Download filtered transactions as CSV file
router.get('/csv', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { category_id, start_date, end_date } = req.query;

    let sql = `
      SELECT t.txn_date, COALESCE(u.bank_detected, 'Bank Statement') as bank_name, t.narration_raw, t.amount, t.txn_type, COALESCE(c.name, 'Uncategorized') as category_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN uploads u ON t.upload_id = u.id
      WHERE t.user_id = ?
    `;

    const params = [userId];

    if (category_id) {
      sql += ' AND t.category_id = ?';
      params.push(category_id);
    }
    if (start_date) {
      sql += ' AND t.txn_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND t.txn_date <= ?';
      params.push(end_date);
    }

    sql += ' ORDER BY t.txn_date DESC';

    const transactions = await db.query(sql, params);

    // Build CSV Content
    let csvString = 'Date,Bank Account,Narration,Amount (INR),Type,Category\n';
    transactions.forEach((t) => {
      const escapedNarration = `"${t.narration_raw.replace(/"/g, '""')}"`;
      csvString += `${t.txn_date},"${t.bank_name}",${escapedNarration},${t.amount},${t.txn_type},"${t.category_name}"\n`;
    });

    const monthSuffix = start_date ? `_${start_date.substring(0, 7)}` : '_All_Time';
    const filename = `Bank_Statement_Report${monthSuffix}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csvString);
  } catch (err) {
    console.error('CSV Export Error:', err);
    return res.status(500).json({ error: 'Failed to generate CSV export' });
  }
});

// GET /api/export/pdf - Download summary report as PDF document
router.get('/pdf', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userEmail = req.user.email;
    const { start_date, end_date } = req.query;

    let dateFilter = '';
    const dateParams = [userId];

    if (start_date) {
      dateFilter += ' AND txn_date >= ?';
      dateParams.push(start_date);
    }
    if (end_date) {
      dateFilter += ' AND txn_date <= ?';
      dateParams.push(end_date);
    }

    // 1. Totals (Total Spend & Total Income)
    const totalsRes = await db.get(
      `SELECT 
        COALESCE(SUM(CASE WHEN LOWER(txn_type) = 'debit' THEN amount ELSE 0 END), 0) as total_spend,
        COALESCE(SUM(CASE WHEN LOWER(txn_type) = 'credit' THEN amount ELSE 0 END), 0) as total_income,
        COUNT(*) as total_txns
       FROM transactions WHERE user_id = ? ${dateFilter}`,
      dateParams
    );

    // 2. Category Breakdown
    const categoryBreakdown = await db.query(
      `SELECT 
        COALESCE(c.name, 'Uncategorized') as category_name,
        COUNT(t.id) as txn_count,
        COALESCE(SUM(t.amount), 0) as total_amount
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = ? AND LOWER(t.txn_type) = 'debit' ${dateFilter}
       GROUP BY c.name
       ORDER BY total_amount DESC`,
      dateParams
    );

    // 3. Monthly Trends (Monthly Cashflow)
    const monthlyTrends = await db.query(
      `SELECT 
        substr(txn_date, 1, 7) as month,
        COALESCE(SUM(CASE WHEN LOWER(txn_type) = 'debit' THEN amount ELSE 0 END), 0) as spend,
        COALESCE(SUM(CASE WHEN LOWER(txn_type) = 'credit' THEN amount ELSE 0 END), 0) as income
       FROM transactions
       WHERE user_id = ? ${dateFilter}
       GROUP BY substr(txn_date, 1, 7)
       ORDER BY month ASC`,
      dateParams
    );

    // 4. Statement Transactions
    const txns = await db.query(
      `SELECT t.txn_date, t.narration_raw, t.amount, t.txn_type, COALESCE(c.name, 'Uncategorized') as category_name, COALESCE(u.bank_detected, 'Bank Statement') as bank_name
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       LEFT JOIN uploads u ON t.upload_id = u.id
       WHERE t.user_id = ? ${dateFilter}
       ORDER BY t.txn_date DESC
       LIMIT 200`,
      dateParams
    );

    const summaryData = {
      totalSpend: totalsRes ? parseFloat(totalsRes.total_spend) : 0,
      totalIncome: totalsRes ? parseFloat(totalsRes.total_income) : 0,
      totalTxns: totalsRes ? totalsRes.total_txns : 0,
      topCategory: categoryBreakdown.length > 0 ? categoryBreakdown[0].category_name : 'N/A',
      categoryBreakdown
    };

    const dateRangeStr = start_date && end_date ? `${start_date} to ${end_date}` : 'All Time';
    const monthSuffix = start_date ? `_${start_date.substring(0, 7)}` : '_All_Time';
    const filename = `Bank_Statement_Expense_Report${monthSuffix}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    generatePdfReport(res, {
      userEmail,
      summaryData,
      transactions: txns,
      dateRange: dateRangeStr,
      monthlyTrends
    });
  } catch (err) {
    console.error('PDF Export Error:', err);
    return res.status(500).json({ error: 'Failed to generate PDF report' });
  }
});

module.exports = router;
