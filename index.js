const functions = require("firebase-functions");
const app = require("./server/app");
const connectDB = require("./server/config/db");

let isConnected = false;

async function ensureDB() {
  if (!isConnected) {
    await connectDB();
    isConnected = true;

    const User = require("./server/models/User");
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      await User.create({
        name: "Admin",
        email: "admin@stock.com",
        password: "admin123",
        role: "admin",
      });
      console.log("Admin user created");
    }
  }
}

exports.api = functions.https.onRequest(async (req, res) => {
  await ensureDB();
  return app(req, res);
});
