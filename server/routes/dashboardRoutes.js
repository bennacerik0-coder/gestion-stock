const express = require('express');
const router = express.Router();
const { stats, recentMovements, stockByCategory, movementsByDay, lowStockProducts } = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');

router.get('/stats', authenticate, stats);
router.get('/recent-movements', authenticate, recentMovements);
router.get('/stock-by-category', authenticate, stockByCategory);
router.get('/movements-by-day', authenticate, movementsByDay);
router.get('/low-stock', authenticate, lowStockProducts);

module.exports = router;
