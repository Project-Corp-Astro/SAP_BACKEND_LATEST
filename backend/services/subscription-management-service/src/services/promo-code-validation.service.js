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
exports.PromoCodeValidationService = exports.PromoCodeValidationError = void 0;
const PromoCode_entity_1 = require("../entities/PromoCode.entity");
const logger_1 = __importDefault(require("../utils/logger"));
const redis_1 = require("../utils/redis");
const cache_key_utils_1 = require("../utils/cache-key-utils");
const promo_code_error_1 = require("../errors/promo-code-error");
class PromoCodeValidationError extends promo_code_error_1.PromoCodeError {
    constructor(message) {
        super(message, promo_code_error_1.PromoCodeErrorCode.VALIDATION_ERROR);
    }
}
exports.PromoCodeValidationError = PromoCodeValidationError;
class PromoCodeValidationService {
    /**
     * Validate promo code data before creation/update
     */
    validatePromoCodeData(data_1) {
        return __awaiter(this, arguments, void 0, function* (data, isUpdate = false) {
            var _a, _b, _c;
            // Basic field validations
            if (!isUpdate) {
                if (!((_a = data.code) === null || _a === void 0 ? void 0 : _a.trim())) {
                    throw new PromoCodeValidationError('Promo code is required');
                }
                if (!((_b = data.description) === null || _b === void 0 ? void 0 : _b.trim())) {
                    throw new PromoCodeValidationError('Description is required');
                }
                if (!data.discountType || !Object.values(PromoCode_entity_1.DiscountType).includes(data.discountType)) {
                    throw new PromoCodeValidationError('Discount type must be "percentage" or "fixed"');
                }
                if (data.discountValue === undefined || data.discountValue <= 0) {
                    throw new PromoCodeValidationError('Discount value must be a positive number');
                }
                if (!data.startDate) {
                    throw new PromoCodeValidationError('Start date is required');
                }
                if (data.applicableTo === undefined || !Object.values(PromoCode_entity_1.ApplicableType).includes(data.applicableTo)) {
                    throw new PromoCodeValidationError('Applicable type must be "all", "specific_plans", or "specific_users"');
                }
            }
            // Validate code uniqueness
            if ((_c = data.code) === null || _c === void 0 ? void 0 : _c.trim()) {
                const existingPromoCode = yield this.promoCodeRepository.findOne({
                    where: { code: data.code, isActive: true },
                });
                if (existingPromoCode && (!isUpdate || existingPromoCode.id !== data.id)) {
                    throw new promo_code_error_1.PromoCodeError(`Promo code ${data.code} already exists`, promo_code_error_1.PromoCodeErrorCode.DUPLICATE_CODE);
                }
            }
            // Validate date range
            if (data.startDate && data.endDate && data.endDate <= data.startDate) {
                throw new PromoCodeValidationError('End date must be after start date');
            }
            // Validate applicableTo specific requirements
            if (data.applicableTo === PromoCode_entity_1.ApplicableType.SPECIFIC_PLANS && (!data.applicablePlans || data.applicablePlans.length === 0)) {
                throw new PromoCodeValidationError('At least one plan must be specified for specific plans');
            }
            if (data.applicableTo === PromoCode_entity_1.ApplicableType.SPECIFIC_USERS && (!data.applicableUsers || data.applicableUsers.length === 0)) {
                throw new PromoCodeValidationError('At least one user must be specified for specific users');
            }
            // Check discount value constraints
            if (data.discountType === PromoCode_entity_1.DiscountType.PERCENTAGE && data.discountValue && data.discountValue > 100) {
                throw new PromoCodeValidationError('Percentage discount cannot exceed 100%');
            }
            // Validate usage limit
            if (data.usageLimit !== undefined && data.usageLimit <= 0) {
                throw new PromoCodeValidationError('Usage limit must be a positive number');
            }
        });
    }
    constructor(promoCodeRepository, subscriptionPromoCodeRepository, subscriptionRepository, redisService = redis_1.promoCache) {
        this.promoCodeRepository = promoCodeRepository;
        this.subscriptionPromoCodeRepository = subscriptionPromoCodeRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.redisService = redisService;
        this.logger = logger_1.default;
    }
    getPromoCodeDetails(promoCodeId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.promoCodeRepository.findOne({
                where: { id: promoCodeId, isActive: true },
                relations: ['applicablePlans', 'applicableUsers']
            });
        });
    }
    validatePromoCode(promoCodeId, userId, planId) {
        return __awaiter(this, void 0, void 0, function* () {
            const cacheKey = `promo:validate:${userId}:${planId}:${promoCodeId}`;
            try {
                const cachedResult = yield this.redisService.get(cacheKey);
                if (cachedResult) {
                    this.logger.debug(`Cache hit for key: ${cacheKey}`);
                    return cachedResult;
                }
                const promoCode = yield this.getPromoCodeDetails(promoCodeId);
                if (!promoCode) {
                    const result = { isValid: false, message: 'Promo code not found' };
                    yield this.redisService.set(cacheKey, result, 120);
                    return result;
                }
                yield this.validateBasicStatus(promoCode);
                yield this.validateUsageLimits(promoCode, userId);
                yield this.validateDateRange(promoCode);
                yield this.validatePlanApplicability(promoCode, planId);
                yield this.validateUserEligibility(promoCode, userId);
                const result = { isValid: true, message: 'Promo code is valid', promoCode };
                yield this.redisService.set(cacheKey, result, cache_key_utils_1.CacheKeyUtils.getTTL());
                return result;
            }
            catch (error) {
                this.logger.error('Error validating promo code for user', { error });
                return { isValid: false, message: error instanceof Error ? error.message : String(error) };
            }
        });
    }
    validateBasicStatus(promoCode) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!promoCode.isActive)
                throw new PromoCodeValidationError('Promo code is inactive');
            const now = new Date();
            if (promoCode.startDate > now)
                throw new PromoCodeValidationError('Promo code is not yet active');
            if (promoCode.endDate && promoCode.endDate < now)
                throw new PromoCodeValidationError('Promo code has expired');
        });
    }
    validateUsageLimits(promoCode, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Check total usage limit
            if (typeof promoCode.usageLimit === 'number' && promoCode.usageCount >= promoCode.usageLimit) {
                throw new PromoCodeValidationError('Promo code has reached its maximum usage limit');
            }
            // Check per-user usage limit (assuming 1 use per user)
            const userUsageCount = yield this.subscriptionPromoCodeRepository.count({
                where: {
                    promoCodeId: promoCode.id,
                    subscription: {
                        userId: userId,
                    },
                },
            });
            if (userUsageCount > 0) {
                throw new PromoCodeValidationError('You have already used this promo code');
            }
        });
    }
    validateDateRange(promoCode) {
        return __awaiter(this, void 0, void 0, function* () {
            const now = new Date();
            if (promoCode.startDate && promoCode.startDate > now) {
                throw new PromoCodeValidationError('Promo code is not yet active');
            }
            if (promoCode.endDate && promoCode.endDate < now) {
                throw new PromoCodeValidationError('Promo code has expired');
            }
        });
    }
    validatePlanApplicability(promoCode, planId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (promoCode.applicableTo === PromoCode_entity_1.ApplicableType.SPECIFIC_PLANS) {
                const applicablePlan = promoCode.applicablePlans.find((p) => p.planId === planId);
                if (!applicablePlan) {
                    throw new PromoCodeValidationError('Promo code is not applicable to this plan');
                }
            }
        });
    }
    validateUserEligibility(promoCode, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (promoCode.applicableTo === PromoCode_entity_1.ApplicableType.SPECIFIC_USERS) {
                const applicableUser = promoCode.applicableUsers.find((u) => u.userId === userId);
                if (!applicableUser) {
                    throw new PromoCodeValidationError('Promo code is not applicable to this user');
                }
            }
            if (promoCode.isFirstTimeOnly) {
                const hasPreviousSubscription = yield this.hasPreviousSubscription(userId);
                if (hasPreviousSubscription) {
                    throw new PromoCodeValidationError('Promo code is only valid for first-time users');
                }
            }
        });
    }
    hasPreviousSubscription(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const count = yield this.subscriptionRepository.count({ where: { userId } });
            return count > 0;
        });
    }
}
exports.PromoCodeValidationService = PromoCodeValidationService;
