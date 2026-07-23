const jwt = require('jsonwebtoken');
const User = require('../models/User');

function generateToken(user) {
  return jwt.sign(
    { userId: user._id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
}

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email et mot de passe requis.' });
    }
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect.' });
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect.' });
    }
    user.lastLogin = new Date();
    await user.save();
    const token = generateToken(user);
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur: ' + err.message });
  }
};

exports.me = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || !user.isActive) {
      return res.status(404).json({ message: 'Utilisateur non trouve.' });
    }
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur: ' + err.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || !user.isActive) {
      return res.status(404).json({ message: 'Utilisateur non trouve.' });
    }
    if (req.body.name) user.name = req.body.name;
    await user.save();
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur: ' + err.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Mot de passe actuel et nouveau mot de passe requis.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Le nouveau mot de passe doit faire au moins 6 caracteres.' });
    }
    const user = await User.findById(req.user.userId);
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Mot de passe actuel incorrect.' });
    }
    user.password = newPassword;
    await user.save();
    res.json({ message: 'Mot de passe modifie avec succes.' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur: ' + err.message });
  }
};
