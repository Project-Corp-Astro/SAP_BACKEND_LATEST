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
exports.promoCodeService = exports.PromoCodeService = void 0;
const typeorm_1 = require("typeorm");
const data_source_1 = require("../db/data-source");
const PromoCode_entity_1 = require("../entities/PromoCode.entity");
const cache_key_utils_1 = require("../utils/cache-key-utils");
const Subscription_entity_1 = require("../entities/Subscription.entity");
const SubscriptionPromoCode_entity_1 = require("../entities/SubscriptionPromoCode.entity");
const PromoCodeApplicablePlan_entity_1 = require("../entities/PromoCodeApplicablePlan.entity");
const PromoCodeApplicableUser_entity_1 = require("../entities/PromoCodeApplicableUser.entity");
const SubscriptionPlan_entity_1 = require("../entities/SubscriptionPlan.entity");
const logger_1 = __importDefault(require("../utils/logger"));
const redis_1 = require("../utils/redis");
const promo_code_validation_service_1 = require("./promo-code-validation.service");
const api_error_1 = require("../errors/api-error");
class PromoCodeService {
    constructor() {
        this.redisDb = 3;
        this.validationService = new promo_code_validation_service_1.PromoCodeValidationService(data_source_1.AppDataSource.getRepository(PromoCode_entity_1.PromoCode), data_source_1.AppDataSource.getRepository(SubscriptionPromoCode_entity_1.SubscriptionPromoCode), data_source_1.AppDataSource.getRepository(Subscription_entity_1.Subscription));
    }
    /**
     * Invalidate all promo code related caches
     * @param promoCodeId Optional specific promo code ID to invalidate
     * @returns Number of cache keys deleted
     */
    invalidatePromoCache(promoCodeId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const patterns = [
                    'subscription:promos:all_promo_codes:*',
                    'promo_code:*',
                    'promo_validation:*',
                    'promo_search:*',
                    'promo_stats:*',
                    'promo_plans:*',
                    'promo_users:*'
                ];
                let totalDeleted = 0;
                const batchSize = 100; // Process 100 keys at a time
                for (const pattern of patterns) {
                    try {
                        const deleted = yield redis_1.promoCache.deleteByPattern(pattern, batchSize);
                        totalDeleted += deleted;
                        // Small delay between different patterns to prevent Redis from being overwhelmed
                        yield new Promise(resolve => setTimeout(resolve, 10));
                    }
                    catch (error) {
                        logger_1.default.error(`Error deleting cache pattern ${pattern}:`, error);
                        // Continue with next pattern even if one fails
                    }
                }
                // Invalidate specific promo code cache if ID is provided
                if (promoCodeId) {
                    try {
                        const singleDeleted = yield this.invalidateSinglePromoCache(promoCodeId);
                        totalDeleted += singleDeleted;
                    }
                    catch (error) {
                        logger_1.default.error(`Error invalidating single promo cache for ID ${promoCodeId}:`, error);
                        throw error; // Re-throw to handle in the outer catch
                    }
                }
                logger_1.default.info(`Invalidated ${totalDeleted} promo cache keys`);
                return totalDeleted;
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                logger_1.default.error('Error invalidating promo cache:', { error: errorMessage });
                throw new Error(`Failed to invalidate promo cache: ${errorMessage}`);
            }
        });
    }
    /**
     * Invalidate cache for a specific promo code
     * @param promoCodeId The ID of the promo code to invalidate
     * @returns Number of cache keys deleted
     */
    invalidateSinglePromoCache(promoCodeId) {
        return __awaiter(this, void 0, void 0, function* () {
            const patterns = [
                `promo_code:${promoCodeId}`,
                `promo_validation:${promoCodeId}:*`,
                `promo_plans:${promoCodeId}:*`,
                `promo_users:${promoCodeId}:*`,
                `promo_stats:${promoCodeId}:*`
            ];
            let totalDeleted = 0;
            const batchSize = 50; // Smaller batch size for single promo code
            for (const pattern of patterns) {
                try {
                    const deleted = yield redis_1.promoCache.deleteByPattern(pattern, batchSize);
                    totalDeleted += deleted;
                }
                catch (error) {
                    logger_1.default.error(`Error deleting cache pattern ${pattern} for promo ${promoCodeId}:`, error);
                    // Continue with next pattern even if one fails
                }
            }
            logger_1.default.info(`Invalidated ${totalDeleted} cache keys for promo code ${promoCodeId}`);
            return totalDeleted;
        });
    }
    /**
     * Invalidate promo code search results cache
     * @returns Number of cache keys deleted
     */
    invalidatePromoSearchCache() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const deleted = yield redis_1.promoCache.deleteByPattern('promo_search:*', 100);
                logger_1.default.info(`Invalidated ${deleted} promo search cache keys`);
                return deleted;
            }
            catch (error) {
                logger_1.default.error('Error invalidating promo search cache:', error);
                throw new Error('Failed to invalidate promo search cache');
            }
        });
    }
    /**
     * Invalidate promo code statistics cache
     * @returns Number of cache keys deleted
     */
    invalidatePromoStatsCache() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const deleted = yield redis_1.promoCache.deleteByPattern('promo_stats:*', 100);
                logger_1.default.info(`Invalidated ${deleted} promo stats cache keys`);
                return deleted;
            }
            catch (error) {
                logger_1.default.error('Error invalidating promo stats cache:', error);
                throw new Error('Failed to invalidate promo stats cache');
            }
        });
    }
    /**
     * Invalidate cache for promo code plans
     * @param promoCodeId The ID of the promo code
     * @returns Number of cache keys deleted
     */
    invalidatePromoPlansCache(promoCodeId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const pattern = `promo_plans:${promoCodeId}:*`;
                const deleted = yield redis_1.promoCache.deleteByPattern(pattern, 100);
                logger_1.default.info(`Invalidated ${deleted} cache keys for promo code ${promoCodeId} plans`);
                return deleted;
            }
            catch (error) {
                logger_1.default.error(`Error invalidating promo plans cache for ${promoCodeId}:`, error);
                throw new Error('Failed to invalidate promo plans cache');
            }
        });
    }
    getTimestamp() {
        return new Date().toISOString();
    }
    log(message, data) {
        // Removed console logging
    }
    error(message, error) {
        // Removed console error logging
    }
    getAllPromoCodes() {
        return __awaiter(this, arguments, void 0, function* (filters = {}) {
            try {
                const page = filters.page || 1;
                const pageSize = 10;
                const skip = (page - 1) * pageSize;
                const searchTerm = filters.search || '';
                const sortOrder = filters.sort || 'createdAt_desc';
                let statusFilter = filters.status ? filters.status.toLowerCase() : undefined;
                let discountTypeFilter = filters.discountType;
                if (statusFilter === 'percentage' || statusFilter === 'fixed') {
                    discountTypeFilter = statusFilter;
                    statusFilter = undefined;
                }
                // Generate cache key with all relevant filters and current date
                const today = new Date().toISOString().split('T')[0];
                const cacheKey = `promo_codes:${today}:${JSON.stringify({
                    status: statusFilter,
                    discountType: discountTypeFilter,
                    search: searchTerm,
                    sort: sortOrder,
                    page,
                    pageSize
                })}`;
                const promoCodeRepo = data_source_1.AppDataSource.getRepository(PromoCode_entity_1.PromoCode);
                const queryBuilder = promoCodeRepo.createQueryBuilder('promoCode')
                    .leftJoinAndSelect('promoCode.applicablePlans', 'applicablePlans')
                    .leftJoinAndSelect('promoCode.applicableUsers', 'applicableUsers');
                const now = new Date();
                if (statusFilter) {
                    if (statusFilter === 'active') {
                        queryBuilder.andWhere('promoCode.isActive = :isActive', { isActive: true });
                    }
                    else if (statusFilter === 'expired') {
                        queryBuilder.andWhere(new typeorm_1.Brackets((qb) => {
                            qb.where('promoCode.isActive = :isActive', { isActive: false })
                                .orWhere('promoCode.endDate < :now', { now });
                        }));
                    }
                }
                if (discountTypeFilter) {
                    const normalizedDiscountType = discountTypeFilter.toLowerCase();
                    if (normalizedDiscountType === 'percentage' || normalizedDiscountType === 'fixed') {
                        queryBuilder.andWhere('promoCode.discountType = :discountType', {
                            discountType: normalizedDiscountType
                        });
                    }
                    const sql = queryBuilder.getQueryAndParameters();
                }
                if (searchTerm) {
                    const searchPattern = `%${searchTerm.toLowerCase()}%`;
                    queryBuilder.andWhere('(LOWER(promoCode.code) LIKE :search OR LOWER(promoCode.description) LIKE :search)', { search: searchPattern });
                }
                const total = yield queryBuilder.getCount();
                logger_1.default.debug('Processing sort order:', { sortOrder, type: typeof sortOrder });
                // Default values
                let field = 'createdAt';
                let direction = 'DESC';
                // Parse sort parameter if provided
                if (sortOrder && typeof sortOrder === 'string') {
                    const parts = sortOrder.split('_');
                    // Validate and set sort field
                    if (parts[0]) {
                        const validFields = ['id', 'code', 'createdAt', 'updatedAt', 'startDate', 'endDate', 'discountValue'];
                        if (validFields.includes(parts[0])) {
                            field = parts[0];
                        }
                        else {
                            logger_1.default.warn(`Invalid sort field: ${parts[0]}, using default`);
                        }
                    }
                    // Validate and set sort direction
                    if (parts[1]) {
                        const dir = parts[1].toUpperCase();
                        if (dir === 'ASC' || dir === 'DESC') {
                            direction = dir;
                        }
                        else {
                            logger_1.default.warn(`Invalid sort direction: ${parts[1]}, using default`);
                        }
                    }
                }
                // Apply sorting with explicit string literals to ensure type safety
                logger_1.default.debug('Applying sort:', { field, direction });
                const sortDir = direction === 'ASC' ? 'ASC' : 'DESC';
                // Apply sorting using the safe field and direction
                switch (field) {
                    case 'id':
                        queryBuilder.orderBy('promoCode.id', sortDir);
                        break;
                    case 'code':
                        queryBuilder.orderBy('promoCode.code', sortDir);
                        break;
                    case 'createdAt':
                        queryBuilder.orderBy('promoCode.createdAt', sortDir);
                        break;
                    case 'updatedAt':
                        queryBuilder.orderBy('promoCode.updatedAt', sortDir);
                        break;
                    case 'startDate':
                        queryBuilder.orderBy('promoCode.startDate', sortDir);
                        break;
                    case 'endDate':
                        queryBuilder.orderBy('promoCode.endDate', sortDir);
                        break;
                    case 'discountValue':
                        queryBuilder.orderBy('promoCode.discountValue', sortDir);
                        break;
                    default:
                        // Fallback to default sorting
                        queryBuilder.orderBy('promoCode.createdAt', 'DESC');
                }
                queryBuilder.skip(skip).take(pageSize);
                const promoCodes = yield queryBuilder.getMany();
                // Prepare response
                const result = {
                    items: promoCodes,
                    totalPages: Math.ceil(total / pageSize),
                    currentPage: page,
                    totalItems: total,
                };
                const ttl = cache_key_utils_1.CacheKeyUtils.getTTL();
                yield redis_1.promoCache.set(cacheKey, result, ttl);
                return {
                    items: promoCodes,
                    totalPages: Math.ceil(total / pageSize),
                    currentPage: page,
                    totalItems: total,
                };
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                logger_1.default.error('Error executing promo code query:', error);
                throw new Error(`Failed to fetch promo codes: ${errorMessage}`);
            }
        });
    }
    getPromoCodeById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const cacheKey = `promo_code:${id}`;
            const cachedData = yield redis_1.promoCache.get(cacheKey);
            if (cachedData) {
                return cachedData;
            }
            const promoCode = yield data_source_1.AppDataSource.getRepository(PromoCode_entity_1.PromoCode).findOne({
                where: { id },
                relations: ['applicablePlans', 'applicableUsers'],
            });
            if (promoCode) {
                yield redis_1.promoCache.set(cacheKey, promoCode, 3600);
            }
            return promoCode;
        });
    }
    createPromoCode(promoCodeData) {
        return __awaiter(this, void 0, void 0, function* () {
            return data_source_1.AppDataSource.manager.transaction((transactionalEntityManager) => __awaiter(this, void 0, void 0, function* () {
                var _a, _b, _c;
                const promoCodeRepo = transactionalEntityManager.getRepository(PromoCode_entity_1.PromoCode);
                // --- Business Logic and Validation ---
                if (!promoCodeData.code || promoCodeData.code.trim() === '') {
                    throw new api_error_1.BadRequestError('Promo code cannot be empty.');
                }
                if (promoCodeData.discountType == null || promoCodeData.discountValue == null) {
                    throw new api_error_1.BadRequestError('Discount type and value are required.');
                }
                const existingCode = yield promoCodeRepo.findOne({ where: { code: promoCodeData.code } });
                if (existingCode) {
                    throw new api_error_1.BadRequestError(`Promo code "${promoCodeData.code}" already exists.`);
                }
                if (promoCodeData.discountType === PromoCode_entity_1.DiscountType.PERCENTAGE && (promoCodeData.discountValue < 1 || promoCodeData.discountValue > 100)) {
                    throw new api_error_1.BadRequestError('Percentage discount must be between 1 and 100.');
                }
                if (promoCodeData.discountType === PromoCode_entity_1.DiscountType.FIXED && promoCodeData.discountValue <= 0) {
                    throw new api_error_1.BadRequestError('Fixed discount must be a positive number.');
                }
                if (promoCodeData.endDate && new Date(promoCodeData.endDate) <= new Date()) {
                    throw new api_error_1.BadRequestError('Expiration date must be in the future.');
                }
                if (promoCodeData.usageLimit != null && promoCodeData.usageLimit <= 0) {
                    throw new api_error_1.BadRequestError('Max uses must be a positive number.');
                }
                // --- End Validation ---
                const promoCode = promoCodeRepo.create(Object.assign(Object.assign({}, promoCodeData), { isActive: (_a = promoCodeData.isActive) !== null && _a !== void 0 ? _a : true, usageCount: 0 }));
                const savedPromoCode = yield promoCodeRepo.save(promoCode);
                if ((_b = promoCodeData.applicablePlans) === null || _b === void 0 ? void 0 : _b.length) {
                    yield this._addApplicablePlans(transactionalEntityManager, savedPromoCode.id, promoCodeData.applicablePlans.map(p => p.id));
                }
                if ((_c = promoCodeData.applicableUsers) === null || _c === void 0 ? void 0 : _c.length) {
                    yield this._addApplicableUsers(transactionalEntityManager, savedPromoCode.id, promoCodeData.applicableUsers.map(u => u.id));
                }
                const deletedCount = yield this.invalidatePromoCache();
                logger_1.default.info(`Created promo code with ID ${savedPromoCode.id}, invalidated ${deletedCount} cache keys.`);
                return savedPromoCode;
            }));
        });
    }
    updatePromoCode(id, promoCodeData) {
        return __awaiter(this, void 0, void 0, function* () {
            return data_source_1.AppDataSource.manager.transaction((transactionalEntityManager) => __awaiter(this, void 0, void 0, function* () {
                var _a;
                const promoCodeRepo = transactionalEntityManager.getRepository(PromoCode_entity_1.PromoCode);
                const promoCode = yield promoCodeRepo.findOne({ where: { id } });
                if (!promoCode) {
                    throw new api_error_1.NotFoundError('Promo code not found');
                }
                // --- Business Logic and Validation ---
                if (promoCodeData.code && promoCodeData.code !== promoCode.code) {
                    const existingCode = yield promoCodeRepo.findOne({ where: { code: promoCodeData.code } });
                    if (existingCode) {
                        throw new api_error_1.BadRequestError(`Promo code "${promoCodeData.code}" already exists.`);
                    }
                }
                if (promoCodeData.discountType && promoCodeData.discountType !== promoCode.discountType) {
                    throw new api_error_1.BadRequestError('Cannot change the discount type of an existing promo code.');
                }
                const finalType = promoCode.discountType;
                const finalValue = (_a = promoCodeData.discountValue) !== null && _a !== void 0 ? _a : promoCode.discountValue;
                if (finalType === PromoCode_entity_1.DiscountType.PERCENTAGE && (finalValue < 1 || finalValue > 100)) {
                    throw new api_error_1.BadRequestError('Percentage discount must be between 1 and 100.');
                }
                if (finalType === PromoCode_entity_1.DiscountType.FIXED && finalValue <= 0) {
                    throw new api_error_1.BadRequestError('Fixed discount must be a positive number.');
                }
                if (promoCodeData.endDate && new Date(promoCodeData.endDate) <= new Date()) {
                    throw new api_error_1.BadRequestError('Expiration date must be in the future.');
                }
                // --- End Validation ---
                promoCodeRepo.merge(promoCode, promoCodeData);
                const updatedPromoCode = yield promoCodeRepo.save(promoCode);
                if (promoCodeData.applicablePlans) {
                    yield transactionalEntityManager.getRepository(PromoCodeApplicablePlan_entity_1.PromoCodeApplicablePlan).delete({ promoCodeId: id });
                    if (promoCodeData.applicablePlans.length > 0) {
                        yield this._addApplicablePlans(transactionalEntityManager, id, promoCodeData.applicablePlans.map(p => p.id));
                    }
                }
                if (promoCodeData.applicableUsers) {
                    yield transactionalEntityManager.getRepository(PromoCodeApplicableUser_entity_1.PromoCodeApplicableUser).delete({ promoCodeId: id });
                    if (promoCodeData.applicableUsers.length > 0) {
                        yield this._addApplicableUsers(transactionalEntityManager, id, promoCodeData.applicableUsers.map(u => u.id));
                    }
                }
                const deletedCount = yield this.invalidatePromoCache(id);
                logger_1.default.info(`Updated promo code with ID ${id}, invalidated ${deletedCount} cache keys.`);
                return updatedPromoCode;
            }));
        });
    }
    deletePromoCode(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return data_source_1.AppDataSource.manager.transaction((transactionalEntityManager) => __awaiter(this, void 0, void 0, function* () {
                const promoCodeRepo = transactionalEntityManager.getRepository(PromoCode_entity_1.PromoCode);
                const result = yield promoCodeRepo.delete(id);
                if (result.affected === 0) {
                    throw new api_error_1.NotFoundError('Promo code not found');
                }
                const deletedCount = yield this.invalidatePromoCache(id);
                logger_1.default.info(`Deleted promo code with ID ${id}, invalidated ${deletedCount} cache keys.`);
            }));
        });
    }
    addApplicablePlans(promoCodeId, planIds) {
        return __awaiter(this, void 0, void 0, function* () {
            return data_source_1.AppDataSource.manager.transaction((transactionalEntityManager) => __awaiter(this, void 0, void 0, function* () {
                yield this._addApplicablePlans(transactionalEntityManager, promoCodeId, planIds);
                const deletedCount = yield this.invalidateSinglePromoCache(promoCodeId);
                logger_1.default.info(`Added applicable plans to promo code ${promoCodeId}, invalidated ${deletedCount} cache keys.`);
            }));
        });
    }
    _addApplicablePlans(entityManager, promoCodeId, planIds) {
        return __awaiter(this, void 0, void 0, function* () {
            const applicablePlanRepo = entityManager.getRepository(PromoCodeApplicablePlan_entity_1.PromoCodeApplicablePlan);
            const applicablePlans = planIds.map(planId => applicablePlanRepo.create({ promoCodeId, planId }));
            yield applicablePlanRepo.save(applicablePlans);
        });
    }
    addApplicableUsers(promoCodeId, userIds) {
        return __awaiter(this, void 0, void 0, function* () {
            return data_source_1.AppDataSource.manager.transaction((transactionalEntityManager) => __awaiter(this, void 0, void 0, function* () {
                yield this._addApplicableUsers(transactionalEntityManager, promoCodeId, userIds);
                const deletedCount = yield this.invalidateSinglePromoCache(promoCodeId);
                logger_1.default.info(`Added applicable users to promo code ${promoCodeId}, invalidated ${deletedCount} cache keys.`);
            }));
        });
    }
    _addApplicableUsers(entityManager, promoCodeId, userIds) {
        return __awaiter(this, void 0, void 0, function* () {
            const applicableUserRepo = entityManager.getRepository(PromoCodeApplicableUser_entity_1.PromoCodeApplicableUser);
            const applicableUsers = userIds.map(userId => applicableUserRepo.create({ promoCodeId, userId }));
            yield applicableUserRepo.save(applicableUsers);
        });
    }
    validatePromoCode(code, userId, planId) {
        return __awaiter(this, void 0, void 0, function* () {
            const cacheKey = `promo_validation:${code}:${userId}:${planId}`;
            const cachedResult = yield redis_1.promoCache.get(cacheKey);
            if (cachedResult) {
                return cachedResult;
            }
            const promoCode = yield data_source_1.AppDataSource.getRepository(PromoCode_entity_1.PromoCode).findOne({ where: { code } });
            if (!promoCode) {
                return { isValid: false, message: 'Promo code not found' };
            }
            const validationResult = yield this.validationService.validatePromoCode(promoCode.id, userId, planId);
            if (!validationResult.isValid) {
                return { isValid: false, message: validationResult.message };
            }
            const plan = yield data_source_1.AppDataSource.getRepository(SubscriptionPlan_entity_1.SubscriptionPlan).findOne({ where: { id: planId } });
            if (!plan) {
                return { isValid: false, message: 'Invalid subscription plan' };
            }
            const discountAmount = this.calculateDiscount(promoCode, plan.price);
            const result = {
                isValid: true,
                promoCode,
                discountAmount,
                message: 'Promo code applied successfully',
            };
            yield redis_1.promoCache.set(cacheKey, result, 60 * 2);
            return result;
        });
    }
    applyPromoCode(subscriptionId, userId, promoCodeId, discountAmount) {
        return __awaiter(this, void 0, void 0, function* () {
            return data_source_1.AppDataSource.manager.transaction((transactionalEntityManager) => __awaiter(this, void 0, void 0, function* () {
                const promoCodeRepo = transactionalEntityManager.getRepository(PromoCode_entity_1.PromoCode);
                const promoCode = yield promoCodeRepo.findOne({ where: { id: promoCodeId } });
                if (!promoCode) {
                    throw new api_error_1.NotFoundError('Promo code not found');
                }
                const validationResult = yield this.validationService.validatePromoCode(promoCodeId, userId, subscriptionId);
                if (!validationResult.isValid) {
                    throw new api_error_1.BadRequestError(validationResult.message);
                }
                yield promoCodeRepo.increment({ id: promoCodeId }, 'usageCount', 1);
                const subPromoCodeRepo = transactionalEntityManager.getRepository(SubscriptionPromoCode_entity_1.SubscriptionPromoCode);
                const subscriptionPromoCode = subPromoCodeRepo.create({
                    promoCode: { id: promoCodeId },
                    discountAmount,
                    appliedDate: new Date(),
                    isActive: true,
                });
                const savedPromoCode = yield subPromoCodeRepo.save(subscriptionPromoCode);
                const deletedCount = yield this.invalidatePromoCache(promoCodeId);
                logger_1.default.info(`Applied promo code ${promoCodeId} to subscription ${subscriptionId}, invalidated ${deletedCount} cache keys.`);
                return savedPromoCode;
            }));
        });
    }
    calculateDiscount(promoCode, planPrice) {
        if (promoCode.discountType === PromoCode_entity_1.DiscountType.PERCENTAGE) {
            let discount = (planPrice * promoCode.discountValue) / 100;
            if (promoCode.maxDiscountAmount) {
                discount = Math.min(discount, promoCode.maxDiscountAmount);
            }
            return discount;
        }
        else if (promoCode.discountType === PromoCode_entity_1.DiscountType.FIXED) {
            return Math.min(promoCode.discountValue, planPrice);
        }
        throw new api_error_1.BadRequestError(`Invalid discount type for promo code ${promoCode.code}`);
    }
}
exports.PromoCodeService = PromoCodeService;
exports.promoCodeService = new PromoCodeService();
