"use strict";
/**
 * Error handling utilities for the subscription service
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatErrorResponse = exports.getErrorMessage = void 0;
/**
 * Extract a safe error message from any error type
 * @param error Any error object
 * @returns A safe string representation of the error
 */
const getErrorMessage = (error) => {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    if (typeof error === 'object' && error !== null && 'message' in error) {
        return String(error.message);
    }
    return 'An unknown error occurred';
};
exports.getErrorMessage = getErrorMessage;
/**
 * Format error for response
 * @param error Any error object
 * @returns Object with message and error details
 */
const formatErrorResponse = (error, defaultMessage = 'An error occurred') => {
    if (error instanceof Error && 'message' in error && 'error' in error) {
        // Handle custom error format with both message and error fields
        return {
            message: error.message,
            error: error.error
        };
    }
    return {
        message: defaultMessage,
        error: (0, exports.getErrorMessage)(error)
    };
};
exports.formatErrorResponse = formatErrorResponse;
