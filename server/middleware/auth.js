const { clerkClient, requireAuth } = require('@clerk/express');

// Verify Clerk session and attach user to req
const authenticate = requireAuth();

// Check role from Clerk publicMetadata
const requireRole = (...roles) => async (req, res, next) => {
  const user = await clerkClient.users.getUser(req.auth.userId);
  const userRole = user.publicMetadata?.role || 'staff';
  if (!roles.includes(userRole)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  req.userRole = userRole;
  next();
};

// Sync Clerk user to our DB on first request
const syncUser = async (req, res, next) => {
  const db = require('../db');
  const { userId } = req.auth;
  const clerkUser = await clerkClient.users.getUser(userId);
  const email = clerkUser.emailAddresses[0]?.emailAddress;
  const role = clerkUser.publicMetadata?.role || 'staff';

  await db.query(
    `INSERT INTO users (id, email, role) VALUES ($1, $2, $3)
     ON CONFLICT (id) DO UPDATE SET email = $2, role = $3`,
    [userId, email, role]
  );
  req.clerkUser = clerkUser;
  req.userRole = role;
  next();
};

module.exports = { authenticate, requireRole, syncUser };
