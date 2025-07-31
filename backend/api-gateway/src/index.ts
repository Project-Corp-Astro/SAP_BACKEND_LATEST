import express, { Express, Request, Response, NextFunction } from 'express';
import { createProxyMiddleware, Options as ProxyOptions } from 'http-proxy-middleware';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import morgan from 'morgan';

const app: Express = express();
const PORT = process.env.PORT || 5001;

// ✅ Add proper logging function (simplified version of your logger)
const logger = {
  info: (message: string, meta?: any) => console.log(`[INFO] ${new Date().toISOString()} - ${message}`, meta || ''),
  error: (message: string, meta?: any) => console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, meta || ''),
  warn: (message: string, meta?: any) => console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, meta || '')
};

// Basic middleware
app.use(helmet());
app.use(compression());

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001', 
    'http://localhost:5173',
    'http://localhost:8080',
    'https://sap.corpastro.com',
    'http://sap.corpastro.com',
    'https://sap.corpastro.in',
    'http://sap.corpastro.in' 
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(morgan('combined'));

// ✅ Enhanced body parsing with limits
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Parse the body for all proxy requests
// app.use((req, res, next) => {
//   if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
//     let data = '';
//     req.on('data', chunk => {
//       data += chunk;
//     });
//     req.on('end', () => {
//       try {
//         if (data) {
//           req.body = JSON.parse(data);
//         }
//         next();
//       } catch (e) {
//         next();
//       }
//     });
//   } else {
//     next();
//   }
// });

// ✅ Add request tracking logger
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`🔍 ${req.method} ${req.path} from ${req.ip}`);
  logger.info(`📋 Headers: Origin=${req.headers.origin || 'none'}, Content-Type=${req.headers['content-type'] || 'none'}`);
  logger.info(`➡️ Body: ${JSON.stringify(req.body)}`);
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'healthy', 
    service: 'api-gateway',
    timestamp: new Date().toISOString()
  });
});

// Ready check endpoint
app.get('/ready', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'ready', 
    service: 'api-gateway',
    timestamp: new Date().toISOString()
  });
});

// Service proxy configurations
const services = {
  auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  user: process.env.USER_SERVICE_URL || 'http://localhost:3002',
  content: process.env.CONTENT_SERVICE_URL || 'http://localhost:3005',
  subscription: process.env.SUBSCRIPTION_SERVICE_URL || 'http://localhost:3003'
};

