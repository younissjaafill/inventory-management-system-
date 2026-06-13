const router = require('express').Router();
const db = require('../db');
const { authenticate, requirePermission } = require('../middleware/auth');

function stockState(item) {
  if (item.status !== 'active') return 'neutral';
  const quantity = Number(item.quantity);
  const warning = Number(item.reorder_warning_quantity);
  if (quantity <= 0) return 'red';
  if (quantity <= warning) return 'yellow';
  return 'green';
}

function dateKey(value) {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function addMonths(date, months) {
  const copy = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  copy.setUTCMonth(copy.getUTCMonth() + months);
  return copy;
}

function expiryState(item) {
  const expiry = dateKey(item.expiry_date);
  if (!expiry) return 'none';
  const todayKey = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Beirut',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const today = new Date(`${todayKey}T00:00:00Z`);
  const expiryDate = new Date(`${expiry}T00:00:00Z`);
  if (expiryDate < today) return 'expired';
  const warningDate = addMonths(today, Number(item.expiry_warning_months || 3));
  if (expiryDate <= warningDate) return 'warning';
  return 'ok';
}

function presentItem(item) {
  return {
    ...item,
    expiry_date: dateKey(item.expiry_date),
    stock_state: stockState(item),
    expiry_state: expiryState(item),
  };
}

async function logHistory(itemId, userId, action, oldValues, newValues, notes) {
  await db.query(
    `INSERT INTO item_history (item_id, user_id, action, old_values, new_values, notes)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [itemId, userId, action, oldValues ? JSON.stringify(oldValues) : null, newValues ? JSON.stringify(newValues) : null, notes || null]
  );
}

const itemSelect = `
  SELECT i.*,
         c.name AS category_name,
         s.name AS supplier_name,
         EXISTS (
           SELECT 1
           FROM purchase_lines pl
           JOIN purchases p ON p.id = pl.purchase_id
           WHERE pl.item_id = i.id AND p.paid_status = 'unpaid'
         ) AS has_unpaid_purchase
  FROM items i
  LEFT JOIN categories c ON c.id = i.category_id
  LEFT JOIN suppliers s ON s.id = i.supplier_id
`;

router.get('/', authenticate, requirePermission('stock', 'pos', 'purchases'), async (req, res) => {
  const { q, category_id, supplier_id, stock, page = 1, limit = 50 } = req.query;
  const conditions = [];
  const params = [];

  if (q) {
    params.push(q);
    conditions.push(`(to_tsvector('english', i.name || ' ' || coalesce(i.description,'')) @@ plainto_tsquery('english', $${params.length}) OR i.barcode ILIKE '%' || $${params.length} || '%' OR i.sku ILIKE '%' || $${params.length} || '%')`);
  }
  if (category_id) {
    params.push(Number(category_id));
    conditions.push(`i.category_id = $${params.length}`);
  }
  if (supplier_id) {
    params.push(Number(supplier_id));
    conditions.push(`i.supplier_id = $${params.length}`);
  }
  if (stock === 'red') conditions.push(`i.status = 'active' AND i.quantity <= 0`);
  if (stock === 'yellow') conditions.push(`i.status = 'active' AND i.quantity > 0 AND i.quantity <= i.reorder_warning_quantity`);
  if (stock === 'green') conditions.push(`i.status = 'active' AND i.quantity > i.reorder_warning_quantity`);

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (Number(page) - 1) * Number(limit);
  params.push(Number(limit), offset);

  const result = await db.query(
    `${itemSelect}
     ${where}
     ORDER BY i.updated_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  const count = await db.query(`SELECT COUNT(*) FROM items i ${where}`, params.slice(0, -2));

  res.json({
    items: result.rows.map(presentItem),
    total: Number(count.rows[0].count),
    page: Number(page),
    limit: Number(limit),
  });
});

router.get('/barcode/:barcode', authenticate, requirePermission('pos', 'stock', 'purchases'), async (req, res) => {
  const result = await db.query(`${itemSelect} WHERE i.barcode = $1`, [req.params.barcode]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Item not found for this barcode' });
  res.json(presentItem(result.rows[0]));
});

router.get('/:id', authenticate, requirePermission('stock', 'purchases'), async (req, res) => {
  const result = await db.query(`${itemSelect} WHERE i.id = $1`, [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Item not found' });
  const history = await db.query(
    `SELECT h.*, u.username AS user_name
     FROM item_history h
     LEFT JOIN users u ON u.id = h.user_id
     WHERE h.item_id = $1
     ORDER BY h.created_at DESC
     LIMIT 30`,
    [req.params.id]
  );
  res.json({ ...presentItem(result.rows[0]), history: history.rows });
});

router.post('/', authenticate, requirePermission('stock'), async (req, res) => {
  const {
    name, sku, barcode, description, category_id, supplier_id, quantity = 0,
    reorder_warning_quantity = 5, expiry_date, expiry_warning_months = 3,
    unit_type = 'piece', cost_price = 0, sale_price = 0,
    status = 'active', image_url, location, notes,
  } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const result = await db.query(
    `INSERT INTO items
     (name, sku, barcode, description, category_id, supplier_id, quantity, reorder_warning_quantity,
      expiry_date, expiry_warning_months, unit_type, cost_price, sale_price, status, image_url, location, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
     RETURNING *`,
    [name, sku || null, barcode || null, description || null, category_id || null, supplier_id || null,
      quantity, reorder_warning_quantity, expiry_date || null, Number(expiry_warning_months || 3),
      unit_type, cost_price, sale_price, status, image_url || null, location || null, notes || null]
  );
  await logHistory(result.rows[0].id, req.user.id, 'created', null, result.rows[0], 'Item created');
  res.status(201).json(presentItem(result.rows[0]));
});

router.put('/:id', authenticate, requirePermission('stock'), async (req, res) => {
  const existing = await db.query('SELECT * FROM items WHERE id = $1', [req.params.id]);
  if (!existing.rows[0]) return res.status(404).json({ error: 'Item not found' });
  const old = existing.rows[0];
  const fields = { ...old, ...req.body };

  const result = await db.query(
    `UPDATE items SET
      name=$1, sku=$2, barcode=$3, description=$4, category_id=$5, supplier_id=$6,
      quantity=$7, reorder_warning_quantity=$8, expiry_date=$9, expiry_warning_months=$10,
      unit_type=$11, cost_price=$12, sale_price=$13, status=$14, image_url=$15,
      location=$16, notes=$17, updated_at=NOW()
     WHERE id=$18
     RETURNING *`,
    [fields.name, fields.sku || null, fields.barcode || null, fields.description || null,
      fields.category_id || null, fields.supplier_id || null, fields.quantity,
      fields.reorder_warning_quantity, fields.expiry_date || null, Number(fields.expiry_warning_months || 3),
      fields.unit_type, fields.cost_price, fields.sale_price, fields.status, fields.image_url || null,
      fields.location || null, fields.notes || null, req.params.id]
  );
  await logHistory(req.params.id, req.user.id, 'updated', old, result.rows[0], null);
  res.json(presentItem(result.rows[0]));
});

router.patch('/:id/quantity', authenticate, requirePermission('stock'), async (req, res) => {
  const { adjustment, notes } = req.body;
  if (adjustment === undefined) return res.status(400).json({ error: 'adjustment is required' });
  const existing = await db.query('SELECT * FROM items WHERE id = $1', [req.params.id]);
  if (!existing.rows[0]) return res.status(404).json({ error: 'Item not found' });
  const old = existing.rows[0];
  const result = await db.query(
    `UPDATE items SET quantity = GREATEST(0, quantity + $1::numeric), updated_at = NOW()
     WHERE id = $2 RETURNING *`,
    [adjustment, req.params.id]
  );
  await logHistory(req.params.id, req.user.id, 'quantity_changed', { quantity: old.quantity }, { quantity: result.rows[0].quantity }, notes || null);
  res.json(presentItem(result.rows[0]));
});

router.delete('/:id', authenticate, requirePermission('stock'), async (req, res) => {
  const result = await db.query('DELETE FROM items WHERE id = $1 RETURNING id', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Item not found' });
  res.json({ success: true });
});

module.exports = router;
