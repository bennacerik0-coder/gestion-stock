const Category = require('../models/Category');

exports.list = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort('name');
    res.json({ categories });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Categorie non trouvee' });
    res.json({ category });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, description, color, icon } = req.body;
    if (!name) return res.status(400).json({ message: 'Le nom est requis' });
    const existing = await Category.findOne({ name: name.trim() });
    if (existing) return res.status(400).json({ message: 'Cette categorie existe deja' });
    const category = await Category.create({
      name: name.trim(),
      description: description || '',
      color: color || '#3b82f6',
      icon: icon || 'folder',
      createdBy: req.user.userId,
    });
    res.status(201).json({ category });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { name, description, color, icon } = req.body;
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Categorie non trouvee' });
    if (name && name.trim() !== category.name) {
      const existing = await Category.findOne({ name: name.trim(), _id: { $ne: category._id } });
      if (existing) return res.status(400).json({ message: 'Ce nom de categorie existe deja' });
      category.name = name.trim();
    }
    if (description !== undefined) category.description = description;
    if (color) category.color = color;
    if (icon) category.icon = icon;
    await category.save();
    res.json({ category });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const Product = require('../models/Product');
    const count = await Product.countDocuments({ category: req.params.id, isActive: true });
    if (count > 0) {
      return res.status(400).json({ message: 'Impossible de supprimer: ' + count + ' produit(s) associe(s)' });
    }
    const category = await Category.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!category) return res.status(404).json({ message: 'Categorie non trouvee' });
    res.json({ message: 'Categorie supprimee' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
