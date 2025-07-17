"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const subscription_analytics_controller_1 = require("../controllers/subscription-analytics.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const permission_client_1 = require("@corp-astro/permission-client");
const router = (0, express_1.Router)();
// Apply auth middleware to all routes
router.use(auth_middleware_1.authMiddleware);
// Get analytics for a specific date range
router.get('/', (0, permission_client_1.requireRemotePermission)('analytics:view', { application: 'billing',
    allowSuperadmin: true
}), subscription_analytics_controller_1.SubscriptionAnalyticsController.getAnalytics);
// Get analytics for the last 30 days
router.get('/current', (0, permission_client_1.requireRemotePermission)('analytics:view', { application: 'billing',
    allowSuperadmin: true
}), subscription_analytics_controller_1.SubscriptionAnalyticsController.getCurrentAnalytics);
exports.default = router;
