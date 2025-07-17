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
exports.getAppRepository = exports.initializeDatabase = exports.AppDataSource = void 0;
const typeorm_1 = require("typeorm");
// Custom logger that does nothing
class NoopLogger {
    log(level, message) { }
    logMigration(message) { }
    logQuery(query, parameters, queryRunner) { }
    logQueryError(error, query, parameters, queryRunner) { }
    logQuerySlow(time, query, parameters, queryRunner) { }
    logSchemaBuild(message, queryRunner) { }
}
const Subscription_entity_1 = require("../entities/Subscription.entity");
const SubscriptionPlan_entity_1 = require("../entities/SubscriptionPlan.entity");
const PlanFeature_entity_1 = require("../entities/PlanFeature.entity");
const Payment_entity_1 = require("../entities/Payment.entity");
const PromoCode_entity_1 = require("../entities/PromoCode.entity");
const SubscriptionEvent_entity_1 = require("../entities/SubscriptionEvent.entity");
const SubscriptionPromoCode_entity_1 = require("../entities/SubscriptionPromoCode.entity");
const PromoCodeApplicablePlan_entity_1 = require("../entities/PromoCodeApplicablePlan.entity");
const PromoCodeApplicableUser_entity_1 = require("../entities/PromoCodeApplicableUser.entity");
const App_entity_1 = require("../entities/App.entity");
const SubscriptionAnalytics_entity_1 = require("../entities/SubscriptionAnalytics.entity");
const supabase_1 = require("../utils/supabase");
const logger_1 = __importDefault(require("../utils/logger"));
// Load environment variables
const NODE_ENV = process.env.NODE_ENV || 'development';
// Use Supabase DB configuration from main .env file
const SUPABASE_DB_HOST = process.env.SUPABASE_DB_HOST || 'db.leaekgpafpvrvykeuvgk.supabase.co';
const SUPABASE_DB_PORT = parseInt(process.env.SUPABASE_DB_PORT || '5432', 10);
const SUPABASE_DB_USER = process.env.SUPABASE_DB_USER || 'postgres';
const SUPABASE_DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD || 'COLLoSSkT4atAoWZ';
const SUPABASE_DB_NAME = process.env.SUPABASE_DB_NAME || 'postgres';
// Fallback PostgreSQL config (should not be used now)
const POSTGRES_HOST = process.env.POSTGRES_HOST || 'localhost';
const POSTGRES_PORT = parseInt(process.env.POSTGRES_PORT || '5432', 10);
const POSTGRES_USER = process.env.POSTGRES_USER || 'postgres';
const POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD || 'postgres';
const POSTGRES_DB = process.env.POSTGRES_DB || 'subscription_db';
// Common TypeORM config settings
const commonConfig = {
    name: 'default', // Important: this makes it the default connection
    type: 'postgres',
    entities: [
        Subscription_entity_1.Subscription,
        SubscriptionPlan_entity_1.SubscriptionPlan,
        PlanFeature_entity_1.PlanFeature,
        Payment_entity_1.Payment,
        PromoCode_entity_1.PromoCode,
        SubscriptionEvent_entity_1.SubscriptionEvent,
        SubscriptionPromoCode_entity_1.SubscriptionPromoCode,
        PromoCodeApplicablePlan_entity_1.PromoCodeApplicablePlan,
        PromoCodeApplicableUser_entity_1.PromoCodeApplicableUser,
        App_entity_1.App,
        SubscriptionAnalytics_entity_1.SubscriptionAnalytics
    ],
    // Set to false initially to prevent automatic enum creation
    synchronize: false,
    logging: false, // Disable default logging
    logger: new NoopLogger(), // Use our custom no-op logger
    ssl: {
        rejectUnauthorized: false // This allows self-signed certificates
    }, // Required for Supabase connection
};
// Create TypeORM config based on available connection details
let dataSourceOptions;
// Always use Supabase configuration from main .env file
logger_1.default.info('Using Supabase database configuration');
dataSourceOptions = Object.assign(Object.assign({}, commonConfig), { host: SUPABASE_DB_HOST, port: SUPABASE_DB_PORT, username: SUPABASE_DB_USER, password: SUPABASE_DB_PASSWORD, database: SUPABASE_DB_NAME, ssl: {
        rejectUnauthorized: false // This allows self-signed certificates
    }, synchronize: false // Disable auto synchronize to prevent enum conflicts
 });
