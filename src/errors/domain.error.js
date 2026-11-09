import { AppError } from "./app.error.js";
import { ERROR_CODES } from "./error.dictionary.js";

export class UserNotFoundError extends AppError {
    constructor(details) {
        super(ERROR_CODES.USER_NOT_FOUND, details);
    }
}

export class ProductNotFoundError extends AppError {
    constructor(details) {
        super(ERROR_CODES.PRODUCT_NOT_FOUND, details);
    }
}

export class OrderNotFoundError extends AppError {
    constructor(details) {
        super(ERROR_CODES.ORDER_NOT_FOUND, details);
    }
}

export class EmailRequiredError extends AppError {
    constructor(details) {
        super(ERROR_CODES.EMAIL_REQUIRED, details);
    }
}

export class EmailAlreadyExistsError extends AppError {
    constructor(details) {
        super(ERROR_CODES.EMAIL_ALREADY_EXISTS, details);
    }
}

export class InvalidPasswordError extends AppError {
    constructor(details) {
        super(ERROR_CODES.INVALID_PASSWORD, details);
    }
}

export class InvalidStatusError extends AppError {
    constructor(details) {
        super(ERROR_CODES.INVALID_STATUS, details);
    }
}

export class InvalidQuantityError extends AppError {
    constructor(details) {
        super(ERROR_CODES.INVALID_QUANTITY, details);
    }
}

export class MockSeedError extends AppError {
    constructor(details, cause) {
        super(ERROR_CODES.MOCK_SEED_FAILED, details, cause);
    }
}

export class InvalidIdError extends AppError {
    constructor(details) {
        super(ERROR_CODES.INVALID_ID, details);
    }
}

export class DeliveryAlreadyExistsError extends AppError {
    constructor(details) {
        super(ERROR_CODES.DELIVERY_ALREADY_EXISTS, details);
    }
}

export class NoCouriersAvailableError extends AppError {
    constructor(details) {
        super(ERROR_CODES.NO_COURIERS_AVAILABLE, details);
    }
}

export class DeliveryNotFoundError extends AppError {
    constructor(details) {
        super(ERROR_CODES.DELIVERY_NOT_FOUND, details);
    }
}

export class InvalidCourierError extends AppError {
    constructor(details) {
        super(ERROR_CODES.INVALID_COURIER, details);
    }
}

export class InvalidDataError extends AppError {
    constructor(details) {
        super(ERROR_CODES.VALIDATION_ERROR, details);
    }
}