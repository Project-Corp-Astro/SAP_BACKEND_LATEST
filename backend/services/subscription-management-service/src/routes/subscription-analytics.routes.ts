import { RequestHandler, Router } from 'express';
import { SubscriptionAnalyticsController } from '../controllers/subscription-analytics.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRemotePermission } from '../middlewares/permission.middleware';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get analytics for a specific date range
router.get('/', 
    requireRemotePermission(
        'analytics:view',    
        { application: 'billing',
            allowSuperadmin: true
        }) as any as RequestHandler,
  SubscriptionAnalyticsController.getAnalytics
);

// Get analytics for the last 30 days
router.get('/current', 
    requireRemotePermission(
        'analytics:view',    
        { application: 'billing',
            allowSuperadmin: true
        }) as any as RequestHandler,
  SubscriptionAnalyticsController.getCurrentAnalytics
);

export default router;
