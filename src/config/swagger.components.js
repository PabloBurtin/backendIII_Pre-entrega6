import {
    USER_ROLES,
    PRODUCT_STATUS,
    ORDER_STATUS,
    ORDER_PRIORITY,
    DELIVERY_STATUS,
    LOG_LEVELS,
    MOCKING_PARAMETERS
} from "../constants/index.js";
import { ERROR_CODES } from "../errors/error.dictionary.js";

const ref = (name) => ({ $ref: `#/components/schemas/${name}` });

const objectId = (description) => ({
    type: "string",
    pattern: "^[a-f\\d]{24}$",
    example: "6ad17024e1471905bf172aac",
    description
});

const dateTime = (example, extra = {}) => ({ type: "string", format: "date-time", example, ...extra });

const timestamps = {
    createdAt: dateTime("2026-10-16T00:30:28.479Z"),
    updatedAt: dateTime("2026-10-16T00:30:28.479Z")
};

const omit = (schema, keys) => ({
    ...schema,
    properties: Object.fromEntries(Object.entries(schema.properties).filter(([key]) => !keys.includes(key)))
});

const envelope = (payload) => ({
    allOf: [ref("SuccessResponse"), { type: "object", properties: { payload } }]
});

const { MIN_QTY, MAX_QTY, DEFAULT_QTY } = MOCKING_PARAMETERS;

const User = {
    type: "object",
    properties: {
        _id: objectId("Identificador del usuario"),
        name: { type: "string", example: "Ana García" },
        email: { type: "string", format: "email", example: "ana@mail.com" },
        role: { type: "string", enum: Object.values(USER_ROLES), example: USER_ROLES.USER },
        ...timestamps
    }
};

const Product = {
    type: "object",
    properties: {
        _id: objectId("Identificador del producto"),
        name: { type: "string", example: "Caja" },
        description: { type: "string", example: "Caja de cartón mediana" },
        price: { type: "number", minimum: 0, example: 10 },
        stock: { type: "integer", minimum: 0, example: 5 },
        status: {
            type: "string",
            enum: Object.values(PRODUCT_STATUS),
            example: PRODUCT_STATUS.AVAILABLE,
            description: "Lo define el sistema según el stock"
        },
        ...timestamps
    }
};

const OrderItem = {
    type: "object",
    required: ["name", "quantity", "price"],
    properties: {
        name: { type: "string", example: "Caja mediana" },
        quantity: { type: "integer", minimum: 1, example: 2 },
        price: { type: "number", minimum: 0, example: 45.5 }
    }
};

const Order = {
    type: "object",
    properties: {
        _id: objectId("Identificador del pedido"),
        customer: objectId("Usuario que realizó el pedido"),
        items: { type: "array", minItems: 1, items: ref("OrderItem") },
        deliveryAddress: { type: "string", example: "Av. Corrientes 1234" },
        total: { type: "number", minimum: 0, example: 100.99, description: "Lo calcula el sistema: suma de cantidad × precio" },
        status: { type: "string", enum: Object.values(ORDER_STATUS), example: ORDER_STATUS.CREATED },
        priority: { type: "string", enum: Object.values(ORDER_PRIORITY), example: ORDER_PRIORITY.NORMAL },
        delivery: { ...objectId("Entrega asociada al pedido"), nullable: true },
        ...timestamps
    }
};

const Delivery = {
    type: "object",
    properties: {
        _id: objectId("Identificador de la entrega"),
        order: objectId("Pedido al que pertenece la entrega"),
        courier: { ...objectId("Repartidor asignado (usuario con rol COURIER)"), nullable: true },
        status: { type: "string", enum: Object.values(DELIVERY_STATUS), example: DELIVERY_STATUS.ASSIGNED },
        assignedAt: dateTime("2026-10-16T10:43:44.184Z", { nullable: true }),
        deliveredAt: dateTime("2026-10-17T13:33:30.625Z", { nullable: true }),
        ...timestamps
    }
};

