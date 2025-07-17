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
exports.AppController = void 0;
const subscription_plan_service_1 = require("../services/subscription-plan.service");
class AppController {
    constructor() {
        this.subscriptionPlanService = new subscription_plan_service_1.SubscriptionPlanService();
    }
    /**
     * Get all apps for dropdown
     * @route GET /api/apps/dropdown
     * @returns {Array<{id: string, name: string}>}
     */
    getAppsForDropdown(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const apps = yield this.subscriptionPlanService.getAppsForDropdown();
                return res.json(apps);
            }
            catch (error) {
                res.status(500).json({
                    error: 'Failed to fetch apps',
                    message: error.message
                });
            }
        });
    }
}
exports.AppController = AppController;
