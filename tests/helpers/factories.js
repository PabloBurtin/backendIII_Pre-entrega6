import { randomUUID } from "node:crypto";
import request from "supertest";
import { expect } from "chai";
import app from "../../src/app.js";
import { UserModel } from "../../src/models/user.model.js";
import { hashPassword } from "../../src/utils/password.util.js";
import { USER_ROLES } from "../../src/constants/index.js";

export const api = () => request(app);

export const NON_EXISTENT_ID = "000000000000000000000000";
export const PASSWORD = "secreto123";

export const uniqueEmail = (prefix = "user") => `${prefix}.${randomUUID().slice(0, 8)}@test.com`;

export const validItems = () => [
    { name: "Caja mediana", quantity: 2, price: 45.5},
    { name: "Sobre", quantity: 1, price: 9.99}
];

export const createUser = async (overrides = {}) => {
    const res = await api()
        .post("/api/users")
        .send({ name: "Usuario Test", email: uniqueEmail(), password: PASSWORD, ...overrides });
    expect(res.status, "no se pudo crear el usuario de prueba").to.equal(201);
    return res.body.payload;
};

export const createCourier = async () => {
    const courier = await UserModel.create({
        name: "Repartidor Test",
        email: uniqueEmail("courier"),
        password: await hashPassword(PASSWORD),
        role: USER_ROLES.COURIER
    });
    return { _id:String(courier._id), email: courier.email, role: courier.role };
};

export const validOrderBody = (customerId, overrides = {}) => ({
    customer: customerId,
    items: validItems(),
    deliveryAddress: "San Martin 150",
    ...overrides
});

export const createOrder = async (customerId, overrides = {}) => {
    const res = await api().post("/api/orders").send(validOrderBody(customerId, overrides));
    expect(res.status, "no se pudo crear el pedido de prueba").to.equal(201);
    return res.body.payload;
};

export const createDelivery = async (orderId, courierId) => {
    const res = await api().post("/api/deliveries").send({ order: orderId, ...(courierId ? { courier: courierId } : {}) });
    expect(res.status, "no se pudo crear la entrega de prueba").to.equal(201);
    return res.body.payload;
};