// Create and export DataSource
exports.AppDataSource = new typeorm_1.DataSource(dataSourceOptions);
// Initialize database connection with priority on Supabase
const initializeDatabase = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // First verify Supabase connection (primary connection method)
        try {
            // Check if Supabase client is available
            if (!supabase_1.supabaseClient) {
                logger_1.default.warn('Supabase client not available - skipping connection check');
            }
            else {
                logger_1.default.info('Verifying Supabase connection...');
                const { data, error } = yield supabase_1.supabaseClient.from('subscriptions').select('count').limit(1);
                if (error) {
                    logger_1.default.warn(`Supabase connection warning: ${error.message}`);
                }
                else {
                    logger_1.default.info('✅ Supabase connection verified successfully');
                }
            }
        }
        catch (supaError) {
            logger_1.default.warn(`Supabase connection check failed: ${supaError instanceof Error ? supaError.message : String(supaError)}`);
            logger_1.default.warn('Continuing with TypeORM initialization, but Supabase functionality may be limited');
        }
        // Initialize TypeORM with connection details
        if (!exports.AppDataSource.isInitialized) {
            logger_1.default.info(`Initializing TypeORM with ${process.env.SUPABASE_POSTGRES_CONNECTION_STRING ? 'Supabase connection string' : 'direct PostgreSQL connection'}...`);
            yield exports.AppDataSource.initialize();
            logger_1.default.info('✅ TypeORM database connection established successfully');
            // After connection is established, attempt to create tables manually if needed
            try {
                logger_1.default.info('Checking if schema needs to be created...');
                const queryRunner = exports.AppDataSource.createQueryRunner();
                // Check if tables exist instead of using synchronize
                const tablesExist = yield queryRunner.hasTable('subscription');
                if (!tablesExist) {
                    logger_1.default.info('Creating schema manually to avoid enum conflicts...');
                    // Create tables manually but don't recreate enums
                    yield exports.AppDataSource.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
                    // Generate schema but skip creating types that might already exist
                    const sqlInMemory = yield exports.AppDataSource.driver.createSchemaBuilder().log();
                    // Apply schema without enum recreation
                    for (const query of sqlInMemory.upQueries) {
                        // Skip queries that might recreate enums
                        if (!query.query.includes('CREATE TYPE')) {
                            try {
                                yield queryRunner.query(query.query);
                            }
                            catch (err) {
                                // Log error but continue with other queries
                                logger_1.default.warn(`Error executing query: ${(err === null || err === void 0 ? void 0 : err.message) || String(err)}`);
                            }
                        }
                    }
                    logger_1.default.info('Schema created successfully');
                }
                else {
                    logger_1.default.info('Tables already exist, skipping schema creation');
                }
                yield queryRunner.release();
            }
            catch (schemaError) {
                logger_1.default.warn(`Schema creation error: ${(schemaError === null || schemaError === void 0 ? void 0 : schemaError.message) || String(schemaError)}`);
                logger_1.default.warn('Continuing with limited functionality');
            }
        }
        return exports.AppDataSource;
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger_1.default.error(`Database initialization failed: ${errorMessage}`);
        throw new Error(`Database initialization failed: ${errorMessage}`);
    }
});
exports.initializeDatabase = initializeDatabase;
// Helper to get repositories in a type-safe way
const getAppRepository = (entity) => {
    if (!exports.AppDataSource.isInitialized) {
        throw new Error('Database connection not initialized. Call initializeDatabase() first.');
    }
    return exports.AppDataSource.getRepository(entity);
};
exports.getAppRepository = getAppRepository;
