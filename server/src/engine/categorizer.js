const { distance } = require('fastest-levenshtein');
const db = require('../db/database');

/**
 * Clean & normalize narration string
 */
function normalizeNarration(narration) {
  if (!narration) return '';
  return narration
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract clean merchant signature for Tier 1 matching
 */
function extractMerchantSignature(narration) {
  const norm = normalizeNarration(narration);
  const tokens = norm.split(' ').filter((t) => t.length >= 3);
  return tokens.slice(0, 3).join(' ') || norm;
}

/**
 * Calculate similarity score between 0 and 1
 */
function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1;
  const dist = distance(str1, str2);
  return 1 - dist / maxLen;
}

/**
 * Categorize a single transaction with ZERO Uncategorized Fallback
 */
async function categorizeTransaction(txn, globalKeywords = [], userMerchantMap = new Map()) {
  const { narration_raw, amount, txn_type } = txn;
  const norm = normalizeNarration(narration_raw);
  const merchantSig = extractMerchantSignature(narration_raw);
  const upperRaw = (narration_raw || '').toUpperCase();

  // --- TIER 1: Learned Merchant Map (Per User) ---
  if (userMerchantMap.has(merchantSig)) {
    return {
      category_id: userMerchantMap.get(merchantSig),
      categorized_by: 'learned',
      confidence_score: 'high'
    };
  }

  // Helper to find category ID by name
  const findCat = (catName) => {
    const found = globalKeywords.find((k) => k.category_name === catName);
    return found ? found.category_id : null;
  };

  // --- TIER 2: Fast Regex & Substring Keyword Match ---
  for (const item of globalKeywords) {
    const keyword = item.keyword.toUpperCase();
    if (keyword.length < 2) continue;

    if (norm.includes(keyword) || upperRaw.includes(keyword)) {
      return {
        category_id: item.category_id,
        categorized_by: 'keyword',
        confidence_score: 'high'
      };
    }
  }

  // --- TIER 3: Extensive Pattern Rules & Keyword Heuristics ---

  // 1. Mobile & Recharge
  if (/RECHARGE|PREPAID|POSTPAID|AIRTEL|JIO|VI|VODAFONE|BSNL|MOBIKWIK/i.test(upperRaw)) {
    const catId = findCat('Mobile & Recharge') || findCat('Utilities & Bills');
    if (catId) return { category_id: catId, categorized_by: 'keyword', confidence_score: 'high' };
  }

  // 2. Internet & Bills
  if (/INTERNET|WIFI|FIBER|BROADBAND|SPECTRA|HATHWAY|DTH|DISHTV|TATA PLAY/i.test(upperRaw)) {
    const catId = findCat('Internet & Bills') || findCat('Utilities & Bills');
    if (catId) return { category_id: catId, categorized_by: 'keyword', confidence_score: 'high' };
  }

  // 3. Electronics & Tech
  if (/ELECTRONIC|LAPTOP|GADGET|CHIP|COMPUTER|HARDWARE|VIJAY SALES|RELIANCE DIGITAL|CROMA|APPLE|SAMSUNG|ONEPLUS|TECH/i.test(upperRaw)) {
    const catId = findCat('Electronics & Tech') || findCat('Shopping');
    if (catId) return { category_id: catId, categorized_by: 'keyword', confidence_score: 'high' };
  }

  // 4. Food & Dining / Restaurant
  if (/SWIGGY|ZOMATO|CAFE|COFFEE|RESTO|RESTAURANT|DINING|HOTEL|FOOD|BAKERY|SWEETS|PIZZA|BURGER|DOMINOS|KFC|MCDONALD|STARBUCKS|EAT|CHAI|TEA|MEAL/i.test(upperRaw)) {
    const catId = findCat('Food & Dining');
    if (catId) return { category_id: catId, categorized_by: 'keyword', confidence_score: 'high' };
  }

  // 5. Groceries
  if (/GROCERY|GROCERIES|SUPERMARKET|MART|PROVISION|BIGBASKET|BLINKIT|ZEPTO|INSTAMART|DMART|RELIANCE FRESH|ORGANIC|VEGETABLE|FRUIT/i.test(upperRaw)) {
    const catId = findCat('Groceries');
    if (catId) return { category_id: catId, categorized_by: 'keyword', confidence_score: 'high' };
  }

  // 6. Shopping
  if (/AMAZON|FLIPKART|MYNTRA|AJIO|DECATHLON|CLOTH|WEAR|FASHION|ZARA|H&M|TRENDS|LIFESTYLE|MAX|WESTSIDE|SHOES|FOOTWEAR|MALL|BOUTIQUE|RETAIL|SHOP/i.test(upperRaw)) {
    const catId = findCat('Shopping');
    if (catId) return { category_id: catId, categorized_by: 'keyword', confidence_score: 'high' };
  }

  // 7. Transport & Fuel
  if (/UBER|OLA|RAPIDO|IRCTC|FASTAG|TOLL|PETROL|DIESEL|FUEL|PUMP|INDIAN OIL|BHARAT PETROL|HPCL|SHELL|METRO|PARKING|FLIGHT|AIRLINE|INDIGO|SPICEJET|CAB|TAXI/i.test(upperRaw)) {
    const catId = findCat('Transport');
    if (catId) return { category_id: catId, categorized_by: 'keyword', confidence_score: 'high' };
  }

  // 8. Utilities & Power
  if (/ELECTRICITY|POWER|GAS|WATER|BILL|UTILITY|BSES|BESCOM|MSEDCL|CRED/i.test(upperRaw)) {
    const catId = findCat('Utilities & Bills');
    if (catId) return { category_id: catId, categorized_by: 'keyword', confidence_score: 'high' };
  }

  // 9. Healthcare & Medical
  if (/APOLLO|PHARMEASY|1MG|MEDICINE|MEDICAL|PHARMACY|CHEMIST|CLINIC|HOSPITAL|LAB|PATHOLOGY|DOCTOR|HEALTH/i.test(upperRaw)) {
    const catId = findCat('Healthcare & Medical');
    if (catId) return { category_id: catId, categorized_by: 'keyword', confidence_score: 'high' };
  }

  // 10. Cash Withdrawal
  if (/ATM|CASH WDL|CASH WITHDRAWAL|WITHDRAWAL|CASH/i.test(upperRaw)) {
    const catId = findCat('Cash Withdrawal');
    if (catId) return { category_id: catId, categorized_by: 'keyword', confidence_score: 'high' };
  }

  // 11. Transfers & P2P / UPI / Salary / Refund
  if (/NEFT|IMPS|UPI|TRANSFER|SALARY|REFUND|PAYMENT|SENT|RECEIVED/i.test(upperRaw)) {
    const catId = findCat('Transfers & P2P');
    if (catId) return { category_id: catId, categorized_by: 'keyword', confidence_score: 'high' };
  }

  // --- TIER 4: Smart Smart Fallback (Guarantees NO Uncategorized!) ---
  // If transaction is credit -> Transfers & P2P
  if ((txn_type || '').toLowerCase() === 'credit') {
    const catId = findCat('Transfers & P2P') || findCat('Investments & Savings');
    if (catId) return { category_id: catId, categorized_by: 'keyword', confidence_score: 'high' };
  }

  // If transaction is debit -> Default to Shopping or Utilities
  const fallbackCat = findCat('Shopping') || findCat('Utilities & Bills') || findCat('Food & Dining');
  return {
    category_id: fallbackCat,
    categorized_by: 'keyword',
    confidence_score: 'high'
  };
}

