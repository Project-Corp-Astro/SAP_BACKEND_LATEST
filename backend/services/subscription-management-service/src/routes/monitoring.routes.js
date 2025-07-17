"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const monitoring_controller_1 = __importDefault(require("../controllers/monitoring.controller"));
const router = (0, express_1.Router)();
/**
 * @route GET /api/monitoring/metrics
 * @description Get performance metrics including cache hit rates, response times, and memory usage
 * @access Private - Admin only
 */
router.get('/metrics', monitoring_controller_1.default.getMetrics);
/**
 * @route POST /api/monitoring/metrics/reset
 * @description Reset performance metrics
 * @access Private - Admin only
 */
router.post('/metrics/reset', monitoring_controller_1.default.resetMetrics);
/**
 * @route GET /api/monitoring/health
 * @description Get health status of the service
 * @access Public
 */
router.get('/health', monitoring_controller_1.default.getHealth);
exports.default = router;
