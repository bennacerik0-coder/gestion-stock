const Settings = require('../models/Settings');
const AuditLog = require('../models/AuditLog');

exports.getSettings = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    res.json({ settings });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur: ' + err.message });
  }
};

exports.updateCompany = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    const { name, address, phone, email, logo, rc, ice, patent } = req.body;
    if (name !== undefined) settings.company.name = name;
    if (address !== undefined) settings.company.address = address;
    if (phone !== undefined) settings.company.phone = phone;
    if (email !== undefined) settings.company.email = email;
    if (logo !== undefined) settings.company.logo = logo;
    if (rc !== undefined) settings.company.rc = rc;
    if (ice !== undefined) settings.company.ice = ice;
    if (patent !== undefined) settings.company.patent = patent;
    settings.updatedAt = new Date();
    await settings.save();

    await AuditLog.create({
      user: req.user.userId,
      userName: req.user.email,
      action: 'update',
      entity: 'settings',
      details: 'Informations entreprise modifiees',
      ip: req.ip
    });

    res.json({ settings });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur: ' + err.message });
  }
};

exports.updateDefaults = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    const { minStock, maxStock, currency, currencySymbol } = req.body;
    if (minStock !== undefined) settings.defaults.minStock = minStock;
    if (maxStock !== undefined) settings.defaults.maxStock = maxStock;
    if (currency !== undefined) settings.defaults.currency = currency;
    if (currencySymbol !== undefined) settings.defaults.currencySymbol = currencySymbol;
    settings.updatedAt = new Date();
    await settings.save();

    await AuditLog.create({
      user: req.user.userId,
      userName: req.user.email,
      action: 'update',
      entity: 'settings',
      details: 'Parametres par defaut modifies',
      ip: req.ip
    });

    res.json({ settings });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur: ' + err.message });
  }
};

exports.backupDatabase = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const collections = mongoose.connections[0].collections;
    const backup = { createdAt: new Date().toISOString(), collections: {} };

    for (const [name, collection] of Object.entries(collections)) {
      backup.collections[name] = await collection.find({}).toArray();
    }

    await AuditLog.create({
      user: req.user.userId,
      userName: req.user.email,
      action: 'backup',
      entity: 'database',
      details: 'Sauvegarde complete exportee',
      ip: req.ip
    });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="backup-stock-' + new Date().toISOString().slice(0, 10) + '.json"');
    res.json(backup);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur: ' + err.message });
  }
};
