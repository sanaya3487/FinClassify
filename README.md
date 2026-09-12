# Fintech Expense Classification & Reporting Tool

A privacy-first, 100% rule-based expense classification engine and interactive financial report dashboard built for Indian banking statements (UPI, Debit Cards, Net Banking, ATM, Cards).

---

## 🌟 Key Features

* **🔒 Privacy-First (Zero Third-Party AI/LLM Calls)**: All transaction narrations remain fully local and deterministic. No external AI APIs consume financial data.
* **⚡ 3-Tier Categorization Engine**:
  1. **Tier 1 (Learned Merchant Map)**: User manual re-categorizations build a personalized memory lookup table.
  2. **Tier 2 (Global Keyword Dictionary & Fuzzy Matching)**: Seeded Indian merchant keywords (Swiggy, Zomato, Uber, Amazon, Blinkit, Apollo, etc.) matched via word-boundary regex (`\bKEYWORD\b`) and `fastest-levenshtein` fuzzy token matching.
  3. **Tier 3 (Heuristic Fallback)**: Structured fallback rules for ATM withdrawals, UPI/NEFT round amounts, and Rent.
* **📊 Multi-Bank CSV Parser**: Auto-detects column headers for HDFC, SBI, ICICI, Axis Bank, and generic CSVs. Includes visual column mapper modal for unknown bank formats.
* **🛡️ Duplicate Detection**: SHA-256 hash hashing of `(date, amount, narration, user_id)` prevents duplicate records on re-upload.
* **📈 Interactive Financial Dashboard**:
  * KPI summary cards (Total Spent, Top Category, Review Queue Count, Net Flow).
  * Category spending Donut Chart (`recharts`).
  * Monthly Cash Flow trend Area Chart.
  * Searchable & filterable transaction table with inline recategorization.
* **📄 Export Capabilities**: Server-generated PDF spending report (`pdfkit`) and CSV export.
* **🚀 Dual Database Support**: Configured for PostgreSQL (PRD requirement) with automatic zero-setup SQLite fallback out-of-the-box.

---

## 🌐 Production Deployment & PostgreSQL Setup Guide

Jab aap is project ko cloud server par deploy karoge, toh aapko apna data ek online Cloud Database me rakhna hoga. System me PostgreSQL support built-in hai!

### Step 1: Create Free PostgreSQL Database (Neon / Supabase / Render)
1. **Neon.tech** ya **Supabase.com** par free account banayein.
2. Naya project banayein aur apna **`DATABASE_URL`** connection string copy karein.
   - Example: `postgres://user:password@ep-host.region.aws.neon.tech/neondb?sslmode=require`

### Step 2: Deploy Backend (Render / Railway)
1. Render.com par Web Service banayein aur backend repository link karein.
2. Environment Variables me set karein:
   - `DATABASE_URL` = (Aapka Neon/Supabase PostgreSQL connection string)
   - `USE_POSTGRES` = `true`
   - `JWT_SECRET` = `any_random_secure_secret_key`
3. Backend Server start hote hi saare Tables (`users`, `categories`, `uploads`, `transactions`, `merchant_map`) automatically PostgreSQL me create aur seed ho jayenge!

### Step 3: Deploy Frontend (Vercel / Netlify / Render)
1. Vercel ya Netlify par frontend React app deploy karein.
2. Environment Variable set karein: `VITE_API_URL` = (Aapka deployed backend Render URL).

---

## 🛠️ Local Quick Start Guide

### 1. Install Dependencies
```bash
# Backend dependencies
cd server
npm install

# Frontend dependencies
cd ../client
npm install
```

### 2. Run the Application
In separate terminal windows:

**Terminal 1 (Backend Server)**:
```bash
cd server
npm run dev
# Server starts at http://localhost:5000
```

**Terminal 2 (Frontend Client)**:
```bash
cd client
npm run dev
# Client starts at http://localhost:5173
```

### 3. Quick Demo with Sample Bank CSV
1. Open `http://localhost:5173`.
2. Login with pre-filled demo credentials:
   - Email: `demo@fintech.local`
   - Password: `password123`
3. Click **Upload Statement** -> click **"HDFC Bank CSV Statement"** or **"SBI Bank CSV Statement"** under Quick Demo to instantly populate the dashboard with real-looking statement data!

---

## 🧪 Running Automated Tests

```bash
cd server
npm test
```
