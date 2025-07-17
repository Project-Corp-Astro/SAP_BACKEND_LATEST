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
exports.SubscriptionService = void 0;
const data_source_1 = require("../db/data-source");
const Subscription_entity_1 = require("../entities/Subscription.entity");
const SubscriptionEvent_entity_1 = require("../entities/SubscriptionEvent.entity");
const SubscriptionPlan_entity_1 = require("../entities/SubscriptionPlan.entity");
const Payment_entity_1 = require("../entities/Payment.entity");
const PromoCode_entity_1 = require("../entities/PromoCode.entity");
const SubscriptionPromoCode_entity_1 = require("../entities/SubscriptionPromoCode.entity");
const logger_1 = __importDefault(require("../utils/logger"));
const redis_1 = require("../utils/redis");
const promo_code_validation_service_1 = require("./promo-code-validation.service");
const api_error_1 = require("../errors/api-error");
class SubscriptionService {
    constructor() {
        this.initializeRepositories();
        this.promoCodeValidationService = new promo_code_validation_service_1.PromoCodeValidationService(this.getPromoCodeRepository(), this.getSubscriptionPromoCodeRepository(), this.getSubscriptionRepository());
    }
    initializeRepositories() {
        try {
            this.subscriptionRepository = data_source_1.AppDataSource.getRepository(Subscription_entity_1.Subscription);
            this.subscriptionEventRepository = data_source_1.AppDataSource.getRepository(SubscriptionEvent_entity_1.SubscriptionEvent);
            this.planRepository = data_source_1.AppDataSource.getRepository(SubscriptionPlan_entity_1.SubscriptionPlan);
            this.paymentRepository = data_source_1.AppDataSource.getRepository(Payment_entity_1.Payment);
            this.promoCodeRepository = data_source_1.AppDataSource.getRepository(PromoCode_entity_1.PromoCode);
            this.subscriptionPromoCodeRepository = data_source_1.AppDataSource.getRepository(SubscriptionPromoCode_entity_1.SubscriptionPromoCode);
            logger_1.default.info(`Initialized repositories for SubscriptionService`);
        }
        catch (error) {
            logger_1.default.error('Failed to initialize repositories in SubscriptionService:', error);
        }
    }
    getSubscriptionRepository() {
        if (!this.subscriptionRepository) {
            this.subscriptionRepository = data_source_1.AppDataSource.getRepository(Subscription_entity_1.Subscription);
        }
        return this.subscriptionRepository;
    }
    getSubscriptionEventRepository() {
        if (!this.subscriptionEventRepository) {
            this.subscriptionEventRepository = data_source_1.AppDataSource.getRepository(SubscriptionEvent_entity_1.SubscriptionEvent);
        }
        return this.subscriptionEventRepository;
    }
    getPlanRepository() {
        if (!this.planRepository) {
            this.planRepository = data_source_1.AppDataSource.getRepository(SubscriptionPlan_entity_1.SubscriptionPlan);
        }
        return this.planRepository;
    }
    getPaymentRepository() {
        if (!this.paymentRepository) {
            this.paymentRepository = data_source_1.AppDataSource.getRepository(Payment_entity_1.Payment);
        }
        return this.paymentRepository;
    }
    getPromoCodeRepository() {
        if (!this.promoCodeRepository) {
            this.promoCodeRepository = data_source_1.AppDataSource.getRepository(PromoCode_entity_1.PromoCode);
        }
        return this.promoCodeRepository;
    }
    getSubscriptionPromoCodeRepository() {
        if (!this.subscriptionPromoCodeRepository) {
            this.subscriptionPromoCodeRepository = data_source_1.AppDataSource.getRepository(SubscriptionPromoCode_entity_1.SubscriptionPromoCode);
        }
        return this.subscriptionPromoCodeRepository;
    }
    invalidateSubscriptionCache(filters) {
        return __awaiter(this, void 0, void 0, function* () {
            const pattern = filters ? `subscriptions:${JSON.stringify(filters)}` : 'subscriptions:*';
            yield redis_1.userSubsCache.deleteByPattern(pattern);
        });
    }
    invalidateSingleSubscriptionCache(subscriptionId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const cacheKey = `subscription:${subscriptionId}:${userId || 'admin'}`;
            yield redis_1.userSubsCache.del(cacheKey);
        });
    }
    invalidateUserSubscriptionsCache(userId, appId) {
        return __awaiter(this, void 0, void 0, function* () {
            const cacheKey = `subscriptions:user:${userId}:${appId || 'all'}`;
            yield redis_1.userSubsCache.del(cacheKey);
        });
    }
    getAllSubscriptions() {
        return __awaiter(this, arguments, void 0, function* (filters = {}) {
            const cacheKey = `subscriptions:${JSON.stringify(filters)}`;
            const cachedSubscriptions = yield redis_1.userSubsCache.get(cacheKey);
            if (cachedSubscriptions)
                return cachedSubscriptions;
            const subscriptions = yield this.getSubscriptionRepository().find({
                where: filters,
                relations: ['plan', 'payments', 'events'],
            });
            yield redis_1.userSubsCache.set(cacheKey, subscriptions, 3600);
            return subscriptions;
        });
    }
    getSubscriptionsByApp(appId) {
        return __awaiter(this, void 0, void 0, function* () {
            const cacheKey = `subscriptions:app:${appId}`;
            const cachedSubscriptions = yield redis_1.userSubsCache.get(cacheKey);
            if (cachedSubscriptions)
                return cachedSubscriptions;
            const subscriptions = yield this.getSubscriptionRepository().find({ where: { appId }, relations: ['plan', 'payments'] });
            yield redis_1.userSubsCache.set(cacheKey, subscriptions, 3600);
            return subscriptions;
        });
    }
    getUserSubscriptions(userId, appId) {
        return __awaiter(this, void 0, void 0, function* () {
            const cacheKey = `subscriptions:user:${userId}:${appId || 'all'}`;
            const cachedSubscriptions = yield redis_1.userSubsCache.get(cacheKey);
            if (cachedSubscriptions)
                return cachedSubscriptions;
            const where = { userId };
            if (appId)
                where.appId = appId;
            const subscriptions = yield this.getSubscriptionRepository().find({ where, relations: ['plan', 'payments', 'events'] });
            yield redis_1.userSubsCache.set(cacheKey, subscriptions, 3600);
            return subscriptions;
        });
    }
    getSubscriptionById(subscriptionId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const cacheKey = `subscription:${subscriptionId}:${userId || 'admin'}`;
            const cachedSubscription = yield redis_1.userSubsCache.get(cacheKey);
            if (cachedSubscription)
                return cachedSubscription;
            const where = { id: subscriptionId };
            if (userId)
                where.userId = userId;
            const subscription = yield this.getSubscriptionRepository().findOne({
                where,
                relations: ['plan', 'payments', 'events', 'promoCodes', 'promoCodes.promoCode'],
            });
            if (subscription) {
                yield redis_1.userSubsCache.set(cacheKey, subscription, 3600);
            }
            return subscription;
        });
    }
    createSubscription(planId, userId, appId, promoCodeId) {
        return __awaiter(this, void 0, void 0, function* () {
            return data_source_1.AppDataSource.transaction((transactionalEntityManager) => __awaiter(this, void 0, void 0, function* () {
                const planRepository = transactionalEntityManager.getRepository(SubscriptionPlan_entity_1.SubscriptionPlan);
                const subscriptionRepository = transactionalEntityManager.getRepository(Subscription_entity_1.Subscription);
                const promoCodeRepository = transactionalEntityManager.getRepository(PromoCode_entity_1.PromoCode);
                const subscriptionPromoCodeRepository = transactionalEntityManager.getRepository(SubscriptionPromoCode_entity_1.SubscriptionPromoCode);
                const plan = yield planRepository.findOne({ where: { id: planId, status: 'active' } });
                if (!plan) {
                    throw new api_error_1.NotFoundError('Subscription plan not found');
                }
                let price = plan.price;
                let promoCode = null;
                if (promoCodeId) {
                    const validationResult = yield this.promoCodeValidationService.validatePromoCode(promoCodeId, userId, planId);
                    if (!validationResult.isValid || !validationResult.promoCode) {
                        throw new api_error_1.BadRequestError(validationResult.message || 'Invalid promo code');
                    }
                    promoCode = validationResult.promoCode;
                    price = this.calculateDiscountedPrice(price, promoCode);
                }
                const subscriptionData = {
                    userId,
                    appId,
                    planId: plan.id,
                    status: plan.trialDays && plan.trialDays > 0 ? Subscription_entity_1.SubscriptionStatus.TRIAL : Subscription_entity_1.SubscriptionStatus.ACTIVE,
                    amount: price,
                    currency: plan.currency,
                    billingCycle: plan.billingCycle,
                    startDate: new Date(),
                    endDate: this.calculateEndDate(30, plan.billingCycle),
                    trialEndDate: plan.trialDays && plan.trialDays > 0 ? new Date(Date.now() + plan.trialDays * 24 * 60 * 60 * 1000) : undefined,
                };
                const newSubscription = subscriptionRepository.create(subscriptionData);
                const savedSubscription = yield subscriptionRepository.save(newSubscription);
                if (promoCode) {
                    const subPromoCode = subscriptionPromoCodeRepository.create({
                        subscription: savedSubscription,
                        promoCode: promoCode,
                        discountAmount: plan.price - price,
                        appliedDate: new Date(),
                        isActive: true,
                    });
                    yield subscriptionPromoCodeRepository.save(subPromoCode);
                    yield transactionalEntityManager.increment(PromoCode_entity_1.PromoCode, { id: promoCode.id }, 'usageCount', 1);
                }
                yield this.invalidateUserSubscriptionsCache(userId, appId);
                logger_1.default.info(`Successfully created subscription ${savedSubscription.id} for user ${userId}`);
                return savedSubscription;
            }));
        });
    }
    calculateDiscountedPrice(originalPrice, promoCode) {
        if (promoCode.discountType === PromoCode_entity_1.DiscountType.PERCENTAGE) {
            const discount = originalPrice * (promoCode.discountValue / 100);
            return Math.max(0, originalPrice - discount);
        }
        else if (promoCode.discountType === PromoCode_entity_1.DiscountType.FIXED) {
            return Math.max(0, originalPrice - promoCode.discountValue);
        }
        return originalPrice;
    }
    cancelSubscription(subscriptionId_1, userId_1) {
        return __awaiter(this, arguments, void 0, function* (subscriptionId, userId, cancelImmediately = false) {
            const subscription = yield this.getSubscriptionById(subscriptionId, userId);
            if (!subscription) {
                throw new api_error_1.NotFoundError('Subscription not found');
            }
            if (userId && subscription.userId !== userId) {
                throw new api_error_1.BadRequestError('Subscription does not belong to the user');
            }
            subscription.status = cancelImmediately ? Subscription_entity_1.SubscriptionStatus.CANCELED : subscription.status;
            subscription.cancelAtPeriodEnd = !cancelImmediately;
            subscription.canceledAt = new Date();
            yield this.getSubscriptionRepository().save(subscription);
            yield this.invalidateSingleSubscriptionCache(subscriptionId, userId);
            yield this.invalidateUserSubscriptionsCache(subscription.userId, subscription.appId);
            return subscription;
        });
    }
    updateSubscriptionStatus(subscriptionId, status) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.getSubscriptionRepository().update({ id: subscriptionId }, { status: status });
            const updatedSubscription = yield this.getSubscriptionById(subscriptionId);
            if (updatedSubscription) {
                yield this.invalidateSingleSubscriptionCache(subscriptionId);
                yield this.invalidateUserSubscriptionsCache(updatedSubscription.userId, updatedSubscription.appId);
            }
            return updatedSubscription;
        });
    }
    renewSubscription(subscriptionId) {
        return __awaiter(this, void 0, void 0, function* () {
            return data_source_1.AppDataSource.transaction((transactionalEntityManager) => __awaiter(this, void 0, void 0, function* () {
                const subscriptionRepository = transactionalEntityManager.getRepository(Subscription_entity_1.Subscription);
                const subscription = yield subscriptionRepository.findOne({ where: { id: subscriptionId }, relations: ['plan'] });
                if (!subscription) {
                    throw new api_error_1.NotFoundError('Subscription not found for renewal');
                }
                subscription.startDate = new Date();
                subscription.endDate = this.calculateEndDate(30, subscription.plan.billingCycle);
                subscription.status = Subscription_entity_1.SubscriptionStatus.ACTIVE;
                return subscriptionRepository.save(subscription);
            }));
        });
    }
    calculateEndDate(durationDays, billingCycle, startDate = new Date()) {
        const endDate = new Date(startDate);
        switch (billingCycle) {
            case 'quarterly':
                endDate.setMonth(endDate.getMonth() + 3);
                break;
            case 'monthly':
                endDate.setMonth(endDate.getMonth() + 1);
                break;
            case 'yearly':
                endDate.setFullYear(endDate.getFullYear() + 1);
                break;
            case 'weekly':
                endDate.setDate(endDate.getDate() + 7);
                break;
            case 'daily':
                endDate.setDate(endDate.getDate() + 1);
                break;
            default:
                endDate.setDate(endDate.getDate() + durationDays);
        }
        return endDate;
    }
    calculatePaymentAmount(subscription) {
        let amount = subscription.plan.price;
        if (subscription.promoCodes && subscription.promoCodes.length > 0) {
            const activePromoCodes = subscription.promoCodes.filter((pc) => pc.isActive);
            for (const promoCodeLink of activePromoCodes) {
                amount -= promoCodeLink.discountAmount;
            }
        }
        return Math.max(0, amount);
    }
}
exports.SubscriptionService = SubscriptionService;
exports.default = new SubscriptionService();
