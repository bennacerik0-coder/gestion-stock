const AuditLog = require('../models/AuditLog');

async function logAction(req, action, entity, entityId, entityName, details) {
  try {
    await AuditLog.create({
      user: req.user ? req.user.userId : null,
      userName: req.user ? req.user.email : 'system',
      action,
      entity,
      entityId: String(entityId || ''),
      entityName: String(entityName || ''),
      details: details || '',
      ip: req.ip || ''
    });
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
}

module.exports = { logAction };
