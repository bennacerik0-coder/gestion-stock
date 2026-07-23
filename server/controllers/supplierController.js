const Supplier = require('../models/Supplier');
const Product = require('../models/Product');

exports.list = async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const filter = { isActive: true };
    if (search) filter.name = { $regex: search, $options: 'i' };

    const total = await Supplier.countDocuments(filter);
    const suppliers = await Supplier.find(filter)
      .sort('name')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const suppliersWithCount = await Promise.all(suppliers.map(async function(s) {
      const count = await Product.countDocuments({ supplier: s._id, isActive: true });
      return { ...s.toJSON(), productCount: count };
    }));

    res.json({ suppliers: suppliersWithCount, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ message: 'Fournisseur non trouve' });
    const products = await Product.find({ supplier: supplier._id, isActive: true }).select('name sku stock buyingPrice');
    res.json({ supplier, products });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, contactName, email, phone, address, website, notes } = req.body;
    if (!name) return res.status(400).json({ message: 'Le nom est requis' });
    const supplier = await Supplier.create({
      name: name.trim(),
      contactName: contactName || '',
      email: email || '',
      phone: phone || '',
      address: address || '',
      website: website || '',
      notes: notes || '',
      createdBy: req.user.userId,
    });
    res.status(201).json({ supplier });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ message: 'Fournisseur non trouve' });
    const { name, contactName, email, phone, address, website, notes } = req.body;
    if (name) supplier.name = name.trim();
    if (contactName !== undefined) supplier.contactName = contactName;
    if (email !== undefined) supplier.email = email;
    if (phone !== undefined) supplier.phone = phone;
    if (address !== undefined) supplier.address = address;
    if (website !== undefined) supplier.website = website;
    if (notes !== undefined) supplier.notes = notes;
    await supplier.save();
    res.json({ supplier });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const count = await Product.countDocuments({ supplier: req.params.id, isActive: true });
    if (count > 0) {
      return res.status(400).json({ message: 'Impossible de supprimer: ' + count + ' produit(s) associe(s)' });
    }
    await Supplier.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'Fournisseur supprime' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
