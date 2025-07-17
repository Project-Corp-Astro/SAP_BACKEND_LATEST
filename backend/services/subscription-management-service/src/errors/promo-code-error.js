"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromoCodeError = exports.PromoCodeErrorCode = void 0;
var PromoCodeErrorCode;
(function (PromoCodeErrorCode) {
    PromoCodeErrorCode["DUPLICATE_CODE"] = "DUPLICATE_CODE";
    PromoCodeErrorCode["NOT_FOUND"] = "NOT_FOUND";
    PromoCodeErrorCode["VALIDATION_ERROR"] = "VALIDATION_ERROR";
    PromoCodeErrorCode["INITIALIZATION_ERROR"] = "INITIALIZATION_ERROR";
    PromoCodeErrorCode["FETCH_ERROR"] = "FETCH_ERROR";
    PromoCodeErrorCode["CACHE_INVALIDATION_ERROR"] = "CACHE_INVALIDATION_ERROR";
    PromoCodeErrorCode["INVALID_PLANS"] = "INVALID_PLANS";
    PromoCodeErrorCode["INVALID_USERS"] = "INVALID_USERS";
})(PromoCodeErrorCode || (exports.PromoCodeErrorCode = PromoCodeErrorCode = {}));
class PromoCodeError extends Error {
    constructor(message, code, details) {
        super(message);
        this.message = message;
        this.code = code;
        this.details = details;
        this.name = 'PromoCodeError';
        Object.setPrototypeOf(this, PromoCodeError.prototype);
    }
}
exports.PromoCodeError = PromoCodeError;
