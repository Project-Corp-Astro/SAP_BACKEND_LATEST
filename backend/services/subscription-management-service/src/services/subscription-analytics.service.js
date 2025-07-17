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
exports.subscriptionAnalyticsService = exports.SubscriptionAnalyticsService = void 0;
const typeorm_1 = require("typeorm");
const data_source_1 = require("../db/data-source");
const Subscription_entity_1 = require("../entities/Subscription.entity");
const SubscriptionPlan_entity_1 = require("../entities/SubscriptionPlan.entity");
const SubscriptionAnalytics_entity_1 = require("../entities/SubscriptionAnalytics.entity");
const date_fns_1 = require("date-fns");
const logger_1 = __importDefault(require("../utils/logger"));
class SubscriptionAnalyticsService {
    constructor() {
        this.CACHE_TTL = 3600;
        this.subscriptionRepository = data_source_1.AppDataSource.getRepository(Subscription_entity_1.Subscription);
        this.planRepository = data_source_1.AppDataSource.getRepository(SubscriptionPlan_entity_1.SubscriptionPlan);
        this.analyticsRepository = data_source_1.AppDataSource.getRepository(SubscriptionAnalytics_entity_1.SubscriptionAnalytics);
    }
    static getInstance() {
        if (!SubscriptionAnalyticsService.instance) {
            SubscriptionAnalyticsService.instance = new SubscriptionAnalyticsService();
        }
        return SubscriptionAnalyticsService.instance;
    }
    getAnalytics(range) {
        return __awaiter(this, void 0, void 0, function* () {
            const { startDate, endDate, appId } = range;
            try {
                const start = (0, date_fns_1.startOfDay)(new Date(startDate));
                const end = (0, date_fns_1.endOfDay)(new Date(endDate));
                const cacheKey = `analytics:${start.toISOString()}:${end.toISOString()}:${appId || 'all'}`;
                const cachedAnalytics = yield this.getCachedAnalytics(cacheKey);
                if (cachedAnalytics)
                    return cachedAnalytics;
                const analytics = yield this.calculateAnalytics(start, end, appId);
                yield this.cacheAnalytics(cacheKey, analytics);
                return analytics;
            }
            catch (error) {
                logger_1.default.error('Error in getAnalytics:', error);
                throw error;
            }
        });
    }
    calculateAnalytics(start, end, appId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const whereClause = appId ? { appId } : {};
                const [totalSubscribers, activeSubscriptions, newSubscribers, churned, trialConversions, plansWithCounts] = yield Promise.all([
                    this.getTotalSubscribersCount(start, end, appId),
                    this.getActiveSubscriptionsCount(start, end, appId),
                    this.getNewSubscribersCount(start, end, appId),
                    this.getChurnedSubscribersCount(start, end, appId),
                    this.getTrialSubscriptions(start, end, appId),
                    this.getSubscriptionPlans(start, end, appId)
                ]);
                const mrr = this.calculateMRR(plansWithCounts);
                const arr = this.calculateARR(plansWithCounts);
                const arpu = totalSubscribers > 0 ? mrr / totalSubscribers : 0;
                const churnRate = this.calculateChurnRate(churned, totalSubscribers);
                const conversionRate = this.calculateConversionRate(trialConversions, newSubscribers);
                const ltv = this.calculateLTV(arpu, churnRate);
                const trialConversionRate = this.calculateTrialConversionRate(trialConversions, plansWithCounts);
                const planDistribution = yield this.getPlanDistribution(start, end, appId);
                return {
                    date: new Date().toISOString(),
                    totalSubscribers,
                    activeSubscriptions,
                    monthlyRecurringRevenue: mrr,
                    annualRecurringRevenue: arr,
                    averageRevenuePerUser: arpu,
                    churnRate,
                    newSubscribers,
                    churned,
                    conversionRate,
                    lifetimeValue: ltv,
                    planDistribution,
                    upgradedRate: 0,
                    downgradedRate: 0,
                    freeTrialConversions: trialConversions,
                    renewalRate: 0
                };
            }
            catch (error) {
                logger_1.default.error('Error in calculateAnalytics:', error);
                throw error;
            }
        });
    }
    getTotalSubscribersCount(start, end, appId) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = this.subscriptionRepository
                .createQueryBuilder('s')
                .select('COUNT(DISTINCT s.userId)', 'count')
                .where('s.createdAt BETWEEN :start AND :end', { start, end });
            if (appId)
                query.andWhere('s.appId = :appId', { appId });
            const result = yield query.getRawOne();
            return parseInt((result === null || result === void 0 ? void 0 : result.count) || '0', 10);
        });
    }
    getActiveSubscriptionsCount(start, end, appId) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = this.subscriptionRepository
                .createQueryBuilder('s')
                .where('s.status = :status', { status: Subscription_entity_1.SubscriptionStatus.ACTIVE })
                .andWhere('s.startDate <= :end', { end })
                .andWhere('(s.endDate IS NULL OR s.endDate >= :start)', { start });
            if (appId)
                query.andWhere('s.appId = :appId', { appId });
            return query.getCount();
        });
    }
    getNewSubscribersCount(start, end, appId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.subscriptionRepository.count({
                where: Object.assign({ startDate: (0, typeorm_1.Between)(start, end) }, (appId ? { appId } : {}))
            });
        });
    }
    getChurnedSubscribersCount(start, end, appId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.subscriptionRepository.count({
                where: Object.assign({ status: Subscription_entity_1.SubscriptionStatus.CANCELED, endDate: (0, typeorm_1.Between)(start, end) }, (appId ? { appId } : {}))
            });
        });
    }
    getTrialSubscriptions(start, end, appId) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = this.subscriptionRepository
                .createQueryBuilder('s')
                .innerJoin('s.plan', 'p', 'p.trialDays > 0')
                .where('s.status = :status', { status: Subscription_entity_1.SubscriptionStatus.ACTIVE })
                .andWhere('s.trialEndDate IS NOT NULL')
                .andWhere('s.startDate BETWEEN :start AND :end', { start, end });
            if (appId)
                query.andWhere('s.appId = :appId', { appId });
            return query.getCount();
        });
    }
    getSubscriptionPlans(start, end, appId) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = this.planRepository
                .createQueryBuilder('p')
                .leftJoin('p.subscriptions', 's', 's.startDate <= :end AND (s.endDate IS NULL OR s.endDate >= :start)', { start, end })
                .addSelect('COUNT(s.id)', 'subscriberCount')
                .groupBy('p.id');
            if (appId)
                query.andWhere('p.appId = :appId', { appId });
            const results = yield query.getRawAndEntities();
            return results.entities.map((plan, index) => {
                var _a;
                return ({
                    plan,
                    count: parseInt(((_a = results.raw[index]) === null || _a === void 0 ? void 0 : _a.subscriberCount) || '0', 10)
                });
            });
        });
    }
    calculateMRR(plans) {
        return plans.reduce((total, { plan, count }) => {
            let rate = plan.price;
            if (plan.billingCycle === SubscriptionPlan_entity_1.BillingCycle.YEARLY)
                rate /= 12;
            if (plan.billingCycle === SubscriptionPlan_entity_1.BillingCycle.QUARTERLY)
                rate /= 3;
            return total + rate * count;
        }, 0);
    }
    calculateARR(plans) {
        return this.calculateMRR(plans) * 12;
    }
    calculateChurnRate(churned, total) {
        return total > 0 ? (churned / total) * 100 : 0;
    }
    calculateConversionRate(trialConversions, newSubs) {
        return newSubs > 0 ? (trialConversions / newSubs) * 100 : 0;
    }
    calculateLTV(arpu, churnRate) {
        return churnRate > 0 ? arpu / (churnRate / 100) : 0;
    }
    calculateTrialConversionRate(trialConversions, plans) {
        const totalTrials = plans.reduce((sum, { plan, count }) => {
            return plan.trialDays && plan.trialDays > 0 ? sum + count : sum;
        }, 0);
        return totalTrials > 0 ? (trialConversions / totalTrials) * 100 : 0;
    }
    getPlanDistribution(start, end, appId) {
        return __awaiter(this, void 0, void 0, function* () {
            const plans = yield this.getSubscriptionPlans(start, end, appId);
            const total = plans.reduce((sum, { count }) => sum + count, 0);
            return plans.reduce((acc, { plan, count }) => {
                acc[plan.name] = {
                    count,
                    percentage: total > 0 ? (count / total) * 100 : 0
                };
                return acc;
            }, {});
        });
    }
    getCachedAnalytics(_key) {
        return __awaiter(this, void 0, void 0, function* () {
            return null; // Implement caching logic (e.g., Redis)
        });
    }
    cacheAnalytics(_key, _data) {
        return __awaiter(this, void 0, void 0, function* () {
            // Implement cache set logic
        });
    }
}
exports.SubscriptionAnalyticsService = SubscriptionAnalyticsService;
exports.subscriptionAnalyticsService = SubscriptionAnalyticsService.getInstance();
