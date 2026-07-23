const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  action: { type: String, enum: ['create', 'update', 'delete', 'login', 'export', 'backup', 'receive', 'status_change'], required: true },
  entity: { type: String, required: true },
  entityId: { type: String, default: '' },
  entityName: { type: String, default: '' },
  details: { type: String, default: '' },
  ip: { type: String, default: '' }
}, { timestamps: true });

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ entity: 1, createdAt: -1 });
auditLogSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