const MockUser = {
    type: "object",
    properties: {
        _id: objectId("Identificador generado (no existe en la base)"),
        name: { type: "string", example: "Aliza Prohaska" },
        email: { type: "string", format: "email", example: "aliza.prohaska544@test.com" },
        password: { type: "string", example: MOCKING_PARAMETERS.DEFAULT_PASSWORD, description: "Contraseña de prueba, sin hashear" },
        role: { type: "string", enum: [USER_ROLES.USER, USER_ROLES.COURIER], example: USER_ROLES.COURIER }
    }
};

const bodies = {
    UserInput: {
        type: "object",
        required: ["name", "email", "password"],
        properties: {
            name: { type: "string", example: "Ana García" },
            email: { type: "string", format: "email", example: "ana@mail.com" },
            password: { type: "string", minLength: 6, example: "secreto123" }
        },
        description: "El rol no se puede enviar: los usuarios se crean siempre con rol USER (si se envía, se ignora)"
    },
    UserUpdate: {
        type: "object",
        properties: {
            name: { type: "string", example: "Ana García" },
            email: { type: "string", format: "email", example: "ana.nueva@mail.com" },
            password: { type: "string", minLength: 6, example: "otraClave456" }
        },
        description: "Todos los campos son opcionales. El rol no se puede modificar"
    },
    ProductInput: {
        type: "object",
        required: ["name", "price"],
        properties: {
            name: { type: "string", example: "Caja" },
            description: { type: "string", example: "Caja de cartón mediana" },
            price: { type: "number", minimum: 0, example: 10 },
            stock: { type: "integer", minimum: 0, default: 0, example: 5 }
        },
        description: "El estado (status) no se puede enviar: lo define el sistema según el stock"
    },
    ProductUpdate: {
        type: "object",
        properties: {
            name: { type: "string", example: "Caja grande" },
            description: { type: "string", example: "Caja de cartón grande" },
            price: { type: "number", minimum: 0, example: 15 },
            stock: { type: "integer", minimum: 0, example: 0 }
        },
        description: "Todos los campos son opcionales. Si se envía stock, el estado se recalcula"
    },
    OrderInput: {
        type: "object",
        required: ["customer", "items", "deliveryAddress"],
        properties: {
            customer: objectId("Usuario que realiza el pedido (debe existir)"),
            items: { type: "array", minItems: 1, items: ref("OrderItem") },
            deliveryAddress: { type: "string", example: "Av. Corrientes 1234" },
            priority: { type: "string", enum: Object.values(ORDER_PRIORITY), default: ORDER_PRIORITY.NORMAL }
        },
        description: "El total, el estado (siempre CREATED) y la entrega los define el sistema: si se envían, se ignoran"
    },
    OrderUpdate: {
        type: "object",
        properties: {
            items: { type: "array", minItems: 1, items: ref("OrderItem") },
            deliveryAddress: { type: "string", example: "Nueva dirección 456" },
            priority: { type: "string", enum: Object.values(ORDER_PRIORITY) }
        },
        description: "Todos los campos son opcionales. Si se envían items, el total se recalcula. El estado se cambia con PATCH /{id}/status"
    },
    OrderStatusUpdate: {
        type: "object",
        required: ["status"],
        properties: { status: { type: "string", enum: Object.values(ORDER_STATUS), example: ORDER_STATUS.ASSIGNED } }
    },
    DeliveryInput: {
        type: "object",
        required: ["order"],
        properties: {
            order: objectId("Pedido a entregar: debe existir, estar en estado CREATED y no tener entrega"),
            courier: objectId("Repartidor (opcional): debe existir y tener rol COURIER. Si se envía, la entrega nace ASSIGNED; si no, PENDING")
        }
    },
    DeliveryCourierUpdate: {
        type: "object",
        required: ["courier"],
        properties: { courier: objectId("Repartidor a asignar o reasignar (rol COURIER)") }
    },
    DeliveryStatusUpdate: {
        type: "object",
        required: ["status"],
        properties: { status: { type: "string", enum: Object.values(DELIVERY_STATUS), example: DELIVERY_STATUS.IN_TRANSIT } }
    }
};

