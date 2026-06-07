require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('express-async-errors');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());

// Routes
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/items',      require('./routes/items'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/suppliers',  require('./routes/suppliers'));
app.use('/api/pos',        require('./routes/pos'));
app.use('/api/purchases',  require('./routes/purchases'));
app.use('/api/expenses',   require('./routes/expenses'));
app.use('/api/dashboard',  require('./routes/dashboard'));
app.use('/api/users',      require('./routes/users'));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Inventory Management Server running on port ${PORT}`));
