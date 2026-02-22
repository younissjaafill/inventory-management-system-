const router = require('express').Router();
const db = require('../db');
const { authenticate, syncUser, requireRole } = require('../middleware/auth');

// GET /api/categories — list all with item count
router.get('/', authenticate, syncUser, async (req, res) => {
  const result = await db.query(
    `SELECT c.*, COUNT(i.id)::int AS item_count
     FROM categories c
     LEFT JOIN items i ON i.category_id = c.id
     GROUP BY c.id
     ORDER BY c.name ASC`
  );
  res.json(result.rows);
});

// POST /api/categories — create
router.post('/', authenticate, syncUser, requireRole('admin', 'manager'), async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const result = await db.query(
    `INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING *`,
    [name, description || null]
  );
  res.status(201).json(result.rows[0]);
});

// PUT /api/categories/:id — update
router.put('/:id', authenticate, syncUser, requireRole('admin', 'manager'), async (req, res) => {
  const { name, description } = req.body;
  const result = await db.query(
    `UPDATE categories SET
       name = COALESCE($1, name),
       description = COALESCE($2, description)
     WHERE id = $3
     RETURNING *`,
    [name || null, description !== undefined ? description : null, req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Category not found' });
  res.json(result.rows[0]);
});

// DELETE /api/categories/:id — only if no items reference it
router.delete('/:id', authenticate, syncUser, requireRole('admin'), async (req, res) => {
  const itemCount = await db.query(
    `SELECT COUNT(*) FROM items WHERE category_id = $1`, [req.params.id]
  );
  if (parseInt(itemCount.rows[0].count) > 0) {
    return res.status(400).json({ error: 'Cannot delete category that has items. Reassign items first.' });
  }
  const result = await db.query('DELETE FROM categories WHERE id = $1 RETURNING id', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Category not found' });
  res.json({ success: true });
});

module.exports = router;
