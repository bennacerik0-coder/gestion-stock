const Product = require('../models/Product');
const Settings = require('../models/Settings');
const { logAction } = require('../utils/auditLogger');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads', 'products')),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    cb(null, ext && mime);
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

exports.uploadMiddleware = upload.single('photo');

exports.list = async (req, res) => {
  try {
    const { page = 1, limit = 50, category, supplier, status, search, sort = 'name', order = 'asc' } = req.query;
    const filter = { isActive: true };
    if (category) filter.category = category;
    if (supplier) filter.supplier = supplier;
    if (search) filter.$text = { $search: search };
    if (status === 'low') filter.$expr = { $lte: ['$stock', '$minStock'] };
    else if (status === 'out_of_stock') filter.stock = 0;
    else if (status === 'overstocked') filter.$expr = { $gte: ['$stock', '$maxStock'] };

    const sortObj = {};
    sortObj[sort] = order === 'desc' ? -1 : 1;

    const total = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .populate('category', 'name color')
      .populate('supplier', 'name')
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ products, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category', 'name color')
      .populate('supplier', 'name contactName phone email');
    if (!product) return res.status(404).json({ message: 'Produit non trouve' });
    res.json({ product });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    const { name, sku, description, category, supplier, unit, stock, minStock, maxStock, buyingPrice, sellingPrice, location } = req.body;
    if (!name || !sku || !category || buyingPrice === undefined || sellingPrice === undefined) {
      return res.status(400).json({ message: 'Nom, SKU, categorie et prix sont requis' });
    }
    const existing = await Product.findOne({ sku: sku.toUpperCase() });
    if (existing) return res.status(400).json({ message: 'Ce SKU existe deja' });
    const product = await Product.create({
      name: name.trim(),
      sku: sku.toUpperCase(),
      description: description || '',
      category,
      supplier: supplier || null,
      unit: unit || 'piece',
      stock: stock || 0,
      minStock: minStock || settings.defaults.minStock,
      maxStock: maxStock || settings.defaults.maxStock,
      buyingPrice,
      sellingPrice,
      location: location || '',
      createdBy: req.user.userId,
    });
    const populated = await product.populate('category', 'name color');
    logAction(req, 'create', 'product', product._id, product.name, 'Produit cree: ' + product.sku);
    res.status(201).json({ product: populated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Produit non trouve' });
    const { name, sku, description, category, supplier, unit, minStock, maxStock, buyingPrice, sellingPrice, location } = req.body;
    if (sku && sku.toUpperCase() !== product.sku) {
      const existing = await Product.findOne({ sku: sku.toUpperCase(), _id: { $ne: product._id } });
      if (existing) return res.status(400).json({ message: 'Ce SKU existe deja' });
      product.sku = sku.toUpperCase();
    }
    if (name) product.name = name.trim();
    if (description !== undefined) product.description = description;
    if (category) product.category = category;
    if (supplier !== undefined) product.supplier = supplier || null;
    if (unit) product.unit = unit;
    if (minStock !== undefined) product.minStock = minStock;
    if (maxStock !== undefined) product.maxStock = maxStock;
    if (buyingPrice !== undefined) product.buyingPrice = buyingPrice;
    if (sellingPrice !== undefined) product.sellingPrice = sellingPrice;
    if (location !== undefined) product.location = location;
    await product.save();
    const populated = await product.populate('category', 'name color');
    logAction(req, 'update', 'product', product._id, product.name, 'Produit modifie');
    res.json({ product: populated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!product) return res.status(404).json({ message: 'Produit non trouve' });
    logAction(req, 'delete', 'product', product._id, product.name, 'Produit supprime');
    res.json({ message: 'Produit supprime' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updatePhoto = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Aucun fichier uploadé' });
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Produit non trouve' });
    product.photo = '/uploads/products/' + req.file.filename;
    await product.save();
    res.json({ product });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getBarcode = async (req, res) => {
  try {
    const QRCode = require('qrcode');
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Produit non trouve' });
    const data = JSON.stringify({ sku: product.sku, name: product.name });
    const url = await QRCode.toDataURL(data, { width: 200, margin: 2 });
    res.json({ barcode: url });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getLowStock = async (req, res) => {
  try {
    const products = await Product.find({
      isActive: true,
      $expr: { $lte: ['$stock', '$minStock'] }
    }).populate('category', 'name color').sort('stock');
    res.json({ products });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
