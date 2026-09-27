/**
 * MongoDB connection helpers built on Mongoose.
 */
import mongoose from 'mongoose';

/**
 * Opens the MongoDB connection used by the whole application.
 * @param {string} uri - MongoDB connection string.
 * @returns {Promise<typeof mongoose>} The connected Mongoose instance.
 */
export async function connectDB(uri) {
  // Reject queries for fields that are not in the schema instead of ignoring them.
  mongoose.set('strictQuery', true);

  const connection = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
  });

  console.log(`[db] connected to MongoDB: ${connection.connection.name}`);
  return connection;
}

/**
 * Closes the MongoDB connection (used on shutdown and in tests).
 * @returns {Promise<void>}
 */
export async function disconnectDB() {
  await mongoose.connection.close();
  console.log('[db] connection closed');
}
