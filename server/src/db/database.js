require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

let pgPool = null;
let sqliteDb = null;
let dbMode = 'sqlite'; // 'postgres' or 'sqlite'

// Check if PostgreSQL configuration is provided
const dbUrl = process.env.DATABASE_URL;
const usePostgres = process.env.USE_POSTGRES === 'true' || Boolean(dbUrl);

if (usePostgres) {
  try {
    const poolConfig = dbUrl
      ? {
          connectionString: dbUrl,
          ssl: process.env.PG_NO_SSL === 'true' ? false : { rejectUnauthorized: false }
        }
      : {
          user: process.env.PGUSER || 'postgres',
          password: process.env.PGPASSWORD || 'postgres',
          host: process.env.PGHOST || 'localhost',
          port: process.env.PGPORT || 5432,
          database: process.env.PGDATABASE || 'fintech_db',
          ssl: false
        };

    pgPool = new Pool(poolConfig);
    dbMode = 'postgres';
    console.log('[DB] Configured & Connected to PostgreSQL (Neon Cloud Database Active)');
  } catch (err) {
    console.warn('[DB] PostgreSQL initialization failed, falling back to SQLite:', err.message);
    dbMode = 'sqlite';
  }
}

if (dbMode === 'sqlite') {
  const dbDir = path.join(__dirname, '../../data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  const dbPath = path.join(dbDir, 'fintech.sqlite');
  sqliteDb = new sqlite3.Database(dbPath);
  console.log(`[DB] Connected to SQLite local database at ${dbPath}`);
}

/**
 * Universal async query execution
 */
async function query(sql, params = []) {
  if (dbMode === 'postgres') {
    let pgSql = sql;
    let paramIdx = 1;
    while (pgSql.includes('?')) {
      pgSql = pgSql.replace('?', `$${paramIdx++}`);
    }
    // Replace SQLite specific substr for monthly grouping if present
    pgSql = pgSql.replace(/substr\(txn_date,\s*1,\s*7\)/g, "to_char(txn_date::date, 'YYYY-MM')");
    
    const res = await pgPool.query(pgSql, params);
    return res.rows;
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }
}

async function get(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

async function run(sql, params = []) {
  if (dbMode === 'postgres') {
    let pgSql = sql;
    let paramIdx = 1;
    while (pgSql.includes('?')) {
      pgSql = pgSql.replace('?', `$${paramIdx++}`);
    }
    const res = await pgPool.query(pgSql, params);
    return { rowsAffected: res.rowCount };
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }
}

async function exec(sql) {
  if (dbMode === 'postgres') {
    await pgPool.query(sql);
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.exec(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

/**
 * Initialize Tables (Compatible with PostgreSQL & SQLite)
 */
async function initSchema() {
  if (dbMode === 'postgres') {
    const pgSchemaSql = `
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        color VARCHAR(20) DEFAULT '#6B7280',
        icon VARCHAR(50) DEFAULT 'Tag',
        is_system BOOLEAN DEFAULT TRUE
      );

      CREATE TABLE IF NOT EXISTS uploads (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        filename VARCHAR(255) NOT NULL,
        bank_detected VARCHAR(100) DEFAULT 'Generic',
        status VARCHAR(20) DEFAULT 'processing',
        row_count INT DEFAULT 0,
        error_log TEXT,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        upload_id VARCHAR(36) NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
        txn_date DATE NOT NULL,
        narration_raw TEXT NOT NULL,
        narration_norm TEXT NOT NULL,
        amount NUMERIC(12,2) NOT NULL,
        txn_type VARCHAR(10) NOT NULL,
        category_id VARCHAR(36) REFERENCES categories(id) ON DELETE SET NULL,
        categorized_by VARCHAR(20) DEFAULT 'uncategorized',
        confidence_score VARCHAR(10) DEFAULT 'low',
        txn_hash VARCHAR(64) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS merchant_map (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        merchant_sig VARCHAR(255) NOT NULL,
        category_id VARCHAR(36) NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, merchant_sig)
      );

      CREATE TABLE IF NOT EXISTS keyword_dictionary (
        id VARCHAR(36) PRIMARY KEY,
        keyword VARCHAR(100) NOT NULL,
        category_id VARCHAR(36) NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        priority INT DEFAULT 10
      );

      CREATE INDEX IF NOT EXISTS idx_txns_user_date ON transactions(user_id, txn_date);
      CREATE INDEX IF NOT EXISTS idx_txns_user_cat ON transactions(user_id, category_id);
      CREATE INDEX IF NOT EXISTS idx_txns_upload ON transactions(upload_id);
      CREATE INDEX IF NOT EXISTS idx_uploads_user ON uploads(user_id);
    `;
    await exec(pgSchemaSql);
  } else {
    const sqliteSchemaSql = `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        color TEXT DEFAULT '#6B7280',
        icon TEXT DEFAULT 'Tag',
        is_system BOOLEAN DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS uploads (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        filename TEXT NOT NULL,
        bank_detected TEXT DEFAULT 'Generic',
        status TEXT DEFAULT 'processing',
        row_count INT DEFAULT 0,
        error_log TEXT,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        upload_id TEXT NOT NULL,
        txn_date TEXT NOT NULL,
        narration_raw TEXT NOT NULL,
        narration_norm TEXT NOT NULL,
        amount NUMERIC(12,2) NOT NULL,
        txn_type TEXT NOT NULL,
        category_id TEXT,
        categorized_by TEXT DEFAULT 'uncategorized',
        confidence_score TEXT DEFAULT 'low',
        txn_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(upload_id) REFERENCES uploads(id) ON DELETE CASCADE,
        FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS merchant_map (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        merchant_sig TEXT NOT NULL,
        category_id TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE CASCADE,
        UNIQUE(user_id, merchant_sig)
      );

      CREATE TABLE IF NOT EXISTS keyword_dictionary (
        id TEXT PRIMARY KEY,
        keyword TEXT NOT NULL,
        category_id TEXT NOT NULL,
        priority INT DEFAULT 10,
        FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE CASCADE
      );
    `;
    await exec(sqliteSchemaSql);
  }
}

module.exports = {
  query,
  get,
  run,
  exec,
  initSchema,
  dbMode
};
