import { DeliveryRepository } from "../repositories/delivery.repository.js";
import { OrderRepository } from "../repositories/order.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import {
    ORDER_STATUS,
    DELIVERY_STATUS,
    USER_ROLES,
    DELIVERY_STATUS_TRANSITIONS,
    ORDER_STATUS_BY_DELIVERY_STATUS
} from "../constants/index.js";
import {
    DeliveryNotFoundError,
    OrderNotFoundError,
    UserNotFoundError,
    DeliveryAlreadyExistsError,
    InvalidStatusError,
    InvalidCourierError,
    InvalidDataError
} from "../errors/domain.error.js";
import { assertValidStatus, assertValidTransition } from "../utils/status.util.js";
import { pick } from "../utils/object.util.js";
import logger from "../utils/logger.util.js";

const requireField = (value, field, message) => {
    if (!value) throw new InvalidDataError([{ field, message }]);
};

const ensureCourier = async (courierId) => {
    const courier = await UserRepository.getById(courierId);
    if (!courier) throw new UserNotFoundError({ id: courierId });
    if (courier.role !== USER_ROLES.COURIER) throw new InvalidCourierError({ id: courierId, role: courier.role });
};

const syncOrderStatus = (orderId, deliveryStatus) =>
    OrderRepository.update(orderId, { status: ORDER_STATUS_BY_DELIVERY_STATUS[deliveryStatus] });

const findOrFail = async (id) => {
    const delivery = await DeliveryRepository.getById(id);
    if (!delivery) throw new DeliveryNotFoundError({ id });
    return delivery;
};

export class DeliveryService {
    static async getAll(status) {
        if (status === undefined) return DeliveryRepository.getAll();

        assertValidStatus(status, Object.values(DELIVERY_STATUS));
        return DeliveryRepository.getAll({ status });
    }

    static async getById(id) {
        return findOrFail(id);
    }

    static async create(data) {
        const { order: orderId, courier: courierId } = pick(data, ["order", "courier"]);
        requireField(orderId, "order", "El pedido es obligatorio");

        const order = await OrderRepository.getById(orderId);
        if (!order) throw new OrderNotFoundError({ id: orderId });

        if (order.delivery) throw new DeliveryAlreadyExistsError({ orderId, deliveryId: order.delivery });

        if (order.status !== ORDER_STATUS.CREATED) {
            throw new InvalidStatusError({
                orderStatus: order.status,
                reason: `Solo se puede crear una entrega para un pedido en estado ${ORDER_STATUS.CREATED}`
            });
        }

        if (courierId) await ensureCourier(courierId);

        const status = courierId ? DELIVERY_STATUS.ASSIGNED : DELIVERY_STATUS.PENDING;
        const delivery = await DeliveryRepository.create({
            order: orderId,
            courier: courierId ?? null,
            status,
            assignedAt: courierId ? new Date() : null
        });

        await OrderRepository.update(orderId, { delivery: delivery._id, status: ORDER_STATUS_BY_DELIVERY_STATUS[status] });

        logger.info("Entrega creada", { deliveryId: delivery._id, orderId, status });

        return delivery;
    }

    static async update(id, data) {
        const { courier: courierId } = pick(data, ["courier"]);
        requireField(courierId, "courier", "El repartidor es obligatorio");

        const current = await findOrFail(id);
        if (current.status === DELIVERY_STATUS.DELIVERED) {
            throw new InvalidStatusError({
                deliveryStatus: current.status,
                reason: "No se puede reasignar una entrega ya entregada"
            });
        }

        await ensureCourier(courierId);

        const changes = { courier: courierId };
        if (current.status === DELIVERY_STATUS.PENDING) {
            changes.status = DELIVERY_STATUS.ASSIGNED;
            changes.assignedAt = new Date();
        }

        const delivery = await DeliveryRepository.update(id, changes);
        if (changes.status) await syncOrderStatus(current.order, changes.status);

        logger.info("Entrega actualizada", { deliveryId: id, courierId, status: delivery.status });
        return delivery;
    }

    static async updateStatus(id, status) {
        assertValidStatus(status, Object.values(DELIVERY_STATUS));

        const current = await findOrFail(id);
        assertValidTransition(current.status, status, DELIVERY_STATUS_TRANSITIONS);

        if (status === DELIVERY_STATUS.ASSIGNED && !current.courier) {
            throw new InvalidStatusError({
                from: current.status,
                to: status,
                reason: "La entrega no tiene repartidor asignado: asígnalo antes con PUT /api/deliveries/{id}"
            });
        }

        const changes = { status };
        if (status === DELIVERY_STATUS.ASSIGNED) changes.assignedAt = new Date();
        if (status === DELIVERY_STATUS.DELIVERED) changes.deliveredAt = new Date();

        const delivery = await DeliveryRepository.update(id, changes);
        await syncOrderStatus(current.order, status);

        logger.info("Estado de entrega actualizado", { deliveryId: id, from: current.status, to: status });
        return delivery;
    }

    static async delete(id) {
        const delivery = await DeliveryRepository.delete(id);
        if (!delivery) throw new DeliveryNotFoundError({ id });

        const order = await OrderRepository.getById(delivery.order);
        if (order) {
            const changes = { delivery: null };
            if (order.status !== ORDER_STATUS.DELIVERED && order.status !== ORDER_STATUS.CANCELLED) {
                changes.status = ORDER_STATUS.CREATED;
            }
            await OrderRepository.update(order._id, changes);
        }

        logger.info("Entrega eliminada", { deliveryId: id, orderId: delivery.order });
        return delivery;
    }
}