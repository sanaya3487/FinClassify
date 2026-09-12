const {
  normalizeNarration,
  extractMerchantSignature,
  categorizeTransaction
} = require('../src/engine/categorizer');

describe('Categorization Engine (3-Tier Non-LLM)', () => {
  const mockGlobalKeywords = [
    { keyword: 'SWIGGY', category_id: 'cat-food', category_name: 'Food & Dining' },
    { keyword: 'ZOMATO', category_id: 'cat-food', category_name: 'Food & Dining' },
    { keyword: 'UBER', category_id: 'cat-trans', category_name: 'Transport' },
    { keyword: 'AMAZON', category_id: 'cat-shop', category_name: 'Shopping' },
    { keyword: 'STARBUCKS', category_id: 'cat-food', category_name: 'Food & Dining' },
    { keyword: 'ATM_SPECIAL_KEYWORD', category_id: 'cat-cash', category_name: 'Cash Withdrawal' },
    { keyword: 'Uncategorized', category_id: 'cat-uncat', category_name: 'Uncategorized' }
  ];

  test('narration normalization strips noise & symbols', () => {
    const raw = 'UPI-SWIGGY*ORDER8827-SWIGGY@YBL';
    const norm = normalizeNarration(raw);
    expect(norm).toContain('SWIGGY');
    expect(norm).not.toContain('ORDER8827');
  });

  test('extracts clean merchant signature', () => {
    const raw = 'UPI-ZOMATO-FOOD-MUMBAI';
    const sig = extractMerchantSignature(raw);
    expect(sig).toBe('ZOMATO FOOD MUMBAI');
  });

  test('Tier 1: uses per-user learned merchant map first', async () => {
    const userMap = new Map([['LOCAL CHAI CORNER', 'cat-food']]);
    const txn = { narration_raw: 'UPI/LOCAL CHAI CORNER/P2P', amount: 50, txn_type: 'debit', user_id: 'u1' };

    const result = await categorizeTransaction(txn, mockGlobalKeywords, userMap);
    expect(result.categorized_by).toBe('learned');
    expect(result.category_id).toBe('cat-food');
    expect(result.confidence_score).toBe('high');
  });

  test('Tier 2: exact keyword match with word-boundary regex', async () => {
    const txn = { narration_raw: 'POS SWIGGY FOOD ORDER', amount: 350, txn_type: 'debit', user_id: 'u1' };
    const result = await categorizeTransaction(txn, mockGlobalKeywords, new Map());

    expect(result.categorized_by).toBe('keyword');
    expect(result.category_id).toBe('cat-food');
    expect(result.confidence_score).toBe('high');
  });

  test('Tier 2: word boundary regex prevents false positive collisions', async () => {
    // "BLUE STAR SERVICE" should NOT match keyword "STARBUCKS"
    const txn = { narration_raw: 'BLUE STAR SERVICE CENTER', amount: 1200, txn_type: 'debit', user_id: 'u1' };
    const result = await categorizeTransaction(txn, mockGlobalKeywords, new Map());

    expect(result.category_id).not.toBe('cat-food');
  });

  test('Tier 3: ATM cash withdrawal heuristic', async () => {
    const txn = { narration_raw: 'ATM CASH WITHDRAWAL HDFC BANK', amount: 2000, txn_type: 'debit', user_id: 'u1' };
    const result = await categorizeTransaction(txn, mockGlobalKeywords, new Map());

    expect(result.categorized_by).toBe('heuristic');
    expect(result.category_id).toBe('cat-cash');
  });

  test('Tier 3: unknown merchant falls back to Uncategorized with low confidence', async () => {
    const txn = { narration_raw: 'RANDOM OBSCURE STORE 9928', amount: 199, txn_type: 'debit', user_id: 'u1' };
    const result = await categorizeTransaction(txn, mockGlobalKeywords, new Map());

    expect(result.categorized_by).toBe('uncategorized');
    expect(result.confidence_score).toBe('low');
  });
});
