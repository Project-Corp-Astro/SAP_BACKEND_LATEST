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
exports.supabaseUtils = exports.checkSupabaseConnection = exports.supabaseAdminClient = exports.supabaseClient = void 0;
/**
 * Supabase utility for Subscription Management Service
 */
const supabase_js_1 = require("@supabase/supabase-js");
const logger_1 = __importDefault(require("./logger"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
/**
 * Create a Supabase client instance
 */
const createSupabaseClient = () => {
    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_ANON_KEY;
        if (!supabaseUrl || !supabaseKey) {
            logger_1.default.error('Supabase URL or key is missing in environment variables');
            return null;
        }
        return (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: true,
            },
        });
    }
    catch (error) {
        logger_1.default.error('Error creating Supabase client:', error);
        return null;
    }
};
/**
 * Create a Supabase admin client with service role key
 */
const createSupabaseAdminClient = () => {
    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
        if (!supabaseUrl || !supabaseServiceKey) {
            logger_1.default.error('Supabase URL or service role key is missing in environment variables');
            return null;
        }
        return (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
        });
    }
    catch (error) {
        logger_1.default.error('Error creating Supabase admin client:', error);
        return null;
    }
};
// Initialize Supabase clients
const supabaseClient = createSupabaseClient();
exports.supabaseClient = supabaseClient;
const supabaseAdminClient = createSupabaseAdminClient();
exports.supabaseAdminClient = supabaseAdminClient;
/**
 * Check Supabase connection
 */
const checkSupabaseConnection = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!supabaseClient) {
            return false;
        }
        // Try to make a simple query to test the connection
        const { data, error } = yield supabaseClient.from('dummy_check').select('*').limit(1);
        if (error) {
            // The table might not exist, but we received a response from Supabase
            if (error.code === '42P01') {
                logger_1.default.info('Supabase connection successful (table not found, but connection works)');
                return true;
            }
            logger_1.default.error('Supabase connection error:', error);
            return false;
        }
        logger_1.default.info('Supabase connection successful');
        return true;
    }
    catch (error) {
        logger_1.default.error('Supabase connection check failed:', error);
        return false;
    }
});
exports.checkSupabaseConnection = checkSupabaseConnection;
// Helper functions for common Supabase operations
const supabaseUtils = {
    /**
     * Fetch data from a table
     */
    select(table_1) {
        return __awaiter(this, arguments, void 0, function* (table, query = {}) {
            try {
                if (!supabaseClient)
                    throw new Error('Supabase client not initialized');
                let queryBuilder = supabaseClient.from(table).select();
                // Apply filters if provided
                if (query.filters) {
                    for (const [column, value] of Object.entries(query.filters)) {
                        queryBuilder = queryBuilder.eq(column, value);
                    }
                }
                // Apply limit if provided
                if (query.limit) {
                    queryBuilder = queryBuilder.limit(query.limit);
                }
                // Apply order if provided
                if (query.order) {
                    const { column, ascending = true } = query.order;
                    queryBuilder = queryBuilder.order(column, { ascending });
                }
                const { data, error } = yield queryBuilder;
                if (error)
                    throw error;
                return { data, error: null };
            }
            catch (error) {
                logger_1.default.error(`Error selecting from ${table}:`, error);
                return { data: null, error };
            }
        });
    },
    /**
     * Insert data into a table
     */
    insert(table, data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!supabaseClient)
                    throw new Error('Supabase client not initialized');
                const { data: result, error } = yield supabaseClient
                    .from(table)
                    .insert(data)
                    .select();
                if (error)
                    throw error;
                return { data: result, error: null };
            }
            catch (error) {
                logger_1.default.error(`Error inserting into ${table}:`, error);
                return { data: null, error };
            }
        });
    },
    /**
     * Update data in a table
     */
    update(table, data, match) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!supabaseClient)
                    throw new Error('Supabase client not initialized');
                let queryBuilder = supabaseClient.from(table).update(data);
                // Apply match conditions
                for (const [column, value] of Object.entries(match)) {
                    queryBuilder = queryBuilder.eq(column, value);
                }
                const { data: result, error } = yield queryBuilder.select();
                if (error)
                    throw error;
                return { data: result, error: null };
            }
            catch (error) {
                logger_1.default.error(`Error updating in ${table}:`, error);
                return { data: null, error };
            }
        });
    },
    /**
     * Delete data from a table
     */
    delete(table, match) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!supabaseClient)
                    throw new Error('Supabase client not initialized');
                let queryBuilder = supabaseClient.from(table).delete();
                // Apply match conditions
                for (const [column, value] of Object.entries(match)) {
                    queryBuilder = queryBuilder.eq(column, value);
                }
                const { data: result, error } = yield queryBuilder.select();
                if (error)
                    throw error;
                return { data: result, error: null };
            }
            catch (error) {
                logger_1.default.error(`Error deleting from ${table}:`, error);
                return { data: null, error };
            }
        });
    },
    /**
     * Get subscriptions for a user
     */
    getSubscriptionsForUser(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!supabaseClient)
                    throw new Error('Supabase client not initialized');
                const { data, error } = yield supabaseClient
                    .from('subscriptions')
                    .select('*')
                    .eq('user_id', userId);
                if (error)
                    throw error;
                return { data, error: null };
            }
            catch (error) {
                logger_1.default.error(`Error getting subscriptions for user ${userId}:`, error);
                return { data: null, error };
            }
        });
    },
    /**
     * Get active subscription for a user
     */
    getActiveSubscription(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!supabaseClient)
                    throw new Error('Supabase client not initialized');
                const { data, error } = yield supabaseClient
                    .from('subscriptions')
                    .select('*')
                    .eq('user_id', userId)
                    .eq('status', 'active')
                    .maybeSingle();
                if (error)
                    throw error;
                return { data, error: null };
            }
            catch (error) {
                logger_1.default.error(`Error getting active subscription for user ${userId}:`, error);
                return { data: null, error };
            }
        });
    },
    /**
     * Close any open connections
     */
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // No specific close method with current Supabase JS client
                logger_1.default.info('Supabase connections closed');
                return Promise.resolve();
            }
            catch (error) {
                logger_1.default.error('Error closing Supabase connections:', error);
            }
        });
    }
};
exports.supabaseUtils = supabaseUtils;
exports.default = supabaseUtils;
