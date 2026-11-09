import { generateMockUsers } from "../mocks/user.mocks.js";
import { generateMockOrders } from "../mocks/order.mocks.js";
import { generateMockDelivery } from "../mocks/delivery.mocks.js";
import { MockRepository } from "../repositories/mock.repository.js";
import { USER_ROLES, MOCKING_PARAMETERS, ORDER_STATUS, COLLECTIONS, DELIVERY_STATUS_BY_ORDER_STATUS } from "../constants/index.js";
import { hashPassword } from "../utils/password.util.js";
import { InvalidQuantityError, InvalidStatusError, MockSeedError, InvalidIdError, OrderNotFoundError, DeliveryAlreadyExistsError, NoCouriersAvailableError } from "../errors/domain.error.js";
import logger from "../utils/logger.util.js";

const parseQty = (qty) => {
    if (qty === undefined) return MOCKING_PARAMETERS.DEFAULT_QTY;

    const { MIN_QTY, MAX_QTY } = MOCKING_PARAMETERS;
    const details = { received: qty, min: MIN_QTY, max: MAX_QTY };

    if (typeof qty !== "string" || !/^-?\d+$/.test(qty.trim())) {
        throw new InvalidQuantityError({ ...details, reason: "La cantidad debe ser un número entero" });
    }

    const parsed = Number(qty);
    if (parsed < 0) {
        throw new InvalidQuantityError({ ...details, reason: "La cantidad no puede ser negativa" });
    }
    if (parsed < MIN_QTY) {
        throw new InvalidQuantityError({ ...details, reason: `La cantidad mínima es ${MIN_QTY}` });
    }
    if (parsed > MAX_QTY) {
        throw new InvalidQuantityError({ ...details, reason: `La cantidad máxima es ${MAX_QTY}` });
    }
    return parsed;
};

const parseOrderStatus = (status) => {
    if (status === undefined) return undefined;

    const allowed = Object.values(ORDER_STATUS);
    if (typeof status !== "string" || !allowed.includes(status)) {
        throw new InvalidStatusError({ received: status, allowed });
    }
    return status;
};

const buildDataset = (qty, orderStatus) => {
    const courierQty = Math.max(1, Math.ceil(qty / MOCKING_PARAMETERS.ORDERS_PER_COURIER));

    const customers = generateMockUsers(qty, USER_ROLES.USER);
    const couriers = generateMockUsers(courierQty, USER_ROLES.COURIER);
    const orders = generateMockOrders(qty, customers.map((c) => c._id), orderStatus);

    const courierIds = couriers.map((c) => c._id);
    const deliveries = [];
    for (const order of orders) {
        const delivery = generateMockDelivery(order, courierIds);
        if (!delivery) continue;
        order.delivery = delivery._id;
        deliveries.push(delivery);
    }

    return { customers, couriers, orders, deliveries };
};

const withHashedPassword = async (users) => {
    const password = await hashPassword(MOCKING_PARAMETERS.DEFAULT_PASSWORD);
    return users.map((user) => ({ ...user, password }));
};

const rollbackSteps = async (steps) => {
    for (const step of [...steps].reverse()) {
        try {
            await step.remove(step.docs.map((doc) => doc._id));
        } catch (error) {
            logger.error("No se pudo revertir la colección tras una carga fallida", {
                collection: step.collection,
                error: error.message
            });
        }
    }
};

const logGenerated = (type, items) => {
    logger.debug("Datos mock generados (no se guardan)", { tipo: type, cantidad: items.length });
    return items;
}

export class MockService {
    static getUsers(qty) {
        return logGenerated("usuarios", generateMockUsers(parseQty(qty)));
    }

    static getCouriers(qty) {
        return logGenerated("repartidores", generateMockUsers(parseQty(qty), USER_ROLES.COURIER));
    }

    static getOrders(qty, status) {
        return logGenerated("pedidos", buildDataset(parseQty(qty), parseOrderStatus(status)).orders);
    }

    static getDeliveries(qty) {
        return logGenerated("entregas", buildDataset(parseQty(qty)).deliveries);
    }

    static async seedUsers(qty) {
        const users = await withHashedPassword(generateMockUsers(parseQty(qty)));
        try {
            const insertados = await MockRepository.insertUsers(users);
            logger.info("Usuarios mock insertados en MongoDB", { cantidad: insertados });
            return { insertados, coleccion: COLLECTIONS.USERS };
        } catch (error) {
            throw new MockSeedError({ collection: COLLECTIONS.USERS }, error);
        }
    }

    static async seed(qty) {
        const { customers, couriers, orders, deliveries } = buildDataset(parseQty(qty));

        const users = await withHashedPassword([...customers, ...couriers]);

        const steps = [
            { collection: COLLECTIONS.USERS, docs: users, insert: MockRepository.insertUsers, remove: MockRepository.deleteUsers },
            { collection: COLLECTIONS.ORDERS, docs: orders, insert: MockRepository.insertOrders, remove: MockRepository.deleteOrders },
            { collection: COLLECTIONS.DELIVERIES, docs: deliveries, insert: MockRepository.insertDeliveries, remove: MockRepository.deleteDeliveries }
        ];

        const completed = [];
        const inserted = {};
        for (const step of steps) {
            try {
                inserted[step.collection] = await step.insert(step.docs);
                completed.push(step);
            } catch (error) {
                logger.warning("Falló la carga de datos mock: se revierte lo ya insertado", {
                    failedCollection: step.collection,
                    inserted: completed.map((done) => done.collection)
                });
                await rollbackSteps(completed);
                throw new MockSeedError({ collection: step.collection }, error);
            }
        }

        const insertados = {
            usuarios: inserted[COLLECTIONS.USERS] - couriers.length,
            repartidores: couriers.length,
            pedidos: inserted[COLLECTIONS.ORDERS],
            entregas: inserted[COLLECTIONS.DELIVERIES]
        };
        logger.info("Datos mock insertados en MongoDB", insertados);

        return { insertados };
    }

    static async seedDelivery(orderId) {
        if (typeof orderId !== "string" || orderId.trim() === "") {
            throw new InvalidIdError({ field: "orderId", reason: "El parámetro orderId es obligatorio" });
        }

        const order = await MockRepository.findOrderById(orderId);
        if (!order) throw new OrderNotFoundError({ id: orderId });

        if (order.delivery) {
            throw new DeliveryAlreadyExistsError({ orderId, deliveryId: order.delivery });
        }

        if (!DELIVERY_STATUS_BY_ORDER_STATUS[order.status]) {
            throw new InvalidStatusError({
                orderStatus: order.status,
                reason: "El estado del pedido no admite una entrega"
            });
        }

        const courierIds = await MockRepository.findCourierIds();
        if (courierIds.length === 0) {
            throw new NoCouriersAvailableError({ hint: "Ejecuta POST /api/mocks/seed para cargar repartidores" });
        }

        const delivery = generateMockDelivery(order, courierIds);

        try {
            await MockRepository.insertDeliveries([delivery]);
            await MockRepository.linkDelivery(order._id, delivery._id);
        } catch (error) {
            await MockRepository.deleteDeliveries([delivery._id]).catch(() => {});
            throw new MockSeedError({ collection: COLLECTIONS.DELIVERIES }, error);
        }

        logger.info("Entrega mock creada para un pedido existente", {
            orderId,
            deliveryId: delivery._id,
            status: delivery.status
        });

        return { insertados: 1, coleccion: COLLECTIONS.DELIVERIES, entrega: delivery };
    }
}