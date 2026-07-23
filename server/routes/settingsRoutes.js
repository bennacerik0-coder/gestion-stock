const express = require('express');
const router = express.Router();
const { getSettings, updateCompany, updateDefaults, backupDatabase } = require('../controllers/settingsController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.get('/', getSettings);
router.put('/company', updateCompany);
router.put('/defaults', updateDefaults);
router.get('/backup', backupDatabase);

module.exports = router;
