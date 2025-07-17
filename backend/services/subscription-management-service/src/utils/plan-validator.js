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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanValidator = void 0;
const subscription_plan_errors_1 = require("../types/subscription-plan.errors");
const SubscriptionPlan_entity_1 = require("../entities/SubscriptionPlan.entity");
class PlanValidator {
    // Validate plan data
    static validatePlanData(data, appId, planRepository) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const errors = [];
            // Validate required fields
            if (!((_a = data.name) === null || _a === void 0 ? void 0 : _a.trim())) {
                errors.push({
                    field: 'name',
                    value: data.name,
                    constraint: 'Plan name is required and must be less than 100 characters'
                });
            }
            else if (data.name.length > 100) {
                errors.push({
                    field: 'name',
                    value: data.name,
                    constraint: 'Plan name must be less than 100 characters'
                });
            }
            // Validate price
            if (!data.price || typeof data.price !== 'number' || data.price < 0) {
                errors.push({
                    field: 'price',
                    value: data.price,
                    constraint: 'Price must be a positive number'
                });
            }
            // Validate billing cycle
            if (!data.billingCycle) {
                errors.push({
                    field: 'billingCycle',
                    value: data.billingCycle,
                    constraint: 'Billing cycle is required'
                });
            }
            // Validate trial days
            if (data.trialDays !== undefined) {
                if (typeof data.trialDays !== 'number' || data.trialDays < 0 || data.trialDays > 30) {
                    errors.push({
                        field: 'trialDays',
                        value: data.trialDays,
                        constraint: 'Trial days must be a number between 0 and 30'
                    });
                }
            }
            // Check for duplicate plan name
            if (!errors.length) {
                const existingPlan = yield planRepository.findOne({
                    where: { name: data.name, appId },
                    select: ['id']
                });
                if (existingPlan && (!data.id || existingPlan.id !== data.id)) {
                    errors.push({
                        field: 'name',
                        value: data.name,
                        constraint: 'A plan with this name already exists for this app'
                    });
                }
            }
            if (errors.length > 0) {
                throw new subscription_plan_errors_1.SubscriptionPlanServiceError(subscription_plan_errors_1.SubscriptionPlanError.VALIDATION_FAILED, 'Validation failed for subscription plan', { errors });
            }
        });
    }
    // Validate feature data
    static validateFeatureData(data, planId, featureRepository) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const errors = [];
            // Validate required fields
            if (!((_a = data.name) === null || _a === void 0 ? void 0 : _a.trim())) {
                errors.push({
                    field: 'name',
                    value: data.name,
                    constraint: 'Feature name is required and must be less than 100 characters'
                });
            }
            else if (data.name.length > 100) {
                errors.push({
                    field: 'name',
                    value: data.name,
                    constraint: 'Feature name must be less than 100 characters'
                });
            }
            if (!((_b = data.description) === null || _b === void 0 ? void 0 : _b.trim())) {
                errors.push({
                    field: 'description',
                    value: data.description,
                    constraint: 'Feature description is required'
                });
            }
            // Validate limit if provided
            if (data.limit !== undefined) {
                if (typeof data.limit !== 'number' || data.limit < 0) {
                    errors.push({
                        field: 'limit',
                        value: data.limit,
                        constraint: 'Feature limit must be a non-negative number'
                    });
                }
            }
            // Check for duplicate feature
            if (!errors.length) {
                const existingFeature = yield featureRepository.findOne({
                    where: { name: data.name, planId },
                    select: ['id']
                });
                if (existingFeature && (!data.id || existingFeature.id !== data.id)) {
                    errors.push({
                        field: 'name',
                        value: data.name,
                        constraint: 'A feature with this name already exists for this plan'
                    });
                }
            }
            if (errors.length > 0) {
                throw new subscription_plan_errors_1.SubscriptionPlanServiceError(subscription_plan_errors_1.SubscriptionPlanError.VALIDATION_FAILED, 'Validation failed for plan feature', { errors });
            }
        });
    }
    // Validate status transition
    static validateStatusTransition(currentStatus, newStatus) {
        var _a;
        const validTransitions = {
            [SubscriptionPlan_entity_1.PlanStatus.ACTIVE]: [SubscriptionPlan_entity_1.PlanStatus.ARCHIVED, SubscriptionPlan_entity_1.PlanStatus.DRAFT],
            [SubscriptionPlan_entity_1.PlanStatus.ARCHIVED]: [],
            [SubscriptionPlan_entity_1.PlanStatus.DRAFT]: [SubscriptionPlan_entity_1.PlanStatus.ACTIVE]
        };
        if (!((_a = validTransitions[currentStatus]) === null || _a === void 0 ? void 0 : _a.includes(newStatus))) {
            throw new subscription_plan_errors_1.SubscriptionPlanServiceError(subscription_plan_errors_1.SubscriptionPlanError.INVALID_STATUS, `Cannot transition from ${currentStatus} to ${newStatus}`, { currentStatus, newStatus });
        }
    }
}
exports.PlanValidator = PlanValidator;
