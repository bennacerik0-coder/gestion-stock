const mongoose = require('mongoose');

const purchaseOrderSchema = new mongoose.Schema({
  orderNumber:  { type: String, required: true, unique: true },
  supplier:     { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  items: [{
    product:    { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity:   { type: Number, required: true, min: 1 },
    unitPrice:  { type: Number, required: true, min: 0 },
    receivedQuantity: { type: Number, default: 0 },
    total:      { type: Number, required: true },
  }],
  totalAmount:  { type: Number, required: true },
  status:       { type: String, required: true, enum: ['draft', 'pending', 'approved', 'ordered', 'partial', 'received', 'cancelled'], default: 'draft' },
  expectedDate: { type: Date, default: null },
  receivedDate: { type: Date, default: null },
  notes:        { type: String, default: '' },
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  approvedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
