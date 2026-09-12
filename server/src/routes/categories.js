const express = require('express');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/categories - List categories
router.get('/', authMiddleware, async (req, res) => {
  try {
    const categories = await db.query('SELECT * FROM categories ORDER BY name ASC');
    return res.json({ categories });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

module.exports = router;