export const schemas = {
    User,
    Product,
    OrderItem,
    Order,
    Delivery,
    MockUser,
    MockOrder: omit(Order, ["createdAt", "updatedAt"]),
    MockDelivery: omit(Delivery, ["createdAt", "updatedAt"]),
    ...bodies,
    SuccessResponse: {
        type: "object",
        required: ["status", "message"],
        properties: {
            status: { type: "string", enum: ["success"], example: "success" },
            message: { type: "string", example: "Operación realizada correctamente" },
            payload: { description: "Datos devueltos por la operación (el tipo depende del endpoint)" }
        }
    },
    ErrorResponse: {
        type: "object",
        required: ["status", "statusCode", "code", "message"],
        properties: {
            status: { type: "string", enum: ["error"], example: "error" },
            statusCode: { type: "integer", example: 404 },
            code: { type: "string", enum: Object.values(ERROR_CODES), example: ERROR_CODES.USER_NOT_FOUND },
            message: { type: "string", example: "Usuario no encontrado" },
            details: { description: "Contexto adicional del error (opcional): ids, valores recibidos, valores permitidos" }
        }
    },
    UserResponse: envelope(ref("User")),
    UserListResponse: envelope({ type: "array", items: ref("User") }),
    ProductResponse: envelope(ref("Product")),
    ProductListResponse: envelope({ type: "array", items: ref("Product") }),
    OrderResponse: envelope(ref("Order")),
    OrderListResponse: envelope({ type: "array", items: ref("Order") }),
    DeliveryResponse: envelope(ref("Delivery")),
    DeliveryListResponse: envelope({ type: "array", items: ref("Delivery") }),
    SeedUsersResult: {
        type: "object",
        properties: {
            insertados: { type: "integer", example: 10 },
            coleccion: { type: "string", example: "usuarios" }
        }
    },
    SeedResult: {
        type: "object",
        properties: {
            insertados: {
                type: "object",
                properties: {
                    usuarios: { type: "integer", example: 10, description: "Clientes (rol USER)" },
                    repartidores: { type: "integer", example: 4, description: "Usuarios con rol COURIER" },
                    pedidos: { type: "integer", example: 10 },
                    entregas: { type: "integer", example: 7, description: "Los pedidos CANCELLED no tienen entrega" }
                }
            }
        }
    },
    SeedDeliveryResult: {
        type: "object",
        properties: {
            insertados: { type: "integer", example: 1 },
            coleccion: { type: "string", example: "entregas" },
            entrega: ref("MockDelivery")
        }
    },
    LoggerTestResponse: envelope({
        type: "object",
        properties: {
            activeLevel: { type: "string", enum: Object.values(LOG_LEVELS), example: LOG_LEVELS.DEBUG, description: "Nivel mínimo del entorno actual" },
            levels: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        level: { type: "string", enum: Object.values(LOG_LEVELS) },
                        registrado: { type: "boolean", description: "false si el nivel está por debajo del nivel mínimo del entorno" }
                    }
                }
            }
        }
    }),
    HealthResponse: {
        type: "object",
        properties: {
            status: { type: "string", example: "ok" },
            timestamp: dateTime("2026-10-26T00:13:08.000Z")
        }
    }
};

const statusQuery = (values, description) => ({
    name: "status",
    in: "query",
    required: false,
    description,
    schema: { type: "string", enum: values }
});

