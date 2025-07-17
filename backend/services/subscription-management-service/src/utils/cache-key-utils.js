"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheKeyUtils = void 0;
class CacheKeyUtils {
    static getPromoCodeKey(promoCodeId) {
        return `${this.PREFIX}:promo:${promoCodeId}`;
    }
    static getValidationKey(promoCodeId, userId) {
        return `${this.PREFIX}:validate:${userId}:${promoCodeId}`;
    }
    static getFilterKey(filters) {
        return `${this.PREFIX}:filters:${filters}`;
    }
    static getSubscriptionKey(subscriptionId) {
        return `${this.PREFIX}:subscriptions:${subscriptionId}`;
    }
    static getTTL() {
        return this.TTL;
    }
    static getPatternsForPromo(promoCodeId) {
        return [
            this.getPromoCodeKey(promoCodeId),
            `promo:validate:*:${promoCodeId}:*`,
            `promos:filters:*:promo:${promoCodeId}`,
            `subscriptions:*:promo:${promoCodeId}`,
        ];
    }
}
exports.CacheKeyUtils = CacheKeyUtils;
CacheKeyUtils.PREFIX = 'subscription:promos';
CacheKeyUtils.TTL = 60 * 4; // 4 minutes
