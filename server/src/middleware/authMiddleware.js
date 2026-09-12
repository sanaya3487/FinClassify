const jwt = require('jsonwebtoken');
const db = require('../db/database');
const { getAuth } = require('@clerk/express');

const JWT_SECRET = process.env.JWT_SECRET || 'fintech_super_secret_jwt_key_2026';

async function authMiddleware(req, res, next) {
  let token = req.cookies?.token;

  if (!token && req.headers.authorization) {
    const authHeader = req.headers.authorization;
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Access token missing' });
  }

  // 1. Try Clerk Token / Auth if available
  try {
    const auth = getAuth ? getAuth(req) : null;
    if (auth && auth.userId) {
      let dbUser = await db.get('SELECT * FROM users WHERE id = ?', [auth.userId]);
      if (!dbUser) {
        await db.run(
          'INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)',
          [auth.userId, auth.userId, 'clerk_oauth']
        );
        dbUser = { id: auth.userId, email: auth.userId };
      }
      req.user = { userId: dbUser.id, email: dbUser.email };
      return next();
    }
  } catch (clerkErr) {}

  // 2. Try standard local JWT verification
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    // 3. Fallback for Clerk JWT tokens if decoded directly
    try {
      const decodedUnverified = jwt.decode(token);
      if (decodedUnverified && decodedUnverified.sub) {
        const userId = decodedUnverified.sub;
        const email = decodedUnverified.email || decodedUnverified.primary_email_address || userId;
        
        // Find existing user by ID or Email so previous uploaded statements stay 100% intact
        let dbUser = await db.get('SELECT * FROM users WHERE id = ? OR email = ?', [userId, email]);
        if (!dbUser) {
          await db.run(
            'INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)',
            [userId, email, 'clerk_oauth']
          );
          dbUser = { id: userId, email };
        }
        req.user = { userId: dbUser.id, email: dbUser.email };
        return next();
      }
    } catch (e) {}

    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
}

module.exports = { authMiddleware, JWT_SECRET };