export const parameters = {
    IdPath: {
        name: "id",
        in: "path",
        required: true,
        description: "Identificador (ObjectId de MongoDB: 24 caracteres hexadecimales)",
        schema: { type: "string", pattern: "^[a-f\\d]{24}$", example: "6ad17024e1471905bf172aac" }
    },
    QtyQuery: {
        name: "qty",
        in: "query",
        required: false,
        description: `Cantidad de elementos a generar: entero entre ${MIN_QTY} y ${MAX_QTY}. Por defecto ${DEFAULT_QTY}`,
        schema: { type: "integer", minimum: MIN_QTY, maximum: MAX_QTY, default: DEFAULT_QTY }
    },
    OrderStatusQuery: statusQuery(Object.values(ORDER_STATUS), "Filtra los pedidos por estado"),
    DeliveryStatusQuery: statusQuery(Object.values(DELIVERY_STATUS), "Filtra las entregas por estado"),
    MockOrderStatusQuery: statusQuery(Object.values(ORDER_STATUS), "Fuerza el estado de todos los pedidos generados"),
    OrderIdQuery: {
        name: "orderId",
        in: "query",
        required: true,
        description: "Identificador de un pedido existente",
        schema: { type: "string", pattern: "^[a-f\\d]{24}$", example: "6ade9b2097940680b39394e7" }
    }
};

const err = (statusCode, code, message, details) => ({
    value: { status: "error", statusCode, code, message, ...(details !== undefined ? { details } : {}) }
});
const orderStatuses = Object.values(ORDER_STATUS);
const deliveryStatuses = Object.values(DELIVERY_STATUS);
const exampleId = "6ad17024e1471905bf172aac";

