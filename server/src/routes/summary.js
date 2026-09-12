const express = require('express');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/summary - Dashboard aggregate metrics and chart data
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
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

    // Run all 5 aggregate analytics queries in parallel for instant execution (< 50ms)
    const [totalsRes, activeBanksRes, categoryBreakdown, monthlyTrends, topMerchant] = await Promise.all([
      db.get(
        `SELECT 
          COALESCE(SUM(CASE WHEN LOWER(txn_type) = 'debit' THEN amount ELSE 0 END), 0) as total_spend,
          COALESCE(SUM(CASE WHEN LOWER(txn_type) = 'credit' THEN amount ELSE 0 END), 0) as total_income,
          COUNT(*) as total_txns
         FROM transactions t
         WHERE t.user_id = ? ${dateFilter}`,
        dateParams
      ),
      db.query(
        `SELECT DISTINCT bank_detected FROM uploads WHERE user_id = ? AND status = 'completed'`,
        [userId]
      ),
      db.query(
        `SELECT 
          COALESCE(c.name, 'Uncategorized') as category_name,
          COALESCE(c.color, '#9CA3AF') as category_color,
          COALESCE(c.icon, 'HelpCircle') as category_icon,
          COUNT(t.id) as txn_count,
          COALESCE(SUM(t.amount), 0) as total_amount
         FROM transactions t
         LEFT JOIN categories c ON t.category_id = c.id
         WHERE t.user_id = ? AND LOWER(t.txn_type) = 'debit' ${dateFilter}
         GROUP BY c.name, c.color, c.icon
         ORDER BY total_amount DESC`,
        dateParams
      ),
      db.query(
        `SELECT 
          substr(txn_date, 1, 7) as month,
          COALESCE(SUM(CASE WHEN LOWER(txn_type) = 'debit' THEN amount ELSE 0 END), 0) as spend,
          COALESCE(SUM(CASE WHEN LOWER(txn_type) = 'credit' THEN amount ELSE 0 END), 0) as income
         FROM transactions
         WHERE user_id = ? ${dateFilter}
         GROUP BY substr(txn_date, 1, 7)
         ORDER BY month ASC`,
        dateParams
      ),
      db.get(
        `SELECT narration_norm as merchant, SUM(amount) as total_spent, COUNT(*) as txn_count
         FROM transactions
         WHERE user_id = ? AND LOWER(txn_type) = 'debit' ${dateFilter}
         GROUP BY narration_norm
         ORDER BY total_spent DESC
         LIMIT 1`,
        dateParams
      )
    ]);

    const activeBanks = activeBanksRes.map((r) => r.bank_detected).filter(Boolean);

    return res.json({
      summary: {
        totalSpend: totalsRes ? parseFloat(totalsRes.total_spend) : 0,
        totalIncome: totalsRes ? parseFloat(totalsRes.total_income) : 0,
        totalTxns: totalsRes ? parseInt(totalsRes.total_txns, 10) : 0,
        activeBanksCount: activeBanks.length,
        activeBanks: activeBanks.length > 0 ? activeBanks : ['Bank Statements'],
        topCategory: categoryBreakdown.length > 0 ? categoryBreakdown[0].category_name : 'N/A',
        topMerchant: topMerchant ? topMerchant.merchant : 'N/A'
      },
      categoryBreakdown,
      monthlyTrends
    });
  } catch (err) {
    console.error('Summary API error:', err);
    return res.status(500).json({ error: 'Failed to fetch summary data' });
  }
});

module.exports = router;
