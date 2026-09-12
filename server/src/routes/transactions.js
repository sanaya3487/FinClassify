const express = require('express');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/authMiddleware');
const { saveLearnedMapping } = require('../engine/categorizer');

const router = express.Router();

// GET /api/transactions - List & Filter transactions
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      search,
      category_id,
      uncategorized_only,
      review_queue_only,
      start_date,
      end_date,
      page = 1,
      limit = 50,
      sort_by = 'txn_date',
      sort_dir = 'DESC'
    } = req.query;

    let sql = `
      SELECT t.id, t.txn_date, t.narration_raw, t.narration_norm, t.amount, t.txn_type,
             t.category_id, t.categorized_by, t.confidence_score, t.upload_id, t.created_at,
             c.name as category_name, c.color as category_color, c.icon as category_icon,
             COALESCE(u.bank_detected, 'Bank Statement') as bank_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN uploads u ON t.upload_id = u.id
      WHERE t.user_id = ?
    `;

    const params = [userId];

    if (search) {
      sql += ` AND (t.narration_raw LIKE ? OR t.narration_norm LIKE ?)`;
      params.push(`%${search.toUpperCase()}%`, `%${search.toUpperCase()}%`);
    }

    if (category_id) {
      sql += ` AND (t.category_id = ? OR c.name = ?)`;
      params.push(category_id, category_id);
    }

    if (uncategorized_only === 'true') {
      sql += ` AND (t.categorized_by = 'uncategorized' OR c.name = 'Uncategorized' OR t.category_id IS NULL)`;
    }

    if (start_date) {
      sql += ` AND t.txn_date >= ?`;
      params.push(start_date);
    }

    if (end_date) {
      sql += ` AND t.txn_date <= ?`;
      params.push(end_date);
    }

    // Count total matching
    const countSql = `SELECT COUNT(*) as total FROM (${sql}) sub`;
    const countRes = await db.get(countSql, params);
    const totalCount = countRes ? parseInt(countRes.total || countRes.count || 0, 10) : 0;

    // Sorting & Pagination
    const validSortCols = ['txn_date', 'amount', 'narration_raw', 'category_name'];
    const sortCol = validSortCols.includes(sort_by) ? sort_by : 'txn_date';
    const direction = sort_dir.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    sql += ` ORDER BY t.${sortCol === 'category_name' ? 'category_id' : sortCol} ${direction}`;

    const parsedLimit = parseInt(limit, 10);
    const parsedPage = parseInt(page, 10);
    const offset = (parsedPage - 1) * parsedLimit;

    sql += ` LIMIT ? OFFSET ?`;
    params.push(parsedLimit, offset);

    const transactions = await db.query(sql, params);

    return res.json({
      transactions,
      pagination: {
        total: totalCount,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(totalCount / parsedLimit)
      }
    });
  } catch (err) {
    console.error('Error fetching transactions:', err);
    return res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// PATCH /api/transactions/:id - Manually recategorize a transaction
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const txnId = req.params.id;
    const { category_id } = req.body;

    if (!category_id) {
      return res.status(400).json({ error: 'Please specify a category_id' });
    }

    const txn = await db.get(
      'SELECT id, narration_raw FROM transactions WHERE id = ? AND user_id = ?',
      [txnId, userId]
    );

    if (!txn) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // 1. Update Transaction record
    await db.run(
      `UPDATE transactions 
       SET category_id = ?, categorized_by = 'manual', confidence_score = 'high' 
       WHERE id = ? AND user_id = ?`,
      [category_id, txnId, userId]
    );

    // 2. Save to Tier 1 Learned Merchant Map (Self-Improving Loop)
    await saveLearnedMapping(userId, txn.narration_raw, category_id);

    // Fetch updated transaction details
    const updatedTxn = await db.get(
      `SELECT t.*, c.name as category_name, c.color as category_color 
       FROM transactions t 
       LEFT JOIN categories c ON t.category_id = c.id 
       WHERE t.id = ?`,
      [txnId]
    );

    return res.json({
      message: 'Category updated and rule saved to your learned merchant map!',
      transaction: updatedTxn
    });
  } catch (err) {
    console.error('Error recategorizing transaction:', err);
    return res.status(500).json({ error: 'Failed to recategorize transaction' });
  }
});

module.exports = router;
