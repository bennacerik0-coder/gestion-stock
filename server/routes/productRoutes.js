const express = require('express');
const router = express.Router();
const { list, getById, create, update, remove, updatePhoto, getBarcode, getLowStock, uploadMiddleware } = require('../controllers/productController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/low-stock', authenticate, getLowStock);
router.get('/', authenticate, list);
router.get('/:id', authenticate, getById);
router.get('/:id/barcode', authenticate, getBarcode);
router.post('/', authenticate, authorize('admin', 'manager', 'operator'), create);
router.put('/:id', authenticate, authorize('admin', 'manager'), update);
router.delete('/:id', authenticate, authorize('admin'), remove);
router.post('/:id/photo', authenticate, authorize('admin', 'manager'), uploadMiddleware, updatePhoto);

module.exports = router;
