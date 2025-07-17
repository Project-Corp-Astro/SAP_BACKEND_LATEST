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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionAnalyticsController = void 0;
const subscription_analytics_service_1 = require("../services/subscription-analytics.service");
const subscription_analytics_dto_1 = require("../dtos/subscription-analytics.dto");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const logger_1 = __importDefault(require("../utils/logger"));
class SubscriptionAnalyticsController {
    /**
     * Get analytics for a specific date range
     */
    static getAnalytics(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Convert query params to DTO
                const dateRange = (0, class_transformer_1.plainToInstance)(subscription_analytics_dto_1.DateRangeDto, {
                    startDate: req.query.startDate || new Date(0).toISOString(),
                    endDate: req.query.endDate || new Date().toISOString(),
                    appId: req.query.appId
                });
                // Validate DTO
                yield (0, class_validator_1.validateOrReject)(dateRange, {
                    validationError: { target: false },
                    whitelist: true,
                    forbidNonWhitelisted: true
                });
                // Get analytics
                const analytics = yield subscription_analytics_service_1.subscriptionAnalyticsService.getAnalytics({
                    startDate: dateRange.startDate,
                    endDate: dateRange.endDate,
                    appId: dateRange.appId
                });
                res.status(200).json({
                    success: true,
                    data: analytics
                });
            }
            catch (error) {
                logger_1.default.error('Error getting subscription analytics:', error);
                if (Array.isArray(error) && error.length > 0) {
                    // Handle validation errors
                    res.status(400).json({
                        success: false,
                        error: 'Validation failed',
                        details: error.map(err => ({
                            property: err.property,
                            constraints: err.constraints,
                            value: err.value
                        }))
                    });
                }
                else {
                    // Handle other errors
                    res.status(500).json({
                        success: false,
                        error: 'Failed to get analytics',
                        message: error instanceof Error ? error.message : 'An unknown error occurred'
                    });
                }
            }
        });
    }
    /**
     * Get analytics for the last 30 days
     */
    static getCurrentAnalytics(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                const dateRange = {
                    startDate: thirtyDaysAgo.toISOString(),
                    endDate: new Date().toISOString(),
                    appId: req.query.appId
                };
                const analytics = yield subscription_analytics_service_1.subscriptionAnalyticsService.getAnalytics({
                    startDate: dateRange.startDate,
                    endDate: dateRange.endDate,
                    appId: dateRange.appId
                });
                res.status(200).json({
                    success: true,
                    data: analytics
                });
            }
            catch (error) {
                logger_1.default.error('Error getting current analytics:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to get current analytics',
                    message: error instanceof Error ? error.message : 'An unknown error occurred'
                });
            }
        });
    }
}
exports.SubscriptionAnalyticsController = SubscriptionAnalyticsController;
