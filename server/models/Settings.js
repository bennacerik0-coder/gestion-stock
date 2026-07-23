const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  company: {
    name: { type: String, default: 'Mon Entreprise' },
    address: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    logo: { type: String, default: '' },
    rc: { type: String, default: '' },
    ice: { type: String, default: '' },
    patent: { type: String, default: '' }
  },
  defaults: {
    minStock: { type: Number, default: 10 },
    maxStock: { type: Number, default: 100 },
    currency: { type: String, default: 'MAD' },
    currencySymbol: { type: String, default: 'MAD' }
  },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

settingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model('Settings', settingsSchema);
