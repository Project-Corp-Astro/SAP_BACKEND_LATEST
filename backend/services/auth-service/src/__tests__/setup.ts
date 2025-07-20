import mongoose from 'mongoose';
// import { MongoMemoryServer } from 'mongodb-memory-server';

// Mock MongoMemoryServer for testing
interface MongoMemoryServer {
  create(): Promise<MongoMemoryServer>;
  getUri(): string;
  stop(): Promise<void>;
}

let mongoServer: any; // Use any to avoid compilation issues

// Setup before all tests
beforeAll(async () => {
  // Use regular MongoDB connection for now
  const mongoUri = process.env.MONGODB_URL || 'mongodb://localhost:27017/auth-test';
  
  // Connect to the database
  await mongoose.connect(mongoUri);
});

// Clean up after each test
afterEach(async () => {
  // Clear all collections after each test
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// Clean up after all tests
afterAll(async () => {
  // Disconnect from the database
  await mongoose.disconnect();
  
  // Stop the server if it exists
  if (mongoServer && mongoServer.stop) {
    await mongoServer.stop();
  }
});

// Global test timeout
jest.setTimeout(30000);

// Suppress console output during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
