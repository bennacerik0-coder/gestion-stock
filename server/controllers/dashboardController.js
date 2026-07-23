const Product = require('../models/Product');
const Category = require('../models/Category');
const Supplier = require('../models/Supplier');
const StockMovement = require('../models/StockMovement');
const PurchaseOrder = require('../models/PurchaseOrder');
const Alert = require('../models/Alert');

exports.stats = async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments({ isActive: true });
    const totalSuppliers = await Supplier.countDocuments({ isActive: true });
    const totalCategories = await Category.countDocuments({ isActive: true });

    const stockValue = await Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, total: { $sum: { $multiply: ['$stock', '$buyingPrice'] } } } }
    ]);
    const totalStockValue = stockValue.length > 0 ? stockValue[0].total : 0;

    const lowStockCount = await Product.countDocuments({ isActive: true, $expr: { $lte: ['$stock', '$minStock'] } });
    const outOfStockCount = await Product.countDocuments({ isActive: true, stock: 0 });

    const pendingOrders = await PurchaseOrder.countDocuments({ status: { $in: ['draft', 'pending', 'approved', 'ordered', 'partial'] } });
    const unreadAlerts = await Alert.countDocuments({ isRead: false });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const movementsToday = await StockMovement.countDocuments({ movementDate: { $gte: today } });

    res.json({
      totalProducts, totalStockValue, lowStockCount, outOfStockCount,
      pendingOrders, totalSuppliers, totalCategories, movementsToday, unreadAlerts,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.recentMovements = async (req, res) => {
  try {
    const movements = await StockMovement.find()
      .populate('product', 'name sku unit')
      .populate('performedBy', 'name')
      .sort({ movementDate: -1 })
      .limit(10);
    res.json({ movements });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.stockByCategory = async (req, res) => {
  try {
    const result = await Product.aggregate([
      { $match: { isActive: true } },
      { $lookup: { from: 'categories', localField: 'category', foreignField: '_id', as: 'cat' } },
      { $unwind: { path: '$cat', preserveNullAndEmptyArrays: true } },
      { $group: {
        _id: '$cat.name',
        color: { $first: '$cat.color' },
        totalStock: { $sum: '$stock' },
        totalValue: { $sum: { $multiply: ['$stock', '$buyingPrice'] } },
        productCount: { $sum: 1 },
      }},
      { $sort: { totalValue: -1 } }
    ]);
    res.json({ categories: result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.movementsByDay = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await StockMovement.aggregate([
      { $match: { movementDate: { $gte: thirtyDaysAgo } } },
      { $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$movementDate' } },
          type: '$type',
        },
        count: { $sum: 1 },
        totalQty: { $sum: '$quantity' },
        totalValue: { $sum: '$totalValue' },
      }},
      { $sort: { '_id.date': 1 } }
    ]);

    const dateMap = {};
    result.forEach(function(r) {
      if (!dateMap[r._id.date]) dateMap[r._id.date] = { date: r._id.date, entryQty: 0, exitQty: 0, entryValue: 0, exitValue: 0 };
      if (r._id.type === 'entry') {
        dateMap[r._id.date].entryQty = r.totalQty;
        dateMap[r._id.date].entryValue = r.totalValue;
      } else {
        dateMap[r._id.date].exitQty = r.totalQty;
        dateMap[r._id.date].exitValue = r.totalValue;
      }
    });

    const data = Object.values(dateMap).sort(function(a, b) { return a.date.localeCompare(b.date); });
    res.json({ data });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.lowStockProducts = async (req, res) => {
  try {
    const products = await Product.find({ isActive: true, $expr: { $lte: ['$stock', '$minStock'] } })
      .populate('category', 'name color')
      .sort('stock')
      .limit(10);
    res.json({ products });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
