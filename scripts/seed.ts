/**
 * Run this script once to seed the initial admin user and sample dishes.
 * Usage: npx tsx scripts/seed.ts
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/zapbill';

// Inline models to avoid 'server-only' import issues in CLI scripts
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
});
const User = mongoose.models.User ?? mongoose.model('User', UserSchema);

const VariantSchema = new mongoose.Schema(
  { label: String, price: Number },
  { _id: false }
);
const DishSchema = new mongoose.Schema(
  {
    name: String,
    category: String,
    isAvailable: { type: Boolean, default: true },
    variants: [VariantSchema],
  },
  { timestamps: true }
);
const Dish = mongoose.models.Dish ?? mongoose.model('Dish', DishSchema);

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  // Seed admin user
  const existing = await User.findOne({ username: 'admin' });
  if (!existing) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await User.create({ username: 'admin', password: hashedPassword });
    console.log('✅ Admin user created (username: admin, password: admin123)');
  } else {
    console.log('ℹ️  Admin user already exists');
  }

  // Seed dishes
  const dishCount = await Dish.countDocuments();
  if (dishCount === 0) {
    await Dish.insertMany([
      {
        name: 'Chicken Biriyani',
        category: 'Biriyani',
        variants: [
          { label: 'Quarter', price: 80 },
          { label: 'Half', price: 150 },
          { label: 'Full', price: 280 },
        ],
      },
      {
        name: 'Mutton Biriyani',
        category: 'Biriyani',
        variants: [
          { label: 'Quarter', price: 110 },
          { label: 'Half', price: 200 },
          { label: 'Full', price: 380 },
        ],
      },
      {
        name: 'Chicken Curry',
        category: 'Curry',
        variants: [
          { label: 'Quarter', price: 60 },
          { label: 'Half', price: 110 },
          { label: 'Full', price: 200 },
        ],
      },
      {
        name: 'Porotta',
        category: 'Bread',
        variants: [{ label: 'Per Piece', price: 15 }],
      },
      {
        name: 'Chapathi',
        category: 'Bread',
        variants: [{ label: 'Per Piece', price: 12 }],
      },
    ]);
    console.log('✅ Sample dishes created');
  } else {
    console.log('ℹ️  Dishes already exist, skipping sample data');
  }

  await mongoose.disconnect();
  console.log('Done!');
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
