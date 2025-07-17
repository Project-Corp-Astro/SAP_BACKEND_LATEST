"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const subscription_controller_1 = require("../controllers/app/subscription.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = express_1.default.Router();
const appSubscriptionController = new subscription_controller_1.AppSubscriptionController();
// Apply authentication middleware to routes that require user authentication
router.use(auth_middleware_1.authMiddleware);
// Subscription routes
router.get('/app/:appId/plans', appSubscriptionController.getAvailablePlans);
router.get('/app/:appId/user', appSubscriptionController.getUserSubscription);
router.post('/app/:appId/subscribe', appSubscriptionController.createSubscription);
router.post('/app/:appId/subscription/:subscriptionId/cancel', appSubscriptionController.cancelSubscription);
router.post('/app/:appId/promo-code/validate', appSubscriptionController.validatePromoCode);
exports.default = router;
