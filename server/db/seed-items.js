require('dotenv').config();
const pool = require('./index');

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── Categories ─────────────────────────────────────────────────────────────
    const categoriesData = [
      { name: 'Electronics',       description: 'Electronic devices, components, and accessories' },
      { name: 'Office Supplies',   description: 'Stationery, paper, pens, and office consumables' },
      { name: 'Furniture',         description: 'Desks, chairs, shelving, and workspace furniture' },
      { name: 'Tools & Equipment', description: 'Hand tools, power tools, and maintenance equipment' },
      { name: 'Safety Equipment',  description: 'PPE, first aid, fire safety, and protective gear' },
    ];

    const categoryIds = {};
    for (const cat of categoriesData) {
      const res = await client.query(
        `INSERT INTO categories (name, description)
         VALUES ($1, $2)
         ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
         RETURNING id, name`,
        [cat.name, cat.description]
      );
      categoryIds[res.rows[0].name] = res.rows[0].id;
    }
    console.log('✓ Categories seeded');

    // ── Suppliers ──────────────────────────────────────────────────────────────
    const suppliersData = [
      { name: 'TechSource Global',   email: 'orders@techsource.com',   phone: '+1-800-555-0101', address: '123 Silicon Ave, San Jose, CA 95110' },
      { name: 'OfficeWorld Supplies', email: 'supply@officeworld.com',  phone: '+1-800-555-0202', address: '456 Business Park Dr, Chicago, IL 60601' },
      { name: 'SafetyFirst Inc.',     email: 'sales@safetyfirst.com',   phone: '+1-800-555-0303', address: '789 Industrial Blvd, Houston, TX 77001' },
    ];

    const supplierIds = {};
    for (const sup of suppliersData) {
      const res = await client.query(
        `INSERT INTO suppliers (name, email, phone, address)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name`,
        [sup.name, sup.email, sup.phone, sup.address]
      );
      supplierIds[res.rows[0].name] = res.rows[0].id;
    }
    console.log('✓ Suppliers seeded');

    // ── Inventory Items ────────────────────────────────────────────────────────
    const itemsData = [
      // Electronics
      { name: 'Laptop - Dell Latitude 5540',  sku: 'ELEC-001', description: '15.6" FHD Intel Core i7, 16GB RAM, 512GB SSD',             category: 'Electronics',       supplier: 'TechSource Global',    quantity: 25,  min_quantity: 5,  unit_price: 1299.99, status: 'in_stock',    location: 'Warehouse A - Shelf 1' },
      { name: 'Wireless Mouse - Logitech MX', sku: 'ELEC-002', description: 'Ergonomic wireless mouse, multi-device, USB-C charging',   category: 'Electronics',       supplier: 'TechSource Global',    quantity: 3,   min_quantity: 10, unit_price: 99.99,   status: 'low_stock',   location: 'Warehouse A - Shelf 2' },
      { name: 'USB-C Hub 7-in-1',             sku: 'ELEC-003', description: 'HDMI 4K, 3x USB-A, SD card, USB-C PD 100W',                category: 'Electronics',       supplier: 'TechSource Global',    quantity: 0,   min_quantity: 8,  unit_price: 49.99,   status: 'ordered',     location: 'Warehouse A - Shelf 2' },
      { name: 'Monitor - 27" 4K IPS',         sku: 'ELEC-004', description: '27-inch 4K UHD IPS panel, 60Hz, HDR400',                  category: 'Electronics',       supplier: 'TechSource Global',    quantity: 12,  min_quantity: 3,  unit_price: 449.99,  status: 'in_stock',    location: 'Warehouse A - Shelf 3' },
      { name: 'Keyboard - Mechanical TKL',    sku: 'ELEC-005', description: 'Tenkeyless mechanical keyboard, Cherry MX Brown switches', category: 'Electronics',       supplier: 'TechSource Global',    quantity: 2,   min_quantity: 5,  unit_price: 129.99,  status: 'low_stock',   location: 'Warehouse A - Shelf 2' },

      // Office Supplies
      { name: 'A4 Copy Paper (Box of 5 Reams)', sku: 'OFF-001', description: '80gsm white copy paper, 500 sheets/ream, 5 reams/box',  category: 'Office Supplies',   supplier: 'OfficeWorld Supplies', quantity: 40,  min_quantity: 10, unit_price: 29.99,   status: 'in_stock',    location: 'Warehouse B - Shelf 1' },
      { name: 'Ballpoint Pens (Box of 50)',      sku: 'OFF-002', description: 'Blue ink ballpoint pens, medium point',                 category: 'Office Supplies',   supplier: 'OfficeWorld Supplies', quantity: 4,   min_quantity: 5,  unit_price: 14.99,   status: 'low_stock',   location: 'Warehouse B - Shelf 2' },
      { name: 'Whiteboard Markers Set',          sku: 'OFF-003', description: '12-pack assorted colors, dry-erase, chisel tip',        category: 'Office Supplies',   supplier: 'OfficeWorld Supplies', quantity: 18,  min_quantity: 6,  unit_price: 19.99,   status: 'in_stock',    location: 'Warehouse B - Shelf 2' },
      { name: 'Stapler - Heavy Duty',            sku: 'OFF-004', description: 'Staples up to 100 sheets, includes 5000 staples',       category: 'Office Supplies',   supplier: 'OfficeWorld Supplies', quantity: 1,   min_quantity: 3,  unit_price: 39.99,   status: 'low_stock',   location: 'Warehouse B - Shelf 3' },

      // Furniture
      { name: 'Ergonomic Office Chair',          sku: 'FURN-001', description: 'Lumbar support, adjustable armrests, mesh back, 5-year warranty', category: 'Furniture', supplier: 'OfficeWorld Supplies', quantity: 8,   min_quantity: 2,  unit_price: 399.99,  status: 'in_stock',    location: 'Warehouse C - Bay 1' },
      { name: 'Standing Desk - 60" Electric',    sku: 'FURN-002', description: '60x30" electric height-adjustable desk, dual motor',              category: 'Furniture', supplier: 'OfficeWorld Supplies', quantity: 3,   min_quantity: 2,  unit_price: 699.99,  status: 'in_stock',    location: 'Warehouse C - Bay 2' },
      { name: 'Fax Machine (Discontinued)',      sku: 'FURN-003', description: 'Fax machine — being phased out',                                   category: 'Office Supplies', supplier: 'OfficeWorld Supplies', quantity: 0, min_quantity: 0, unit_price: 89.99, status: 'discontinued', location: 'Storage' },

      // Tools & Equipment
      { name: 'Power Drill - 18V Cordless',      sku: 'TOOL-001', description: '18V brushless motor, 2-speed, includes 2 batteries & charger', category: 'Tools & Equipment', supplier: 'SafetyFirst Inc.', quantity: 6,   min_quantity: 2,  unit_price: 179.99,  status: 'in_stock',    location: 'Warehouse D - Rack 1' },
      { name: 'Cable Tester - Network',          sku: 'TOOL-002', description: 'RJ45/RJ11 network cable tester with LED indicators',             category: 'Tools & Equipment', supplier: 'TechSource Global', quantity: 2,   min_quantity: 3,  unit_price: 34.99,   status: 'low_stock',   location: 'Warehouse D - Rack 2' },

      // Safety Equipment
      { name: 'First Aid Kit - 200 Piece',       sku: 'SAFE-001', description: 'OSHA compliant, wall-mountable, for up to 25 people',   category: 'Safety Equipment',  supplier: 'SafetyFirst Inc.',    quantity: 5,   min_quantity: 3,  unit_price: 59.99,   status: 'in_stock',    location: 'Warehouse E - Cabinet 1' },
    ];

    for (const item of itemsData) {
      await client.query(
        `INSERT INTO items (name, sku, description, category_id, supplier_id, quantity, min_quantity, unit_price, status, location)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (sku) DO NOTHING`,
        [
          item.name, item.sku, item.description,
          categoryIds[item.category],
          supplierIds[item.supplier],
          item.quantity, item.min_quantity, item.unit_price,
          item.status, item.location
        ]
      );
    }
    console.log('✓ Inventory items seeded (15 items)');

    await client.query('COMMIT');
    console.log('\n✅ Seed complete! Database is ready.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

seed();