const examples = {
    invalidId: { summary: "Identificador mal formado", ...err(400, ERROR_CODES.INVALID_ID, "El identificador no tiene un formato válido", { field: "_id", value: "abc" }) },
    invalidJson: { summary: "JSON mal formado", ...err(400, ERROR_CODES.INVALID_JSON, "El cuerpo de la petición no es un JSON válido") },
    validationError: { summary: "Datos que no cumplen el modelo", ...err(400, ERROR_CODES.VALIDATION_ERROR, "Los datos enviados no son válidos", [{ field: "price", message: "Path `price` (-5) is less than minimum allowed value (0)." }]) },
    customerRequired: { summary: "Falta el cliente", ...err(400, ERROR_CODES.VALIDATION_ERROR, "Los datos enviados no son válidos", [{ field: "customer", message: "El cliente es obligatorio" }]) },
    orderRequired: { summary: "Falta el pedido", ...err(400, ERROR_CODES.VALIDATION_ERROR, "Los datos enviados no son válidos", [{ field: "order", message: "El pedido es obligatorio" }]) },
    courierRequired: { summary: "Falta el repartidor", ...err(400, ERROR_CODES.VALIDATION_ERROR, "Los datos enviados no son válidos", [{ field: "courier", message: "El repartidor es obligatorio" }]) },
    emailRequired: { summary: "Falta el email", ...err(400, ERROR_CODES.EMAIL_REQUIRED, "El email es obligatorio") },
    invalidPassword: { summary: "Contraseña demasiado corta", ...err(400, ERROR_CODES.INVALID_PASSWORD, "La contraseña no cumple los requisitos", { minLength: 6 }) },
    invalidOrderStatusValue: { summary: "Estado inexistente", ...err(400, ERROR_CODES.INVALID_STATUS, "Estado inválido", { received: "FOO", allowed: orderStatuses }) },
    invalidDeliveryStatusValue: { summary: "Estado inexistente", ...err(400, ERROR_CODES.INVALID_STATUS, "Estado inválido", { received: "FOO", allowed: deliveryStatuses }) },
    invalidOrderTransition: { summary: "Transición no permitida", ...err(400, ERROR_CODES.INVALID_STATUS, "Estado inválido", { from: "CREATED", to: "DELIVERED", allowed: ["ASSIGNED", "CANCELLED"], reason: "Transición de estado no permitida" }) },
    invalidDeliveryTransition: { summary: "Transición no permitida", ...err(400, ERROR_CODES.INVALID_STATUS, "Estado inválido", { from: "ASSIGNED", to: "DELIVERED", allowed: ["IN_TRANSIT"], reason: "Transición de estado no permitida" }) },
    deliveryWithoutCourier: { summary: "Entrega sin repartidor", ...err(400, ERROR_CODES.INVALID_STATUS, "Estado inválido", { from: "PENDING", to: "ASSIGNED", reason: "La entrega no tiene repartidor asignado: asígnalo antes con PUT /api/deliveries/{id}" }) },
    orderNotCreated: { summary: "El pedido no está en CREATED", ...err(400, ERROR_CODES.INVALID_STATUS, "Estado inválido", { orderStatus: "ASSIGNED", reason: "Solo se puede crear una entrega para un pedido en estado CREATED" }) },
    deliveredReassign: { summary: "Entrega ya entregada", ...err(400, ERROR_CODES.INVALID_STATUS, "Estado inválido", { deliveryStatus: "DELIVERED", reason: "No se puede reasignar una entrega ya entregada" }) },
    orderCancelledForDelivery: { summary: "Pedido cancelado", ...err(400, ERROR_CODES.INVALID_STATUS, "Estado inválido", { orderStatus: "CANCELLED", reason: "El estado del pedido no admite una entrega" }) },
    invalidCourier: { summary: "El usuario no es repartidor", ...err(400, ERROR_CODES.INVALID_COURIER, "El usuario indicado no es un repartidor", { id: exampleId, role: "USER" }) },
    invalidQuantity: { summary: "Cantidad inválida", ...err(400, ERROR_CODES.INVALID_QUANTITY, "Cantidad inválida", { received: "abc", min: MIN_QTY, max: MAX_QTY, reason: "La cantidad debe ser un número entero" }) },
    negativeQuantity: { summary: "Cantidad negativa", ...err(400, ERROR_CODES.INVALID_QUANTITY, "Cantidad inválida", { received: "-5", min: MIN_QTY, max: MAX_QTY, reason: "La cantidad no puede ser negativa" }) },
    orderIdRequired: { summary: "Falta orderId", ...err(400, ERROR_CODES.INVALID_ID, "El identificador no tiene un formato válido", { field: "orderId", reason: "El parámetro orderId es obligatorio" }) },
    userNotFound: { summary: "Usuario inexistente", ...err(404, ERROR_CODES.USER_NOT_FOUND, "Usuario no encontrado", { id: exampleId }) },
    productNotFound: { summary: "Producto inexistente", ...err(404, ERROR_CODES.PRODUCT_NOT_FOUND, "Producto no encontrado", { id: exampleId }) },
    orderNotFound: { summary: "Pedido inexistente", ...err(404, ERROR_CODES.ORDER_NOT_FOUND, "Pedido no encontrado", { id: exampleId }) },
    deliveryNotFound: { summary: "Entrega inexistente", ...err(404, ERROR_CODES.DELIVERY_NOT_FOUND, "Entrega no encontrada", { id: exampleId }) },
    emailAlreadyExists: { summary: "Email repetido", ...err(409, ERROR_CODES.EMAIL_ALREADY_EXISTS, "Ya existe un usuario con ese email", { email: "ana@mail.com" }) },
    deliveryAlreadyExists: { summary: "El pedido ya tiene entrega", ...err(409, ERROR_CODES.DELIVERY_ALREADY_EXISTS, "El pedido ya tiene una entrega asociada", { orderId: exampleId, deliveryId: "bda7b0bc9402dddc18f38d63" }) },
    noCouriers: { summary: "No hay repartidores cargados", ...err(409, ERROR_CODES.NO_COURIERS_AVAILABLE, "No hay repartidores disponibles para asignar la entrega", { hint: "Ejecuta POST /api/mocks/seed para cargar repartidores" }) },
    mockSeedFailed: { summary: "Falla de MongoDB al insertar", ...err(500, ERROR_CODES.MOCK_SEED_FAILED, "No se pudieron guardar los datos de prueba", { collection: "usuarios" }) },
    internalError: { summary: "Error inesperado", ...err(500, ERROR_CODES.INTERNAL_ERROR, "Error interno del servidor") }
};

