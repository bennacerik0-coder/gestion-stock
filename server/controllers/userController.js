const User = require('../models/User');

exports.listUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json({ users, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur: ' + err.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Nom, email et mot de passe requis.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Le mot de passe doit faire au moins 6 caracteres.' });
    }
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: 'Cet email est deja utilise.' });
    }
    const user = await User.create({ name, email, password, role: role || 'operator' });
    res.status(201).json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur: ' + err.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { name, email, role, isActive } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouve.' });
    if (email && email.toLowerCase() !== user.email) {
      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) return res.status(400).json({ message: 'Cet email est deja utilise.' });
    }
    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email.toLowerCase();
    if (role !== undefined) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;
    await user.save();
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur: ' + err.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Le mot de passe doit faire au moins 6 caracteres.' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouve.' });
    user.password = newPassword;
    await user.save();
    res.json({ message: 'Mot de passe reinitialise avec succes.' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur: ' + err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouve.' });
    if (user._id.toString() === req.user.userId) {
      return res.status(400).json({ message: 'Vous ne pouvez pas supprimer votre propre compte.' });
    }
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Utilisateur supprime.' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur: ' + err.message });
  }
};
