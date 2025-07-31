import express, { RequestHandler } from 'express';
import { AdminSubscriptionController } from '../controllers/admin/subscription.controller';
import adminSubscriptionPlanController from '../controllers/admin/subscription-plan.controller';
import { AdminPromoCodeController } from '../controllers/admin/promo-code.controller';
import promoCodeAnalyticsController from '../controllers/admin/promo-code-analytics.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRemotePermission } from '../middlewares/permission.middleware';
const router = express.Router();
const adminSubscriptionController = new AdminSubscriptionController();
const adminPromoCodeController = new AdminPromoCodeController();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Subscription routes
router.get('/subscriptions',
    requireRemotePermission(
        'subscription:read', {
        application: "billing",
        allowSuperadmin: true
      }) as any as RequestHandler,
    adminSubscriptionController.getAllSubscriptions);

router.get('/subscriptions/app/:appId',
    requireRemotePermission(
        'subscription:read',
        { application: 'billing',
            allowSuperadmin: true
        }) as any as RequestHandler,
    adminSubscriptionController.getSubscriptionsByApp);

router.get('/subscriptions/user/:userId',
    requireRemotePermission(
        'subscription:read',
        { application: 'billing',
            allowSuperadmin: true
        }) as any as RequestHandler,
    adminSubscriptionController.getUserSubscriptions);

router.post('/subscriptions',
    requireRemotePermission(
        'subscription:create',
        { application: 'billing',
            allowSuperadmin: true
        }) as any as RequestHandler,
    adminSubscriptionController.createSubscription);

router.get('/subscriptions/:id',
    requireRemotePermission(
        'subscription:read',
        { application: 'billing',
            allowSuperadmin: true
        }) as any as RequestHandler,
    adminSubscriptionController.getSubscriptionById);

router.patch('/subscriptions/:id/status',
    requireRemotePermission(
        'subscription:update',
        { application: 'billing',
            allowSuperadmin: true
        }) as any as RequestHandler,
    adminSubscriptionController.updateSubscriptionStatus);

router.post('/subscriptions/:id/renew',
    requireRemotePermission(
        'subscription:upgrade',
        { application: 'billing',
            allowSuperadmin: true
        }) as any as RequestHandler,
    adminSubscriptionController.renewSubscription);

// Subscription plan routes
router.get('/plans',
    requireRemotePermission(
        'subscription:read',
        { application: 'billing',
            allowSuperadmin: true
        }) as any as RequestHandler,
    adminSubscriptionPlanController.getAllPlans);

router.get('/plans/:id',
    requireRemotePermission(
        'subscription:read',
        { application: 'billing',
            allowSuperadmin: true
        }) as any as RequestHandler,
    adminSubscriptionPlanController.getPlanById);

router.post('/plans',
    requireRemotePermission(
        'subscription:create',
        { application: 'billing',
            allowSuperadmin: true
        }) as any as RequestHandler,
    adminSubscriptionPlanController.createPlan);

router.put('/plans/:id',
    requireRemotePermission(
        'subscription:update',
        { application: 'billing',
            allowSuperadmin: true
        }) as any as RequestHandler,
    adminSubscriptionPlanController.updatePlan);

router.delete('/plans/:id',
    requireRemotePermission(
        'subscription:cancel',
        { application: 'billing',
            allowSuperadmin: true
        }) as any as RequestHandler,
    adminSubscriptionPlanController.deletePlan);

router.delete('/plans/:id/permanent',
    requireRemotePermission(
        'subscription:cancel',
        { application: 'billing',
            allowSuperadmin: true
        }) as any as RequestHandler,
    adminSubscriptionPlanController.hardDeletePlan);

// Plan feature routes
router.post('/plans/:planId/features',
    requireRemotePermission(
        'subscription:create',
        { application: 'billing',
            allowSuperadmin: true
        }) as any as RequestHandler,
    adminSubscriptionPlanController.addFeature);

router.put('/features/:featureId',
    requireRemotePermission(
        'subscription:update',
        { application: 'billing',
            allowSuperadmin: true
        }) as any as RequestHandler,
    adminSubscriptionPlanController.updateFeature);

router.delete('/features/:featureId',
    requireRemotePermission(
        'subscription:cancel',
        { application: 'billing',
            allowSuperadmin: true
        }) as any as RequestHandler,
    adminSubscriptionPlanController.deleteFeature);

// Promo code analytics routes
router.get('/promo-codes/analytics',
    requireRemotePermission(
        'subscription:read',
        { application: 'billing',
            allowSuperadmin: true
        }) as any as RequestHandler,
    promoCodeAnalyticsController.getAnalytics);

// Promo code routes
router.get('/promo-codes',
    // requireRemotePermission(
    //     'subscription:read',    
    //     { application: 'billing',
    //         allowSuperadmin: true
    //     }) as any as RequestHandler,
    adminPromoCodeController.getAllPromoCodes);

router.get('/promo-codes/:id',
    requireRemotePermission(
        'subscription:read',    
        { application: 'billing',
            allowSuperadmin: true
        }) as any as RequestHandler,
    adminPromoCodeController.getPromoCodeById);
router.post('/promo-codes',
    requireRemotePermission(
        'subscription:create',    
        { application: 'billing',
            allowSuperadmin: true
        }) as any as RequestHandler,
    adminPromoCodeController.createPromoCode);
router.put('/promo-codes/:id',
    requireRemotePermission(
        'subscription:update',    
        { application: 'billing',
            allowSuperadmin: true
        }) as any as RequestHandler,
    adminPromoCodeController.updatePromoCode);
router.delete('/promo-codes/:id', 
    requireRemotePermission(
        'subscription:cancel',    
        { application: 'billing',
            allowSuperadmin: true
        }) as any as RequestHandler,
    adminPromoCodeController.deletePromoCode);

router.get('/apps/dropdown',
    requireRemotePermission(
        'subscription:read',    
        { application: 'billing',
            allowSuperadmin: true
        }) as any as RequestHandler,
    adminSubscriptionPlanController.getAppsForDropdown);

export default router;
