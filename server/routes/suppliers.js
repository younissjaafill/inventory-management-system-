const router = require('express').Router();
const db = require('../db');
const { authenticate, syncUser, requireRole } = require('../middleware/auth');

// GET /api/suppliers — list all with item count
router.get('/', authenticate, syncUser, async (req, res) => {
  const result = await db.query(
    `SELECT s.*, COUNT(i.id)::int AS item_count
     FROM suppliers s
     LEFT JOIN items i ON i.supplier_id = s.id
     GROUP BY s.id
     ORDER BY s.name ASC`
  );
  res.json(result.rows);
});

// GET /api/suppliers/:id — supplier details + their items
router.get('/:id', authenticate, syncUser, async (req, res) => {
  const supplier = await db.query('SELECT * FROM suppliers WHERE id = $1', [req.params.id]);
  if (!supplier.rows[0]) return res.status(404).json({ error: 'Supplier not found' });

  const items = await db.query(
    `SELECT i.id, i.name, i.sku, i.quantity, i.status, i.unit_price, c.name AS category_name
     FROM items i
     LEFT JOIN categories c ON i.category_id = c.id
     WHERE i.supplier_id = $1
     ORDER BY i.name ASC`,
    [req.params.id]
  );

  res.json({ ...supplier.rows[0], items: items.rows });
});

// POST /api/suppliers — create
router.post('/', authenticate, syncUser, requireRole('admin', 'manager'), async (req, res) => {
  const { name, email, phone, address } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const result = await db.query(
    `INSERT INTO suppliers (name, email, phone, address) VALUES ($1,$2,$3,$4) RETURNING *`,
    [name, email || null, phone || null, address || null]
  );
  res.status(201).json(result.rows[0]);
});

// PUT /api/suppliers/:id — update
router.put('/:id', authenticate, syncUser, requireRole('admin', 'manager'), async (req, res) => {
  const { name, email, phone, address } = req.body;
  const result = await db.query(
    `UPDATE suppliers SET
       name    = COALESCE($1, name),
       email   = COALESCE($2, email),
       phone   = COALESCE($3, phone),
       address = COALESCE($4, address)
     WHERE id = $5
     RETURNING *`,
    [name || null, email || null, phone || null, address || null, req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Supplier not found' });
  res.json(result.rows[0]);
});

// DELETE /api/suppliers/:id — admin only
router.delete('/:id', authenticate, syncUser, requireRole('admin'), async (req, res) => {
  const result = await db.query('DELETE FROM suppliers WHERE id = $1 RETURNING id', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Supplier not found' });
  res.json({ success: true });
});

module.exports = router;
