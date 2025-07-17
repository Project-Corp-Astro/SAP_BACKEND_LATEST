"use strict";
/**
 * SubscriptionPlan Entity
 * Represents a subscription plan that users can subscribe to
 *
 * @swagger
 * components:
 *   schemas:
 *     BillingCycle:
 *       type: string
 *       enum:
 *         - monthly
 *         - quarterly
 *         - yearly
 *       example: monthly
 *       description: Frequency of billing
 *
 *     PlanStatus:
 *       type: string
 *       enum:
 *         - active
 *         - draft
 *         - archived
 *       example: active
 *       description: Current status of the plan
 *
 *     SubscriptionPlan:
 *       type: object
 *       required:
 *         - id
 *         - name
 *         - description
 *         - price
 *         - status
 *         - billingCycle
 *         - appId
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the subscription plan
 *           example: 550e8400-e29b-41d4-a716-446655440000
 *         name:
 *           type: string
 *           description: Name of the subscription plan
 *           example: Premium Plan
 *         description:
 *           type: string
 *           description: Detailed description of the subscription plan
 *           example: Access to all premium features with priority support
 *         price:
 *           type: number
 *           format: float
 *           description: Regular price of the plan
 *           example: 19.99
 *         annualPrice:
 *           type: number
 *           format: float
 *           description: Annual price (with discount if applicable)
 *           example: 199.99
 *           nullable: true
 *         billingCycle:
 *           $ref: '#/components/schemas/BillingCycle'
 *         trialDays:
 *           type: integer
 *           description: Number of days in trial period
 *           example: 14
 *           nullable: true
 *         status:
 *           $ref: '#/components/schemas/PlanStatus'
 *         appId:
 *           type: string
 *           format: uuid
 *           description: ID of the application this plan belongs to
 *         features:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Unlimited Storage
 *               description:
 *                 type: string
 *                 example: Store unlimited files in your account
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the plan was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: When the plan was last updated
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
exports.SubscriptionPlan = exports.PlanStatus = exports.BillingCycle = void 0;
const typeorm_1 = require("typeorm");
const PlanFeature_entity_1 = require("./PlanFeature.entity");
const Subscription_entity_1 = require("./Subscription.entity");
const PromoCodeApplicablePlan_entity_1 = require("./PromoCodeApplicablePlan.entity");
const App_entity_1 = require("./App.entity");
var BillingCycle;
(function (BillingCycle) {
    BillingCycle["MONTHLY"] = "monthly";
    BillingCycle["QUARTERLY"] = "quarterly";
    BillingCycle["SEMI_ANNUAL"] = "semi_annual";
    BillingCycle["ANNUAL"] = "annual";
    BillingCycle["YEARLY"] = "yearly"; // Alias for annual
})(BillingCycle || (exports.BillingCycle = BillingCycle = {}));
var PlanStatus;
(function (PlanStatus) {
    PlanStatus["ACTIVE"] = "active";
    PlanStatus["DRAFT"] = "draft";
    PlanStatus["ARCHIVED"] = "archived";
})(PlanStatus || (exports.PlanStatus = PlanStatus = {}));
let SubscriptionPlan = class SubscriptionPlan {
};
exports.SubscriptionPlan = SubscriptionPlan;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], SubscriptionPlan.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], SubscriptionPlan.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], SubscriptionPlan.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], SubscriptionPlan.prototype, "price", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], SubscriptionPlan.prototype, "annualPrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], SubscriptionPlan.prototype, "discountPercentage", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: BillingCycle,
        default: BillingCycle.MONTHLY
    }),
    __metadata("design:type", String)
], SubscriptionPlan.prototype, "billingCycle", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    (0, typeorm_1.Index)('IDX_SUBSCRIPTION_PLAN_APP_ID'),
    __metadata("design:type", String)
], SubscriptionPlan.prototype, "appId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => App_entity_1.App, app => app.plans),
    (0, typeorm_1.JoinColumn)(),
    __metadata("design:type", App_entity_1.App)
], SubscriptionPlan.prototype, "app", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], SubscriptionPlan.prototype, "trialDays", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: PlanStatus,
        default: PlanStatus.ACTIVE
    }),
    __metadata("design:type", String)
], SubscriptionPlan.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], SubscriptionPlan.prototype, "highlight", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], SubscriptionPlan.prototype, "sortPosition", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 1 }),
    __metadata("design:type", Number)
], SubscriptionPlan.prototype, "version", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp' }),
    __metadata("design:type", Date)
], SubscriptionPlan.prototype, "effectiveDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Number)
], SubscriptionPlan.prototype, "maxUsers", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], SubscriptionPlan.prototype, "enterprisePricing", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: '₹' }),
    __metadata("design:type", String)
], SubscriptionPlan.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], SubscriptionPlan.prototype, "growthRate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], SubscriptionPlan.prototype, "conversionRate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], SubscriptionPlan.prototype, "churnRate", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => PlanFeature_entity_1.PlanFeature, feature => feature.plan, { cascade: true }),
    __metadata("design:type", Array)
], SubscriptionPlan.prototype, "features", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Subscription_entity_1.Subscription, subscription => subscription.plan),
    __metadata("design:type", Array)
], SubscriptionPlan.prototype, "subscriptions", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => PromoCodeApplicablePlan_entity_1.PromoCodeApplicablePlan, applicablePlan => applicablePlan.plan),
    __metadata("design:type", Array)
], SubscriptionPlan.prototype, "applicablePromoCodes", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamp' }),
    __metadata("design:type", Date)
], SubscriptionPlan.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ type: 'timestamp' }),
    __metadata("design:type", Date)
], SubscriptionPlan.prototype, "updatedAt", void 0);
exports.SubscriptionPlan = SubscriptionPlan = __decorate([
    (0, typeorm_1.Entity)('subscription_plan')
], SubscriptionPlan);
