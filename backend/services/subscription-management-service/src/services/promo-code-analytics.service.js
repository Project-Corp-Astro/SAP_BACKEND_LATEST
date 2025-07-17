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
exports.PromoCodeAnalyticsService = void 0;
const data_source_1 = require("../db/data-source");
const PromoCode_entity_1 = require("../entities/PromoCode.entity");
const SubscriptionPromoCode_entity_1 = require("../entities/SubscriptionPromoCode.entity");
const SubscriptionAnalytics_entity_1 = require("../entities/SubscriptionAnalytics.entity");
const logger_1 = __importDefault(require("../utils/logger"));
class PromoCodeAnalyticsService {
    constructor() {
        this.promoCodeRepository = data_source_1.AppDataSource.getRepository(PromoCode_entity_1.PromoCode);
        this.subscriptionPromoCodeRepository = data_source_1.AppDataSource.getRepository(SubscriptionPromoCode_entity_1.SubscriptionPromoCode);
        this.subscriptionAnalyticsRepository = data_source_1.AppDataSource.getRepository(SubscriptionAnalytics_entity_1.SubscriptionAnalytics);
    }
    static getInstance() {
        if (!PromoCodeAnalyticsService.instance) {
            PromoCodeAnalyticsService.instance = new PromoCodeAnalyticsService();
        }
        return PromoCodeAnalyticsService.instance;
    }
    /**
     * Get comprehensive promo code analytics
     */
    getAnalytics() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [overview, metrics, monthlyTrends] = yield Promise.all([
                    this.getOverview(),
                    this.getPromoCodeMetrics(),
                    this.getMonthlyTrends(),
                ]);
                const performance = metrics.map((m) => ({
                    code: m.code,
                    redemptions: m.redemptions,
                    discountValue: m.discountValue,
                    conversionRate: m.uniqueUsers > 0 ? (m.redemptions / m.uniqueUsers) * 100 : 0,
                    averageDiscount: m.redemptions > 0 ? m.discountValue / m.redemptions : 0,
                    usageTrend: m.usageTrend,
                }));
                const campaignInsights = metrics.map((m) => ({
                    code: m.code,
                    performance: {
                        redemptions: m.redemptions,
                        discountValue: m.discountValue,
                        conversionRate: m.uniqueUsers > 0 ? (m.redemptions / m.uniqueUsers) * 100 : 0,
                    },
                    recommendations: this.generateRecommendations({
                        redemptions: m.redemptions,
                        discountValue: m.discountValue,
                        conversionRate: m.uniqueUsers > 0 ? (m.redemptions / m.uniqueUsers) * 100 : 0,
                    }),
                }));
                return {
                    overview,
                    performance,
                    monthlyTrends,
                    campaignInsights,
                };
            }
            catch (error) {
                // Type-safe error handling
                if (error instanceof Error) {
                    logger_1.default.error('Error getting promo code analytics:', { error: error.message, stack: error.stack });
                    throw new Error(`Failed to fetch promo code analytics: ${error.message}`);
                }
                else {
                    logger_1.default.error('Error getting promo code analytics:', { error: String(error) });
                    throw new Error('Failed to fetch promo code analytics: Unknown error');
                }
            }
        });
    }
    /**
     * Get promo code overview statistics
     */
    getOverview() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [totalCodes, activeCodes, totalRedemptions, totalDiscountValue, mostUsedCode] = yield Promise.all([
                    this.promoCodeRepository.count(),
                    this.promoCodeRepository.count({ where: { isActive: true } }),
                    this.subscriptionPromoCodeRepository.count(),
                    this.subscriptionPromoCodeRepository
                        .createQueryBuilder('spc')
                        .select('SUM(spc.discountAmount)', 'total')
                        .getRawOne(),
                    this.subscriptionPromoCodeRepository
                        .createQueryBuilder('spc')
                        .leftJoin('spc.promoCode', 'pc')
                        .select(['pc.code AS pc_code'])
                        .addSelect('COUNT(spc.id)', 'redemptions')
                        .addSelect('SUM(spc.discountAmount)', 'discountValue')
                        .groupBy('pc.id, pc.code')
                        .orderBy('redemptions', 'DESC')
                        .limit(1)
                        .getRawOne(),
                ]);
                return {
                    totalCodes,
                    activeCodes,
                    totalRedemptions,
                    totalDiscountValue: Number(totalDiscountValue === null || totalDiscountValue === void 0 ? void 0 : totalDiscountValue.total) || 0,
                    averageDiscount: totalRedemptions > 0 ? (Number(totalDiscountValue === null || totalDiscountValue === void 0 ? void 0 : totalDiscountValue.total) || 0) / totalRedemptions : 0,
                    mostUsedCode: {
                        code: (mostUsedCode === null || mostUsedCode === void 0 ? void 0 : mostUsedCode.pc_code) || '',
                        redemptions: Number(mostUsedCode === null || mostUsedCode === void 0 ? void 0 : mostUsedCode.redemptions) || 0,
                        discountValue: Number(mostUsedCode === null || mostUsedCode === void 0 ? void 0 : mostUsedCode.discountValue) || 0,
                    },
                };
            }
            catch (error) {
                // Type-safe error handling
                if (error instanceof Error) {
                    logger_1.default.error('Error getting promo code overview:', { error: error.message, stack: error.stack });
                    throw new Error(`Failed to fetch promo code overview: ${error.message}`);
                }
                else {
                    logger_1.default.error('Error getting promo code overview:', { error: String(error) });
                    throw new Error('Failed to fetch promo code overview: Unknown error');
                }
            }
        });
    }
    /**
     * Get aggregated metrics for all promo codes
     */
    getPromoCodeMetrics() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Fetch redemption counts and discount values
                const redemptionMetrics = yield this.subscriptionPromoCodeRepository
                    .createQueryBuilder('spc')
                    .select('spc.promoCodeId', 'id')
                    .addSelect('pc.code', 'code')
                    .addSelect('COUNT(spc.id)', 'redemptions')
                    .addSelect('SUM(spc.discountAmount)', 'discountValue')
                    .addSelect('COUNT(DISTINCT spc.subscriptionId)', 'uniqueUsers')
                    .leftJoin('spc.promoCode', 'pc')
                    .groupBy('spc.promoCodeId, pc.code')
                    .getRawMany();
                // Fetch usage trends for all promo codes in a single query
                const usageTrends = yield this.subscriptionPromoCodeRepository
                    .createQueryBuilder('spc')
                    .select('spc.promoCodeId', 'id')
                    .addSelect('DATE_TRUNC(:interval, spc.appliedDate)', 'month')
                    .addSelect('COUNT(spc.id)', 'redemptions')
                    .addSelect('SUM(spc.discountAmount)', 'discountValue')
                    .setParameter('interval', 'month')
                    .groupBy('spc.promoCodeId, DATE_TRUNC(:interval, spc.appliedDate)')
                    .orderBy('spc.promoCodeId, month', 'ASC')
                    .getRawMany();
                // Group usage trends by promoCodeId
                const trendMap = new Map();
                usageTrends.forEach((trend) => {
                    const trends = trendMap.get(trend.id) || [];
                    trends.push({
                        month: trend.month,
                        redemptions: Number(trend.redemptions),
                        discountValue: Number(trend.discountValue),
                    });
                    trendMap.set(trend.id, trends);
                });
                // Combine metrics
                return redemptionMetrics.map((metric) => ({
                    id: metric.id,
                    code: metric.code,
                    redemptions: Number(metric.redemptions),
                    discountValue: Number(metric.discountValue),
                    uniqueUsers: Number(metric.uniqueUsers),
                    usageTrend: trendMap.get(metric.id) || [],
                }));
            }
            catch (error) {
                // Type-safe error handling
                if (error instanceof Error) {
                    logger_1.default.error('Error getting promo code metrics:', { error: error.message, stack: error.stack });
                    throw new Error(`Failed to fetch promo code metrics: ${error.message}`);
                }
                else {
                    logger_1.default.error('Error getting promo code metrics:', { error: String(error) });
                    throw new Error('Failed to fetch promo code metrics: Unknown error');
                }
            }
        });
    }
    /**
     * Get monthly redemption trends
     */
    getMonthlyTrends() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const trends = yield this.subscriptionPromoCodeRepository
                    .createQueryBuilder('spc')
                    .select('DATE_TRUNC(:interval, spc.appliedDate)', 'month')
                    .addSelect('COUNT(spc.id)', 'redemptions')
                    .addSelect('SUM(spc.discountAmount)', 'discountValue')
                    .addSelect('AVG(spc.discountAmount)', 'averageDiscount')
                    .setParameter('interval', 'month')
                    .groupBy('DATE_TRUNC(:interval, spc.appliedDate)')
                    .orderBy('month', 'ASC')
                    .getRawMany();
                // Get unique users and total exposures for conversion rate calculation
                const exposureStats = yield this.subscriptionAnalyticsRepository
                    .createQueryBuilder('sa')
                    .select('DATE_TRUNC(:interval, sa.date)', 'month')
                    .addSelect('COUNT(DISTINCT sa.appId)', 'uniqueUsers')
                    .addSelect('COUNT(sa.id)', 'totalExposures')
                    .setParameter('interval', 'month')
                    .groupBy('DATE_TRUNC(:interval, sa.date)')
                    .getRawMany();
                // Combine exposure stats with redemption trends
                const combinedTrends = trends.map((trend) => {
                    const exposure = exposureStats.find(e => e.month === trend.month);
                    const uniqueRedemptions = Number(trend.redemptions);
                    const totalExposures = exposure ? Number(exposure.totalExposures) : 0;
                    const conversionRate = totalExposures > 0 ? (uniqueRedemptions / totalExposures) * 100 : 0;
                    return {
                        month: trend.month,
                        redemptions: uniqueRedemptions,
                        discountValue: Number(trend.discountValue),
                        conversionRate: conversionRate,
                    };
                });
                return combinedTrends;
            }
            catch (error) {
                // Type-safe error handling
                if (error instanceof Error) {
                    logger_1.default.error('Error getting monthly trends:', { error: error.message, stack: error.stack });
                    throw new Error(`Failed to fetch monthly trends: ${error.message}`);
                }
                else {
                    logger_1.default.error('Error getting monthly trends:', { error: String(error) });
                    throw new Error('Failed to fetch monthly trends: Unknown error');
                }
            }
        });
    }
    /**
     * Generate recommendations based on performance metrics
     */
    generateRecommendations(performance) {
        const recommendations = [];
        if (performance.redemptions < 10) {
            recommendations.push({
                type: 'increase',
                metric: 'Visibility',
                reason: 'Low redemption rate indicates limited exposure',
            });
        }
        if (performance.conversionRate < 20) {
            recommendations.push({
                type: 'increase',
                metric: 'Conversion',
                reason: 'Low conversion rate suggests potential targeting issues',
            });
        }
        if (performance.discountValue > 1000) {
            recommendations.push({
                type: 'decrease',
                metric: 'Discount',
                reason: 'High discount value may be cannibalizing revenue',
            });
        }
        return recommendations;
    }
}
exports.PromoCodeAnalyticsService = PromoCodeAnalyticsService;
