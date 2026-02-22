# 📦 InventoryOS — Smart Inventory Management System

A full-stack inventory management system with AI-powered insights, role-based access control, restock order management, and a modern React UI.

> **Live Demo:** [https://inventory-management-system-aspire-beta.vercel.app]

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [1. Clone the Repository](#1-clone-the-repository)
  - [2. Set Up the Database](#2-set-up-the-database)
  - [3. Configure Environment Variables](#3-configure-environment-variables)
  - [4. Install Dependencies & Run](#4-install-dependencies--run)
- [Seeding the Database](#seeding-the-database)
- [User Roles & Permissions](#user-roles--permissions)
- [API Endpoints](#api-endpoints)
- [AI Features](#ai-features)
- [Extra Features](#extra-features)
- [Project Structure](#project-structure)
- [Screenshots](#screenshots)

---

## Features

### Core
- **Item Management** — Add, edit, and delete inventory items with rich metadata (name, SKU, description, category, supplier, quantity, min threshold, unit price, status, image, location).
- **Stock Tracking** — Real-time stock levels with automatic status computation (`in_stock`, `low_stock`, `ordered`, `discontinued`) based on quantity vs. minimum threshold.
- **Quantity Adjustment** — Increase or decrease item quantities with audit notes; all changes are logged in the item history.
- **Search & Filter** — Full-text search by name/description, filter by status, category, and supplier with paginated results.
- **Restock Orders** — Create, track, receive, and cancel restock orders. Receiving an order automatically updates item quantities and status.
- **Admin Dashboard** — Manage items, categories, suppliers, and user roles from a tabbed admin panel.
- **Authentication & SSO** — Powered by [Clerk](https://clerk.com) with Google/GitHub SSO, email/password, and session management.
- **Role-Based Access Control** — Three roles (`admin`, `manager`, `staff`) with granular permissions.

### AI-Powered
- **AI Item Insights** — Generate actionable insights for any inventory item (stock health, reorder timing, cost optimization, risks) using GPT-4o-mini.
- **AI Restock Suggestions** — Analyze all low-stock and on-order items to produce a prioritized restock plan with quantities and urgency levels.
- **AI Category Classification** — Automatically suggest the best category for a new item based on its name and description.
- **AI Demand Forecasting** — Analyze restock history to forecast days until stockout and recommended reorder quantities.
- **AI Chat Assistant** — Conversational inventory assistant that helps with stock queries, reorder advice, and inventory management best practices.

### Extra / Creative
- **Audit Trail** — Every item change (create, update, quantity change, status change) is logged with old/new values, user, and timestamp.
- **Category & Supplier Management** — Full CRUD for categories and suppliers with item count tracking.
- **Visual Stock Indicators** — Color-coded progress bars showing stock level relative to minimum threshold (green/yellow/red).
- **Dashboard Stats** — At-a-glance stat cards showing total items, in-stock, low-stock, and on-order counts.
- **Responsive UI** — Built with Tailwind CSS for a clean, modern experience on all screen sizes.
- **Skeleton Loading** — Animated loading placeholders for a polished UX.
- **Toast Notifications** — Real-time feedback for all user actions via react-hot-toast.

---

## Tech Stack

| Layer        | Technology                                                                 |
|--------------|---------------------------------------------------------------------------|
| **Frontend** | React 18, React Router v7, Tailwind CSS, Vite, Lucide Icons              |
| **Backend**  | Node.js, Express, Helmet, CORS                                           |
| **Database** | PostgreSQL (with full-text search GIN indexes)                            |
| **Auth**     | Clerk (SSO with Google/GitHub, role-based access via `publicMetadata`)    |
| **AI**       | OpenAI GPT-4o-mini (insights, restock suggestions, classification, forecasting, chat) |
| **Storage**  | AWS S3 (image uploads)                                                    |
| **Other**    | Axios, react-hot-toast                                                    |

---

## Architecture

```
┌─────────────┐       ┌──────────────┐       ┌────────────┐
│   React SPA │──────▶│  Express API │──────▶│ PostgreSQL │
│  (Vite)     │ Clerk │  (Node.js)   │  pg   │            │
│  Port 5173  │ JWT   │  Port 4000   │       │            │
└─────────────┘       └──────┬───────┘       └────────────┘
                             │
                    ┌────���───┴────────┐
                    │   OpenAI API    │
                    │   AWS S3        │
                    └─────────────────┘
```

- The **client** authenticates via Clerk and sends a JWT Bearer token with every API request.
- The **server** verifies the token using `@clerk/express`, syncs the user to the local DB, and checks role permissions.
- **AI features** call OpenAI's API server-side, keeping the API key secure.
- **Item images** are stored via AWS S3.

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **PostgreSQL** ≥ 14 (local or hosted, e.g. Neon, Supabase, Railway)
- **Clerk account** — [clerk.com](https://clerk.com) (free tier works)
- **OpenAI API key** — [platform.openai.com](https://platform.openai.com)
- *(Optional)* **AWS S3 bucket** — for item image uploads

### 1. Clone the Repository

```bash
git clone https://github.com/younissjaafill/inventory-management-system-.git
cd inventory-management-system-
```

### 2. Set Up the Database

Create a PostgreSQL database and run the schema:

```bash
psql -U postgres -c "CREATE DATABASE inventory_db;"
psql -U postgres -d inventory_db -f server/db/schema.sql
```

Or if using a hosted provider, paste the contents of `server/db/schema.sql` into their SQL editor.

The schema creates the following tables:
- `users` — synced from Clerk
- `categories` — item categories
- `suppliers` — supplier directory
- `items` — inventory items with status tracking
- `item_history` — audit trail for all item changes
- `restock_orders` — restock order lifecycle management

### 3. Configure Environment Variables

**Server** — create `server/.env`:

```env
DATABASE_URL=postgresql://user:password@host:5432/inventory_db
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxx
CLIENT_URL=http://localhost:5173
OPENAI_API_KEY=sk-xxxxxxxxxxxxx
PORT=4000
```

**Client** — create `client/.env`:

```env
VITE_API_URL=http://localhost:4000
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
```

### 4. Install Dependencies & Run

```bash
# Terminal 1 — Server
cd server
npm install
npm run dev

# Terminal 2 — Client
cd client
npm install
npm run dev
```

The app will be available at **http://localhost:5173**.

---

## Seeding the Database

A seed script populates the database with sample categories, suppliers, and 15 inventory items across multiple categories:

```bash
cd server
node db/seed-items.js
```

Seeded data includes:
- **5 Categories:** Electronics, Office Supplies, Furniture, Tools & Equipment, Safety Equipment
- **3 Suppliers:** TechSource Global, OfficeWorld Supplies, SafetyFirst Inc.
- **15 Items:** Laptops, monitors, keyboards, office supplies, furniture, tools, safety equipment — with varied stock levels and statuses

---

## User Roles & Permissions

| Action                          | `staff` | `manager` | `admin` |
|---------------------------------|:-------:|:---------:|:-------:|
| Browse & search items           | ✅      | ✅        | ✅      |
| View item details & history     | ✅      | ✅        | ✅      |
| Adjust item quantities          | ✅      | ✅        | ✅      |
| Use AI chat & insights          | ✅      | ✅        | ✅      |
| Add / edit items                | ❌      | ✅        | ✅      |
| Manage categories & suppliers   | ❌      | ✅        | ✅      |
| Create & manage restock orders  | ❌      | ✅        | ✅      |
| Override item status            | ❌      | ✅        | ✅      |
| Delete items                    | ❌      | ❌        | ✅      |
| Delete categories & suppliers   | ❌      | ❌        | ✅      |
| Cancel restock orders           | ❌      | ❌        | ✅      |
| Manage user roles               | ���      | ❌        | ✅      |

Roles are stored in Clerk's `publicMetadata` and synced to the local `users` table. The first user defaults to `staff` — promote to `admin` via the Clerk dashboard or the admin panel once one admin exists.

---

## API Endpoints

### Items
| Method   | Endpoint                        | Auth        | Description                                      |
|----------|---------------------------------|-------------|--------------------------------------------------|
| `GET`    | `/api/items`                    | Authenticated | List/search items (`?q=`, `?category_id=`, `?status=`, `?supplier_id=`, `?page=`, `?limit=`) |
| `GET`    | `/api/items/:id`                | Authenticated | Get item details with category, supplier & recent history |
| `POST`   | `/api/items`                    | Admin/Manager | Create a new item                                |
| `PUT`    | `/api/items/:id`                | Admin/Manager | Update an item                                   |
| `PATCH`  | `/api/items/:id/quantity`       | All roles     | Adjust item quantity (positive or negative)      |
| `PATCH`  | `/api/items/:id/status`         | Admin/Manager | Manually override item status                    |
| `DELETE` | `/api/items/:id`                | Admin         | Delete an item                                   |

### Categories
| Method   | Endpoint                  | Auth        | Description                              |
|----------|---------------------------|-------------|------------------------------------------|
| `GET`    | `/api/categories`         | Authenticated | List all categories with item counts   |
| `POST`   | `/api/categories`         | Admin/Manager | Create a category                      |
| `PUT`    | `/api/categories/:id`     | Admin/Manager | Update a category                      |
| `DELETE` | `/api/categories/:id`     | Admin         | Delete a category (only if no items)   |

### Suppliers
| Method   | Endpoint                  | Auth        | Description                              |
|----------|---------------------------|-------------|------------------------------------------|
| `GET`    | `/api/suppliers`          | Authenticated | List all suppliers with item counts    |
| `GET`    | `/api/suppliers/:id`      | Authenticated | Supplier details with their items      |
| `POST`   | `/api/suppliers`          | Admin/Manager | Create a supplier                      |
| `PUT`    | `/api/suppliers/:id`      | Admin/Manager | Update a supplier                      |
| `DELETE` | `/api/suppliers/:id`      | Admin         | Delete a supplier                      |

### Restock Orders
| Method   | Endpoint                        | Auth        | Description                                    |
|----------|---------------------------------|-------------|------------------------------------------------|
| `GET`    | `/api/orders`                   | Admin/Manager | List all orders (`?status=`, `?item_id=`)    |
| `GET`    | `/api/orders/:id`               | Admin/Manager | Get order details                            |
| `POST`   | `/api/orders`                   | Admin/Manager | Create restock order (sets item to `ordered`)|
| `PUT`    | `/api/orders/:id`               | Admin/Manager | Update order details                         |
| `PATCH`  | `/api/orders/:id/receive`       | Admin/Manager | Mark received — adds qty to item stock       |
| `PATCH`  | `/api/orders/:id/cancel`        | Admin         | Cancel an order                              |

### Users
| Method   | Endpoint                    | Auth  | Description              |
|----------|-----------------------------|-------|--------------------------|
| `GET`    | `/api/users`                | Admin | List all users           |
| `PUT`    | `/api/users/:userId/role`   | Admin | Update a user's role     |

### AI
| Method   | Endpoint                        | Auth          | Description                                    |
|----------|---------------------------------|---------------|------------------------------------------------|
| `POST`   | `/api/ai/insights/:itemId`      | Authenticated | Generate AI insights for an item               |
| `POST`   | `/api/ai/restock-suggestions`   | Authenticated | Get prioritized restock plan for low-stock items |
| `POST`   | `/api/ai/classify`              | Authenticated | Auto-classify an item into a category          |
| `POST`   | `/api/ai/chat`                  | Authenticated | Chat with the AI inventory assistant           |
| `POST`   | `/api/ai/forecast`              | Authenticated | Demand forecasting for items                   |

---

## AI Features

### 1. AI Item Insights
On any item's detail page, click **"Generate Insights"** to get AI-powered analysis including stock health assessment, reorder timing recommendations, cost optimization tips, and risk identification. Insights are persisted in the database so they only need to be generated once.

### 2. AI Restock Suggestions
From the AI Assistant page, run the restock analyzer to get a prioritized restock plan. Items are ranked by urgency (`critical`, `high`, `medium`) with suggested reorder quantities and reasoning.

### 3. AI Category Classification
Enter an item name and optional description to have the AI suggest the best matching category from your existing categories, with a confidence level and explanation.

### 4. AI Demand Forecasting
Analyze restock order history to forecast estimated days until stockout and recommended reorder quantities for each item.

### 5. AI Chat Assistant
A conversational chatbot with full conversation history that has real-time awareness of your inventory snapshot. It can help users:
- Check stock levels and find items
- Get restocking advice and reorder recommendations
- Understand inventory management best practices
- Answer questions about suppliers and categories

---

## Extra Features

- **📋 Audit Trail** — Complete history of every item change with old/new values, user attribution, and timestamps.
- **📊 Dashboard Stats** — At-a-glance stat cards for total items, in-stock, low-stock, and on-order counts.
- **📦 Restock Order Lifecycle** — Full order management: create → ship → receive → auto-update inventory, or cancel.
- **🏷️ Category & Supplier Management** — Organize items by category and supplier with full CRUD and item count tracking.
- **📈 Stock Level Indicators** — Visual progress bars color-coded by stock health (green/yellow/red).
- **🔍 Full-Text Search** — PostgreSQL GIN indexes on item name and description for fast search.
- **🔄 Auto Status Computation** — Item status automatically updates based on quantity vs. minimum threshold.
- **🎨 Skeleton Loading** — Animated loading placeholders for a polished UX.
- **🔔 Toast Notifications** — Real-time feedback for all user actions via react-hot-toast.
- **📱 Responsive Design** — Clean, modern UI that works on all screen sizes.

---

## Project Structure

```
inventory-management-system-/
├── client/                         # React frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── AddEditItemModal.jsx #   Add/edit item form modal
│   │   │   ├── Navbar.jsx           #   Top navigation with role badge
│   │   │   └── StatusBadge.jsx      #   Color-coded status indicator
│   │   ├── hooks/
│   │   │   └── useApi.js            #   Axios instance with Clerk auth
│   │   ├── lib/
│   │   │   └── api.js               #   Axios config & interceptor
│   │   ├── pages/
│   │   │   ├── AdminPage.jsx        #   Admin panel (items, categories, suppliers, users)
│   │   │   ├── AIChatPage.jsx       #   AI chat + restock suggestions + classify + forecast
│   │   │   ├── InventoryPage.jsx    #   Main inventory catalog with search/filter/stats
│   │   │   ├── ItemDetailPage.jsx   #   Single item view + AI insights + history + qty adjust
│   │   │   ├── OrdersPage.jsx       #   Restock order management
│   │   │   └── SignInPage.jsx       #   Clerk sign-in page
│   │   ├── App.jsx                  # Route definitions & auth guards
│   │   └── main.jsx                 # Entry point with Clerk & Router providers
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── server/                          # Express backend
│   ├── db/
│   │   ├── index.js                 # PostgreSQL connection pool
│   │   ├── schema.sql               # Full database schema with indexes
│   │   └── seed-items.js            # Seed script (categories, suppliers, items)
│   ├── middleware/
│   │   └── auth.js                  # Clerk auth, role checks, user sync
│   ├── routes/
│   │   ├── ai.js                    # AI insights, restock, classify, forecast, chat
│   │   ├── categories.js            # Category CRUD
│   │   ├── items.js                 # Item CRUD + quantity adjust + status override
│   │   ├── orders.js                # Restock order lifecycle
│   │   ├── suppliers.js             # Supplier CRUD
│   │   └── users.js                 # User listing & role management
│   ├── index.js                     # Express app entry point
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## Screenshots

*(Coming soon)*

---

## License

This project was built as part of a coding challenge. Feel free to use it as a reference.
