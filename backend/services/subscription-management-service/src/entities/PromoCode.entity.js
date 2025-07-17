"use strict";
/**
 * PromoCode Entity
 * Represents promotional codes for subscription discounts
 *
 * @swagger
 * components:
 *   schemas:
 *     DiscountType:
 *       type: string
 *       enum:
 *         - percentage
 *         - fixed
 *       example: percentage
 *       description: Type of discount (percent off or fixed amount)
 *
 *     ApplicableType:
 *       type: string
 *       enum:
 *         - all
 *         - specific_plans
 *         - specific_users
 *       example: all
 *       description: Which plans or users the promo code can be used for
 *
 *     PromoCode:
 *       type: object
 *       required:
 *         - id
 *         - code
 *         - description
 *         - discountType
 *         - discountValue
 *         - maxUses
 *         - validFrom
 *         - validTo
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the promo code
 *           example: 550e8400-e29b-41d4-a716-446655440000
 *         code:
 *           type: string
 *           description: The actual promo code string that users input
 *           example: SUMMER2025
 *         description:
 *           type: string
 *           description: Description of the promo code for admin reference
 *           example: Summer 2025 promotion - 20% off all plans
 *         discountType:
 *           $ref: '#/components/schemas/DiscountType'
 *         discountValue:
 *           type: number
 *           format: float
 *           description: The value of the discount (percentage or fixed amount)
 *           example: 20.00
 *         maxUses:
 *           type: integer
 *           description: Maximum number of times this code can be used
 *           example: 100
 *         usedCount:
 *           type: integer
 *           description: Number of times this code has been used
 *           example: 45
 *         maxUsesPerUser:
 *           type: integer
 *           description: Maximum number of times a single user can use this code
 *           example: 1
 *         applicableType:
 *           $ref: '#/components/schemas/ApplicableType'
 *         validFrom:
 *           type: string
 *           format: date-time
 *           description: Start date when the code becomes valid
 *         validTo:
 *           type: string
 *           format: date-time
 *           description: End date when the code expires
 *         isActive:
 *           type: boolean
 *           description: Whether the promo code is active
 *           default: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the promo code was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: When the promo code was last updated
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
exports.PromoCode = exports.ApplicableType = exports.DiscountType = void 0;
const typeorm_1 = require("typeorm");
const SubscriptionPromoCode_entity_1 = require("./SubscriptionPromoCode.entity");
const PromoCodeApplicablePlan_entity_1 = require("./PromoCodeApplicablePlan.entity");
const PromoCodeApplicableUser_entity_1 = require("./PromoCodeApplicableUser.entity");
var DiscountType;
(function (DiscountType) {
    DiscountType["PERCENTAGE"] = "percentage";
    DiscountType["FIXED"] = "fixed";
})(DiscountType || (exports.DiscountType = DiscountType = {}));
var ApplicableType;
(function (ApplicableType) {
    ApplicableType["ALL"] = "all";
    ApplicableType["SPECIFIC_PLANS"] = "specific_plans";
    ApplicableType["SPECIFIC_USERS"] = "specific_users";
})(ApplicableType || (exports.ApplicableType = ApplicableType = {}));
let PromoCode = class PromoCode {
};
exports.PromoCode = PromoCode;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], PromoCode.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', unique: true }),
    (0, typeorm_1.Index)('IDX_PROMO_CODE'),
    __metadata("design:type", String)
], PromoCode.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], PromoCode.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: DiscountType,
        default: DiscountType.PERCENTAGE
    }),
    __metadata("design:type", String)
], PromoCode.prototype, "discountType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], PromoCode.prototype, "discountValue", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", Date)
], PromoCode.prototype, "startDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date', nullable: true }),
    __metadata("design:type", Date)
], PromoCode.prototype, "endDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Number)
], PromoCode.prototype, "usageLimit", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], PromoCode.prototype, "usageCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], PromoCode.prototype, "minPurchaseAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], PromoCode.prototype, "maxDiscountAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], PromoCode.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], PromoCode.prototype, "isFirstTimeOnly", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ApplicableType,
        default: ApplicableType.ALL
    }),
    __metadata("design:type", String)
], PromoCode.prototype, "applicableTo", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: '[]' }),
    __metadata("design:type", Array)
], PromoCode.prototype, "applicableItems", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamp' }),
    __metadata("design:type", Date)
], PromoCode.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ type: 'timestamp' }),
    __metadata("design:type", Date)
], PromoCode.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => SubscriptionPromoCode_entity_1.SubscriptionPromoCode, subscriptionPromoCode => subscriptionPromoCode.promoCode),
    __metadata("design:type", Array)
], PromoCode.prototype, "subscriptionPromoCodes", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => PromoCodeApplicablePlan_entity_1.PromoCodeApplicablePlan, applicablePlan => applicablePlan.promoCode),
    __metadata("design:type", Array)
], PromoCode.prototype, "applicablePlans", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => PromoCodeApplicableUser_entity_1.PromoCodeApplicableUser, applicableUser => applicableUser.promoCode),
    __metadata("design:type", Array)
], PromoCode.prototype, "applicableUsers", void 0);
exports.PromoCode = PromoCode = __decorate([
    (0, typeorm_1.Entity)('promo_codes')
], PromoCode);
