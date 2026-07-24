const mongoose = require('mongoose');

let isConnected = false;

async function connectDB() {
  if (isConnected) return;

  let mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    try {
      const functions = require('firebase-functions');
      mongoUri = functions.config().mongo.uri;
    } catch (e) {}
  }

  if (!mongoUri) {
    throw new Error('MONGO_URI is not set');
  }

  const conn = await mongoose.connect(mongoUri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });
  isConnected = true;
  console.log('MongoDB connected:', conn.connection.host);
}

module.exports = connectDB;
