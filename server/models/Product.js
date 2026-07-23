const mongoose = require('mongoose');
require('./Supplier');
require('./Category');

const productSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  sku:          { type: String, required: true, unique: true, uppercase: true, trim: true },
  barcode:      { type: String, default: null },
  description:  { type: String, default: '' },
  category:     { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  supplier:     { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', default: null },
  unit:         { type: String, required: true, enum: ['piece', 'kg', 'g', 'L', 'm', 'box', 'pack'], default: 'piece' },
  stock:        { type: Number, required: true, default: 0, min: 0 },
  minStock:     { type: Number, required: true, default: 10, min: 0 },
  maxStock:     { type: Number, required: true, default: 100, min: 0 },
  buyingPrice:  { type: Number, required: true, min: 0 },
  sellingPrice: { type: Number, required: true, min: 0 },
  photo:        { type: String, default: null },
  location:     { type: String, default: '' },
  isActive:     { type: Boolean, default: true },
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

productSchema.index({ name: 'text', sku: 'text', description: 'text' });

productSchema.virtual('stockStatus').get(function() {
  if (this.stock === 0) return 'out_of_stock';
  if (this.stock <= this.minStock) return 'low';
  if (this.stock >= this.maxStock) return 'overstocked';
  return 'normal';
});

productSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Product', productSchema);
