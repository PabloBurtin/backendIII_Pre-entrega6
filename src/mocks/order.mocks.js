import { faker } from "@faker-js/faker";
import { ORDER_STATUS, ORDER_PRIORITY } from "../constants/index.js";

const generateMockItem = () => ({
    name: faker.commerce.productName(),
    quantity: faker.number.int({ min:1, max: 5 }),
    price: Number(faker.commerce.price({ min: 5, max: 200 }))
});

export const generateMockOrder = (customerId, status) => {
    const items = Array.from({ length: faker.number.int({ min: 1, max: 4 }) }, generateMockItem);
    const total = items.reduce((acc, item) => acc + item.quantity * item.price, 0);

    return {
        _id: faker.database.mongodbObjectId(),
        customer: customerId,
        items,
        deliveryAddress: faker.location.streetAddress(),
        total: Math.round(total * 100) / 100,
        status: status ?? faker.helpers.arrayElement(Object.values(ORDER_STATUS)),
        priority: faker.helpers.arrayElement(Object.values(ORDER_PRIORITY)),
        delivery: null
    };
};

export const generateMockOrders = (qty, customerIds, status) => Array.from({ length: qty }, () => generateMockOrder(faker.helpers.arrayElement(customerIds), status));