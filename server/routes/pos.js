const router = require('express').Router();
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

function money(value) {
  return Math.max(0, Math.round(Number(value || 0) * 100) / 100);
}

router.get('/sales', authenticate, async (req, res) => {
  const result = await db.query(
    `SELECT s.*, u.username AS created_by_name, COUNT(sl.id)::int AS line_count
     FROM sales s
     LEFT JOIN users u ON u.id = s.created_by
     LEFT JOIN sale_lines sl ON sl.sale_id = s.id
     GROUP BY s.id, u.username
     ORDER BY s.created_at DESC
     LIMIT 100`
  );
  res.json(result.rows);
});

router.post('/sales', authenticate, requireRole('admin'), async (req, res) => {
  const { lines = [], cart_discount = 0, paid_status = 'paid' } = req.body;
  if (!Array.isArray(lines) || lines.length === 0) return res.status(400).json({ error: 'Sale lines are required' });

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const prepared = [];

    for (const line of lines) {
      const itemResult = await client.query('SELECT * FROM items WHERE id = $1 FOR UPDATE', [line.item_id]);
      const item = itemResult.rows[0];
      if (!item || item.status !== 'active') throw new Error(`Item is unavailable: ${line.item_id}`);

      const quantity = Number(line.quantity);
      if (!quantity || quantity <= 0) throw new Error(`Invalid quantity for ${item.name}`);
      if (Number(item.quantity) < quantity) throw new Error(`Insufficient stock for ${item.name}`);

      const discount = money(line.discount || 0);
      const unitPrice = money(item.sale_price);
      const lineTotal = money(unitPrice * quantity - discount);
      prepared.push({ item, quantity, discount, unitPrice, lineTotal });
    }

    const subtotal = money(prepared.reduce((sum, line) => sum + line.lineTotal, 0));
    const discountTotal = money(cart_discount);
    const total = money(subtotal - discountTotal);

    const sale = await client.query(
      `INSERT INTO sales (subtotal, discount_total, total, paid_status, created_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [subtotal, discountTotal, total, paid_status, req.user.id]
    );

    for (const line of prepared) {
      await client.query(
        `INSERT INTO sale_lines
         (sale_id, item_id, item_name, barcode, quantity, unit_type, unit_price, unit_cost, discount, line_total)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [sale.rows[0].id, line.item.id, line.item.name, line.item.barcode, line.quantity,
          line.item.unit_type, line.unitPrice, line.item.cost_price, line.discount, line.lineTotal]
      );
      await client.query('UPDATE items SET quantity = quantity - $1, updated_at = NOW() WHERE id = $2', [line.quantity, line.item.id]);
      await client.query(
        `INSERT INTO item_history (item_id, user_id, action, old_values, new_values, notes)
         VALUES ($1,$2,'pos_sale',$3,$4,$5)`,
        [line.item.id, req.user.id, JSON.stringify({ quantity: line.item.quantity }),
          JSON.stringify({ quantity: Number(line.item.quantity) - line.quantity }), `POS sale #${sale.rows[0].id}`]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(sale.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
