"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const admin_routes_1 = __importDefault(require("./admin.routes"));
const app_routes_1 = __importDefault(require("./app.routes"));
const monitoring_routes_1 = __importDefault(require("./monitoring.routes"));
const subscription_analytics_routes_1 = __importDefault(require("./subscription-analytics.routes"));
exports.default = {
    adminRoutes: admin_routes_1.default,
    appRoutes: app_routes_1.default,
    monitoringRoutes: monitoring_routes_1.default,
    subscriptionAnalyticsRoutes: subscription_analytics_routes_1.default
};
