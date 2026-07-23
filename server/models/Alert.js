const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  type:     { type: String, required: true, enum: ['low_stock', 'overstock', 'expiry', 'custom'] },
  severity: { type: String, required: true, enum: ['info', 'warning', 'critical'] },
  product:  { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
  message:  { type: String, required: true },
  isRead:   { type: Boolean, default: false },
  readBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

module.exports = mongoose.model('Alert', alertSchema);
