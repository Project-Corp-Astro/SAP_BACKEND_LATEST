"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const subscription_controller_1 = require("../controllers/admin/subscription.controller");
const subscription_plan_controller_1 = __importDefault(require("../controllers/admin/subscription-plan.controller"));
const promo_code_controller_1 = require("../controllers/admin/promo-code.controller");
const promo_code_analytics_controller_1 = __importDefault(require("../controllers/admin/promo-code-analytics.controller"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const permission_client_1 = require("@corp-astro/permission-client");
const router = express_1.default.Router();
const adminSubscriptionController = new subscription_controller_1.AdminSubscriptionController();
const adminPromoCodeController = new promo_code_controller_1.AdminPromoCodeController();
// Apply authentication middleware to all routes
router.use(auth_middleware_1.authMiddleware);
// Subscription routes
router.get('/subscriptions', (0, permission_client_1.requireRemotePermission)('subscription:read', {
    application: "billing",
    allowSuperadmin: true
}), adminSubscriptionController.getAllSubscriptions);
router.get('/subscriptions/app/:appId', (0, permission_client_1.requireRemotePermission)('subscription:read', { application: 'billing',
    allowSuperadmin: true
}), adminSubscriptionController.getSubscriptionsByApp);
router.get('/subscriptions/user/:userId', (0, permission_client_1.requireRemotePermission)('subscription:read', { application: 'billing',
    allowSuperadmin: true
}), adminSubscriptionController.getUserSubscriptions);
router.post('/subscriptions', (0, permission_client_1.requireRemotePermission)('subscription:create', { application: 'billing',
    allowSuperadmin: true
}), adminSubscriptionController.createSubscription);
router.get('/subscriptions/:id', (0, permission_client_1.requireRemotePermission)('subscription:read', { application: 'billing',
    allowSuperadmin: true
}), adminSubscriptionController.getSubscriptionById);
router.patch('/subscriptions/:id/status', (0, permission_client_1.requireRemotePermission)('subscription:update', { application: 'billing',
    allowSuperadmin: true
}), adminSubscriptionController.updateSubscriptionStatus);
router.post('/subscriptions/:id/renew', (0, permission_client_1.requireRemotePermission)('subscription:upgrade', { application: 'billing',
    allowSuperadmin: true
}), adminSubscriptionController.renewSubscription);
// Subscription plan routes
router.get('/plans', (0, permission_client_1.requireRemotePermission)('subscription:read', { application: 'billing',
    allowSuperadmin: true
}), subscription_plan_controller_1.default.getAllPlans);
router.get('/plans/:id', (0, permission_client_1.requireRemotePermission)('subscription:read', { application: 'billing',
    allowSuperadmin: true
}), subscription_plan_controller_1.default.getPlanById);
router.post('/plans', (0, permission_client_1.requireRemotePermission)('subscription:create', { application: 'billing',
    allowSuperadmin: true
}), subscription_plan_controller_1.default.createPlan);
router.put('/plans/:id', (0, permission_client_1.requireRemotePermission)('subscription:update', { application: 'billing',
    allowSuperadmin: true
}), subscription_plan_controller_1.default.updatePlan);
router.delete('/plans/:id', (0, permission_client_1.requireRemotePermission)('subscription:cancel', { application: 'billing',
    allowSuperadmin: true
}), subscription_plan_controller_1.default.deletePlan);
router.delete('/plans/:id/permanent', (0, permission_client_1.requireRemotePermission)('subscription:cancel', { application: 'billing',
    allowSuperadmin: true
}), subscription_plan_controller_1.default.hardDeletePlan);
// Plan feature routes
router.post('/plans/:planId/features', (0, permission_client_1.requireRemotePermission)('subscription:create', { application: 'billing',
    allowSuperadmin: true
}), subscription_plan_controller_1.default.addFeature);
router.put('/features/:featureId', (0, permission_client_1.requireRemotePermission)('subscription:update', { application: 'billing',
    allowSuperadmin: true
}), subscription_plan_controller_1.default.updateFeature);
router.delete('/features/:featureId', (0, permission_client_1.requireRemotePermission)('subscription:cancel', { application: 'billing',
    allowSuperadmin: true
}), subscription_plan_controller_1.default.deleteFeature);
// Promo code analytics routes
router.get('/promo-codes/analytics', (0, permission_client_1.requireRemotePermission)('subscription:read', { application: 'billing',
    allowSuperadmin: true
}), promo_code_analytics_controller_1.default.getAnalytics);
// Promo code routes
router.get('/promo-codes', (0, permission_client_1.requireRemotePermission)('subscription:read', { application: 'billing',
    allowSuperadmin: true
}), adminPromoCodeController.getAllPromoCodes);
router.get('/promo-codes/:id', (0, permission_client_1.requireRemotePermission)('subscription:read', { application: 'billing',
    allowSuperadmin: true
}), adminPromoCodeController.getPromoCodeById);
router.post('/promo-codes', (0, permission_client_1.requireRemotePermission)('subscription:create', { application: 'billing',
    allowSuperadmin: true
}), adminPromoCodeController.createPromoCode);
router.put('/promo-codes/:id', (0, permission_client_1.requireRemotePermission)('subscription:update', { application: 'billing',
    allowSuperadmin: true
}), adminPromoCodeController.updatePromoCode);
router.delete('/promo-codes/:id', (0, permission_client_1.requireRemotePermission)('subscription:cancel', { application: 'billing',
    allowSuperadmin: true
}), adminPromoCodeController.deletePromoCode);
router.get('/apps/dropdown', (0, permission_client_1.requireRemotePermission)('subscription:read', { application: 'billing',
    allowSuperadmin: true
}), subscription_plan_controller_1.default.getAppsForDropdown);
exports.default = router;
