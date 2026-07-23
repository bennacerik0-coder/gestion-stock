const express = require('express');
const router = express.Router();
const { list, getById, create, update, remove } = require('../controllers/categoryController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, list);
router.get('/:id', authenticate, getById);
router.post('/', authenticate, authorize('admin', 'manager'), create);
router.put('/:id', authenticate, authorize('admin', 'manager'), update);
router.delete('/:id', authenticate, authorize('admin'), remove);

module.exports = router;
