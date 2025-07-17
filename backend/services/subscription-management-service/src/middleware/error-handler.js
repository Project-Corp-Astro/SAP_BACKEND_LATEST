"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const api_error_1 = require("../errors/api-error");
const logger_1 = __importDefault(require("../utils/logger"));
const errorHandler = (err, req, res, next) => {
    if (err instanceof api_error_1.ApiError) {
        logger_1.default.warn(`API Error: ${err.statusCode} - ${err.message}`);
        return res.status(err.statusCode).json({ message: err.message });
    }
    logger_1.default.error('Internal Server Error:', { error: err.message, stack: err.stack });
    res.status(500).json({ message: 'Something went wrong' });
};
exports.errorHandler = errorHandler;
