"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionPlanServiceError = exports.SubscriptionPlanError = void 0;
var SubscriptionPlanError;
(function (SubscriptionPlanError) {
    SubscriptionPlanError["INVALID_DATA"] = "INVALID_DATA";
    SubscriptionPlanError["PLAN_NOT_FOUND"] = "PLAN_NOT_FOUND";
    SubscriptionPlanError["FEATURE_NOT_FOUND"] = "FEATURE_NOT_FOUND";
    SubscriptionPlanError["DUPLICATE_PLAN"] = "DUPLICATE_PLAN";
    SubscriptionPlanError["DUPLICATE_FEATURE"] = "DUPLICATE_FEATURE";
    SubscriptionPlanError["INVALID_STATUS"] = "INVALID_STATUS";
    SubscriptionPlanError["TRANSACTION_FAILED"] = "TRANSACTION_FAILED";
    SubscriptionPlanError["VALIDATION_FAILED"] = "VALIDATION_FAILED";
})(SubscriptionPlanError || (exports.SubscriptionPlanError = SubscriptionPlanError = {}));
class SubscriptionPlanServiceError extends Error {
    constructor(code, message, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'SubscriptionPlanServiceError';
    }
}
exports.SubscriptionPlanServiceError = SubscriptionPlanServiceError;
