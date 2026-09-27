/**
 * Starts an in-memory MongoDB instance for integration tests, so tests never
 * touch the real development database.
 */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer = null;

/**
 * Boots an in-memory MongoDB server and connects Mongoose to it.
 * @returns {Promise<void>}
 */
export async function connectMemoryDb() {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
}

/**
 * Removes every document from every collection between tests.
 * @returns {Promise<void>}
 */
export async function clearMemoryDb() {
  const { collections } = mongoose.connection;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
}

/**
 * Disconnects Mongoose and stops the in-memory MongoDB server.
 * @returns {Promise<void>}
 */
export async function closeMemoryDb() {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongoServer) await mongoServer.stop();
}
