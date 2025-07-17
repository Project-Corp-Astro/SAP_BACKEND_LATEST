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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionPlanService = void 0;
const data_source_1 = require("../db/data-source");
const SubscriptionPlan_entity_1 = require("../entities/SubscriptionPlan.entity");
const SubscriptionPlan_entity_2 = require("../entities/SubscriptionPlan.entity");
const PlanFeature_entity_1 = require("../entities/PlanFeature.entity");
const logger_1 = __importDefault(require("../utils/logger"));
const redis_1 = require("../utils/redis");
const subscription_plan_errors_1 = require("../types/subscription-plan.errors");
const App_entity_1 = require("../entities/App.entity");
const api_error_1 = require("../errors/api-error");
class SubscriptionPlanService {
    constructor() {
        this.redisDb = 3; // Subscription service uses DB3
        this.initializeRepositories();
    }
    initializeRepositories() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!data_source_1.AppDataSource.isInitialized) {
                    yield data_source_1.AppDataSource.initialize();
                    logger_1.default.info('Database connection initialized');
                }
                this.planRepository = data_source_1.AppDataSource.getRepository(SubscriptionPlan_entity_2.SubscriptionPlan);
                this.featureRepository = data_source_1.AppDataSource.getRepository(PlanFeature_entity_1.PlanFeature);
                this.appRepository = data_source_1.AppDataSource.getRepository(App_entity_1.App);
                logger_1.default.info(`Initialized repositories for SubscriptionPlanService, using Redis DB${this.redisDb}`);
            }
            catch (error) {
                logger_1.default.error('Failed to initialize repositories in SubscriptionPlanService:', {
                    error: error.message,
                    stack: error.stack,
                });
                throw error;
            }
        });
    }
    /**
     * Get all apps for dropdown
     * @returns Array of {id, name} objects
     */
    getAppsForDropdown() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const cacheKey = 'apps:dropdown';
                const fullCacheKey = `subscription:apps:${cacheKey}`;
                // Try to get from cache first
                const cachedResult = yield redis_1.planCache.get(cacheKey).catch((cacheError) => {
                    logger_1.default.warn(`Error fetching from cache for key ${fullCacheKey} in Redis DB${this.redisDb}:`, {
                        error: cacheError.message,
                        stack: cacheError.stack,
                    });
                    return null;
                });
                if (cachedResult) {
                    logger_1.default.debug(`Cache hit for key: ${fullCacheKey} in Redis DB${this.redisDb}`);
                    return cachedResult;
                }
                logger_1.default.debug(`Cache miss for key: ${fullCacheKey} in Redis DB${this.redisDb}, querying database`);
                // Get apps from database
                const apps = yield this.appRepository.find({
                    select: ['id', 'name', 'color', 'logo'],
                    order: { name: 'ASC' }
                });
                // Transform to dropdown format
                const dropdownApps = apps.map(app => ({
                    id: app.id,
                    name: app.name,
                    color: app.color,
                    logo: app.logo
                }));
                // Cache the results for 1 hour
                try {
                    const success = yield redis_1.planCache.set(cacheKey, dropdownApps, 60 * 60); // Cache for 1 hour
                    if (success) {
                        logger_1.default.debug(`Stored apps dropdown in cache key: ${fullCacheKey} with TTL 1 hour in Redis DB${this.redisDb}`);
                    }
                    else {
                        logger_1.default.warn(`Failed to store apps dropdown in cache key: ${fullCacheKey} in Redis DB${this.redisDb}`);
                    }
                }
                catch (cacheError) {
                    logger_1.default.error(`Error caching apps dropdown for key ${fullCacheKey} in Redis DB${this.redisDb}:`, cacheError);
                }
                return dropdownApps;
            }
            catch (error) {
                logger_1.default.error('Error fetching apps for dropdown:', {
                    error: error.message,
                    stack: error.stack,
                });
                throw new subscription_plan_errors_1.SubscriptionPlanServiceError(subscription_plan_errors_1.SubscriptionPlanError.VALIDATION_FAILED, 'Failed to fetch apps');
            }
        });
    }
    getPlanRepository() {
        if (!this.planRepository) {
            this.planRepository = data_source_1.AppDataSource.getRepository(SubscriptionPlan_entity_2.SubscriptionPlan);
        }
        return this.planRepository;
    }
    getFeatureRepository() {
        if (!this.featureRepository) {
            this.featureRepository = data_source_1.AppDataSource.getRepository(PlanFeature_entity_1.PlanFeature);
        }
        return this.featureRepository;
    }
    /**
     * Invalidate cache for plan-related data
     * @param planId Optional specific plan ID to invalidate
     * @param appId Optional app ID to invalidate app-specific caches
     */
    invalidatePlanCache(planId, appId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const patterns = [
                    'plans:*', // All plan listings and filtered lists
                    'plan:*', // Individual plan caches
                    'subscription:*:plan:*', // Subscription data referencing plans
                    'billing:*:plan:*', // Billing data referencing plans
                    'cache:plans:*', // Miscellaneous plan caches
                    'featured:plans*', // Featured plans
                    'popular:plans*' // Popular plans
                ];
                // Add specific patterns for planId if provided
                if (planId) {
                    patterns.push(`plan:${planId}`, // Specific plan
                    `plans:*:${planId}`, // Listings containing this plan
                    `subscriptions:*:plan:${planId}`, // Subscriptions for this plan
                    `billing:*:plan:${planId}`, // Billing for this plan
                    `cache:plans:${planId}` // Direct plan cache
                    );
                }
                // Add app-specific patterns if appId is provided
                if (appId) {
                    patterns.push(`app:${appId}:plans`, // App-specific plan lists
                    `apps:${appId}:plans`, // App-specific plan caches
                    `plans:app:${appId}:*` // Plans tied to this app
                    );
                }
                let totalDeleted = 0;
                const batchSize = 50;
                // Use Set to avoid duplicate patterns
                const uniquePatterns = [...new Set(patterns)];
                for (const pattern of uniquePatterns) {
                    try {
                        const deleted = yield redis_1.planCache.deleteByPattern(pattern, batchSize);
                        totalDeleted += deleted;
                        if (deleted > 0) {
                            logger_1.default.debug(`Invalidated ${deleted} cache keys for pattern '${pattern}' in Redis DB${this.redisDb}`);
                        }
                    }
                    catch (error) {
                        logger_1.default.warn(`Failed to invalidate cache for pattern '${pattern}':`, {
                            error: error instanceof Error ? error.message : String(error),
                            planId,
                            appId
                        });
                    }
                }
                logger_1.default.info(`Invalidated total ${totalDeleted} plan-related cache keys in Redis DB${this.redisDb}${planId ? ` for plan ${planId}` : ''}${appId ? ` for app ${appId}` : ''}`);
            }
            catch (error) {
                logger_1.default.warn(`Failed to invalidate plan cache in Redis DB${this.redisDb}:`, {
                    error: error.message,
                    stack: error.stack,
                    planId,
                    appId
                });
            }
        });
    }
    /**
     * Get all subscription plans with pagination and filtering
     */
    getAllPlans() {
        return __awaiter(this, arguments, void 0, function* (filters = {
            includeInactive: false
        }, page = 1, limit = 10) {
            try {
                // Initialize filters with default values
                const finalFilters = {
                    appId: filters.appId,
                    status: filters.status,
                    name: filters.name,
                    sortPosition: filters.sortPosition,
                    highlight: filters.highlight,
                    billingCycle: filters.billingCycle,
                    includeInactive: filters.includeInactive || false
                };
                // Validate status if provided
                const validStatuses = ['active', 'draft', 'archived'];
                if (finalFilters.status) {
                    const lowerCaseStatus = finalFilters.status.toLowerCase();
                    if (!validStatuses.includes(lowerCaseStatus)) {
                        throw new Error(`Invalid status value. Must be one of: ${validStatuses.join(', ')}`);
                    }
                    finalFilters.status = lowerCaseStatus;
                }
                const cacheKey = `plans:${JSON.stringify(finalFilters)}:${page}:${limit}`;
                const fullCacheKey = `subscription:plans:${cacheKey}`;
                // Try to get from cache first
                const cachedResult = yield redis_1.planCache.get(cacheKey).catch((cacheError) => {
                    logger_1.default.warn(`Error fetching from cache for key ${fullCacheKey} in Redis DB${this.redisDb}:`, {
                        error: cacheError.message,
                        stack: cacheError.stack,
                    });
                    return null;
                });
                if (cachedResult) {
                    logger_1.default.debug(`Cache hit for key: ${fullCacheKey} in Redis DB${this.redisDb}`);
                    return cachedResult;
                }
                logger_1.default.debug(`Cache miss for key: ${fullCacheKey} in Redis DB${this.redisDb}, querying database`);
                // Build where clause
                const where = {};
                // Handle each filter parameter
                if (filters.appId) {
                    where.appId = filters.appId;
                }
                if (filters.status) {
                    where.status = filters.status;
                }
                if (filters.name) {
                    where.name = filters.name;
                }
                if (filters.description) {
                    where.description = filters.description;
                }
                if (filters.price !== undefined) {
                    where.price = filters.price;
                }
                if (filters.billingCycle) {
                    where.billingCycle = filters.billingCycle;
                }
                if (filters.trialDays !== undefined) {
                    where.trialDays = filters.trialDays;
                }
                if (filters.sortPosition !== undefined) {
                    where.sortPosition = filters.sortPosition;
                }
                if (filters.highlight) {
                    where.highlight = filters.highlight;
                }
                if (!filters.includeInactive && !filters.status) {
                    where.status = SubscriptionPlan_entity_1.PlanStatus.ACTIVE;
                }
                // Get plans with features from database with pagination
                const [plans, total] = yield this.getPlanRepository()
                    .createQueryBuilder('plan')
                    .leftJoinAndSelect('plan.features', 'features')
                    .where(where)
                    .skip((page - 1) * limit)
                    .take(limit)
                    .getManyAndCount();
                const result = { plans, total };
                // Cache the results for 5 minutes
                try {
                    const success = yield redis_1.planCache.set(cacheKey, result, 60 * 5); // Cache for 5 minutes
                    if (success) {
                        logger_1.default.debug(`Stored ${plans.length} plans in cache key: ${fullCacheKey} with TTL 5 minutes in Redis DB${this.redisDb}`);
                    }
                    else {
                        logger_1.default.warn(`Failed to store plans in cache key: ${fullCacheKey} in Redis DB${this.redisDb}`);
                    }
                }
                catch (cacheError) {
                    logger_1.default.warn(`Error caching plans for key ${fullCacheKey} in Redis DB${this.redisDb}:`, cacheError);
                }
                return result;
            }
            catch (error) {
                logger_1.default.error('Error in getAllPlans:', {
                    error: error.message,
                    stack: error.stack,
                    filters: {
                        appId: filters.appId,
                        status: filters.status,
                        name: filters.name,
                        sortPosition: filters.sortPosition,
                        highlight: filters.highlight,
                        billingCycle: filters.billingCycle,
                        includeInactive: filters.includeInactive
                    },
                    page,
                    limit
                });
                throw error;
            }
        });
    }
    /**
     * Get a specific plan by ID
     */
    getPlanById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const cacheKey = `plan:${id}`;
                const fullCacheKey = `subscription:plans:${cacheKey}`;
                // Try to get from cache first
                const cachedPlan = yield redis_1.planCache.get(cacheKey).catch((cacheError) => {
                    logger_1.default.warn(`Error fetching from cache for key ${fullCacheKey} in Redis DB${this.redisDb}:`, {
                        error: cacheError.message,
                        stack: cacheError.stack,
                    });
                    return null;
                });
                if (cachedPlan) {
                    logger_1.default.debug(`Cache hit for key: ${fullCacheKey} in Redis DB${this.redisDb}`);
                    return cachedPlan;
                }
                logger_1.default.debug(`Cache miss for key ${cacheKey} in Redis DB${this.redisDb}, querying database`);
                // Fetch from database
                const plan = yield this.getPlanRepository().findOne({
                    where: { id },
                    relations: ['features'],
                });
                if (plan) {
                    // Cache the result for 5 minutes
                    try {
                        const success = yield redis_1.planCache.set(cacheKey, plan, 60 * 5); // Cache for 5 minutes
                        if (success) {
                            logger_1.default.debug(`Stored plan in cache key: ${fullCacheKey} with TTL 5 minutes in Redis DB${this.redisDb}`);
                        }
                        else {
                            logger_1.default.warn(`Failed to store plan in cache key: ${fullCacheKey} in Redis DB${this.redisDb}`);
                        }
                    }
                    catch (cacheError) {
                        logger_1.default.warn(`Error caching plan for key ${fullCacheKey} in Redis DB${this.redisDb}:`, {
                            error: cacheError.message,
                            stack: cacheError.stack,
                        });
                    }
                }
                else {
                    logger_1.default.debug(`No plan found for ID ${id}, not caching in Redis DB${this.redisDb}`);
                }
                return plan;
            }
            catch (error) {
                logger_1.default.error(`Error getting subscription plan ${id}:`, {
                    error: error.message,
                    stack: error.stack,
                });
                throw error;
            }
        });
    }
    /**
     * Create a new subscription plan - Admin access
     */
    createPlan(planData) {
        return __awaiter(this, void 0, void 0, function* () {
            return data_source_1.AppDataSource.manager.transaction((transactionalEntityManager) => __awaiter(this, void 0, void 0, function* () {
                var _a;
                try {
                    const planRepository = transactionalEntityManager.getRepository(SubscriptionPlan_entity_2.SubscriptionPlan);
                    const featureRepository = transactionalEntityManager.getRepository(PlanFeature_entity_1.PlanFeature);
                    // Business logic validation for creation
                    if (!planData.features || planData.features.length === 0) {
                        throw new api_error_1.BadRequestError('A subscription plan must have at least one feature.');
                    }
                    if (!planData.name || planData.name.trim() === '') {
                        throw new api_error_1.BadRequestError('Plan name cannot be empty.');
                    }
                    if (!planData.appId) {
                        throw new api_error_1.BadRequestError('A plan must be associated with an app.');
                    }
                    const existingPlan = yield planRepository.findOne({ where: { name: planData.name, appId: planData.appId } });
                    if (existingPlan) {
                        throw new api_error_1.BadRequestError(`A plan with the name "${planData.name}" already exists for this app.`);
                    }
                    // Create the plan entity
                    const { features } = planData, planOnlyData = __rest(planData, ["features"]);
                    const plan = planRepository.create(planOnlyData);
                    const savedPlan = yield transactionalEntityManager.save(plan);
                    logger_1.default.debug(`Saved plan with ID ${savedPlan.id}`);
                    // Process features
                    const savedFeatures = [];
                    for (const feature of features) {
                        if (String(feature.id).startsWith('temp-')) {
                            // Omit the temporary ID to let TypeORM generate a UUID
                            logger_1.default.debug(`Omitting temporary feature ID ${feature.id} for new feature`);
                            const { id: tempId } = feature, featureData = __rest(feature, ["id"]);
                            const featureToCreate = featureRepository.create(Object.assign(Object.assign({}, featureData), { planId: savedPlan.id, createdAt: new Date() }));
                            const savedFeature = yield transactionalEntityManager.save(featureToCreate);
                            savedFeatures.push(savedFeature);
                            logger_1.default.debug(`Saved new feature with ID ${savedFeature.id} for plan ${savedPlan.id}`);
                        }
                        else {
                            // Existing feature (should not happen in create, but handle for robustness)
                            logger_1.default.warn(`Unexpected non-temporary feature ID ${feature.id} in createPlan, treating as new feature`);
                            const { id: featureId } = feature, featureData = __rest(feature, ["id"]);
                            const featureToCreate = featureRepository.create(Object.assign(Object.assign({}, featureData), { planId: savedPlan.id, createdAt: new Date() }));
                            const savedFeature = yield transactionalEntityManager.save(featureToCreate);
                            savedFeatures.push(savedFeature);
                            logger_1.default.debug(`Saved new feature with ID ${savedFeature.id} for plan ${savedPlan.id}`);
                        }
                    }
                    // Attach saved features to the plan
                    savedPlan.features = savedFeatures;
                    // Invalidate caches
                    yield this.invalidatePlanCache(savedPlan.id, savedPlan.appId);
                    logger_1.default.info(`Created new subscription plan with ID ${savedPlan.id}, invalidated caches in Redis DB${this.redisDb}`);
                    return savedPlan;
                }
                catch (error) {
                    logger_1.default.error(`Error creating subscription plan:`, {
                        error: error.message,
                        stack: error.stack,
                        planData: {
                            name: planData.name,
                            appId: planData.appId,
                            featureCount: (_a = planData.features) === null || _a === void 0 ? void 0 : _a.length
                        }
                    });
                    throw error;
                }
            }));
        });
    }
    /**
     * Update an existing subscription plan - Admin access
     */
    updatePlan(id, planData) {
        return __awaiter(this, void 0, void 0, function* () {
            return data_source_1.AppDataSource.manager.transaction((transactionalEntityManager) => __awaiter(this, void 0, void 0, function* () {
                var _a;
                try {
                    const planRepository = transactionalEntityManager.getRepository(SubscriptionPlan_entity_2.SubscriptionPlan);
                    const featureRepository = transactionalEntityManager.getRepository(PlanFeature_entity_1.PlanFeature);
                    const plan = yield planRepository.findOne({ where: { id } });
                    if (!plan) {
                        throw new api_error_1.NotFoundError('Plan not found');
                    }
                    // Prevent duplicate plan names within the same app
                    if (planData.name && planData.appId && (planData.name !== plan.name || planData.appId !== plan.appId)) {
                        const existingPlan = yield planRepository.findOne({ where: { name: planData.name, appId: planData.appId } });
                        if (existingPlan) {
                            throw new api_error_1.BadRequestError(`A plan with the name "${planData.name}" already exists for this app.`);
                        }
                    }
                    // Separate features from the rest of the plan data
                    const { features } = planData, planOnlyData = __rest(planData, ["features"]);
                    // 1. Update the plan's own properties
                    planRepository.merge(plan, planOnlyData);
                    yield transactionalEntityManager.save(plan);
                    logger_1.default.debug(`Updated plan with ID ${id}`);
                    // 2. Handle features if they are part of the update
                    if (features) {
                        const existingFeatures = yield featureRepository.findBy({ planId: id });
                        const existingFeatureIds = existingFeatures.map(f => f.id);
                        const incomingFeatureIds = features
                            .map(f => f.id)
                            .filter(fid => fid && !String(fid).startsWith('temp-'));
                        // Features to delete
                        const featuresToDelete = existingFeatureIds.filter(fid => !incomingFeatureIds.includes(fid));
                        // Calculate final feature count for logging
                        const finalFeatureCount = existingFeatureIds.length - featuresToDelete.length + features.filter(f => String(f.id).startsWith('temp-')).length;
                        logger_1.default.debug(`Updating plan ${id} with ${finalFeatureCount} features`);
                        if (featuresToDelete.length > 0) {
                            yield featureRepository.delete(featuresToDelete);
                            logger_1.default.debug(`Deleted ${featuresToDelete.length} features for plan ${id}`);
                        }
                        // Features to update or create
                        for (const feature of features) {
                            if (String(feature.id).startsWith('temp-')) {
                                // Omit the temporary ID to let TypeORM generate a UUID
                                logger_1.default.debug(`Omitting temporary feature ID ${feature.id} for new feature`);
                                const { id: tempId } = feature, featureData = __rest(feature, ["id"]);
                                const featureToCreate = featureRepository.create(Object.assign(Object.assign({}, featureData), { planId: id, createdAt: new Date() }));
                                const savedFeature = yield transactionalEntityManager.save(featureToCreate);
                                logger_1.default.debug(`Saved new feature with ID ${savedFeature.id} for plan ${id}`);
                            }
                            else {
                                // Update existing feature
                                const { id: featureId } = feature, featureUpdateData = __rest(feature, ["id"]);
                                yield featureRepository.update({ id: featureId, planId: id }, featureUpdateData);
                                logger_1.default.debug(`Updated feature with ID ${featureId} for plan ${id}`);
                            }
                        }
                    }
                    // Invalidate caches
                    yield this.invalidatePlanCache(id, planData.appId || plan.appId);
                    logger_1.default.info(`Updated plan with ID ${id}, invalidated caches in Redis DB${this.redisDb}`);
                    // Return the fully updated plan with its features
                    const updatedPlan = yield planRepository.findOne({ where: { id }, relations: ['features'] });
                    return updatedPlan;
                }
                catch (error) {
                    logger_1.default.error(`Error updating subscription plan ${id}:`, {
                        error: error.message,
                        stack: error.stack,
                        planData: {
                            name: planData.name,
                            appId: planData.appId,
                            featureCount: (_a = planData.features) === null || _a === void 0 ? void 0 : _a.length
                        }
                    });
                    throw error;
                }
            }));
        });
    }
    /**
     * Delete a plan - Admin access (soft delete)
     */
    deletePlan(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return data_source_1.AppDataSource.manager.transaction((transactionalEntityManager) => __awaiter(this, void 0, void 0, function* () {
                const planRepository = transactionalEntityManager.getRepository(SubscriptionPlan_entity_2.SubscriptionPlan);
                const plan = yield planRepository.findOne({ where: { id } });
                if (!plan) {
                    throw new api_error_1.NotFoundError('Plan not found');
                }
                yield transactionalEntityManager.update(SubscriptionPlan_entity_2.SubscriptionPlan, { id }, {
                    status: SubscriptionPlan_entity_1.PlanStatus.ARCHIVED,
                    updatedAt: new Date(),
                });
                // Invalidate caches
                yield this.invalidatePlanCache(id, plan.appId);
                logger_1.default.info(`Soft deleted plan with ID ${id}, invalidated caches in Redis DB${this.redisDb}`);
            }));
        });
    }
    /**
     * Hard delete a plan - Super Admin only
     */
    hardDeletePlan(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return data_source_1.AppDataSource.manager.transaction((transactionalEntityManager) => __awaiter(this, void 0, void 0, function* () {
                const planRepository = transactionalEntityManager.getRepository(SubscriptionPlan_entity_2.SubscriptionPlan);
                const plan = yield planRepository.findOne({ where: { id } });
                if (!plan) {
                    throw new api_error_1.NotFoundError('Plan not found');
                }
                yield transactionalEntityManager.delete(SubscriptionPlan_entity_2.SubscriptionPlan, { id });
                // Invalidate caches
                yield this.invalidatePlanCache(id, plan.appId);
                logger_1.default.info(`Hard deleted plan with ID ${id}, invalidated caches in Redis DB${this.redisDb}`);
            }));
        });
    }
    /**
     * Add a feature to a subscription plan - Admin access
     */
    addFeature(planId, featureData) {
        return __awaiter(this, void 0, void 0, function* () {
            return data_source_1.AppDataSource.manager.transaction((transactionalEntityManager) => __awaiter(this, void 0, void 0, function* () {
                const planRepository = transactionalEntityManager.getRepository(SubscriptionPlan_entity_2.SubscriptionPlan);
                const featureRepository = transactionalEntityManager.getRepository(PlanFeature_entity_1.PlanFeature);
                const plan = yield planRepository.findOne({ where: { id: planId } });
                if (!plan) {
                    throw new api_error_1.NotFoundError('Subscription plan not found');
                }
                // Omit any provided ID to let TypeORM generate a UUID
                const { id } = featureData, featureDataWithoutId = __rest(featureData, ["id"]);
                const feature = featureRepository.create(Object.assign(Object.assign({}, featureDataWithoutId), { planId, createdAt: new Date() }));
                const savedFeature = yield transactionalEntityManager.save(feature);
                logger_1.default.debug(`Saved new feature with ID ${savedFeature.id} for plan ${planId}`);
                // Invalidate caches
                yield this.invalidatePlanCache(planId, plan.appId);
                logger_1.default.info(`Added feature to plan ${planId}, invalidated caches in Redis DB${this.redisDb}`);
                return savedFeature;
            }));
        });
    }
    /**
     * Update a plan feature - Admin access
     */
    updateFeature(featureId, featureData) {
        return __awaiter(this, void 0, void 0, function* () {
            return data_source_1.AppDataSource.manager.transaction((transactionalEntityManager) => __awaiter(this, void 0, void 0, function* () {
                const featureRepository = transactionalEntityManager.getRepository(PlanFeature_entity_1.PlanFeature);
                const planRepository = transactionalEntityManager.getRepository(SubscriptionPlan_entity_2.SubscriptionPlan);
                const featureToUpdate = yield featureRepository.findOne({ where: { id: featureId } });
                if (!featureToUpdate) {
                    throw new api_error_1.NotFoundError('Feature not found');
                }
                // Omit any provided ID in featureData to prevent overwriting
                const { id } = featureData, featureUpdateData = __rest(featureData, ["id"]);
                yield featureRepository.update({ id: featureId }, featureUpdateData);
                const updatedFeature = yield featureRepository.findOne({ where: { id: featureId } });
                if (updatedFeature) {
                    const plan = yield planRepository.findOne({ where: { id: updatedFeature.planId } });
                    if (plan) {
                        yield this.invalidatePlanCache(updatedFeature.planId, plan.appId);
                        logger_1.default.info(`Updated feature ${featureId}, invalidated caches in Redis DB${this.redisDb}`);
                    }
                }
                return updatedFeature;
            }));
        });
    }
    /**
     * Delete a plan feature - Admin access
     */
    deleteFeature(featureId) {
        return __awaiter(this, void 0, void 0, function* () {
            return data_source_1.AppDataSource.manager.transaction((transactionalEntityManager) => __awaiter(this, void 0, void 0, function* () {
                const featureRepository = transactionalEntityManager.getRepository(PlanFeature_entity_1.PlanFeature);
                const planRepository = transactionalEntityManager.getRepository(SubscriptionPlan_entity_2.SubscriptionPlan);
                const feature = yield featureRepository.findOne({ where: { id: featureId } });
                if (!feature) {
                    throw new api_error_1.NotFoundError('Feature not found');
                }
                const planId = feature.planId;
                yield transactionalEntityManager.delete(PlanFeature_entity_1.PlanFeature, { id: featureId });
                // Invalidate caches
                const plan = yield planRepository.findOne({ where: { id: planId } });
                if (plan) {
                    yield this.invalidatePlanCache(planId, plan.appId);
                    logger_1.default.info(`Deleted feature ${featureId}, invalidated caches in Redis DB${this.redisDb}`);
                }
            }));
        });
    }
    /**
     * Clear all plan-related caches (use with caution in production)
     */
    clearAllPlanCaches() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const patterns = [
                    'plans:*',
                    'plan:*',
                    'apps:dropdown',
                    'subscription:*:plan:*',
                    'billing:*:plan:*',
                    'cache:plans:*',
                    'featured:plans*',
                    'popular:plans*'
                ];
                let totalDeleted = 0;
                for (const pattern of patterns) {
                    totalDeleted += yield redis_1.planCache.deleteByPattern(pattern, 100);
                }
                logger_1.default.info(`Cleared all plan caches, removed ${totalDeleted} keys`);
                return {
                    success: true,
                    message: `Successfully cleared ${totalDeleted} cache keys related to plans`
                };
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                logger_1.default.error('Failed to clear plan caches:', { error: errorMessage });
                return {
                    success: false,
                    message: `Failed to clear plan caches: ${errorMessage}`
                };
            }
        });
    }
}
exports.SubscriptionPlanService = SubscriptionPlanService;
exports.default = new SubscriptionPlanService();
