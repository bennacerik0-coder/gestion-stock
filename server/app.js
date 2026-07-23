const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, message: { message: 'Trop de tentatives. Reessayez dans 15 minutes.' } });

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/v1/auth', authLimiter, require('./routes/authRoutes'));
app.use('/api/v1/categories', require('./routes/categoryRoutes'));
app.use('/api/v1/products', require('./routes/productRoutes'));
app.use('/api/v1/suppliers', require('./routes/supplierRoutes'));
app.use('/api/v1/stock-movements', require('./routes/stockMovementRoutes'));
app.use('/api/v1/purchase-orders', require('./routes/purchaseOrderRoutes'));
app.use('/api/v1/users', require('./routes/userRoutes'));
app.use('/api/v1/settings', require('./routes/settingsRoutes'));
app.use('/api/v1/audit-logs', require('./routes/auditLogRoutes'));
app.use('/api/v1/alerts', require('./routes/alertRoutes'));
app.use('/api/v1/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/v1/export', require('./routes/exportRoutes'));

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({ message: err.message || 'Erreur serveur' });
});

module.exports = app;
