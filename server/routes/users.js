const router = require('express').Router();
const db = require('../db');
const { authenticate, requireRole, hashPassword } = require('../middleware/auth');

router.get('/', authenticate, requireRole('admin'), async (req, res) => {
  const result = await db.query('SELECT id, username, role, active, created_at FROM users ORDER BY created_at DESC');
  res.json(result.rows);
});

router.post('/', authenticate, requireRole('admin'), async (req, res) => {
  const { username, password = '1234', active = true } = req.body;
  if (!username) return res.status(400).json({ error: 'username is required' });
  const result = await db.query(
    `INSERT INTO users (username, password_hash, role, active)
     VALUES ($1,$2,'admin',$3)
     RETURNING id, username, role, active, created_at`,
    [String(username).trim().toLowerCase(), hashPassword(password), active]
  );
  res.status(201).json(result.rows[0]);
});

router.patch('/:id', authenticate, requireRole('admin'), async (req, res) => {
  const { active, password } = req.body;
  const result = password
    ? await db.query(
      `UPDATE users SET active = COALESCE($1, active), password_hash = $2 WHERE id=$3
       RETURNING id, username, role, active, created_at`,
      [active, hashPassword(password), req.params.id]
    )
    : await db.query(
      `UPDATE users SET active = COALESCE($1, active) WHERE id=$2
       RETURNING id, username, role, active, created_at`,
      [active, req.params.id]
    );
  if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
  res.json(result.rows[0]);
});

module.exports = router;