// ✅ Enhanced Auth Service proxy (based on your working version)
app.use('/api/auth', createProxyMiddleware({
  target: services.auth,
  changeOrigin: true,
  pathRewrite: {
    '^/api/auth': '/api/auth'  // Keep the /api/auth path
  },
  // ✅ Enhanced timeout settings
  proxyTimeout: 60000,    // 60 seconds
  timeout: 60000,         // 60 seconds
  // ✅ Connection handling
  secure: false,          // Don't verify SSL certificates
  xfwd: true,             // Add x-forwarded headers
  ws: true,               // Enable WebSocket proxying
  followRedirects: true,  // Follow any redirects
  // ✅ Enhanced body handling
  onProxyReq: (proxyReq, req: any, res) => {
    logger.info(`📤 Proxying ${req.method} ${req.path} to auth-service`);
    
    // Ensure content-type is set
    if (!proxyReq.getHeader('content-type')) {
      proxyReq.setHeader('content-type', 'application/json');
    }
    
    // Handle body data properly
    if (req.body) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('content-length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  },
  onProxyRes: (proxyRes, req, res) => {
    logger.info(`📥 Response from auth-service: ${proxyRes.statusCode} for ${req.path}`);
  },
  onError: (err, req, res) => {
    logger.error(`❌ Auth service proxy error for ${req.path}:`, err.message);
    if (!res.headersSent) {
      res.status(503).json({ 
        success: false,
        message: 'Auth Service unavailable', 
        error: err.message 
      });
    }
  }
}));

// ✅ Enhanced User Service proxy
app.use('/api/users', createProxyMiddleware({
  target: services.user,
  changeOrigin: true,
  proxyTimeout: 60000,
  timeout: 60000,
  secure: false,
  xfwd: true,
  pathRewrite: {
    '^/api/users': '/api/users'
  },
  onProxyReq: (proxyReq, req: any, res) => {
    logger.info(`📤 Proxying ${req.method} ${req.path} to user-service`);
    if (req.body && Object.keys(req.body).length > 0) {
      const contentType = proxyReq.getHeader('Content-Type');
      if (contentType && contentType.toString().includes('application/json')) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }
    }
  },
  onError: (err, req, res) => {
    logger.error('User service proxy error:', err.message);
    if (!res.headersSent) {
      res.status(503).json({ success: false, message: 'User service unavailable', error: err.message });
    }
  }
}));

// ✅ Enhanced Roles proxy
app.use('/api/roles', createProxyMiddleware({
  target: services.user,
  changeOrigin: true,
  proxyTimeout: 60000,
  timeout: 60000,
  secure: false,
  xfwd: true,
  pathRewrite: {
    '^/api/roles': '/api/roles'
  },
  onProxyReq: (proxyReq, req: any, res) => {
    logger.info(`📤 Proxying ${req.method} ${req.path} to user-service`);
    if (req.body && Object.keys(req.body).length > 0) {
      const contentType = proxyReq.getHeader('Content-Type');
      if (contentType && contentType.toString().includes('application/json')) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }
    }
  },
  onError: (err, req, res) => {
    logger.error('Role service proxy error:', err.message);
    if (!res.headersSent) {
      res.status(503).json({ success: false, message: 'Role service unavailable', error: err.message });
    }
  }
}));

// ✅ Enhanced Content Service proxy
app.use('/api/content', createProxyMiddleware({
  target: services.content,
  changeOrigin: true,
  proxyTimeout: 60000,
  timeout: 60000,
  secure: false,
  xfwd: true,
  pathRewrite: {
    '^/api/content': '/api/content'
  },
  onProxyReq: (proxyReq, req: any, res) => {
    logger.info(`📤 Proxying ${req.method} ${req.path} to content-service`);
    if (req.body && Object.keys(req.body).length > 0) {
      const contentType = proxyReq.getHeader('Content-Type');
      if (contentType && contentType.toString().includes('application/json')) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }
    }
  },
  onError: (err, req, res) => {
    logger.error('Content service proxy error:', err.message);
    if (!res.headersSent) {
      res.status(503).json({ success: false, message: 'Content service unavailable', error: err.message });
    }
  }
}));

// ✅ Enhanced Subscription Service proxy
app.use('/api/subscription', createProxyMiddleware({
  target: services.subscription,
  changeOrigin: true,
  proxyTimeout: 60000,
  timeout: 60000,
  secure: false,
  xfwd: true,
  pathRewrite: {
    '^/api/subscription': '/api/subscription'
  },
  onProxyReq: (proxyReq, req: any, res) => {
    logger.info(`📤 Proxying ${req.method} ${req.path} to subscription-service`);
    if (req.body && Object.keys(req.body).length > 0) {
      const contentType = proxyReq.getHeader('Content-Type');
      if (contentType && contentType.toString().includes('application/json')) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }
    }
  },
  onError: (err, req, res) => {
    logger.error('Subscription service proxy error:', err.message);
    if (!res.headersSent) {
      res.status(503).json({ success: false, message: 'Subscription service unavailable', error: err.message });
    }
  }
}));

// Default route
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'SAP API Gateway',
    version: '1.0.0',
    services: Object.keys(services),
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Error:', err.message);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// 404 handler
app.use('*', (req: Request, res: Response) => {
  logger.warn(`404 - Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: 'Not Found',
    path: req.originalUrl
  });
});

app.listen(PORT, () => {
  logger.info(`🚀 API Gateway running on port ${PORT}`);
  logger.info(`📋 Services configured:`, services);
});

export default app;
