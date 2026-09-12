const db = require('./database');
const crypto = require('crypto');

function generateUuid() {
  return crypto.randomUUID ? crypto.randomUUID() : (Math.random().toString(36).substring(2) + Date.now().toString(36));
}

const DEFAULT_CATEGORIES = [
  { name: 'Food & Dining', color: '#EF4444', icon: 'Utensils' },
  { name: 'Groceries', color: '#10B981', icon: 'ShoppingBag' },
  { name: 'Transport', color: '#3B82F6', icon: 'Car' },
  { name: 'Shopping', color: '#8B5CF6', icon: 'ShoppingCart' },
  { name: 'Utilities & Bills', color: '#F59E0B', icon: 'Zap' },
  { name: 'Entertainment', color: '#EC4899', icon: 'Film' },
  { name: 'Rent & Housing', color: '#6366F1', icon: 'Home' },
  { name: 'Healthcare & Medical', color: '#14B8A6', icon: 'Heart' },
  { name: 'Cash Withdrawal', color: '#64748B', icon: 'Banknote' },
  { name: 'Transfers & P2P', color: '#06B6D4', icon: 'ArrowRightLeft' },
  { name: 'Investments & Savings', color: '#84CC16', icon: 'TrendingUp' },
  { name: 'Electronics & Tech', color: '#2563EB', icon: 'Laptop' },
  { name: 'Internet & Bills', color: '#D97706', icon: 'Wifi' },
  { name: 'Mobile & Recharge', color: '#059669', icon: 'Smartphone' },
  { name: 'Uncategorized', color: '#9CA3AF', icon: 'HelpCircle' }
];

