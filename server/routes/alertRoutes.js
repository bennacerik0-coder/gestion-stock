const express = require('express');
const router = express.Router();
const { list, unreadCount, markRead, markAllRead, remove } = require('../controllers/alertController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/unread-count', authenticate, unreadCount);
router.get('/', authenticate, list);
router.put('/read-all', authenticate, markAllRead);
router.put('/:id/read', authenticate, markRead);
router.delete('/:id', authenticate, authorize('admin'), remove);

module.exports = router;
