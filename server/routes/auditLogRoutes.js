const express = require('express');
const router = express.Router();
const { listLogs } = require('../controllers/auditLogController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', authorize('admin', 'manager'), listLogs);

module.exports = router;
