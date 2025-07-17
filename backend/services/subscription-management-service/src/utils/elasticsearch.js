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
exports.checkElasticsearchConnection = exports.elasticsearchUtils = exports.elasticsearchClient = void 0;
const elasticsearch_1 = require("elasticsearch");
const config_1 = __importDefault(require("../config"));
const logger_1 = __importDefault(require("./logger"));
// Create Elasticsearch client instance
const elasticsearchClient = new elasticsearch_1.Client({
    host: config_1.default.elasticsearch.node,
    httpAuth: `${config_1.default.elasticsearch.auth.username}:${config_1.default.elasticsearch.auth.password}`,
    ssl: {
        rejectUnauthorized: config_1.default.elasticsearch.ssl.rejectUnauthorized,
    },
});
exports.elasticsearchClient = elasticsearchClient;
// Check Elasticsearch connection
const checkElasticsearchConnection = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Add an empty params object as required by the Elasticsearch client API
        const response = yield elasticsearchClient.info({});
        if (response && typeof response === 'object' && response.version && response.version.number) {
            logger_1.default.info(`Elasticsearch connection successful - version ${response.version.number}`);
            return true;
        }
        logger_1.default.info('Elasticsearch connection successful - version unknown');
        return true;
    }
    catch (error) {
        logger_1.default.error('Elasticsearch connection failed:', error);
        return false;
    }
});
exports.checkElasticsearchConnection = checkElasticsearchConnection;
// Helper functions for common Elasticsearch operations
const elasticsearchUtils = {
    /**
     * Create or update an index with mapping
     */
    createIndex(indexName, mapping) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const indexExists = yield elasticsearchClient.indices.exists({ index: indexName });
                if (!indexExists) {
                    yield elasticsearchClient.indices.create({
                        index: indexName,
                        body: mapping,
                    });
                    logger_1.default.info(`Index ${indexName} created successfully`);
                }
                else {
                    logger_1.default.info(`Index ${indexName} already exists`);
                }
                return true;
            }
            catch (error) {
                logger_1.default.error(`Error creating index ${indexName}:`, error);
                return false;
            }
        });
    },
    /**
     * Index a document
     */
    indexDocument(indexName, id, document) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield elasticsearchClient.index({
                    index: indexName,
                    type: '_doc', // Default type for ES 6.x and 7.x
                    id,
                    body: document,
                    refresh: true, // Make this document immediately available for search
                });
            }
            catch (error) {
                logger_1.default.error(`Error indexing document to ${indexName}:`, error);
                throw error;
            }
        });
    },
    /**
     * Update a document
     */
    updateDocument(indexName, id, document) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield elasticsearchClient.update({
                    index: indexName,
                    type: '_doc', // Default type for ES 6.x and 7.x
                    id,
                    body: {
                        doc: document,
                    },
                    refresh: true,
                });
            }
            catch (error) {
                logger_1.default.error(`Error updating document in ${indexName}:`, error);
                throw error;
            }
        });
    },
    /**
     * Search documents
     */
    searchDocuments(indexName, query) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield elasticsearchClient.search({
                    index: indexName,
                    body: query,
                });
            }
            catch (error) {
                logger_1.default.error(`Error searching documents in ${indexName}:`, error);
                throw error;
            }
        });
    },
    /**
     * Delete a document
     */
    deleteDocument(indexName, id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield elasticsearchClient.delete({
                    index: indexName,
                    type: '_doc', // Default type for ES 6.x and 7.x
                    id,
                    refresh: true,
                });
            }
            catch (error) {
                logger_1.default.error(`Error deleting document from ${indexName}:`, error);
                throw error;
            }
        });
    },
    /**
     * Delete an index
     */
    deleteIndex(indexName) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield elasticsearchClient.indices.delete({
                    index: indexName,
                });
            }
            catch (error) {
                logger_1.default.error(`Error deleting index ${indexName}:`, error);
                throw error;
            }
        });
    },
    /**
     * Bulk operations
     */
    bulkOperation(operations) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield elasticsearchClient.bulk({
                    refresh: true,
                    body: operations,
                });
            }
            catch (error) {
                logger_1.default.error('Error performing bulk operation:', error);
                throw error;
            }
        });
    },
    /**
     * Close Elasticsearch connection
     */
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield elasticsearchClient.close();
                logger_1.default.info('Elasticsearch connection closed');
            }
            catch (error) {
                logger_1.default.error('Error closing Elasticsearch connection:', error);
            }
        });
    },
};
exports.elasticsearchUtils = elasticsearchUtils;
exports.default = elasticsearchUtils;
