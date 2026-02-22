-- ============================================================
-- Inventory Management System — Database Schema (PostgreSQL)
-- Version 4
-- ============================================================

-- 1. Users (synced from Clerk on first authenticated request)
CREATE TABLE IF NOT EXISTS users (
  id         VARCHAR(255) PRIMARY KEY,            -- Clerk user ID
  email      VARCHAR(255) UNIQUE NOT NULL,
  role       VARCHAR(50)  DEFAULT 'staff',        -- 'admin' | 'manager' | 'staff'
  created_at TIMESTAMP    DEFAULT NOW()
);

-- 2. Categories
CREATE TABLE IF NOT EXISTS categories (
  id          SERIAL        PRIMARY KEY,
  name        VARCHAR(100)  NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMP     DEFAULT NOW()
);

-- 3. Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id         SERIAL        PRIMARY KEY,
  name       VARCHAR(200)  NOT NULL,
  email      VARCHAR(255),
  phone      VARCHAR(50),
  address    TEXT,
  created_at TIMESTAMP     DEFAULT NOW()
);

-- 4. Inventory Items
CREATE TABLE IF NOT EXISTS items (
  id           SERIAL          PRIMARY KEY,
  name         VARCHAR(255)    NOT NULL,
  sku          VARCHAR(100)    UNIQUE,
  description  TEXT,
  category_id  INTEGER         REFERENCES categories(id) ON DELETE SET NULL,
  supplier_id  INTEGER         REFERENCES suppliers(id)  ON DELETE SET NULL,
  quantity     INTEGER         NOT NULL DEFAULT 0,
  min_quantity INTEGER         NOT NULL DEFAULT 5,        -- threshold for low_stock
  unit_price   DECIMAL(10,2),
  status       VARCHAR(20)     NOT NULL DEFAULT 'in_stock'
               CHECK (status IN ('in_stock', 'low_stock', 'ordered', 'discontinued')),
  image_url    TEXT,
  location     VARCHAR(255),
  ai_insights  TEXT,
  created_at   TIMESTAMP       DEFAULT NOW(),
  updated_at   TIMESTAMP       DEFAULT NOW()
);

-- 5. Item History (audit trail)
CREATE TABLE IF NOT EXISTS item_history (
  id         SERIAL        PRIMARY KEY,
  item_id    INTEGER       NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  user_id    VARCHAR(255)  REFERENCES users(id) ON DELETE SET NULL,
  action     VARCHAR(50)   NOT NULL,   -- 'created' | 'updated' | 'quantity_changed' | 'status_changed'
  old_values JSONB,
  new_values JSONB,
  notes      TEXT,
  created_at TIMESTAMP     DEFAULT NOW()
);

-- 6. Restock Orders
CREATE TABLE IF NOT EXISTS restock_orders (
  id                SERIAL        PRIMARY KEY,
  item_id           INTEGER       NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  supplier_id       INTEGER       REFERENCES suppliers(id) ON DELETE SET NULL,
  quantity_ordered  INTEGER       NOT NULL,
  quantity_received INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'shipped', 'received', 'cancelled')),
  ordered_by        VARCHAR(255)  REFERENCES users(id) ON DELETE SET NULL,
  ordered_at        TIMESTAMP     DEFAULT NOW(),
  expected_at       TIMESTAMP,
  received_at       TIMESTAMP,
  notes             TEXT
);

-- ============================================================
-- Indexes
-- ============================================================

-- Full-text search on item name and description
CREATE INDEX IF NOT EXISTS idx_items_name        ON items USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_items_description ON items USING gin(to_tsvector('english', coalesce(description, '')));

-- Fast lookups on items
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_id);
CREATE INDEX IF NOT EXISTS idx_items_supplier ON items(supplier_id);
CREATE INDEX IF NOT EXISTS idx_items_status   ON items(status);
CREATE INDEX IF NOT EXISTS idx_items_sku      ON items(sku);

-- Audit trail lookups
CREATE INDEX IF NOT EXISTS idx_history_item ON item_history(item_id);
CREATE INDEX IF NOT EXISTS idx_history_user ON item_history(user_id);

-- Restock order lookups
CREATE INDEX IF NOT EXISTS idx_orders_item   ON restock_orders(item_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON restock_orders(status);
