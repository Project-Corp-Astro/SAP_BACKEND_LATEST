"use strict";
/**
 * SubscriptionPromoCode Entity
 * Links subscriptions to promo codes
 */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionPromoCode = void 0;
const typeorm_1 = require("typeorm");
const PromoCode_entity_1 = require("./PromoCode.entity");
const Subscription_entity_1 = require("./Subscription.entity");
let SubscriptionPromoCode = class SubscriptionPromoCode {
};
exports.SubscriptionPromoCode = SubscriptionPromoCode;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], SubscriptionPromoCode.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    (0, typeorm_1.Index)('IDX_SUBSCRIPTION_PROMO_SUB_ID'),
    __metadata("design:type", String)
], SubscriptionPromoCode.prototype, "subscriptionId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Subscription_entity_1.Subscription),
    (0, typeorm_1.JoinColumn)(),
    __metadata("design:type", Subscription_entity_1.Subscription)
], SubscriptionPromoCode.prototype, "subscription", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    (0, typeorm_1.Index)('IDX_SUBSCRIPTION_PROMO_CODE_ID'),
    __metadata("design:type", String)
], SubscriptionPromoCode.prototype, "promoCodeId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => PromoCode_entity_1.PromoCode),
    (0, typeorm_1.JoinColumn)(),
    __metadata("design:type", PromoCode_entity_1.PromoCode)
], SubscriptionPromoCode.prototype, "promoCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], SubscriptionPromoCode.prototype, "discountAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", Date)
], SubscriptionPromoCode.prototype, "appliedDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], SubscriptionPromoCode.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamp' }),
    __metadata("design:type", Date)
], SubscriptionPromoCode.prototype, "createdAt", void 0);
exports.SubscriptionPromoCode = SubscriptionPromoCode = __decorate([
    (0, typeorm_1.Entity)('subscription_promo_codes')
], SubscriptionPromoCode);
