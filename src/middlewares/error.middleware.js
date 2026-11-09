import { AppError } from "../errors/app.error.js";
import { ERROR_CODES } from "../errors/error.dictionary.js";
import { RESPONSE_STATUS } from "../constants/index.js";
import logger from "../utils/logger.util.js";

export const notFoundHandler = (req, res, next) => { 
    next(new AppError(ERROR_CODES.ROUTE_NOT_FOUND, { method: req.method, path: req.originalUrl}));
};

const normalizeError = (err) => {
    if (err instanceof AppError) return err;

    if (err.type === "entity.parse.failed") {
        return new AppError(ERROR_CODES.INVALID_JSON);
    }

    if (err.name === "CastError") {
        return new AppError(ERROR_CODES.INVALID_ID, { field: err.path, value: err.value });
    }

    if (err.name === "ValidationError") {
        const details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
        return new AppError(ERROR_CODES.VALIDATION_ERROR, details);
    }

    if (err.code === 11000) {
        return err.keyPattern?.email
            ? new AppError(ERROR_CODES.EMAIL_ALREADY_EXISTS)
            : new AppError(ERROR_CODES.VALIDATION_ERROR, err.keyValue);
    }

    return new AppError(ERROR_CODES.INTERNAL_ERROR);
};

export const errorHandler = (err, req, res, next) => {
    const appError = normalizeError(err);
    const requestInfo = `${req.method} ${req.originalUrl}`;

    if (appError.statusCode >= 500) {
        logger.error(`${appError.code}: ${requestInfo}`, {
            code: appError.code,
            statusCode: appError.statusCode,
            error: err.message,
            stack: err.stack,
            cause: err.cause?.stack
        });
    } else {
        logger.warning(`${appError.code}: ${requestInfo}`, {
            code: appError.code,
            statusCode: appError.statusCode,
            details: appError.details
        });
    }

    const body = {
        status: RESPONSE_STATUS.ERROR,
        statusCode: appError.statusCode,
        code: appError.code,
        message: appError.message
    };
    if (appError.details) body.details = appError.details;

    res.status(appError.statusCode).json(body);
};