const errorResponse = (description, exampleKeys) => ({
    description,
    content: {
        "application/json": {
            schema: ref("ErrorResponse"),
            examples: Object.fromEntries(exampleKeys.map((key) => [key, examples[key]]))
        }
    }
});

export const responses = {
    InternalError: errorResponse("Error inesperado del servidor", ["internalError"]),
    InvalidId: errorResponse("El identificador no tiene un formato válido", ["invalidId"]),
    UserNotFound: errorResponse("Usuario no encontrado", ["userNotFound"]),
    ProductNotFound: errorResponse("Producto no encontrado", ["productNotFound"]),
    OrderNotFound: errorResponse("Pedido no encontrado", ["orderNotFound"]),
    DeliveryNotFound: errorResponse("Entrega no encontrada", ["deliveryNotFound"]),
    EmailAlreadyExists: errorResponse("Ya existe un usuario con ese email", ["emailAlreadyExists"]),
    UserCreateInvalid: errorResponse("Datos inválidos", ["emailRequired", "invalidPassword", "validationError", "invalidJson"]),
    UserUpdateInvalid: errorResponse("Datos inválidos", ["invalidId", "invalidPassword", "validationError", "invalidJson"]),
    ProductCreateInvalid: errorResponse("Datos inválidos", ["validationError", "invalidJson"]),
    ProductUpdateInvalid: errorResponse("Datos inválidos", ["invalidId", "validationError", "invalidJson"]),
    OrderStatusFilterInvalid: errorResponse("Estado inválido en el filtro", ["invalidOrderStatusValue"]),
    OrderCreateInvalid: errorResponse("Datos inválidos", ["customerRequired", "validationError", "invalidId", "invalidJson"]),
    OrderUpdateInvalid: errorResponse("Datos inválidos", ["invalidId", "validationError", "invalidJson"]),
    OrderStatusUpdateInvalid: errorResponse("Identificador o estado inválido", ["invalidId", "invalidOrderStatusValue", "invalidOrderTransition"]),
    DeliveryStatusFilterInvalid: errorResponse("Estado inválido en el filtro", ["invalidDeliveryStatusValue"]),
    DeliveryCreateInvalid: errorResponse("Datos o estado inválidos", ["orderRequired", "invalidId", "invalidCourier", "orderNotCreated", "invalidJson"]),
    DeliveryCreateNotFound: errorResponse("El pedido o el repartidor no existen", ["orderNotFound", "userNotFound"]),
    DeliveryUpdateInvalid: errorResponse("Datos o estado inválidos", ["courierRequired", "invalidId", "invalidCourier", "deliveredReassign", "invalidJson"]),
    DeliveryUpdateNotFound: errorResponse("La entrega o el repartidor no existen", ["deliveryNotFound", "userNotFound"]),
    DeliveryStatusUpdateInvalid: errorResponse("Identificador o estado inválido", ["invalidId", "invalidDeliveryStatusValue", "invalidDeliveryTransition", "deliveryWithoutCourier"]),
    DeliveryAlreadyExists: errorResponse("El pedido ya tiene una entrega", ["deliveryAlreadyExists"]),
    MockQuantityInvalid: errorResponse("Cantidad inválida", ["invalidQuantity", "negativeQuantity"]),
    MockOrdersInvalid: errorResponse("Cantidad o estado inválidos", ["invalidQuantity", "negativeQuantity", "invalidOrderStatusValue"]),
    MockSeedFailed: errorResponse("Falló la inserción en MongoDB (lo ya insertado se revierte)", ["mockSeedFailed"]),
    MockDeliveryInvalid: errorResponse("orderId ausente o mal formado, o pedido que no admite entrega", ["orderIdRequired", "invalidId", "orderCancelledForDelivery"]),
    MockDeliveryConflict: errorResponse("El pedido ya tiene entrega, o no hay repartidores cargados", ["deliveryAlreadyExists", "noCouriers"])
};