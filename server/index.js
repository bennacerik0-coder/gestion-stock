require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 3000;

connectDB().then(async () => {
  const User = require('./models/User');
  const userCount = await User.countDocuments();
  if (userCount === 0) {
    await User.create({
      name: 'Admin',
      email: 'admin@stock.com',
      password: 'admin123',
      role: 'admin'
    });
    console.log('Admin user created: admin@stock.com / admin123');
  }

  app.listen(PORT, () => {
    console.log('Server running on port ' + PORT);
  });
}).catch(err => {
  console.error('Failed to connect to MongoDB:', err.message);
  process.exit(1);
});
