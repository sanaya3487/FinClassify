const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/authMiddleware');
const { parseCsvFile, generateTxnHash } = require('../parsers/bankParser');
const { fetchCategorizationContext, categorizeTransaction } = require('../engine/categorizer');

const router = express.Router();

function generateUuid() {
  return crypto.randomUUID ? crypto.randomUUID() : (Math.random().toString(36).substring(2) + Date.now().toString(36));
}

// Multer upload config
// Use memory storage for Vercel serverless compatibility
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.includes('csv') || file.originalname.endsWith('.csv') || file.mimetype.includes('text/plain')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// Write buffer to /tmp for processing (works on both local and Vercel)
function saveTempFile(buffer, filename) {
  const tmpPath = path.join('/tmp', `${Date.now()}_${filename}`);
  fs.writeFileSync(tmpPath, buffer);
  return tmpPath;
}

/**
 * Ultra-fast bulk upload job processor (Compatible with PostgreSQL and SQLite)
 */
async function processUploadJob(uploadId, userId, filePath, customMapping = null) {
  try {
    const parseResult = await parseCsvFile(filePath, customMapping);
    const { bankDetected, rows } = parseResult;

    const { keywords, userMerchantMap } = await fetchCategorizationContext(userId);

    // Fetch existing transaction hashes for this user in ONE query
    const existingHashesRes = await db.query(
      'SELECT txn_hash FROM transactions WHERE user_id = ?',
      [userId]
    );
    const existingHashSet = new Set(existingHashesRes.map((r) => r.txn_hash));

    const newTxnsToInsert = [];
    let duplicateCount = 0;

    for (const row of rows) {
      const txnHash = generateTxnHash(userId, row.txn_date, row.amount, row.narration_norm);

      if (existingHashSet.has(txnHash)) {
        duplicateCount++;
        continue;
      }

      existingHashSet.add(txnHash); // prevent duplicates within same batch

      // Categorize locally
      const catResult = await categorizeTransaction(
        {
          narration_raw: row.narration_raw,
          amount: row.amount,
          txn_type: row.txn_type,
          user_id: userId
        },
        keywords,
        userMerchantMap
      );

      const txnId = generateUuid();
      newTxnsToInsert.push({
        id: txnId,
        user_id: userId,
        upload_id: uploadId,
        txn_date: row.txn_date,
        narration_raw: row.narration_raw,
        narration_norm: row.narration_norm,
        amount: row.amount,
        txn_type: row.txn_type.toLowerCase(),
        category_id: catResult.category_id,
        categorized_by: catResult.categorized_by,
        confidence_score: catResult.confidence_score,
        txn_hash: txnHash
      });
    }

    // Bulk Insert in chunks of 100 using standard ? placeholders
    const CHUNK_SIZE = 100;
    for (let i = 0; i < newTxnsToInsert.length; i += CHUNK_SIZE) {
      const chunk = newTxnsToInsert.slice(i, i + CHUNK_SIZE);
      if (chunk.length === 0) break;

      let valuePlaceholders = [];
      let params = [];

      for (const item of chunk) {
        valuePlaceholders.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        params.push(
          item.id,
          item.user_id,
          item.upload_id,
          item.txn_date,
          item.narration_raw,
          item.narration_norm,
          item.amount,
          item.txn_type,
          item.category_id,
          item.categorized_by,
          item.confidence_score,
          item.txn_hash
        );
      }

      const bulkSql = `INSERT INTO transactions 
        (id, user_id, upload_id, txn_date, narration_raw, narration_norm, amount, txn_type, category_id, categorized_by, confidence_score, txn_hash)
        VALUES ${valuePlaceholders.join(', ')}`;

      await db.run(bulkSql, params);
    }

    await db.run(
      `UPDATE uploads SET status = 'completed', bank_detected = ?, row_count = ?, error_log = ? WHERE id = ?`,
      [bankDetected, newTxnsToInsert.length, duplicateCount > 0 ? `${duplicateCount} duplicates skipped` : null, uploadId]
    );

    console.log(`[Upload Job] Processed ${newTxnsToInsert.length} transactions (${duplicateCount} duplicates) in lightning speed!`);
  } catch (err) {
    if (err.needsMapping) {
      await db.run(`UPDATE uploads SET status = 'needs_mapping', error_log = ? WHERE id = ?`, [JSON.stringify(err.headers), uploadId]);
    } else {
      console.error('Upload processing error:', err);
      await db.run(`UPDATE uploads SET status = 'failed', error_log = ? WHERE id = ?`, [err.message || 'Unknown processing error', uploadId]);
    }
  } finally {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

// POST /api/uploads - Upload bank CSV statement
router.post('/', authMiddleware, upload.single('statement'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please select a valid bank CSV file to upload' });
    }

    const uploadId = generateUuid();
    const userId = req.user.userId;
    const filename = req.file.originalname;

    // Save buffer to temp file for processing
    const tempFilePath = saveTempFile(req.file.buffer, filename);

    await db.run(
      'INSERT INTO uploads (id, user_id, filename, status) VALUES (?, ?, ?, ?)',
      [uploadId, userId, filename, 'processing']
    );

    // Process job with temp file path
    processUploadJob(uploadId, userId, tempFilePath)
      .then(() => {})
      .catch((err) => console.error('Upload background task error:', err));

    return res.status(202).json({
      message: 'Upload received and categorization processing started',
      uploadId,
      status: 'processing'
    });
  } catch (err) {
    console.error('Upload API error:', err);
    return res.status(500).json({ error: err.message || 'File upload failed' });
  }
});

// POST /api/uploads/:id/map - Re-process with user custom column mapping
router.post('/:id/map', authMiddleware, upload.single('statement'), async (req, res) => {
  try {
    const uploadId = req.params.id;
    const { dateCol, narrationCol, debitCol, creditCol, amountCol } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'File is required for column mapping re-process' });
    }

    const customMapping = {
      bank: 'Custom Mapped Bank',
      dateCol,
      narrationCol,
      debitCol,
      creditCol,
      amountCol
    };

    const tempFilePath = saveTempFile(req.file.buffer, req.file.originalname);
    await db.run(`UPDATE uploads SET status = 'processing' WHERE id = ?`, [uploadId]);

    processUploadJob(uploadId, req.user.userId, tempFilePath, customMapping)
      .then(() => {})
      .catch((err) => console.error('Custom mapping job error:', err));

    return res.json({ message: 'Custom mapping applied. Processing transactions...', uploadId });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to apply custom column mapping' });
  }
});

// GET /api/uploads/:id/status - Poll upload processing status
router.get('/:id/status', authMiddleware, async (req, res) => {
  try {
    const upload = await db.get(
      'SELECT id, filename, bank_detected, status, row_count, error_log, uploaded_at FROM uploads WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.userId]
    );

    if (!upload) {
      return res.status(404).json({ error: 'Upload record not found' });
    }

    let headersForMapping = null;
    if (upload.status === 'needs_mapping' && upload.error_log) {
      try {
        headersForMapping = JSON.parse(upload.error_log);
      } catch (e) {}
    }

    return res.json({
      upload,
      headersForMapping
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch upload status' });
  }
});

// GET /api/uploads - Get user upload history
router.get('/', authMiddleware, async (req, res) => {
  try {
    const uploads = await db.query(
      'SELECT * FROM uploads WHERE user_id = ? ORDER BY uploaded_at DESC',
      [req.user.userId]
    );
    return res.json({ uploads });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch upload history' });
  }
});

module.exports = router;
