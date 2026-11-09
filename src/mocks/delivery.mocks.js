import { faker } from "@faker-js/faker";
import { DELIVERY_STATUS, DELIVERY_STATUS_BY_ORDER_STATUS } from "../constants/index.js";

export const generateMockDelivery = (order, courierIds) => {
    const status = DELIVERY_STATUS_BY_ORDER_STATUS[order.status];
    if(!status) return null;

    const hasCourier = status !== DELIVERY_STATUS.PENDING;
    const assignedAt = hasCourier ? faker.date.recent({ days: 7 }) : null;
    const deliveredAt = status === DELIVERY_STATUS.DELIVERED
        ? faker.date.between({ from: assignedAt, to: new Date() })
        : null;

    return {
        _id: faker.database.mongodbObjectId(),
        order: order._id,
        courier: hasCourier ? faker.helpers.arrayElement(courierIds) : null,
        status,
        assignedAt,
        deliveredAt
    };
};