import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable in .env.local');
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Use a global to preserve the connection across hot reloads in dev
declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache;
}

const cached: MongooseCache = global.mongooseCache ?? { conn: null, promise: null };
global.mongooseCache = cached;

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000, // Timeout after 10s instead of default 30s
      connectTimeoutMS: 10000,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log('✅ MongoDB Connected Successfully');
      return mongoose;
    }).catch((error) => {
      console.error('❌ MongoDB Connection Error:', error.message);
      if (error.message.includes('SSL alert number 80') || error.message.includes('tlsv1 alert internal error')) {
        console.warn('⚠️  TIP: This error often means your IP is NOT whitelisted in MongoDB Atlas.');
      }
      throw error;
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
