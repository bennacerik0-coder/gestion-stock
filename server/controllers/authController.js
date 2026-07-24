const jwt = require('jsonwebtoken');
const User = require('../models/User');

function getConfig(key, fallback) {
  if (process.env[key]) return process.env[key];
  try {
    const functions = require('firebase-functions');
    const cfg = functions.config();
    const val = key.toLowerCase().replace(/_/g, '.').split('.').reduce((o, k) => o && o[k], cfg);
    if (val) return val;
  } catch (e) {}
  return fallback;
}

function generateToken(user) {
  return jwt.sign(
    { userId: user._id, role: user.role, email: user.email },
    getConfig('JWT_SECRET', 'fallback-secret-key'),
    { expiresIn: getConfig('JWT_EXPIRES_IN', '7d') }
  );
}