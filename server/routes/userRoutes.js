const express = require('express');
const router = express.Router();
const { listUsers, createUser, updateUser, resetPassword, deleteUser } = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', authorize('admin'), listUsers);
router.post('/', authorize('admin'), createUser);
router.put('/:id', authorize('admin'), updateUser);
router.put('/:id/reset-password', authorize('admin'), resetPassword);
router.delete('/:id', authorize('admin'), deleteUser);

module.exports = router;