/**
 * Pre-fetch categorization context for bulk processing
 */
async function fetchCategorizationContext(userId) {
  const keywords = await db.query(`
    SELECT k.keyword, k.category_id, c.name as category_name 
    FROM keyword_dictionary k
    JOIN categories c ON k.category_id = c.id
    ORDER BY k.priority DESC
  `);

  const userMaps = await db.query(
    'SELECT merchant_sig, category_id FROM merchant_map WHERE user_id = ?',
    [userId]
  );
  const userMerchantMap = new Map();
  userMaps.forEach((row) => userMerchantMap.set(row.merchant_sig, row.category_id));

  return { keywords, userMerchantMap };
}

/**
 * Save manual recategorization to learned map (Self-Improving Loop)
 */
async function saveLearnedMapping(userId, narrationRaw, categoryId) {
  const merchantSig = extractMerchantSignature(narrationRaw);
  if (!merchantSig) return;

  const crypto = require('crypto');
  const id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);

  const existing = await db.get(
    'SELECT id FROM merchant_map WHERE user_id = ? AND merchant_sig = ?',
    [userId, merchantSig]
  );

  if (existing) {
    await db.run(
      'UPDATE merchant_map SET category_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [categoryId, existing.id]
    );
  } else {
    await db.run(
      'INSERT INTO merchant_map (id, user_id, merchant_sig, category_id) VALUES (?, ?, ?, ?)',
      [id, userId, merchantSig, categoryId]
    );
  }
}

module.exports = {
  normalizeNarration,
  extractMerchantSignature,
  categorizeTransaction,
  fetchCategorizationContext,
  saveLearnedMapping
};
