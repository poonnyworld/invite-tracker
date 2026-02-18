import mongoose from 'mongoose';

export const MONGODB_CONNECTED = 1 as const;
export const MONGODB_DISCONNECTED = 0 as const;

export const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGO_URI;

    if (!mongoURI) {
      console.error('❌ MONGO_URI is not defined in environment variables');
      throw new Error('MONGO_URI is required');
    }

    if (mongoose.connection.readyState === MONGODB_CONNECTED) {
      console.log('✓ MongoDB already connected');
      return;
    }

    let normalizedURI = mongoURI;
    if (normalizedURI.includes('localhost')) {
      normalizedURI = normalizedURI.replace('localhost', '127.0.0.1');
    }

    const options = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      bufferCommands: false,
      retryWrites: true,
    };

    await mongoose.connect(normalizedURI, options);
    console.log('✓ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error);
    throw error;
  }
};

export const isDBConnected = (): boolean => {
  return mongoose.connection.readyState === MONGODB_CONNECTED;
};
