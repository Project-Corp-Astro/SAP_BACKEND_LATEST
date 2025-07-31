import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import userRoutes from './routes/user.routes';
import monitoringRoutes from './routes/monitoring.routes';
import logger, { requestLogger, errorLogger } from './utils/logger';
import { performanceMiddleware } from './utils/performance';
import redisUtils from './utils/redis';
import roleRoutes from './routes/role.routes';

// Initialize Express app
const app = express();
const PORT = parseInt(process.env.PORT || process.env.USER_SERVICE_PORT || '3002', 10);

// Middleware
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(helmet());
app.use(express.json());
// @ts-ignore - Suppressing TypeScript errors for middleware compatibility
app.use(performanceMiddleware as any);
// @ts-ignore - Suppressing TypeScript errors for middleware compatibility
app.use(requestLogger as any);



// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/sap-db';
mongoose.set('strictQuery', false);

const mongooseOptions: mongoose.ConnectOptions = {
  serverSelectionTimeoutMS: 5000,
  retryWrites: true,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  family: 4,
};

// Connect to MongoDB



async function connectToDatabase() {
  try {
    await mongoose.connect(MONGO_URI, mongooseOptions);
    logger.info(`MongoDB Connected to ${MONGO_URI}`);
    
    

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error after initial connection:', { error: err.message });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected, attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

  } catch (err: any) {
    logger.error('MongoDB connection error:', { error: err.message, stack: err.stack });
    logger.warn('Running with limited functionality. Some features may not work without MongoDB.');
  }
}
connectToDatabase();

// Routes
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/monitoring', monitoringRoutes);

// @ts-ignore - Suppressing TypeScript errors for Express route compatibility
app.get('/health', async (req: Request, res: Response) => {
  try {
    // Check MongoDB connection
    const dbConnected = mongoose.connection.readyState === 1;
    
    // Check Redis connection
    const redisConnected = await redisUtils.redisUtils.pingRedis();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'user-service',
      db: { connected: dbConnected },
      redis: { connected: redisConnected }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'user-service',
      error: error instanceof Error ? error.message : 'Health check failed'
    });
  }
});

// Error Logging
// @ts-ignore - Suppressing TypeScript errors for middleware compatibility
app.use(errorLogger as any);
// @ts-ignore - Suppressing TypeScript errors for Express error handler compatibility
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error:', { error: err.message, stack: err.stack, path: req.path });
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start Server
let server: any;
const startServer = async () => {
  try {
    server = app.listen(PORT, () => {
      logger.info(`
      ==============================================
      User Service Configuration
      ==============================================
      Service Port: ${PORT}
      MongoDB URI: ${MONGO_URI}
      ==============================================
      `);
      logger.info(`Health check available at http://localhost:${PORT}/health`);
    });

  } catch (error: any) {
    logger.error('Failed to start server:', { error: error.message, stack: error.stack });
    process.exit(1);
  }
};

startServer();

// Graceful Shutdown
async function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}. Closing server...`);

  try {
    // Close Redis connection
    await redisUtils.redisUtils.close();
    
    // Close MongoDB connection
    await mongoose.connection.close();
    
    // Close server
    server.close(() => {
      logger.info('Server closed successfully');
      process.exit(0);
    });
  } catch (error) {
    logger.error('Error during graceful shutdown', {
      error: error instanceof Error ? error.message : String(error)
    });
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
});

process.on('uncaughtException', (error: Error) => {
  if ((error as any).code === 'EADDRINUSE') {
    logger.error(`Port ${PORT} is already in use. Please use a different port or stop the process using this port.`, { error: error.message });
    setTimeout(() => process.exit(1), 1000);
  } else {
    logger.error('Uncaught Exception:', { error: error.message, stack: error.stack });
  }
});

export default app;
