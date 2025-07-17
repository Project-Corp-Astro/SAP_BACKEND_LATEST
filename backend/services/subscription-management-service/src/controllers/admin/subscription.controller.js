"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminSubscriptionController = void 0;
const subscription_service_1 = __importDefault(require("../../services/subscription.service"));
const asyncHandler_1 = require("../../utils/asyncHandler");
/**
 * Admin controller for subscription management
 * Provides all admin functionality for managing subscriptions across all apps and users
 *
 * @swagger
 * tags:
 *   name: AdminSubscriptions
 *   description: Administrative management of user subscriptions across all apps
 */
class AdminSubscriptionController {
    constructor() {
        /**
         * Get all subscriptions with optional filters
         */
        this.getAllSubscriptions = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(this, void 0, void 0, function* () {
            const filters = req.query;
            const subscriptions = yield subscription_service_1.default.getAllSubscriptions(filters);
            return res.json(subscriptions);
        }));
        /**
         * Get subscriptions for a specific app
         */
        this.getSubscriptionsByApp = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(this, void 0, void 0, function* () {
            const { appId } = req.params;
            const subscriptions = yield subscription_service_1.default.getSubscriptionsByApp(appId);
            return res.json(subscriptions);
        }));
        /**
         * Get subscriptions for a specific user
         */
        this.getUserSubscriptions = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(this, void 0, void 0, function* () {
            const { userId } = req.params;
            const { appId } = req.query;
            const subscriptions = yield subscription_service_1.default.getUserSubscriptions(userId, appId);
            return res.json(subscriptions);
        }));
        /**
         * Create a new subscription
         */
        this.createSubscription = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(this, void 0, void 0, function* () {
            const { planId, userId, appId, promoCodeId } = req.body;
            if (!planId || !userId || !appId) {
                return res.status(400).json({ message: 'planId, userId, and appId are required' });
            }
            const subscription = yield subscription_service_1.default.createSubscription(planId, userId, appId, promoCodeId);
            return res.status(201).json(subscription);
        }));
        /**
         * Get a specific subscription by ID
         */
        this.getSubscriptionById = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(this, void 0, void 0, function* () {
            const { id } = req.params;
            const subscription = yield subscription_service_1.default.getSubscriptionById(id);
            if (!subscription) {
                return res.status(404).json({ message: 'Subscription not found' });
            }
            return res.json(subscription);
        }));
        /**
         * Update subscription status (admin function)
         */
        this.updateSubscriptionStatus = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(this, void 0, void 0, function* () {
            const { id } = req.params;
            const { status } = req.body;
            if (!status) {
                return res.status(400).json({ message: 'Status is required' });
            }
            const allowedStatuses = ['active', 'canceled', 'expired', 'suspended', 'past_due'];
            if (!allowedStatuses.includes(status)) {
                return res.status(400).json({
                    message: `Status must be one of: ${allowedStatuses.join(', ')}`,
                });
            }
            const subscription = yield subscription_service_1.default.updateSubscriptionStatus(id, status);
            if (!subscription) {
                return res.status(404).json({ message: 'Subscription not found' });
            }
            return res.json(subscription);
        }));
        /**
         * Force renewal of a subscription (admin function)
         */
        this.renewSubscription = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(this, void 0, void 0, function* () {
            const { id } = req.params;
            const subscription = yield subscription_service_1.default.renewSubscription(id);
            if (!subscription) {
                return res.status(404).json({ message: 'Subscription not found' });
            }
            return res.json(subscription);
        }));
    }
}
exports.AdminSubscriptionController = AdminSubscriptionController;
exports.default = new AdminSubscriptionController();
