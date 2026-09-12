const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const path = require('path');
const seedDatabase = require('./db/seed');

dotenv.config();

const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/uploads');
const transactionRoutes = require('./routes/transactions');
const summaryRoutes = require('./routes/summary');
const exportRoutes = require('./routes/export');
const categoryRoutes = require('./routes/categories');

const { clerkMiddleware } = require('@clerk/express');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
try {
  app.use(clerkMiddleware());
} catch (e) {
  console.warn('[Clerk] Clerk middleware initialization skipped:', e.message);
}

// Static uploads folder
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/summary', summaryRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/categories', categoryRoutes);

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// Start Server
async function startServer() {
  try {
    await seedDatabase();
    app.listen(PORT, () => {
      console.log(`==================================================`);
      console.log(`🚀 Fintech Expense API Server running on port ${PORT}`);
      console.log(`🔗 Healthcheck: http://localhost:${PORT}/api/health`);
      console.log(`==================================================`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = app;
