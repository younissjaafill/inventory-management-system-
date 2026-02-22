const router = require('express').Router();
const OpenAI = require('openai');
const db = require('../db');
const { authenticate, syncUser } = require('../middleware/auth');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── 1. Generate AI insights for a single item ─────────────────────────────────
// Analyses item details and restock history to produce actionable insights.
// Saves the result to items.ai_insights.
router.post('/insights/:itemId', authenticate, syncUser, async (req, res) => {
  const item = await db.query(
    `SELECT i.*, c.name AS category_name, s.name AS supplier_name
     FROM items i
     LEFT JOIN categories c ON i.category_id = c.id
     LEFT JOIN suppliers  s ON i.supplier_id  = s.id
     WHERE i.id = $1`,
    [req.params.itemId]
  );
  if (!item.rows[0]) return res.status(404).json({ error: 'Item not found' });

  const orders = await db.query(
    `SELECT quantity_ordered, quantity_received, status, ordered_at, received_at
     FROM restock_orders WHERE item_id = $1 ORDER BY ordered_at DESC LIMIT 10`,
    [req.params.itemId]
  );

  const { name, sku, description, quantity, min_quantity, unit_price, status, category_name, supplier_name } = item.rows[0];
  const orderHistory = orders.rows.map(o =>
    `Ordered ${o.quantity_ordered}, received ${o.quantity_received}, status: ${o.status}`
  ).join('\n') || 'No order history';

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{
      role: 'user',
      content: `You are an inventory management AI assistant. Analyze this inventory item and provide concise, actionable insights (3-5 bullet points):

Item: ${name} (SKU: ${sku || 'N/A'})
Category: ${category_name || 'Uncategorized'}
Supplier: ${supplier_name || 'N/A'}
Description: ${description || 'N/A'}
Current Quantity: ${quantity}
Minimum Quantity Threshold: ${min_quantity}
Unit Price: $${unit_price || 'N/A'}
Current Status: ${status}

Recent Order History:
${orderHistory}

Provide insights on: stock health, reorder timing recommendations, cost optimization, and any risks or opportunities you identify.`
    }]
  });

  const insights = completion.choices[0].message.content;
  await db.query('UPDATE items SET ai_insights = $1, updated_at = NOW() WHERE id = $2', [insights, req.params.itemId]);
  res.json({ insights });
});

// ── 2. AI restock suggestions ─────────────────────────────────────────────────
// Fetches all low_stock and ordered items and returns a prioritized restock plan.
router.post('/restock-suggestions', authenticate, syncUser, async (req, res) => {
  const items = await db.query(
    `SELECT i.*, c.name AS category_name, s.name AS supplier_name
     FROM items i
     LEFT JOIN categories c ON i.category_id = c.id
     LEFT JOIN suppliers  s ON i.supplier_id  = s.id
     WHERE i.status IN ('low_stock', 'ordered')
     ORDER BY i.quantity ASC
     LIMIT 50`
  );

  if (!items.rows.length) {
    return res.json({ suggestions: [], message: 'All items are well stocked!' });
  }

  const itemList = items.rows.map(i =>
    `- ID:${i.id} | ${i.name} | Qty: ${i.quantity}/${i.min_quantity} | Status: ${i.status} | Supplier: ${i.supplier_name || 'N/A'} | Price: $${i.unit_price || 'N/A'}`
  ).join('\n');

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are an inventory management AI. Analyze the following low-stock items and return a prioritized restock plan as a JSON array.
Each entry must have: { "item_id": number, "item_name": string, "priority": "critical"|"high"|"medium", "suggested_quantity": number, "reason": string }
Sort by priority (critical first). Return ONLY the JSON array.`
      },
      {
        role: 'user',
        content: `Current low-stock / ordered items:\n${itemList}\n\nProvide a prioritized restock plan.`
      }
    ]
  });

  const text = completion.choices[0].message.content;
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  const suggestions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

  res.json({ suggestions });
});

// ── 3. AI category classification ─────────────────────────────────────────────
// Given an item name and description, suggests the best matching category.
router.post('/classify', authenticate, syncUser, async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const categories = await db.query('SELECT id, name, description FROM categories ORDER BY name');
  if (!categories.rows.length) {
    return res.json({ category_id: null, category_name: null, confidence: 'low', reason: 'No categories exist yet.' });
  }

  const catList = categories.rows.map(c => `ID:${c.id} | ${c.name}${c.description ? ` — ${c.description}` : ''}`).join('\n');

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are an inventory classification assistant. Given an item, pick the best matching category from the list.
Return JSON: { "category_id": number, "category_name": string, "confidence": "high"|"medium"|"low", "reason": string }
Return ONLY the JSON object.`
      },
      {
        role: 'user',
        content: `Item Name: ${name}\nDescription: ${description || 'N/A'}\n\nAvailable Categories:\n${catList}`
      }
    ]
  });

  const text = completion.choices[0].message.content;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { category_id: null, reason: 'Could not classify' };

  res.json(result);
});

