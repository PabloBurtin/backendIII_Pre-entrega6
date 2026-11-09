import { ERROR_CODES, ERROR_DICTIONARY } from "./error.dictionary.js";

export class AppError extends Error {
    constructor(code, details = null, cause = null) {
        const resolvedCode = ERROR_DICTIONARY[code] ? code : ERROR_CODES.INTERNAL_ERROR;
        const { statusCode, message } = ERROR_DICTIONARY[resolvedCode];

        super(message, cause ? { cause } : undefined);
        this.name = this.constructor.name;
        this.code = resolvedCode;
        this.statusCode = statusCode;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }

}