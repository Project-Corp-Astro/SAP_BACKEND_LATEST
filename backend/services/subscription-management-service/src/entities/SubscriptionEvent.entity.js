"use strict";
/**
 * SubscriptionEvent Entity
 * Represents events that occur during the subscription lifecycle
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
exports.SubscriptionEvent = exports.SubscriptionEventType = void 0;
const typeorm_1 = require("typeorm");
const Subscription_entity_1 = require("./Subscription.entity");
var SubscriptionEventType;
(function (SubscriptionEventType) {
    SubscriptionEventType["CREATED"] = "created";
    SubscriptionEventType["RENEWED"] = "renewed";
    SubscriptionEventType["CANCELED"] = "canceled";
    SubscriptionEventType["EXPIRED"] = "expired";
    SubscriptionEventType["UPDATED"] = "updated";
    SubscriptionEventType["PAYMENT_FAILED"] = "payment_failed";
    SubscriptionEventType["TRIAL_STARTED"] = "trial_started";
    SubscriptionEventType["TRIAL_ENDED"] = "trial_ended";
})(SubscriptionEventType || (exports.SubscriptionEventType = SubscriptionEventType = {}));
let SubscriptionEvent = class SubscriptionEvent {
};
exports.SubscriptionEvent = SubscriptionEvent;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], SubscriptionEvent.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    (0, typeorm_1.Index)('IDX_SUBSCRIPTION_EVENT_SUBSCRIPTION_ID'),
    __metadata("design:type", String)
], SubscriptionEvent.prototype, "subscriptionId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Subscription_entity_1.Subscription, subscription => subscription.events),
    (0, typeorm_1.JoinColumn)(),
    __metadata("design:type", Subscription_entity_1.Subscription)
], SubscriptionEvent.prototype, "subscription", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    (0, typeorm_1.Index)('IDX_SUBSCRIPTION_EVENT_USER_ID'),
    __metadata("design:type", String)
], SubscriptionEvent.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: SubscriptionEventType
    }),
    __metadata("design:type", String)
], SubscriptionEvent.prototype, "eventType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb' }),
    __metadata("design:type", Object)
], SubscriptionEvent.prototype, "eventData", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamp' }),
    __metadata("design:type", Date)
], SubscriptionEvent.prototype, "createdAt", void 0);
exports.SubscriptionEvent = SubscriptionEvent = __decorate([
    (0, typeorm_1.Entity)('subscription_event')
], SubscriptionEvent);
