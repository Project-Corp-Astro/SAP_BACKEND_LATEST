// import express, { Express, Request, Response, NextFunction } from 'express';
// import { createProxyMiddleware, Options as ProxyOptions } from 'http-proxy-middleware';
// import helmet from 'helmet';
// import compression from 'compression';
// import cors from 'cors';
// import morgan from 'morgan';

// const app: Express = express();
// const PORT = process.env.PORT || 3000;

// // Basic middleware
// app.use(helmet());
// app.use(compression());
// app.use(cors());
// app.use(morgan('combined'));
// app.use(express.json());

// // Health check endpoint
// app.get('/health', (req: Request, res: Response) => {
//   res.status(200).json({ 
//     status: 'healthy', 
//     service: 'api-gateway',
//     timestamp: new Date().toISOString()
//   });
// });

// // Ready check endpoint
// app.get('/ready', (req: Request, res: Response) => {
//   res.status(200).json({ 
//     status: 'ready', 
//     service: 'api-gateway',
//     timestamp: new Date().toISOString()
//   });
// });

// // Service proxy configurations
// const services = {
//   auth: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
//   user: process.env.USER_SERVICE_URL || 'http://user-service:3002',
//   content: process.env.CONTENT_SERVICE_URL || 'http://content-service:3005',
//   subscription: process.env.SUBSCRIPTION_SERVICE_URL || 'http://subscription-service:3003'
// };

// // Proxy middleware for each service
// app.use('/api/auth', createProxyMiddleware({
//   target: services.auth,
//   changeOrigin: true,
//   pathRewrite: {
//     '^/api/auth': ''
//   }
// }));

// app.use('/api/users', createProxyMiddleware({
//   target: services.user,
//   changeOrigin: true,
//   pathRewrite: {
//     '^/api/users': ''
//   }
// }));

// app.use('/api/content', createProxyMiddleware({
//   target: services.content,
//   changeOrigin: true,
//   pathRewrite: {
//     '^/api/content': ''
//   }
// }));

// app.use('/api/subscriptions', createProxyMiddleware({
//   target: services.subscription,
//   changeOrigin: true,
//   pathRewrite: {
//     '^/api/subscriptions': ''
//   }
// }));

// // Default route
// app.get('/', (req: Request, res: Response) => {
//   res.json({
//     message: 'SAP API Gateway',
//     version: '1.0.0',
//     services: Object.keys(services),
//     timestamp: new Date().toISOString()
//   });
// });

// // Error handling middleware
// app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
//   console.error('Error:', err.message);
//   res.status(500).json({
//     error: 'Internal Server Error',
//     message: err.message
//   });
// });

// // 404 handler
// app.use('*', (req: Request, res: Response) => {
//   res.status(404).json({
//     error: 'Not Found',
//     path: req.originalUrl
//   });
// });

// app.listen(PORT, () => {
//   console.log(`🚀 API Gateway running on port ${PORT}`);
//   console.log(`📋 Services configured:`, services);
// });

// export default app;
