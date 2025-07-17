"use strict";
/**
 * SubscriptionAnalytics Entity
 * Represents analytics data for subscription metrics
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
exports.SubscriptionAnalytics = void 0;
const typeorm_1 = require("typeorm");
let SubscriptionAnalytics = class SubscriptionAnalytics {
};
exports.SubscriptionAnalytics = SubscriptionAnalytics;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], SubscriptionAnalytics.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "uuid", nullable: true }),
    (0, typeorm_1.Index)("IDX_SUBSCRIPTION_ANALYTICS_APP_ID"),
    __metadata("design:type", String)
], SubscriptionAnalytics.prototype, "appId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "date" }),
    (0, typeorm_1.Index)("IDX_SUBSCRIPTION_ANALYTICS_DATE"),
    __metadata("design:type", Date)
], SubscriptionAnalytics.prototype, "date", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", default: 0 }),
    __metadata("design:type", Number)
], SubscriptionAnalytics.prototype, "totalSubscribers", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", default: 0 }),
    __metadata("design:type", Number)
], SubscriptionAnalytics.prototype, "activeSubscriptions", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "numeric", precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], SubscriptionAnalytics.prototype, "monthlyRecurringRevenue", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "numeric", precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], SubscriptionAnalytics.prototype, "annualRecurringRevenue", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "numeric", precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], SubscriptionAnalytics.prototype, "averageRevenuePerUser", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "numeric", precision: 5, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], SubscriptionAnalytics.prototype, "churnRate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", default: 0 }),
    __metadata("design:type", Number)
], SubscriptionAnalytics.prototype, "newSubscribers", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", default: 0 }),
    __metadata("design:type", Number)
], SubscriptionAnalytics.prototype, "churned", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "numeric", precision: 5, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], SubscriptionAnalytics.prototype, "conversionRate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "numeric", precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], SubscriptionAnalytics.prototype, "lifetimeValue", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "jsonb", default: "{}" }),
    __metadata("design:type", Object)
], SubscriptionAnalytics.prototype, "planDistribution", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "numeric", precision: 5, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], SubscriptionAnalytics.prototype, "upgradedRate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "numeric", precision: 5, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], SubscriptionAnalytics.prototype, "downgradedRate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", default: 0 }),
    __metadata("design:type", Number)
], SubscriptionAnalytics.prototype, "freeTrialConversions", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "numeric", precision: 5, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], SubscriptionAnalytics.prototype, "renewalRate", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamp' }),
    __metadata("design:type", Date)
], SubscriptionAnalytics.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ type: 'timestamp' }),
    __metadata("design:type", Date)
], SubscriptionAnalytics.prototype, "updatedAt", void 0);
exports.SubscriptionAnalytics = SubscriptionAnalytics = __decorate([
    (0, typeorm_1.Entity)('subscription_analytics')
], SubscriptionAnalytics);
