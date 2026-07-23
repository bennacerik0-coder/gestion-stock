const express = require('express');
const router = express.Router();
const { productsExcel, movementsExcel, productsPdf, movementsPdf } = require('../controllers/exportController');
const jwt = require('jsonwebtoken');

function authenticateExport(req, res, next) {
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query.token) {
    token = req.query.token;
  }
  if (!token) return res.status(401).json({ message: 'Non autorise' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: 'Token invalide' });
  }
}

router.get('/products', authenticateExport, productsExcel);
router.get('/movements', authenticateExport, movementsExcel);
router.get('/products/pdf', authenticateExport, productsPdf);
router.get('/movements/pdf', authenticateExport, movementsPdf);

module.exports = router;
