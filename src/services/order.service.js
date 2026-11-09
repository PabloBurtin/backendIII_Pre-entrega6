import { OrderRepository } from "../repositories/order.repository.js";
import { DeliveryRepository } from "../repositories/delivery.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import { ORDER_STATUS, ORDER_STATUS_TRANSITIONS } from "../constants/index.js";
import { OrderNotFoundError, UserNotFoundError, InvalidDataError } from "../errors/domain.error.js";
import { assertValidStatus, assertValidTransition } from "../utils/status.util.js";
import { pick } from "../utils/object.util.js";
import logger from "../utils/logger.util.js";

const CREATE_FIELDS = ["customer", "items", "deliveryAddress", "priority"];
const UPDATE_FIELDS = ["items", "deliveryAddress", "priority"];

const calculateTotal = (items) => {
    if (!Array.isArray(items)) return 0;
    const total = items.reduce((acc, item) => acc + (Number(item?.quantity) || 0) * (Number(item?.price) || 0), 0);
    return Math.round(total * 100) / 100;
};

export class OrderService {
    static async getAll(status) {
        if (status === undefined) return OrderRepository.getAll();

        assertValidStatus(status, Object.values(ORDER_STATUS));
        return OrderRepository.getAll({ status });
    }

    static async getById(id) {
        const order = await OrderRepository.getById(id);
        if (!order) throw new OrderNotFoundError({ id });
        return order;
    }

    static async create(data) {
        const orderData = pick(data, CREATE_FIELDS);

        if (!orderData.customer) {
            throw new InvalidDataError([{ field: "customer", message: "El cliente es obligatorio" }]);
        }

        const customer = await UserRepository.getById(orderData.customer);
        if (!customer) throw new UserNotFoundError({ id: orderData.customer });

        const order = await OrderRepository.create({
            ...orderData,
            total: calculateTotal(orderData.items),
            status: ORDER_STATUS.CREATED
        });

        logger.info("Pedido creado", { orderId: order._id, customerId: order.customer, total: order.total });
        return order;
    }

    static async update(id, data) {
        const changes = pick(data, UPDATE_FIELDS);
        if (changes.items !== undefined) changes.total = calculateTotal(changes.items);

        const order = await OrderRepository.update(id, changes);
        if (!order) throw new OrderNotFoundError({ id });

        logger.info("Pedido actualizado", { orderId: id, fields: Object.keys(changes) });
        return order;
    }

    static async updateStatus(id, status) {
        assertValidStatus(status, Object.values(ORDER_STATUS));

        const current = await OrderRepository.getById(id);
        if (!current) throw new OrderNotFoundError({ id });

        assertValidTransition(current.status, status, ORDER_STATUS_TRANSITIONS);

        const changes = { status };

        if (status === ORDER_STATUS.CANCELLED && current.delivery) {
            await DeliveryRepository.delete(current.delivery);
            changes.delivery = null;
        }

        const order = await OrderRepository.update(id, changes);
        logger.info("Estado de pedido actualizado", { orderId: id, from: current.status, to: status });
        return order;
    }

    static async delete(id) {
        const order = await OrderRepository.delete(id);
        if (!order) throw new OrderNotFoundError({ id });

        if (order.delivery) await DeliveryRepository.delete(order.delivery);

        logger.info("Pedido eliminado", { orderId: id });
        return order;
    }
}