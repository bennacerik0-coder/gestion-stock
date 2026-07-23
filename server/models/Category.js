const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name:        { type: String, required: true, unique: true, trim: true },
  description: { type: String, default: '' },
  color:       { type: String, default: '#3b82f6' },
  icon:        { type: String, default: 'folder' },
  isActive:    { type: Boolean, default: true },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);
