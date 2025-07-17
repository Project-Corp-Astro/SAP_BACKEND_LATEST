"use strict";
/**
 * PromoCodeApplicablePlan Entity
 * Links promo codes to specific subscription plans
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
exports.PromoCodeApplicablePlan = void 0;
const typeorm_1 = require("typeorm");
const PromoCode_entity_1 = require("./PromoCode.entity");
const SubscriptionPlan_entity_1 = require("./SubscriptionPlan.entity");
let PromoCodeApplicablePlan = class PromoCodeApplicablePlan {
};
exports.PromoCodeApplicablePlan = PromoCodeApplicablePlan;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], PromoCodeApplicablePlan.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    (0, typeorm_1.Index)('IDX_PROMO_CODE_PLAN_PROMO_ID'),
    __metadata("design:type", String)
], PromoCodeApplicablePlan.prototype, "promoCodeId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => PromoCode_entity_1.PromoCode, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)(),
    __metadata("design:type", PromoCode_entity_1.PromoCode)
], PromoCodeApplicablePlan.prototype, "promoCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    (0, typeorm_1.Index)('IDX_PROMO_CODE_PLAN_PLAN_ID'),
    __metadata("design:type", String)
], PromoCodeApplicablePlan.prototype, "planId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => SubscriptionPlan_entity_1.SubscriptionPlan),
    (0, typeorm_1.JoinColumn)(),
    __metadata("design:type", SubscriptionPlan_entity_1.SubscriptionPlan)
], PromoCodeApplicablePlan.prototype, "plan", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamp' }),
    __metadata("design:type", Date)
], PromoCodeApplicablePlan.prototype, "createdAt", void 0);
exports.PromoCodeApplicablePlan = PromoCodeApplicablePlan = __decorate([
    (0, typeorm_1.Entity)('promo_code_applicable_plans')
], PromoCodeApplicablePlan);
