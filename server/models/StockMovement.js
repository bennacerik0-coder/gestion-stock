const mongoose = require('mongoose');

const stockMovementSchema = new mongoose.Schema({
  movementNumber: { type: String, required: true, unique: true },
  type:           { type: String, required: true, enum: ['entry', 'exit'] },
  reason:         { type: String, required: true, enum: ['purchase', 'return', 'adjustment_up', 'transfer_in', 'sale', 'consumption', 'damage', 'adjustment_down', 'transfer_out'] },
  product:        { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity:       { type: Number, required: true, min: 1 },
  unitPrice:      { type: Number, required: true, min: 0 },
  totalValue:     { type: Number, required: true },
  reference:      { type: String, default: '' },
  notes:          { type: String, default: '' },
  performedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  movementDate:   { type: Date, default: Date.now },
}, { timestamps: true });

stockMovementSchema.index({ product: 1, movementDate: -1 });
stockMovementSchema.index({ type: 1, movementDate: -1 });

module.exports = mongoose.model('StockMovement', stockMovementSchema);
