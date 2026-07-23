const Alert = require('../models/Alert');

exports.list = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, severity, isRead } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (severity) filter.severity = severity;
    if (isRead !== undefined) filter.isRead = isRead === 'true';

    const total = await Alert.countDocuments(filter);
    const alerts = await Alert.find(filter)
      .populate('product', 'name sku')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ alerts, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.unreadCount = async (req, res) => {
  try {
    const count = await Alert.countDocuments({ isRead: false });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.markRead = async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(req.params.id, {
      isRead: true, readBy: req.user.userId
    }, { new: true });
    if (!alert) return res.status(404).json({ message: 'Alerte non trouvee' });
    res.json({ alert });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.markAllRead = async (req, res) => {
  try {
    await Alert.updateMany({ isRead: false }, { isRead: true, readBy: req.user.userId });
    res.json({ message: 'Toutes les alertes marques comme lues' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await Alert.findByIdAndDelete(req.params.id);
    res.json({ message: 'Alerte supprimee' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