// ── 4. AI inventory assistant chat ────────────────────────────────────────────
// Multi-turn conversational assistant for inventory questions.
router.post('/chat', authenticate, syncUser, async (req, res) => {
  const { messages } = req.body; // Full conversation history from client

  // Fetch a quick inventory snapshot for context
  const snapshot = await db.query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'in_stock')    AS in_stock,
       COUNT(*) FILTER (WHERE status = 'low_stock')   AS low_stock,
       COUNT(*) FILTER (WHERE status = 'ordered')     AS ordered,
       COUNT(*) FILTER (WHERE status = 'discontinued') AS discontinued,
       COUNT(*) AS total
     FROM items`
  );
  const s = snapshot.rows[0];

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a helpful inventory management assistant. You help users manage their warehouse inventory.
Current inventory snapshot: ${s.total} total items — ${s.in_stock} in stock, ${s.low_stock} low stock, ${s.ordered} on order, ${s.discontinued} discontinued.
Help with: finding items, understanding stock levels, reorder advice, supplier questions, and general inventory management best practices. Be concise and practical.`
      },
      ...messages
    ]
  });

  res.json({ reply: completion.choices[0].message.content });
});

// ── 5. AI demand forecasting ──────────────────────────────────────────────────
// Analyses restock order history to forecast demand for an item or all items.
router.post('/forecast', authenticate, syncUser, async (req, res) => {
  const { item_id } = req.body;

  let items;
  if (item_id) {
    items = await db.query('SELECT id, name, quantity, min_quantity, status FROM items WHERE id = $1', [item_id]);
  } else {
    items = await db.query(
      `SELECT id, name, quantity, min_quantity, status FROM items
       WHERE status != 'discontinued' ORDER BY name LIMIT 30`
    );
  }

  if (!items.rows.length) return res.status(404).json({ error: 'No items found' });

  // Fetch restock history for the relevant items
  const itemIds = items.rows.map(i => i.id);
  const orders = await db.query(
    `SELECT item_id, quantity_ordered, quantity_received, ordered_at, received_at, status
     FROM restock_orders
     WHERE item_id = ANY($1) AND status = 'received'
     ORDER BY ordered_at ASC`,
    [itemIds]
  );

  const ordersByItem = {};
  orders.rows.forEach(o => {
    if (!ordersByItem[o.item_id]) ordersByItem[o.item_id] = [];
    ordersByItem[o.item_id].push(o);
  });

  const itemSummaries = items.rows.map(i => {
    const hist = (ordersByItem[i.id] || []).map(o =>
      `  • Ordered ${o.quantity_ordered} on ${new Date(o.ordered_at).toLocaleDateString()}, received ${o.quantity_received}`
    ).join('\n') || '  • No history';
    return `${i.name} (ID:${i.id}) — Current qty: ${i.quantity}, Min threshold: ${i.min_quantity}\n${hist}`;
  }).join('\n\n');

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are an inventory demand forecasting assistant. Analyze restock history and current stock levels.
Return a JSON array of forecasts: [{ "item_id": number, "item_name": string, "estimated_days_until_stockout": number|null, "recommended_reorder_quantity": number, "forecast_notes": string }]
Return ONLY the JSON array.`
      },
      {
        role: 'user',
        content: `Analyze the following items and their restock history:\n\n${itemSummaries}\n\nProvide demand forecasts.`
      }
    ]
  });

  const text = completion.choices[0].message.content;
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  const forecasts = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

  res.json({ forecasts });
});

module.exports = router;
