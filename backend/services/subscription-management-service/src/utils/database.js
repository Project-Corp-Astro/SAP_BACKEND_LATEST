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
exports.initializeDatabase = exports.AppDataSource = void 0;
const typeorm_1 = require("typeorm");
const logger_1 = __importDefault(require("./logger"));
const dotenv_1 = __importDefault(require("dotenv"));
const entities_1 = require("../entities");
// Load environment variables
dotenv_1.default.config();
// Initialize TypeORM DataSource
exports.AppDataSource = new typeorm_1.DataSource({
    type: 'postgres',
    host: process.env.SUPABASE_DB_HOST || 'localhost',
    port: parseInt(process.env.SUPABASE_DB_PORT || '5432'),
    username: process.env.SUPABASE_DB_USER || 'postgres',
    password: process.env.SUPABASE_DB_PASSWORD,
    database: process.env.SUPABASE_DB_NAME || 'postgres',
    synchronize: process.env.NODE_ENV === 'development',
    logging: process.env.NODE_ENV === 'development',
    entities: [
        entities_1.App,
        entities_1.SubscriptionPlan,
        entities_1.PlanFeature,
        entities_1.Subscription,
        entities_1.Payment,
        entities_1.SubscriptionEvent
    ],
    migrations: [__dirname + '/../models/migrations/*.{js,ts}'],
    subscribers: [__dirname + '/../models/subscribers/*.{js,ts}'],
});
// Function to initialize TypeORM connection
const initializeDatabase = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const dataSource = yield exports.AppDataSource.initialize();
        logger_1.default.info('PostgreSQL connection initialized successfully');
        // Apply migrations if in production
        if (process.env.NODE_ENV === 'production') {
            try {
                yield dataSource.runMigrations();
                logger_1.default.info('Database migrations applied successfully');
            }
            catch (migrationError) {
                logger_1.default.error('Error applying migrations:', migrationError);
            }
        }
        return dataSource;
    }
    catch (error) {
        logger_1.default.error('Error initializing PostgreSQL connection:', error);
        // Don't throw the error, just log it and return null to avoid crashing the service
        return null;
    }
});
exports.initializeDatabase = initializeDatabase;
exports.default = exports.AppDataSource;
