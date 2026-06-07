const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

router.get('/summary', authenticate, async (req, res) => {
  const [
    salesToday,
    salesMonth,
    expensesMonth,
    stockCounts,
    unpaidPurchases,
    grossMargin,
    recentSales,
  ] = await Promise.all([
    db.query(`SELECT COALESCE(SUM(total),0)::numeric AS total FROM sales WHERE created_at::date = CURRENT_DATE`),
    db.query(`SELECT COALESCE(SUM(total),0)::numeric AS total FROM sales WHERE date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE)`),
    db.query(`SELECT COALESCE(SUM(amount),0)::numeric AS total FROM expenses WHERE date_trunc('month', expense_date) = date_trunc('month', CURRENT_DATE)`),
    db.query(
      `SELECT
        COUNT(*)::int AS total_items,
        COUNT(*) FILTER (WHERE status='active' AND quantity <= 0)::int AS out_of_stock,
        COUNT(*) FILTER (WHERE status='active' AND quantity > 0 AND quantity <= reorder_warning_quantity)::int AS low_stock
       FROM items`
    ),
    db.query(`SELECT COUNT(*)::int AS count, COALESCE(SUM(total_cost),0)::numeric AS total FROM purchases WHERE paid_status='unpaid'`),
    db.query(
      `SELECT COALESCE(SUM((sl.unit_price - sl.unit_cost) * sl.quantity - sl.discount),0)::numeric AS total
       FROM sale_lines sl
       JOIN sales s ON s.id = sl.sale_id
       WHERE date_trunc('month', s.created_at) = date_trunc('month', CURRENT_DATE)`
    ),
    db.query(
      `SELECT s.*, COUNT(sl.id)::int AS line_count
       FROM sales s
       LEFT JOIN sale_lines sl ON sl.sale_id = s.id
       GROUP BY s.id
       ORDER BY s.created_at DESC
       LIMIT 6`
    ),
  ]);

  res.json({
    sales_today: salesToday.rows[0].total,
    sales_month: salesMonth.rows[0].total,
    expenses_month: expensesMonth.rows[0].total,
    gross_margin_month: grossMargin.rows[0].total,
    total_items: stockCounts.rows[0].total_items,
    low_stock: stockCounts.rows[0].low_stock,
    out_of_stock: stockCounts.rows[0].out_of_stock,
    unpaid_purchase_count: unpaidPurchases.rows[0].count,
    unpaid_purchase_total: unpaidPurchases.rows[0].total,
    recent_sales: recentSales.rows,
  });
});

module.exports = router;
