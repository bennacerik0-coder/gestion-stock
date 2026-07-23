const StockMovement = require('../models/StockMovement');
const Product = require('../models/Product');
const checkLowStock = require('../utils/checkLowStock');
const { logAction } = require('../utils/auditLogger');

async function generateMovementNumber() {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const count = await StockMovement.countDocuments({
    movementDate: { $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()) }
  });
  return 'SM-' + dateStr + '-' + String(count + 1).padStart(3, '0');
}

exports.list = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, reason, productId, dateFrom, dateTo, search } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (reason) filter.reason = reason;
    if (productId) filter.product = productId;
    if (dateFrom || dateTo) {
      filter.movementDate = {};
      if (dateFrom) filter.movementDate.$gte = new Date(dateFrom);
      if (dateTo) filter.movementDate.$lte = new Date(dateTo + 'T23:59:59');
    }

    const total = await StockMovement.countDocuments(filter);
    const movements = await StockMovement.find(filter)
      .populate('product', 'name sku unit')
      .populate('performedBy', 'name')
      .sort({ movementDate: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ movements, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.entry = async (req, res) => {
  try {
    const { productId, reason, quantity, unitPrice, reference, notes } = req.body;
    if (!productId || !reason || !quantity || unitPrice === undefined) {
      return res.status(400).json({ message: 'Produit, raison, quantite et prix requis' });
    }
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({ message: 'Produit non trouve' });
    }

    const movementNumber = await generateMovementNumber();
    const totalValue = quantity * unitPrice;

    const movement = await StockMovement.create({
      movementNumber,
      type: 'entry',
      reason,
      product: productId,
      quantity,
      unitPrice,
      totalValue,
      reference: reference || '',
      notes: notes || '',
      performedBy: req.user.userId,
    });

    await Product.findByIdAndUpdate(productId, { $inc: { stock: quantity } });
    await checkLowStock(productId);

    const populated = await movement.populate('product', 'name sku unit');
    logAction(req, 'create', 'stock_movement', movement._id, movement.movementNumber, 'Entree: ' + quantity + ' ' + product.unit + ' de ' + product.name);
    res.status(201).json({ movement: populated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.exit = async (req, res) => {
  try {
    const { productId, reason, quantity, unitPrice, reference, notes } = req.body;
    if (!productId || !reason || !quantity || unitPrice === undefined) {
      return res.status(400).json({ message: 'Produit, raison, quantite et prix requis' });
    }
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({ message: 'Produit non trouve' });
    }
    if (product.stock < quantity) {
      return res.status(400).json({ message: 'Stock insuffisant. Stock actuel: ' + product.stock });
    }

    const movementNumber = await generateMovementNumber();
    const totalValue = quantity * unitPrice;

    const movement = await StockMovement.create({
      movementNumber,
      type: 'exit',
      reason,
      product: productId,
      quantity,
      unitPrice,
      totalValue,
      reference: reference || '',
      notes: notes || '',
      performedBy: req.user.userId,
    });

    await Product.findByIdAndUpdate(productId, { $inc: { stock: -quantity } });
    await checkLowStock(productId);

    const populated = await movement.populate('product', 'name sku unit');
    logAction(req, 'create', 'stock_movement', movement._id, movement.movementNumber, 'Sortie: ' + quantity + ' ' + product.unit + ' de ' + product.name);
    res.status(201).json({ movement: populated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.summary = async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const match = {};
    if (dateFrom || dateTo) {
      match.movementDate = {};
      if (dateFrom) match.movementDate.$gte = new Date(dateFrom);
      if (dateTo) match.movementDate.$lte = new Date(dateTo + 'T23:59:59');
    }

    const result = await StockMovement.aggregate([
      { $match: match },
      { $group: {
        _id: '$type',
        count: { $sum: 1 },
        totalQty: { $sum: '$quantity' },
        totalValue: { $sum: '$totalValue' },
      }}
    ]);

    const summary = { entry: { count: 0, totalQty: 0, totalValue: 0 }, exit: { count: 0, totalQty: 0, totalValue: 0 } };
    result.forEach(function(r) {
      summary[r._id] = { count: r.count, totalQty: r.totalQty, totalValue: r.totalValue };
    });

    res.json({ summary });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
