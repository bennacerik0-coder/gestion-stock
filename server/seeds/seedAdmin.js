require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');

    const existingAdmin = await User.findOne({ email: 'admin@stock.com' });
    if (existingAdmin) {
      console.log('Admin already exists: admin@stock.com');
      process.exit(0);
    }

    const admin = await User.create({
      name: 'Administrateur',
      email: 'admin@stock.com',
      password: 'admin123',
      role: 'admin',
    });

    console.log('Admin created:');
    console.log('  Email: admin@stock.com');
    console.log('  Password: admin123');
    console.log('  Role: admin');

    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exit(1);
  }
}

seed();
