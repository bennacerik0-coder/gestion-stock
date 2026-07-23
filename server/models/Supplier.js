const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  contactName: { type: String, default: '' },
  email:       { type: String, default: '', lowercase: true },
  phone:       { type: String, default: '' },
  address:     { type: String, default: '' },
  website:     { type: String, default: '' },
  notes:       { type: String, default: '' },
  isActive:    { type: Boolean, default: true },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Supplier', supplierSchema);
