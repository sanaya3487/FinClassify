-- PostgreSQL Schema for Fintech Expense Classification & Reporting Tool

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
  status VARCHAR(20) DEFAULT 'processing', -- 'processing' | 'completed' | 'failed'
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
  txn_type VARCHAR(10) NOT NULL, -- 'debit' | 'credit'
  category_id VARCHAR(36) REFERENCES categories(id) ON DELETE SET NULL,
  categorized_by VARCHAR(20) DEFAULT 'uncategorized', -- 'learned' | 'keyword' | 'heuristic' | 'manual' | 'uncategorized'
  confidence_score VARCHAR(10) DEFAULT 'low', -- 'high' | 'medium' | 'low'
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
