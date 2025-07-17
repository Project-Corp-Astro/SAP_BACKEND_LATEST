"use strict";
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
exports.DateRangeDto = exports.SubscriptionAnalyticsResponse = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class PlanDistributionItem {
    constructor(partial) {
        this.count = 0;
        this.percentage = 0;
        if (partial) {
            Object.assign(this, partial);
        }
    }
}
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], PlanDistributionItem.prototype, "count", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], PlanDistributionItem.prototype, "percentage", void 0);
class SubscriptionAnalyticsResponse {
    constructor(partial) {
        this.date = new Date().toISOString();
        this.totalSubscribers = 0;
        this.activeSubscriptions = 0;
        this.monthlyRecurringRevenue = 0;
        this.annualRecurringRevenue = 0;
        this.averageRevenuePerUser = 0;
        this.churnRate = 0;
        this.newSubscribers = 0;
        this.churned = 0;
        this.conversionRate = 0;
        this.lifetimeValue = 0;
        this.planDistribution = {};
        this.upgradedRate = 0;
        this.downgradedRate = 0;
        this.freeTrialConversions = 0;
        this.renewalRate = 0;
        if (partial) {
            Object.assign(this, partial);
        }
    }
}
exports.SubscriptionAnalyticsResponse = SubscriptionAnalyticsResponse;
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], SubscriptionAnalyticsResponse.prototype, "date", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], SubscriptionAnalyticsResponse.prototype, "totalSubscribers", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], SubscriptionAnalyticsResponse.prototype, "activeSubscriptions", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], SubscriptionAnalyticsResponse.prototype, "monthlyRecurringRevenue", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], SubscriptionAnalyticsResponse.prototype, "annualRecurringRevenue", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], SubscriptionAnalyticsResponse.prototype, "averageRevenuePerUser", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], SubscriptionAnalyticsResponse.prototype, "churnRate", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], SubscriptionAnalyticsResponse.prototype, "newSubscribers", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], SubscriptionAnalyticsResponse.prototype, "churned", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], SubscriptionAnalyticsResponse.prototype, "conversionRate", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], SubscriptionAnalyticsResponse.prototype, "lifetimeValue", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => PlanDistributionItem),
    __metadata("design:type", Object)
], SubscriptionAnalyticsResponse.prototype, "planDistribution", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], SubscriptionAnalyticsResponse.prototype, "upgradedRate", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], SubscriptionAnalyticsResponse.prototype, "downgradedRate", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], SubscriptionAnalyticsResponse.prototype, "freeTrialConversions", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], SubscriptionAnalyticsResponse.prototype, "renewalRate", void 0);
class DateRangeDto {
    constructor(partial) {
        this.startDate = new Date().toISOString();
        this.endDate = new Date().toISOString();
        if (partial) {
            Object.assign(this, partial);
        }
    }
}
exports.DateRangeDto = DateRangeDto;
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], DateRangeDto.prototype, "startDate", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], DateRangeDto.prototype, "endDate", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], DateRangeDto.prototype, "appId", void 0);
