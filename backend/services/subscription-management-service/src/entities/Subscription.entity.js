"use strict";
/**
 * Subscription Entity
 * Represents a user's subscription to a plan
 *
 * @swagger
 * components:
 *   schemas:
 *     SubscriptionStatus:
 *       type: string
 *       enum:
 *         - active
 *         - canceled
 *         - expired
 *         - trial
 *         - past_due
 *         - unpaid
 *         - pending
 *       example: active
 *
 *     PaymentMethod:
 *       type: string
 *       enum:
 *         - credit_card
 *         - bank_transfer
 *         - paypal
 *       example: credit_card
 *
 *     Subscription:
 *       type: object
 *       required:
 *         - id
 *         - userId
 *         - planId
 *         - appId
 *         - status
 *         - billingCycle
 *         - startDate
 *         - endDate
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the subscription
 *           example: 550e8400-e29b-41d4-a716-446655440000
 *         userId:
 *           type: string
 *           format: uuid
 *           description: User who owns this subscription
 *           example: 7b23e9a0-8c38-4127-8800-950642e78123
 *         planId:
 *           type: string
 *           format: uuid
 *           description: ID of the subscription plan
 *           example: f47ac10b-58cc-4372-a567-0e02b2c3d479
 *         appId:
 *           type: string
 *           format: uuid
 *           description: ID of the application this subscription is for
 *           example: 9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d
 *         status:
 *           $ref: '#/components/schemas/SubscriptionStatus'
 *         billingCycle:
 *           type: string
 *           enum:
 *             - monthly
 *             - quarterly
 *             - semi_annual
 *             - annual
 *           description: Frequency of billing for this subscription
 *           example: monthly
 *         startDate:
 *           type: string
 *           format: date-time
 *           description: Date when the subscription started
 *         endDate:
 *           type: string
 *           format: date-time
 *           description: Date when the subscription ends/renews
 *         trialEndDate:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Date when the trial period ends, if applicable
 *         canceledAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Date when the subscription was canceled
 *         cancelAtPeriodEnd:
 *           type: boolean
 *           description: Whether the subscription will be canceled at the end of the current period
 *           default: false
 *         cancellationReason:
 *           type: string
 *           nullable: true
 *           description: Reason for cancellation, if provided
 *         autoRenew:
 *           type: boolean
 *           description: Whether the subscription will automatically renew
 *           default: true
 *         paymentMethod:
 *           $ref: '#/components/schemas/PaymentMethod'
 *         amount:
 *           type: number
 *           format: float
 *           description: Amount charged for this subscription
 *         currency:
 *           type: string
 *           description: Currency for subscription payments
 *           example: USD
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the subscription record was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: When the subscription record was last updated
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
exports.Subscription = exports.PaymentMethod = exports.SubscriptionStatus = void 0;
const typeorm_1 = require("typeorm");
const SubscriptionPlan_entity_1 = require("./SubscriptionPlan.entity");
const SubscriptionPromoCode_entity_1 = require("./SubscriptionPromoCode.entity");
const Payment_entity_1 = require("./Payment.entity");
const SubscriptionEvent_entity_1 = require("./SubscriptionEvent.entity");
const App_entity_1 = require("./App.entity");
var SubscriptionStatus;
(function (SubscriptionStatus) {
    SubscriptionStatus["ACTIVE"] = "active";
    SubscriptionStatus["TRIAL"] = "trial";
    SubscriptionStatus["CANCELED"] = "canceled";
    SubscriptionStatus["CANCELLED"] = "canceled";
    SubscriptionStatus["EXPIRED"] = "expired";
    SubscriptionStatus["PAUSED"] = "paused";
    SubscriptionStatus["PAST_DUE"] = "past_due";
    SubscriptionStatus["UNPAID"] = "unpaid";
    SubscriptionStatus["PENDING"] = "pending";
})(SubscriptionStatus || (exports.SubscriptionStatus = SubscriptionStatus = {}));
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["CREDIT_CARD"] = "credit_card";
    PaymentMethod["BANK_TRANSFER"] = "bank_transfer";
    PaymentMethod["PAYPAL"] = "paypal";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
let Subscription = class Subscription {
};
exports.Subscription = Subscription;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Subscription.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    (0, typeorm_1.Index)('IDX_SUBSCRIPTION_USER_ID'),
    __metadata("design:type", String)
], Subscription.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    (0, typeorm_1.Index)('IDX_SUBSCRIPTION_PLAN_ID'),
    __metadata("design:type", String)
], Subscription.prototype, "planId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => SubscriptionPlan_entity_1.SubscriptionPlan, plan => plan.subscriptions),
    (0, typeorm_1.JoinColumn)(),
    __metadata("design:type", SubscriptionPlan_entity_1.SubscriptionPlan)
], Subscription.prototype, "plan", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    (0, typeorm_1.Index)('IDX_SUBSCRIPTION_APP_ID'),
    __metadata("design:type", String)
], Subscription.prototype, "appId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => App_entity_1.App),
    (0, typeorm_1.JoinColumn)(),
    __metadata("design:type", App_entity_1.App)
], Subscription.prototype, "app", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: SubscriptionStatus,
        default: SubscriptionStatus.PENDING
    }),
    __metadata("design:type", String)
], Subscription.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: SubscriptionPlan_entity_1.BillingCycle
    }),
    __metadata("design:type", String)
], Subscription.prototype, "billingCycle", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp' }),
    __metadata("design:type", Date)
], Subscription.prototype, "startDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp' }),
    __metadata("design:type", Date)
], Subscription.prototype, "endDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Subscription.prototype, "trialEndDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Subscription.prototype, "canceledAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], Subscription.prototype, "cancelAtPeriodEnd", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Subscription.prototype, "cancellationReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], Subscription.prototype, "autoRenew", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: PaymentMethod,
        default: PaymentMethod.CREDIT_CARD
    }),
    __metadata("design:type", String)
], Subscription.prototype, "paymentMethod", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], Subscription.prototype, "paymentMethodId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Subscription.prototype, "currentPeriod", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], Subscription.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: '₹' }),
    __metadata("design:type", String)
], Subscription.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb', { nullable: true }),
    __metadata("design:type", Object)
], Subscription.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Payment_entity_1.Payment, payment => payment.subscription),
    __metadata("design:type", Array)
], Subscription.prototype, "payments", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => SubscriptionEvent_entity_1.SubscriptionEvent, event => event.subscription),
    __metadata("design:type", Array)
], Subscription.prototype, "events", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => SubscriptionPromoCode_entity_1.SubscriptionPromoCode, subscriptionPromoCode => subscriptionPromoCode.subscription),
    __metadata("design:type", Array)
], Subscription.prototype, "promoCodes", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Subscription.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Subscription.prototype, "updatedAt", void 0);
exports.Subscription = Subscription = __decorate([
    (0, typeorm_1.Entity)('subscription')
], Subscription);
