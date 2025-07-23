import * as winston from 'winston';

// Configuration for the user service logger
const loggerOptions = {
  service: 'user-service',
  level: process.env.LOG_LEVEL || 'info',
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        process.env.NODE_ENV !== 'production' 
          ? winston.format.colorize() 
          : winston.format.uncolorize(),
        process.env.NODE_ENV === 'production'
          ? winston.format.json()
          : winston.format.simple()
      )
    }),
    new winston.transports.File({
      filename: process.env.LOG_FILE_PATH || 'logs/user-service.log',
      maxFiles: 5,
      maxsize: 10 * 1024 * 1024 // 10MB
    })
  ]
};

// Create the logger instance
const logger = winston.createLogger({
  defaultMeta: { service: loggerOptions.service },
  level: loggerOptions.level,
  transports: loggerOptions.transports
});

// Create middleware for request and error logging
const requestLogger = (req, res, next) => {
  logger.info(`${req.method} ${req.url}`, { 
    ip: req.ip, 
    userId: req.user?._id 
  });
  next();
};

const errorLogger = (err, req, res, next) => {
  logger.error(`Error: ${err.message}`, { 
    stack: err.stack,
    url: req.url,
    method: req.method
  });
  next(err);
};

// Export middleware for request and error logging
export { requestLogger, errorLogger };

// Create a service-specific logger function for controllers and services
export const createServiceLogger = (serviceName: string) => {
  return {
    info: (message: string, meta?: any) => logger.info(`[${serviceName}] ${message}`, meta),
    error: (message: string, meta?: any) => logger.error(`[${serviceName}] ${message}`, meta),
    warn: (message: string, meta?: any) => logger.warn(`[${serviceName}] ${message}`, meta),
    debug: (message: string, meta?: any) => logger.debug(`[${serviceName}] ${message}`, meta),
    trace: (message: string, meta?: any) => logger.verbose(`[${serviceName}] ${message}`, meta)
  };
};

// Export the logger as default
export default logger;
