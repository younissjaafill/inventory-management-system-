const router = require('express').Router();
const db = require('../db');
const { authenticate, syncUser, requireRole } = require('../middleware/auth');

// Helper: compute auto status from quantity/min_quantity
// Returns null if the current status should stay (e.g. discontinued/ordered override)
function computeAutoStatus(quantity, minQuantity, currentStatus) {
  if (currentStatus === 'discontinued') return 'discontinued';
  if (quantity > minQuantity) return 'in_stock';
  return 'low_stock';
}

// Helper: log a history entry
async function logHistory(itemId, userId, action, oldValues, newValues, notes) {
  await db.query(
    `INSERT INTO item_history (item_id, user_id, action, old_values, new_values, notes)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [itemId, userId, action, oldValues ? JSON.stringify(oldValues) : null,
     newValues ? JSON.stringify(newValues) : null, notes || null]
  );
}

// GET /api/items — list with search/filter
// Query params: q, category_id, status, supplier_id, page, limit
router.get('/', authenticate, syncUser, async (req, res) => {
  const { q, category_id, status, supplier_id, page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const conditions = [];
  const params = [];

  if (q) {
    params.push(q);
    conditions.push(`to_tsvector('english', i.name || ' ' || coalesce(i.description, '')) @@ plainto_tsquery('english', $${params.length})`);
  }
  if (category_id) {
    params.push(parseInt(category_id));
    conditions.push(`i.category_id = $${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`i.status = $${params.length}`);
  }
  if (supplier_id) {
    params.push(parseInt(supplier_id));
    conditions.push(`i.supplier_id = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  params.push(parseInt(limit));
  params.push(offset);

  const result = await db.query(
    `SELECT i.*,
            c.name AS category_name,
            s.name AS supplier_name
     FROM items i
     LEFT JOIN categories c ON i.category_id = c.id
     LEFT JOIN suppliers  s ON i.supplier_id  = s.id
     ${where}
     ORDER BY i.updated_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  // Total count for pagination
  const countResult = await db.query(
    `SELECT COUNT(*) FROM items i ${where}`,
    params.slice(0, params.length - 2)
  );

  res.json({
    items: result.rows,
    total: parseInt(countResult.rows[0].count),
    page: parseInt(page),
    limit: parseInt(limit)
  });
});

// GET /api/items/:id — single item with category, supplier, recent history
router.get('/:id', authenticate, syncUser, async (req, res) => {
  const item = await db.query(
    `SELECT i.*,
            c.name AS category_name,
            s.name AS supplier_name, s.email AS supplier_email, s.phone AS supplier_phone
     FROM items i
     LEFT JOIN categories c ON i.category_id = c.id
     LEFT JOIN suppliers  s ON i.supplier_id  = s.id
     WHERE i.id = $1`,
    [req.params.id]
  );
  if (!item.rows[0]) return res.status(404).json({ error: 'Item not found' });

  const history = await db.query(
    `SELECT h.*, u.email AS user_email
     FROM item_history h
     LEFT JOIN users u ON h.user_id = u.id
     WHERE h.item_id = $1
     ORDER BY h.created_at DESC
     LIMIT 20`,
    [req.params.id]
  );

  res.json({ ...item.rows[0], history: history.rows });
});

// POST /api/items — create item
router.post('/', authenticate, syncUser, requireRole('admin', 'manager'), async (req, res) => {
  const {
    name, sku, description, category_id, supplier_id,
    quantity = 0, min_quantity = 5, unit_price, status, image_url, location
  } = req.body;

  if (!name) return res.status(400).json({ error: 'name is required' });

  const autoStatus = status || computeAutoStatus(quantity, min_quantity, null);

  const result = await db.query(
    `INSERT INTO items
       (name, sku, description, category_id, supplier_id, quantity, min_quantity, unit_price, status, image_url, location)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING *`,
    [name, sku || null, description || null, category_id || null, supplier_id || null,
     quantity, min_quantity, unit_price || null, autoStatus, image_url || null, location || null]
  );

  const item = result.rows[0];
  await logHistory(item.id, req.auth.userId, 'created', null, item, 'Item created');

  res.status(201).json(item);
});

// PUT /api/items/:id — update item
router.put('/:id', authenticate, syncUser, requireRole('admin', 'manager'), async (req, res) => {
  const existing = await db.query('SELECT * FROM items WHERE id = $1', [req.params.id]);
  if (!existing.rows[0]) return res.status(404).json({ error: 'Item not found' });

  const old = existing.rows[0];
  const {
    name = old.name,
    sku = old.sku,
    description = old.description,
    category_id = old.category_id,
    supplier_id = old.supplier_id,
    quantity = old.quantity,
    min_quantity = old.min_quantity,
    unit_price = old.unit_price,
    status,
    image_url = old.image_url,
    location = old.location
  } = req.body;

  // If status not explicitly provided, recompute from quantity
  const newStatus = status || computeAutoStatus(quantity, min_quantity, old.status);

  const result = await db.query(
    `UPDATE items SET
       name=$1, sku=$2, description=$3, category_id=$4, supplier_id=$5,
       quantity=$6, min_quantity=$7, unit_price=$8, status=$9,
       image_url=$10, location=$11, updated_at=NOW()
     WHERE id=$12
     RETURNING *`,
    [name, sku, description, category_id, supplier_id,
     quantity, min_quantity, unit_price, newStatus,
     image_url, location, req.params.id]
  );

  await logHistory(req.params.id, req.auth.userId, 'updated', old, result.rows[0], null);
  res.json(result.rows[0]);
});

// PATCH /api/items/:id/quantity — adjust quantity (staff can do this)
router.patch('/:id/quantity', authenticate, syncUser, requireRole('admin', 'manager', 'staff'), async (req, res) => {
  const { adjustment, notes } = req.body; // adjustment: positive (add) or negative (remove)
  if (adjustment === undefined || adjustment === null) {
    return res.status(400).json({ error: 'adjustment is required (positive to add, negative to remove)' });
  }

  const existing = await db.query('SELECT * FROM items WHERE id = $1', [req.params.id]);
  if (!existing.rows[0]) return res.status(404).json({ error: 'Item not found' });

  const old = existing.rows[0];
  if (old.status === 'discontinued') {
    return res.status(400).json({ error: 'Cannot adjust quantity of a discontinued item' });
  }

  const newQuantity = Math.max(0, old.quantity + parseInt(adjustment));

  // Preserve 'ordered' status if order is active; otherwise auto-compute
  const newStatus = old.status === 'ordered'
    ? 'ordered'
    : computeAutoStatus(newQuantity, old.min_quantity, old.status);

  const result = await db.query(
    `UPDATE items SET quantity=$1, status=$2, updated_at=NOW() WHERE id=$3 RETURNING *`,
    [newQuantity, newStatus, req.params.id]
  );

  await logHistory(
    req.params.id, req.auth.userId, 'quantity_changed',
    { quantity: old.quantity, status: old.status },
    { quantity: newQuantity, status: newStatus },
    notes || null
  );

  res.json(result.rows[0]);
});

// PATCH /api/items/:id/status — manually override status
router.patch('/:id/status', authenticate, syncUser, requireRole('admin', 'manager'), async (req, res) => {
  const { status } = req.body;
  const valid = ['in_stock', 'low_stock', 'ordered', 'discontinued'];
  if (!valid.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${valid.join(', ')}` });
  }

  const existing = await db.query('SELECT * FROM items WHERE id = $1', [req.params.id]);
  if (!existing.rows[0]) return res.status(404).json({ error: 'Item not found' });

  const old = existing.rows[0];
  const result = await db.query(
    `UPDATE items SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *`,
    [status, req.params.id]
  );

  await logHistory(
    req.params.id, req.auth.userId, 'status_changed',
    { status: old.status },
    { status },
    null
  );

  res.json(result.rows[0]);
});

// DELETE /api/items/:id — delete item (admin only)
router.delete('/:id', authenticate, syncUser, requireRole('admin'), async (req, res) => {
  const existing = await db.query('SELECT * FROM items WHERE id = $1', [req.params.id]);
  if (!existing.rows[0]) return res.status(404).json({ error: 'Item not found' });

  await db.query('DELETE FROM items WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

module.exports = router;
