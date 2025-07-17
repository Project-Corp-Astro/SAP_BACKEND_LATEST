"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingCycle = exports.PlanStatus = exports.SubscriptionStatus = void 0;
// Status enums for entities
var SubscriptionStatus;
(function (SubscriptionStatus) {
    SubscriptionStatus["ACTIVE"] = "active";
    SubscriptionStatus["TRIALING"] = "trialing";
    SubscriptionStatus["CANCELED"] = "canceled";
    SubscriptionStatus["EXPIRED"] = "expired";
})(SubscriptionStatus || (exports.SubscriptionStatus = SubscriptionStatus = {}));
var PlanStatus;
(function (PlanStatus) {
    PlanStatus["ACTIVE"] = "active";
    PlanStatus["DRAFT"] = "draft";
    PlanStatus["ARCHIVED"] = "archived";
})(PlanStatus || (exports.PlanStatus = PlanStatus = {}));
var BillingCycle;
(function (BillingCycle) {
    BillingCycle["MONTHLY"] = "monthly";
    BillingCycle["QUARTERLY"] = "quarterly";
    BillingCycle["YEARLY"] = "yearly";
})(BillingCycle || (exports.BillingCycle = BillingCycle = {}));
