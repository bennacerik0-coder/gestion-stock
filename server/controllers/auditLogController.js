const AuditLog = require('../models/AuditLog');

exports.listLogs = async (req, res) => {
  try {
    const { page = 1, limit = 30, entity = '', action = '', search = '' } = req.query;
    const query = {};
    if (entity) query.entity = entity;
    if (action) query.action = action;
    if (search) {
      query.$or = [
        { userName: { $regex: search, $options: 'i' } },
        { entityName: { $regex: search, $options: 'i' } },
        { details: { $regex: search, $options: 'i' } }
      ];
    }
    const total = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json({ logs, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur: ' + err.message });
  }
};
