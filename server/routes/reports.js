const router = require('express').Router();
const db = require('../db');
const { authenticate, requirePermission } = require('../middleware/auth');

const TZ = 'Asia/Beirut';
const PERIODS = new Set(['day', 'month']);

function selectedPeriod(value) {
  return PERIODS.has(value) ? value : 'day';
}

function selectedDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || '') ? value : null;
}

router.get('/summary', authenticate, requirePermission('dashboard'), async (req, res) => {
  const period = selectedPeriod(req.query.period);
  const date = selectedDate(req.query.date);
  const trunc = period;
  const bounds = `
    WITH input AS (
      SELECT COALESCE($2::date, (CURRENT_TIMESTAMP AT TIME ZONE $3)::date) AS selected_date
    ),
    bounds AS (
      SELECT
        date_trunc($1, input.selected_date::timestamp)::timestamp AS start_at,
        (date_trunc($1, input.selected_date::timestamp) + ('1 ' || $1)::interval)::timestamp AS end_at
      FROM input
    )
  `;
  const saleLocalTime = `((s.created_at AT TIME ZONE 'UTC') AT TIME ZONE $3)`;
  const purchasePaidLocalTime = `((p.paid_at AT TIME ZONE 'UTC') AT TIME ZONE $3)`;
  const saleInPeriod = `((${saleLocalTime} >= bounds.start_at AND ${saleLocalTime} < bounds.end_at) OR (s.created_at >= bounds.start_at AND s.created_at < bounds.end_at))`;
  const purchaseInPeriod = `(p.paid_at IS NOT NULL AND ((${purchasePaidLocalTime} >= bounds.start_at AND ${purchasePaidLocalTime} < bounds.end_at) OR (p.paid_at >= bounds.start_at AND p.paid_at < bounds.end_at)))`;

  const params = [trunc, date, TZ];
  const [
    periodInfo,
    sales,
    expenses,
    supplierPayments,
    grossMargin,
    stockOutput,
    topSold,
    salesList,
  ] = await Promise.all([
    db.query(`${bounds} SELECT start_at::date AS start_date, (end_at - interval '1 day')::date AS end_date FROM bounds`, params),
    db.query(`${bounds} SELECT COALESCE(SUM(s.total),0)::numeric AS total, COUNT(s.id)::int AS count FROM sales s, bounds WHERE ${saleInPeriod}`, params),
    db.query(
      `${bounds}
       SELECT COALESCE(SUM(e.amount),0)::numeric AS total, COUNT(e.id)::int AS count
       FROM expenses e, bounds
       WHERE e.expense_date >= bounds.start_at::date AND e.expense_date < bounds.end_at::date`,
      params
    ),
    db.query(`${bounds} SELECT COALESCE(SUM(p.total_cost),0)::numeric AS total, COUNT(p.id)::int AS count FROM purchases p, bounds WHERE p.paid_status='paid' AND ${purchaseInPeriod}`, params),
    db.query(
      `${bounds}
       SELECT COALESCE(SUM(
         (sl.unit_price - sl.unit_cost) * sl.quantity
         - sl.discount
         - CASE
             WHEN s.subtotal > 0 THEN s.discount_total * (sl.line_total / s.subtotal)
             ELSE 0
           END
       ),0)::numeric AS total
       FROM sale_lines sl
       JOIN sales s ON s.id = sl.sale_id
       CROSS JOIN bounds
       WHERE ${saleInPeriod}`,
      params
    ),
    db.query(
      `${bounds}
       SELECT COALESCE(SUM(sl.quantity),0)::numeric AS total
       FROM sale_lines sl
       JOIN sales s ON s.id = sl.sale_id
       CROSS JOIN bounds
       WHERE ${saleInPeriod}`,
      params
    ),
    db.query(
      `${bounds}
       SELECT
         sl.item_id,
         sl.item_name,
         sl.unit_type,
         SUM(sl.quantity)::numeric AS quantity,
         SUM(sl.line_total)::numeric AS total
       FROM sale_lines sl
       JOIN sales s ON s.id = sl.sale_id
       CROSS JOIN bounds
       WHERE ${saleInPeriod}
       GROUP BY sl.item_id, sl.item_name, sl.unit_type
       ORDER BY total DESC, quantity DESC
       LIMIT 10`,
      params
    ),
    db.query(
      `${bounds}
       SELECT
         s.id,
         s.subtotal,
         s.discount_total,
         s.total,
         s.created_at,
         u.username AS created_by_name,
         COALESCE(json_agg(json_build_object(
           'id', sl.id,
           'item_id', sl.item_id,
           'item_name', sl.item_name,
           'quantity', sl.quantity,
           'unit_type', sl.unit_type,
           'line_total', sl.line_total
         ) ORDER BY sl.id) FILTER (WHERE sl.id IS NOT NULL), '[]') AS lines
       FROM sales s
       LEFT JOIN users u ON u.id = s.created_by
       LEFT JOIN sale_lines sl ON sl.sale_id = s.id
       CROSS JOIN bounds
       WHERE ${saleInPeriod}
       GROUP BY s.id, u.username
       ORDER BY s.created_at DESC
       LIMIT 100`,
      params
    ),
  ]);

  const salesTotal = Number(sales.rows[0].total || 0);
  const expensesTotal = Number(expenses.rows[0].total || 0);
  const supplierPaymentTotal = Number(supplierPayments.rows[0].total || 0);

  res.json({
    period,
    timezone: TZ,
    start_date: periodInfo.rows[0].start_date,
    end_date: periodInfo.rows[0].end_date,
    sales_total: sales.rows[0].total,
    sales_count: sales.rows[0].count,
    expenses_total: expenses.rows[0].total,
    expenses_count: expenses.rows[0].count,
    supplier_payments_total: supplierPayments.rows[0].total,
    supplier_payments_count: supplierPayments.rows[0].count,
    gross_margin_total: grossMargin.rows[0].total,
    stock_output_total: stockOutput.rows[0].total,
    pure_cash: salesTotal - expensesTotal - supplierPaymentTotal,
    top_sold: topSold.rows,
    sales: salesList.rows,
  });
});

module.exports = router;
