const router = require('express').Router();
const db = require('../db');
const { authenticate, syncUser, requireRole } = require('../middleware/auth');

// GET /api/orders — list all restock orders
router.get('/', authenticate, syncUser, requireRole('admin', 'manager'), async (req, res) => {
  const { status, item_id } = req.query;
  const conditions = [];
  const params = [];

  if (status) {
    params.push(status);
    conditions.push(`o.status = $${params.length}`);
  }
  if (item_id) {
    params.push(parseInt(item_id));
    conditions.push(`o.item_id = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await db.query(
    `SELECT o.*,
            i.name AS item_name, i.sku AS item_sku,
            s.name AS supplier_name,
            u.email AS ordered_by_email
     FROM restock_orders o
     LEFT JOIN items     i ON o.item_id     = i.id
     LEFT JOIN suppliers s ON o.supplier_id = s.id
     LEFT JOIN users     u ON o.ordered_by  = u.id
     ${where}
     ORDER BY o.ordered_at DESC`,
    params
  );
  res.json(result.rows);
});

// GET /api/orders/:id — single order
router.get('/:id', authenticate, syncUser, requireRole('admin', 'manager'), async (req, res) => {
  const result = await db.query(
    `SELECT o.*,
            i.name AS item_name, i.sku AS item_sku, i.quantity AS current_quantity,
            s.name AS supplier_name, s.email AS supplier_email,
            u.email AS ordered_by_email
     FROM restock_orders o
     LEFT JOIN items     i ON o.item_id     = i.id
     LEFT JOIN suppliers s ON o.supplier_id = s.id
     LEFT JOIN users     u ON o.ordered_by  = u.id
     WHERE o.id = $1`,
    [req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Order not found' });
  res.json(result.rows[0]);
});

// POST /api/orders — create restock order; sets item status to 'ordered'
router.post('/', authenticate, syncUser, requireRole('admin', 'manager'), async (req, res) => {
  const { item_id, supplier_id, quantity_ordered, expected_at, notes } = req.body;
  if (!item_id || !quantity_ordered) {
    return res.status(400).json({ error: 'item_id and quantity_ordered are required' });
  }

  const item = await db.query('SELECT * FROM items WHERE id = $1', [item_id]);
  if (!item.rows[0]) return res.status(404).json({ error: 'Item not found' });
  if (item.rows[0].status === 'discontinued') {
    return res.status(400).json({ error: 'Cannot restock a discontinued item' });
  }

  const order = await db.query(
    `INSERT INTO restock_orders (item_id, supplier_id, quantity_ordered, ordered_by, expected_at, notes)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [item_id, supplier_id || null, quantity_ordered, req.auth.userId,
     expected_at || null, notes || null]
  );

  // Update item status to 'ordered'
  await db.query(`UPDATE items SET status='ordered', updated_at=NOW() WHERE id=$1`, [item_id]);

  // Log history
  await db.query(
    `INSERT INTO item_history (item_id, user_id, action, old_values, new_values, notes)
     VALUES ($1,$2,'status_changed',$3,$4,$5)`,
    [item_id, req.auth.userId,
     JSON.stringify({ status: item.rows[0].status }),
     JSON.stringify({ status: 'ordered' }),
     `Restock order #${order.rows[0].id} created for ${quantity_ordered} units`]
  );

  res.status(201).json(order.rows[0]);
});

// PUT /api/orders/:id — update order details
router.put('/:id', authenticate, syncUser, requireRole('admin', 'manager'), async (req, res) => {
  const { supplier_id, quantity_ordered, expected_at, notes } = req.body;
  const result = await db.query(
    `UPDATE restock_orders SET
       supplier_id     = COALESCE($1, supplier_id),
       quantity_ordered= COALESCE($2, quantity_ordered),
       expected_at     = COALESCE($3, expected_at),
       notes           = COALESCE($4, notes)
     WHERE id = $5 AND status NOT IN ('received','cancelled')
     RETURNING *`,
    [supplier_id || null, quantity_ordered || null, expected_at || null, notes || null, req.params.id]
  );
  if (!result.rows[0]) {
    return res.status(404).json({ error: 'Order not found or already completed/cancelled' });
  }
  res.json(result.rows[0]);
});

// PATCH /api/orders/:id/receive — mark as received, add quantity to item, update item status
router.patch('/:id/receive', authenticate, syncUser, requireRole('admin', 'manager'), async (req, res) => {
  const { quantity_received, notes } = req.body;

  const order = await db.query('SELECT * FROM restock_orders WHERE id = $1', [req.params.id]);
  if (!order.rows[0]) return res.status(404).json({ error: 'Order not found' });
  if (order.rows[0].status === 'received') return res.status(400).json({ error: 'Order already received' });
  if (order.rows[0].status === 'cancelled') return res.status(400).json({ error: 'Order is cancelled' });

  const received = quantity_received || order.rows[0].quantity_ordered;

  // Update order
  const updatedOrder = await db.query(
    `UPDATE restock_orders SET
       status='received', quantity_received=$1, received_at=NOW(), notes=COALESCE($2, notes)
     WHERE id=$3
     RETURNING *`,
    [received, notes || null, req.params.id]
  );

  // Add quantity to item and recompute status
  const item = await db.query('SELECT * FROM items WHERE id = $1', [order.rows[0].item_id]);
  const newQuantity = item.rows[0].quantity + received;
  const newStatus = newQuantity > item.rows[0].min_quantity ? 'in_stock' : 'low_stock';

  await db.query(
    `UPDATE items SET quantity=$1, status=$2, updated_at=NOW() WHERE id=$3`,
    [newQuantity, newStatus, order.rows[0].item_id]
  );

  // Log history
  await db.query(
    `INSERT INTO item_history (item_id, user_id, action, old_values, new_values, notes)
     VALUES ($1,$2,'quantity_changed',$3,$4,$5)`,
    [order.rows[0].item_id, req.auth.userId,
     JSON.stringify({ quantity: item.rows[0].quantity, status: item.rows[0].status }),
     JSON.stringify({ quantity: newQuantity, status: newStatus }),
     `Restock order #${req.params.id} received: +${received} units`]
  );

  res.json({ order: updatedOrder.rows[0], new_quantity: newQuantity, new_status: newStatus });
});

// PATCH /api/orders/:id/cancel — cancel order (admin only)
router.patch('/:id/cancel', authenticate, syncUser, requireRole('admin'), async (req, res) => {
  const order = await db.query('SELECT * FROM restock_orders WHERE id = $1', [req.params.id]);
  if (!order.rows[0]) return res.status(404).json({ error: 'Order not found' });
  if (['received', 'cancelled'].includes(order.rows[0].status)) {
    return res.status(400).json({ error: `Order is already ${order.rows[0].status}` });
  }

  await db.query(`UPDATE restock_orders SET status='cancelled' WHERE id=$1`, [req.params.id]);

  // Recompute item status now that order is cancelled
  const item = await db.query('SELECT * FROM items WHERE id = $1', [order.rows[0].item_id]);
  if (item.rows[0] && item.rows[0].status === 'ordered') {
    const revertedStatus = item.rows[0].quantity > item.rows[0].min_quantity ? 'in_stock' : 'low_stock';
    await db.query(`UPDATE items SET status=$1, updated_at=NOW() WHERE id=$2`, [revertedStatus, item.rows[0].id]);
  }

  res.json({ success: true });
});

module.exports = router;
