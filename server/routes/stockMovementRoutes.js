const express = require('express');
const router = express.Router();
const { list, entry, exit, summary } = require('../controllers/stockMovementController');
const { authenticate } = require('../middleware/auth');

router.get('/summary', authenticate, summary);
router.get('/', authenticate, list);
router.post('/entry', authenticate, entry);
router.post('/exit', authenticate, exit);

module.exports = router;