const SEEDED_KEYWORDS = [
  // Electronics & Tech
  { keyword: 'ELECTRONICS', category: 'Electronics & Tech' },
  { keyword: 'ELECTRONIC', category: 'Electronics & Tech' },
  { keyword: 'LAPTOP', category: 'Electronics & Tech' },
  { keyword: 'GADGETS', category: 'Electronics & Tech' },
  { keyword: 'VIJAY SALES', category: 'Electronics & Tech' },
  { keyword: 'RELIANCE DIGITAL', category: 'Electronics & Tech' },
  { keyword: 'CHIP', category: 'Electronics & Tech' },

  // Internet & Bills
  { keyword: 'INTERNET', category: 'Internet & Bills' },
  { keyword: 'WIFI', category: 'Internet & Bills' },
  { keyword: 'FIBER', category: 'Internet & Bills' },
  { keyword: 'ACT FIBER', category: 'Internet & Bills' },
  { keyword: 'BROADBAND', category: 'Internet & Bills' },

  // Mobile & Recharge
  { keyword: 'RECHARGE', category: 'Mobile & Recharge' },
  { keyword: 'MOBILE RECHARGE', category: 'Mobile & Recharge' },
  { keyword: 'PREPAID', category: 'Mobile & Recharge' },
  { keyword: 'POSTPAID', category: 'Mobile & Recharge' },
  { keyword: 'AIRTEL RECHARGE', category: 'Mobile & Recharge' },
  { keyword: 'JIO RECHARGE', category: 'Mobile & Recharge' },
  { keyword: 'VI RECHARGE', category: 'Mobile & Recharge' },
  // Food & Dining & Cafes
  { keyword: 'SWIGGY', category: 'Food & Dining' },
  { keyword: 'ZOMATO', category: 'Food & Dining' },
  { keyword: 'CAFE', category: 'Food & Dining' },
  { keyword: 'COFFEE', category: 'Food & Dining' },
  { keyword: 'CAFE COFFEE DAY', category: 'Food & Dining' },
  { keyword: 'CCD', category: 'Food & Dining' },
  { keyword: 'BARISTA', category: 'Food & Dining' },
  { keyword: 'TEA', category: 'Food & Dining' },
  { keyword: 'CHAI', category: 'Food & Dining' },
  { keyword: 'DOMINOS', category: 'Food & Dining' },
  { keyword: 'MCDONALD', category: 'Food & Dining' },
  { keyword: 'KFC', category: 'Food & Dining' },
  { keyword: 'BURGER KING', category: 'Food & Dining' },
  { keyword: 'STARBUCKS', category: 'Food & Dining' },
  { keyword: 'PIZZA', category: 'Food & Dining' },
  { keyword: 'HALDIRAM', category: 'Food & Dining' },
  { keyword: 'BEHROUZ', category: 'Food & Dining' },

  // Transfers, NEFT, IMPS, Salary, Refunds
  { keyword: 'NEFT', category: 'Transfers & P2P' },
  { keyword: 'IMPS', category: 'Transfers & P2P' },
  { keyword: 'UPI', category: 'Transfers & P2P' },
  { keyword: 'TRANSFER', category: 'Transfers & P2P' },
  { keyword: 'SALARY', category: 'Transfers & P2P' },
  { keyword: 'REFUND', category: 'Transfers & P2P' },

  // Groceries
  { keyword: 'BIGBASKET', category: 'Groceries' },
  { keyword: 'BLINKIT', category: 'Groceries' },
  { keyword: 'ZEPTO', category: 'Groceries' },
  { keyword: 'INSTAMART', category: 'Groceries' },
  { keyword: 'DMART', category: 'Groceries' },
  { keyword: 'RELIANCE SMART', category: 'Groceries' },
  { keyword: 'RELIANCE FRESH', category: 'Groceries' },
  { keyword: 'NATURES BASKET', category: 'Groceries' },
  { keyword: 'MILK BASKET', category: 'Groceries' },

  // Transport
  { keyword: 'UBER', category: 'Transport' },
  { keyword: 'OLA', category: 'Transport' },
  { keyword: 'RAPIDO', category: 'Transport' },
  { keyword: 'IRCTC', category: 'Transport' },
  { keyword: 'FASTAG', category: 'Transport' },
  { keyword: 'INDIAN OIL', category: 'Transport' },
  { keyword: 'BHARAT PETROL', category: 'Transport' },
  { keyword: 'HPCL', category: 'Transport' },
  { keyword: 'SHELL', category: 'Transport' },

  // Shopping
  { keyword: 'AMAZON', category: 'Shopping' },
  { keyword: 'FLIPKART', category: 'Shopping' },
  { keyword: 'MYNTRA', category: 'Shopping' },
  { keyword: 'AJIO', category: 'Shopping' },
  { keyword: 'DECATHLON', category: 'Shopping' },
  { keyword: 'CROMA', category: 'Shopping' },

  // Utilities
  { keyword: 'ELECTRICITY', category: 'Utilities & Bills' },
  { keyword: 'BSES', category: 'Utilities & Bills' },
  { keyword: 'AIRTEL', category: 'Utilities & Bills' },
  { keyword: 'JIO', category: 'Utilities & Bills' },
  { keyword: 'BROADBAND', category: 'Utilities & Bills' },
  { keyword: 'CRED', category: 'Utilities & Bills' },

  // Entertainment
  { keyword: 'BOOKMYSHOW', category: 'Entertainment' },
  { keyword: 'NETFLIX', category: 'Entertainment' },
  { keyword: 'SPOTIFY', category: 'Entertainment' },
  { keyword: 'PVR', category: 'Entertainment' },
  { keyword: 'INOX', category: 'Entertainment' },

  // Rent
  { keyword: 'RENT', category: 'Rent & Housing' },
  { keyword: 'NOBROKER', category: 'Rent & Housing' },
  { keyword: 'LANDLORD', category: 'Rent & Housing' },

  // Healthcare
  { keyword: 'APOLLO', category: 'Healthcare & Medical' },
  { keyword: 'PHARMEASY', category: 'Healthcare & Medical' },
  { keyword: '1MG', category: 'Healthcare & Medical' },

  // Cash
  { keyword: 'ATM', category: 'Cash Withdrawal' },
  { keyword: 'CASH WDL', category: 'Cash Withdrawal' },
  { keyword: 'CASH WITHDRAWAL', category: 'Cash Withdrawal' },
  { keyword: 'WITHDRAWAL', category: 'Cash Withdrawal' },
  { keyword: 'CASH', category: 'Cash Withdrawal' },

  // Investments
  { keyword: 'ZERODHA', category: 'Investments & Savings' },
  { keyword: 'GROWW', category: 'Investments & Savings' },
  { keyword: 'MUTUAL FUND', category: 'Investments & Savings' },
  { keyword: 'SIP', category: 'Investments & Savings' }
];

async function seedDatabase() {
  await db.initSchema();

  // 1. Bulk insert categories
  for (const cat of DEFAULT_CATEGORIES) {
    const catId = generateUuid();
    await db.run(
      `INSERT INTO categories (id, name, color, icon, is_system) 
       VALUES (?, ?, ?, ?, true) 
       ON CONFLICT (name) DO NOTHING`,
      [catId, cat.name, cat.color, cat.icon]
    );
  }

  // Fetch all category IDs
  const allCategories = await db.query('SELECT id, name FROM categories');
  const categoryMap = {};
  allCategories.forEach((c) => { categoryMap[c.name] = c.id; });

  // 2. Batch insert keywords
  for (const item of SEEDED_KEYWORDS) {
    const catId = categoryMap[item.category];
    if (catId) {
      const keyId = generateUuid();
      await db.run(
        `INSERT INTO keyword_dictionary (id, keyword, category_id, priority) 
         VALUES (?, ?, ?, 10) 
         ON CONFLICT (id) DO NOTHING`,
        [keyId, item.keyword, catId]
      );
    }
  }

  console.log('[Seed] Database initialization & seeding completed!');
}

module.exports = seedDatabase;
