# 📚 LibraryOS — Mini Library Management System

A full-stack library management system with AI-powered features, role-based access control, and a modern React UI.

> **Live Demo:** [https://library-management-system-beta-one.vercel.app/]

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
- **Book Management** — Add, edit, and delete books with rich metadata (title, author, ISBN, genre, description, cover image, published year, total copies).
- **Check-in / Check-out** — Borrow books with selectable rental periods (2 weeks, 1 month, 2 months, 3 months) and return them when done.
- **Search & Filter** — Find books by title, author, or ISBN. Filter by genre and availability.
- **Admin Dashboard** — Manage books, view all checkouts (with overdue highlighting), and manage user roles.
- **Authentication & SSO** — Powered by [Clerk](https://clerk.com) with Google/GitHub SSO, email/password, and session management.
- **Role-Based Access Control** — Three roles (`admin`, `librarian`, `member`) with granular permissions.

### AI-Powered
- **AI Book Summaries** — Generate concise catalog summaries for any book using GPT-4o-mini.
- **AI Recommendations** — Get personalized book recommendations based on natural language prompts.
- **AI Chat Assistant** — Conversational library assistant that helps users find books, understand genres, and get reading suggestions.

### Extra / Creative
- **Shopping Cart System** — Add multiple books to a cart, choose borrow periods, review totals, and checkout in one go.
- **WhatsApp Checkout Integration** — After checkout, a pre-formatted WhatsApp message is generated with all borrow details for easy communication with the library.
- **Borrow Pricing Plans** — Tiered pricing based on borrow duration ($2 for 2 weeks up to $12 for 3 months).
- **External Book Search** — Admins/librarians can search the Big Book API to discover and import real books into the catalog.
- **Waitlist** — When no copies are available, users are automatically added to a waitlist.
- **Overdue Detection** — Active checkouts past their due date are flagged as overdue in both user and admin views.
- **Responsive UI** — Built with Tailwind CSS for a clean, modern experience on all screen sizes.

---

## Tech Stack

| Layer        | Technology                                                                 |
|--------------|---------------------------------------------------------------------------|
| **Frontend** | React 18, React Router v7, Tailwind CSS, Vite, Lucide Icons              |
| **Backend**  | Node.js, Express, Helmet, CORS                                           |
| **Database** | PostgreSQL (with full-text search indexes)                                |
| **Auth**     | Clerk (SSO with Google/GitHub, role-based access via `publicMetadata`)    |
| **AI**       | OpenAI GPT-4o-mini (summaries, recommendations, chat)                    |
| **APIs**     | Big Book API (external book search), Open Library (seed data)             |
| **Other**    | Axios, react-hot-toast, WhatsApp Web API                                  |

---

## Architecture

```
┌─────────────┐       ┌──────────────┐       ┌────────────┐
│   React SPA │──────▶│  Express API │──────▶│ PostgreSQL │
│  (Vite)     │ Clerk │  (Node.js)   │  pg   │            │
│  Port 5173  │ JWT   │  Port 4000   │       │            │
└─────────────┘       └──────┬───────┘       └────────────┘
                             │
                    ┌────────┴────────┐
                    │   OpenAI API    │
                    │  Big Book API   │
                    └─────────────────┘
```

- The **client** authenticates via Clerk and sends a JWT Bearer token with every API request.
- The **server** verifies the token using `@clerk/express`, syncs the user to the local DB, and checks role permissions.
- **AI features** call OpenAI's API server-side, keeping the API key secure.

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **PostgreSQL** ≥ 14 (local or hosted, e.g. Neon, Supabase, Railway)
- **Clerk account** — [clerk.com](https://clerk.com) (free tier works)
- **OpenAI API key** — [platform.openai.com](https://platform.openai.com)
- *(Optional)* **Big Book API key** — [bigbookapi.com](https://bigbookapi.com) (for external book search)

### 1. Clone the Repository

```bash
git clone https://github.com/younissjaafill/library-management-system.git
cd library-management-system
```

### 2. Set Up the Database

Create a PostgreSQL database and run the schema:

```bash
psql -U postgres -c "CREATE DATABASE library_db;"
psql -U postgres -d library_db -f server/db/schema.sql
```

Or if using a hosted provider, paste the contents of `server/db/schema.sql` into their SQL editor.

### 3. Configure Environment Variables

**Server** — create `server/.env`:

```env
DATABASE_URL=postgresql://user:password@host:5432/library_db
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxx
CLIENT_URL=http://localhost:5173
OPENAI_API_KEY=sk-xxxxxxxxxxxxx
BOOK_API=your-bigbookapi-key        # optional
PORT=4000
```

**Client** — create `client/.env`:

```env
VITE_API_URL=http://localhost:4000
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
VITE_LIBRARY_WHATSAPP=212600000000   # optional, WhatsApp number for checkout messages
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

A seed script fetches 10 well-known books from the Open Library API and inserts them with cover images:

```bash
cd server
node db/seed-books.js
```

Books seeded include: *Harry Potter*, *The Great Gatsby*, *Sapiens*, *Dune*, *1984*, *Atomic Habits*, and more.

---

## User Roles & Permissions

| Action                        | `member` | `librarian` | `admin` |
|-------------------------------|:--------:|:-----------:|:-------:|
| Browse & search books         | ✅       | ✅          | ✅      |
| Borrow / return books         | ✅       | ✅          | ✅      |
| Use AI chat & recommendations | ✅       | ✅          | ✅      |
| Generate AI summaries         | ✅       | ✅          | ✅      |
| Add / edit books              | ❌       | ✅          | ✅      |
| Search & import external books| ❌       | ✅          | ✅      |
| Delete books                  | ❌       | ❌          | ✅      |
| View all checkouts            | ❌       | ✅          | ✅      |
| Manage user roles             | ❌       | ❌          | ✅      |

Roles are stored in Clerk's `publicMetadata` and synced to the local `users` table. The first user defaults to `member` — promote to `admin` via the Clerk dashboard or the admin panel once one admin exists.

---

## API Endpoints

### Books
| Method   | Endpoint                        | Auth       | Description                          |
|----------|---------------------------------|------------|--------------------------------------|
| `GET`    | `/api/books`                    | Public     | List/search books (`?q=`, `?genre=`, `?available=true`) |
| `GET`    | `/api/books/:id`                | Public     | Get book details with active borrowers |
| `POST`   | `/api/books`                    | Admin/Lib  | Create a new book                    |
| `PUT`    | `/api/books/:id`                | Admin/Lib  | Update a book                        |
| `DELETE` | `/api/books/:id`                | Admin      | Delete a book                        |
| `GET`    | `/api/books/external/search`    | Admin/Lib  | Search Big Book API                  |
| `GET`    | `/api/books/external/:bookApiId`| Admin/Lib  | Get external book details            |

### Checkouts
| Method   | Endpoint                          | Auth     | Description                    |
|----------|-----------------------------------|----------|--------------------------------|
| `POST`   | `/api/checkouts/checkout/:bookId` | User     | Borrow a book (direct)         |
| `POST`   | `/api/checkouts/return/:id`       | User     | Return a borrowed book         |
| `GET`    | `/api/checkouts/my`               | User     | Get current user's checkouts   |
| `GET`    | `/api/checkouts/all`              | Admin/Lib| Get all checkouts              |

### Cart
| Method   | Endpoint                  | Auth | Description                        |
|----------|---------------------------|------|------------------------------------|
| `GET`    | `/api/cart`               | User | Get cart items                     |
| `POST`   | `/api/cart/add`           | User | Add/update book in cart            |
| `DELETE` | `/api/cart/remove/:bookId`| User | Remove book from cart              |
| `POST`   | `/api/cart/checkout`      | User | Checkout all cart items at once    |

### Users
| Method   | Endpoint                    | Auth  | Description              |
|----------|-----------------------------|-------|--------------------------|
| `GET`    | `/api/users`                | Admin | List all users           |
| `PUT`    | `/api/users/:userId/role`   | Admin | Update a user's role     |

### AI
| Method   | Endpoint                    | Auth | Description                        |
|----------|-----------------------------|------|------------------------------------|
| `POST`   | `/api/ai/summarize/:bookId` | User | Generate AI summary for a book     |
| `POST`   | `/api/ai/recommend`         | User | Get AI book recommendations        |
| `POST`   | `/api/ai/chat`              | User | Chat with the AI library assistant |

---

## AI Features

### 1. AI Book Summaries
On any book's detail page, click **"Generate"** to create a concise 2–3 sentence catalog summary powered by GPT-4o-mini. Summaries are persisted in the database so they only need to be generated once.

### 2. AI Recommendations
In the AI Chat page, every message you send also triggers a recommendation engine that searches the library catalog and returns matching books with personalized reasons — displayed in a side panel.

### 3. AI Chat Assistant
A conversational chatbot that maintains full conversation history. It can help users:
- Find books by mood, topic, or genre
- Get reading suggestions
- Learn about library policies
- Discover new authors

---

## Extra Features

- **🛒 Cart System** — Browse and add multiple books with different borrow periods before checking out in a single transaction.
- **💬 WhatsApp Integration** — After checkout, a formatted message with all borrow details is sent via WhatsApp for easy coordination with the library.
- **💰 Tiered Pricing** — Four borrow plans: 2 Weeks ($2), 1 Month ($5), 2 Months ($9), 3 Months ($12).
- **📖 External Book Import** — Admins can search the Big Book API and import real books with full metadata and cover images.
- **📋 Waitlist** — Automatically join a waitlist when a book has no available copies.
- **⏰ Overdue Tracking** — Overdue books are highlighted in red across user and admin views.
- **🔍 Full-Text Search** — PostgreSQL GIN indexes on title and author for fast search.
- **🎨 Skeleton Loading** — Animated loading placeholders for a polished UX.
- **🔔 Toast Notifications** — Real-time feedback for all user actions via react-hot-toast.

---

## Project Structure

```
library-management-system/
├── client/                     # React frontend (Vite)
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   │   ├── BorrowModal.jsx #   Borrow period selection modal
│   │   │   └── Navbar.jsx      #   Top navigation bar with cart badge
│   │   ├── contexts/
│   │   │   └── CartContext.jsx  #   Global cart state management
│   │   ├── hooks/
│   │   │   └── useApi.js       #   Axios instance with Clerk auth
│   │   ├── lib/
│   │   │   ├── api.js          #   Axios config & interceptor
│   │   │   └── pricing.js      #   Borrow plan definitions
│   │   ├── pages/
│   │   │   ├── AdminPage.jsx   #   Admin dashboard (books, checkouts, users)
│   │   │   ├── AIChatPage.jsx  #   AI chat + recommendations
│   │   │   ├── BookDetailPage.jsx # Single book view + AI summary
│   │   │   ├── BooksPage.jsx   #   Library catalog with search/filter
│   │   │   ├── CartPage.jsx    #   Shopping cart + WhatsApp checkout
│   │   │   ├── MyCheckoutsPage.jsx # User's active & returned books
│   │   │   └── SignInPage.jsx  #   Clerk sign-in page
│   │   ├── App.jsx             # Route definitions & auth guards
│   │   └── main.jsx            # Entry point with Clerk & Router providers
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── server/                     # Express backend
│   ├── db/
│   │   ├── index.js            # PostgreSQL connection pool
│   │   ├── schema.sql          # Full database schema with indexes
│   │   └── seed-books.js       # Seed script (Open Library API)
│   ├── middleware/
│   │   └── auth.js             # Clerk auth, role checks, user sync
│   ├── routes/
│   │   ├── ai.js               # AI summary, recommendations, chat
│   │   ├── books.js            # CRUD + external book search
│   │   ├── cart.js             # Cart management + batch checkout
│   │   ├── checkouts.js        # Borrow & return logic
│   │   └── users.js            # User listing & role management
│   ├── index.js                # Express app entry point
│   └── package.json
│
├── .gitignore
└── README.md
```



## License

This project was built as part of a coding challenge. Feel free to use it as a reference.
