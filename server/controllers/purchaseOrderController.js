const PurchaseOrder = require('../models/PurchaseOrder');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const checkLowStock = require('../utils/checkLowStock');
const { logAction } = require('../utils/auditLogger');

async function generateOrderNumber() {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const count = await PurchaseOrder.countDocuments({
    createdAt: { $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()) }
  });
  return 'PO-' + dateStr + '-' + String(count + 1).padStart(3, '0');
}

exports.list = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, supplier, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (supplier) filter.supplier = supplier;

    const total = await PurchaseOrder.countDocuments(filter);
    const orders = await PurchaseOrder.find(filter)
      .populate('supplier', 'name')
      .populate('items.product', 'name sku unit')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ orders, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id)
      .populate('supplier', 'name contactName phone email')
      .populate('items.product', 'name sku unit stock')
      .populate('createdBy', 'name')
      .populate('approvedBy', 'name');
    if (!order) return res.status(404).json({ message: 'Commande non trouvee' });
    res.json({ order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { supplier, items, expectedDate, notes } = req.body;
    if (!supplier || !items || items.length === 0) {
      return res.status(400).json({ message: 'Fournisseur et articles requis' });
    }
    const orderNumber = await generateOrderNumber();
    let totalAmount = 0;
    const processedItems = items.map(function(item) {
      const total = item.quantity * item.unitPrice;
      totalAmount += total;
      return { product: item.product, quantity: item.quantity, unitPrice: item.unitPrice, receivedQuantity: 0, total };
    });

    const order = await PurchaseOrder.create({
      orderNumber,
      supplier,
      items: processedItems,
      totalAmount,
      expectedDate: expectedDate || null,
      notes: notes || '',
      createdBy: req.user.userId,
    });

    const populated = await order.populate('supplier', 'name');
    logAction(req, 'create', 'purchase_order', order._id, order.orderNumber, 'Commande creee: ' + order.totalAmount + ' MAD');
    res.status(201).json({ order: populated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Commande non trouvee' });
    if (!['draft', 'pending'].includes(order.status)) {
      return res.status(400).json({ message: 'Impossible de modifier une commande ' + order.status });
    }
    const { supplier, items, expectedDate, notes } = req.body;
    if (supplier) order.supplier = supplier;
    if (items && items.length > 0) {
      let totalAmount = 0;
      order.items = items.map(function(item) {
        const total = item.quantity * item.unitPrice;
        totalAmount += total;
        return { product: item.product, quantity: item.quantity, unitPrice: item.unitPrice, receivedQuantity: 0, total };
      });
      order.totalAmount = totalAmount;
    }
    if (expectedDate !== undefined) order.expectedDate = expectedDate || null;
    if (notes !== undefined) order.notes = notes;
    await order.save();
    res.json({ order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Commande non trouvee' });
    const { status } = req.body;
    const validTransitions = {
      draft: ['pending', 'cancelled'],
      pending: ['approved', 'cancelled'],
      approved: ['ordered', 'cancelled'],
      ordered: ['partial', 'received', 'cancelled'],
      partial: ['received', 'cancelled'],
    };
    if (!validTransitions[order.status] || !validTransitions[order.status].includes(status)) {
      return res.status(400).json({ message: 'Transition invalide: ' + order.status + ' -> ' + status });
    }
    order.status = status;
    if (status === 'approved') order.approvedBy = req.user.userId;
    if (status === 'cancelled' || status === 'received') order.receivedDate = new Date();
    await order.save();
    logAction(req, 'status_change', 'purchase_order', order._id, order.orderNumber, 'Statut change: ' + status);
    res.json({ order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.receive = async (req, res) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Commande non trouvee' });
    if (!['ordered', 'partial'].includes(order.status)) {
      return res.status(400).json({ message: 'Commande non recvable (statut: ' + order.status + ')' });
    }
    const { items } = req.body;
    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Articles requis' });
    }

    let allReceived = true;
    for (const receiveItem of items) {
      const orderItem = order.items.find(function(it) { return it.product.toString() === receiveItem.product; });
      if (!orderItem) continue;
      const remaining = orderItem.quantity - orderItem.receivedQuantity;
      const toReceive = Math.min(receiveItem.receivedQuantity, remaining);
      if (toReceive <= 0) continue;

      orderItem.receivedQuantity += toReceive;

      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
      const movementCount = await StockMovement.countDocuments({
        movementDate: { $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()) }
      });
      const movementNumber = 'SM-' + dateStr + '-' + String(movementCount + 1).padStart(3, '0');

      await StockMovement.create({
        movementNumber,
        type: 'entry',
        reason: 'purchase',
        product: receiveItem.product,
        quantity: toReceive,
        unitPrice: orderItem.unitPrice,
        totalValue: toReceive * orderItem.unitPrice,
        reference: order.orderNumber,
        notes: 'Reception commande ' + order.orderNumber,
        performedBy: req.user.userId,
      });

      await Product.findByIdAndUpdate(receiveItem.product, { $inc: { stock: toReceive } });
      await checkLowStock(receiveItem.product);

      if (orderItem.receivedQuantity < orderItem.quantity) allReceived = false;
    }

    order.status = allReceived ? 'received' : 'partial';
    if (allReceived) order.receivedDate = new Date();
    await order.save();

    const populated = await order.populate('supplier', 'name');
    logAction(req, 'receive', 'purchase_order', order._id, order.orderNumber, 'Commande recue - statut: ' + order.status);
    res.json({ order: populated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Commande non trouvee' });
    if (!['draft', 'pending'].includes(order.status)) {
      return res.status(400).json({ message: 'Impossible de supprimer une commande ' + order.status });
    }
    await PurchaseOrder.findByIdAndDelete(req.params.id);
    logAction(req, 'delete', 'purchase_order', order._id, order.orderNumber, 'Commande supprimee');
    res.json({ message: 'Commande supprimee' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
