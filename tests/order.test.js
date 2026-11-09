import { expect } from "chai";
import {
    api, createUser, createCourier, createOrder, createDelivery, validOrderBody, validItems, NON_EXISTENT_ID
} from "./helpers/factories.js";
import { expectError, expectSuccess, expectObjectId } from "./helpers/assertions.js";
import { clearDatabase } from "./helpers/db.js";
import { OrderModel } from "../src/models/order.model.js";
import { DeliveryModel } from "../src/models/delivery.model.js";
import { ORDER_STATUS, ORDER_PRIORITY, ORDER_STATUS_TRANSITIONS } from "../src/constants/index.js";

describe("Orders", () => {
    let customer;

    beforeEach(async () => {
        await clearDatabase();
        customer = await createUser();
    });
    after(clearDatabase);

    describe("GET /api/orders", () => {
        it ("devuelve una lista vacía si no hay pedidos", async () => {
            const res = await api().get("/api/orders");

            expectSuccess(res, 200);
            expect(res.body.payload).to.be.an("array").that.is.empty;
        });

        it("lista los pedidos con la estructura esperada, del más reciente al más antiguo", async () => {
            const first = await createOrder(customer._id, { deliveryAddress: "Primero" });
            await new Promise((resolve) => setTimeout(resolve, 10));
            const second = await createOrder(customer._id, { deliveryAddress: "Segundo" });

            const res = await api().get("/api/orders");

            expectSuccess(res, 200);
            expect(res.body.payload.map((o) => o._id)).to.deep.equal([second._id, first._id]);
            res.body.payload.forEach((order) => {
                expectObjectId(order._id);
                expect(order.customer).to.equal(customer._id);
                expect(order.items).to.be.an("array").that.is.not.empty;
                expect(order.total).to.be.a("number");
                expect(order.status).to.be.oneOf(Object.values(ORDER_STATUS));
                expect(order.priority).to.be.oneOf(Object.values(ORDER_PRIORITY));
                expect(order).to.have.property("delivery");
                expect(order).to.not.have.property("__v");
            });
        });

        it("filtra por estado", async () => {
            const toCancel = await createOrder(customer._id);
            await createOrder(customer._id);
            await api().patch(`/api/orders/${toCancel._id}/status`).send({ status: ORDER_STATUS.CANCELLED });

            const cancelled = await api().get(`/api/orders?status=${ORDER_STATUS.CANCELLED}`);
            const created = await api().get(`/api/orders?status=${ORDER_STATUS.CREATED}`);

            expect(cancelled.body.payload).to.have.lengthOf(1);
            expect(cancelled.body.payload[0]._id).to.equal(toCancel._id);
            expect(created.body.payload).to.have.lengthOf(1);
        });

        it("responde 400 INVALID_STATUS si el filtro de estado no existe", async () => {
            const res = await api().get("/api/orders?status=FOO");

            expectError(res, 400, "INVALID_STATUS");
            expect(res.body.details).to.deep.equal({ received: "FOO", allowed: Object.values(ORDER_STATUS) });
        });
    });

    describe("GET /api/orders/:id", () => {
        it("devuelve el pedido solicitado con todas sus propiedades", async () => {
            const order = await createOrder(customer._id, { priority: ORDER_PRIORITY.HIGH });

            const res = await api().get(`/api/orders/${order._id}`);

            expectSuccess(res, 200);
            expect(res.body.payload).to.include({
                _id: order._id,
                customer: customer._id,
                deliveryAddress: order.deliveryAddress,
                total: 100.99,
                status: ORDER_STATUS.CREATED,
                priority: ORDER_PRIORITY.HIGH,
                delivery: null
            });
            expect(res.body.payload.items).to.deep.equal(validItems());
        });

        it("responde 404 ORDER_NOT_FOUND si no existe", async () => {
            const res = await api().get(`/api/orders/${NON_EXISTENT_ID}`);

            expectError(res, 404, "ORDER_NOT_FOUND");
            expect(res.body.details).to.deep.equal({ id: NON_EXISTENT_ID });
        });

        it("responde 400 INVALID_ID si el id está mal formado", async () => {
            expectError(await api().get("/api/orders/abc"), 400, "INVALID_ID");
        });
    });

    describe("POST /api/orders", () => {
        it("crea el pedido: calcula el total, lo deja en CREATED y usa prioridad NORMAL por defecto", async () => {
            const res = await api().post("/api/orders").send(validOrderBody(customer._id));

            expectSuccess(res, 201);
            const order = res.body.payload;
            expectObjectId(order._id);
            expect(order).to.include({
                customer: customer._id,
                total: 100.99,
                status: ORDER_STATUS.CREATED,
                priority: ORDER_PRIORITY.NORMAL,
                delivery: null
            });
            const saved = await OrderModel.findById(order._id).lean();
            expect(saved).to.not.equal(null);
            expect(String(saved.customer)).to.equal(customer._id);
        });

        it("ignora el estado, el total y la entrega enviados en el body", async () => {
            const res = await api()
                .post("/api/orders")
                .send(validOrderBody(customer._id, { status: ORDER_STATUS.DELIVERED, total: 1, delivery: NON_EXISTENT_ID }));

            expectSuccess(res, 201);
            expect(res.body.payload).to.include({ status: ORDER_STATUS.CREATED, total: 100.99, delivery: null });
        });

        it("responde 400 VALIDATION_ERROR si falta el cliente", async () => {
            const res = await api().post("/api/orders").send({ items: validItems(), deliveryAddress: "x" });

            expectError(res, 400, "VALIDATION_ERROR");  
            expect(res.body.details).to.deep.equal([{ field: "customer", message: "El cliente es obligatorio" }]);
        });

        it("responde 404 USER_NOT_FOUND si el cliente no existe", async () => {
            const res = await api().post("/api/orders").send(validOrderBody(NON_EXISTENT_ID));

            expectError(res, 404, "USER_NOT_FOUND");
            expect(await OrderModel.countDocuments()).to.equal(0);
        });

        it("responde 400 INVALID_ID si el cliente tiene un id mal formado", async () => {
            expectError(await api().post("/api/orders").send(validOrderBody("abc")), 400, "INVALID_ID");
        });

        it("responde 400 VALIDATION_ERROR si no hay items", async () => {
            const res = await api().post("/api/orders").send(validOrderBody(customer._id, { items: [] }));

            expectError(res, 400, "VALIDATION_ERROR");
            expect(res.body.details.map((d) => d.field)).to.include("items");
        });

        it("responde 400 VALIDATION_ERROR si un item tiene cantidad negativa", async () => {
            const items = [{ name: "Caja", quantity: -1, price: 10 }];

            expectError(await api().post("/api/orders").send(validOrderBody(customer._id, { items })), 400, "VALIDATION_ERROR");
        });

        it("responde 400 VALIDATION_ERROR si falta la dirección de entrega", async () => {
            const res = await api().post("/api/orders").send({ customer: customer._id, items: validItems() });

            expectError(res, 400, "VALIDATION_ERROR");
            expect(res.body.details.map((d) => d.field)).to.include("deliveryAddress");
        });

        it("responde 400 VALIDATION_ERROR si la prioridad no existe", async () => {
            const res = await api().post("/api/orders").send(validOrderBody(customer._id, { priority: "ULTRA" }));

            expectError(res, 400, "VALIDATION_ERROR");  
            expect(res.body.details.map((d) => d.field)).to.include("priority");
        });
    });

    describe("PUT /api/orders/:id", () => {
        it("actualiza dirección e items y recalcula el total, sin tocar estado ni cliente", async () => {
            const order = await createOrder(customer._id);

            const res = await api()
                .put(`/api/orders/${order._id}`)
                .send({ deliveryAddress: "Nueva 123", items: [{ name: "Caja", quantity: 3, price: 10 }], status: ORDER_STATUS.DELIVERED, customer: NON_EXISTENT_ID });

            expectSuccess(res, 200);
            expect(res.body.payload).to.include({
                deliveryAddress: "Nueva 123",
                total: 30,
                status: ORDER_STATUS.CREATED,
                customer: customer._id
            });
        });

        it("responde 404 ORDER_NOT_FOUND si no existe", async () => {
            expectError(await api().put(`/api/orders/${NON_EXISTENT_ID}`).send({ deliveryAddress: "x" }), 404, "ORDER_NOT_FOUND");
        });

        it("responde 400 INVALID_ID si el id está mal formado", async () => {
            expectError(await api().put("/api/orders/abc").send({ deliveryAddress: "x" }), 400, "INVALID_ID");
        });

        it("responde 400 VALIDATION_ERROR si se envían items vacíos", async () => {
            const order = await createOrder(customer._id);

            expectError(await api().put(`/api/orders/${order._id}`).send({ items: [] }), 400, "VALIDATION_ERROR");
        });
    });

    describe("PATCH /api/orders/:id/status", () => {
        it("aplica una transición permitida", async () => {
            const order = await createOrder(customer._id);

            const res = await api().patch(`/api/orders/${order._id}/status`).send({ status: ORDER_STATUS.ASSIGNED });

            expectSuccess(res, 200);
            expect(res.body.payload).to.include({ _id: order._id, status: ORDER_STATUS.ASSIGNED });
        });

        it("recorre el ciclo de vida completo hasta DELIVERED", async () => {
            const order = await createOrder(customer._id);
            
            for (const status of [ORDER_STATUS.ASSIGNED, ORDER_STATUS.PICKED_UP, ORDER_STATUS.IN_TRANSIT, ORDER_STATUS.DELIVERED]) {
                const res = await api().patch(`/api/orders/${order._id}/status`).send({ status });
                expectSuccess(res, 200);
                expect(res.body.payload.status).to.equal(status);
            }
        });

        it("responde 400 INVALID_STATUS si la transición no está permitida", async () => {
            const order = await createOrder(customer._id);

            const res = await api().patch(`/api/orders/${order._id}/status`).send({ status: ORDER_STATUS.DELIVERED });

            expectError(res, 400, "INVALID_STATUS");
            expect(res.body.details).to.deep.include({
                from: ORDER_STATUS.CREATED,
                to: ORDER_STATUS.DELIVERED,
                allowed: ORDER_STATUS_TRANSITIONS[ORDER_STATUS.CREATED]
            });
            expect((await OrderModel.findById(order._id)).status).to.equal(ORDER_STATUS.CREATED);
        });

        it("no permite salir de un estado final", async () => {
            const order = await createOrder(customer._id);
            await api().patch(`/api/orders/${order._id}/status`).send({ status: ORDER_STATUS.CANCELLED });

            const res = await api().patch(`/api/orders/${order._id}/status`).send({ status: ORDER_STATUS.ASSIGNED });

            expectError(res, 400, "INVALID_STATUS");
            expect(res.body.details.allowed).to.deep.equal([]);
        });

        it("responde 400 INVALID_STATUS si el estado no existe", async () => {
            const order =await createOrder(customer._id);

            const res = await api().patch(`/api/orders/${order._id}/status`).send({ status: "FOO" });

            expectError(res, 400, "INVALID_STATUS");
            expect(res.body.details).to.deep.equal({ received: "FOO", allowed: Object.values(ORDER_STATUS) });
        });

        it("responde 400 INVALID_STATUS si no se envía el estado", async () => {
            const order = await createOrder(customer._id);

            expectError(await api().patch(`/api/orders/${order._id}/status`).send({}), 400, "INVALID_STATUS");
        });

        it("responde 404 ORDER_NOT_FOUND si el pedido no existe", async () => {
            const res = await api().patch(`/api/orders/${NON_EXISTENT_ID}/status`).send({ status: ORDER_STATUS.ASSIGNED });

            expectError(res, 404, "ORDER_NOT_FOUND");
        });

        it("responde 400 INVALID_ID si el id está mal formado", async () => {
            expectError(await api().patch("/api/orders/abc/status").send({ status: ORDER_STATUS.ASSIGNED}), 400, "INVALID_ID");
        });

        it("al cancelar un pedido con entrega, elimina la entrega", async () => {
            const courier = await createCourier();
            const order = await createOrder(customer._id);
            const delivery = await createDelivery(order._id, courier._id);

            const res = await api().patch(`/api/orders/${order._id}/status`).send({ status: ORDER_STATUS.CANCELLED });

            expectSuccess(res, 200);
            expect(res.body.payload).to.include({ status: ORDER_STATUS.CANCELLED, delivery: null });
            expect(await DeliveryModel.findById(delivery._id)).to.equal(null);
        });
    });

    describe("DELETE /api/orders/:id", () => {
        it("elimina el pedido y lo devuelve", async () => {
            const order = await createOrder(customer._id);

            const res = await api().delete(`/api/orders/${order._id}`);

            expectSuccess(res, 200);
            expect(res.body.payload._id).to.equal(order._id);
            expect(await OrderModel.findById(order._id)).to.equal(null);
        });

        it("elimina también la entrega del pedido", async () => {
            const courier = await createCourier();
            const order = await createOrder(customer._id);
            const delivery = await createDelivery(order._id, courier._id);

            expectSuccess(await api().delete(`/api/orders/${order._id}`), 200);
            expect(await DeliveryModel.findById(delivery._id)).to.equal(null);
        });

        it("responde 404 ORDER_NOT_FOUND si ya no existe", async () => {
            const order = await createOrder(customer._id);
            await api().delete(`/api/orders/${order._id}`);

            expectError(await api().delete(`/api/orders/${order._id}`), 404, "ORDER_NOT_FOUND");
        });

        it("responde 400 INVALID_ID si el id está mal formado", async () => {
            expectError(await api().delete("/api/orders/abc"), 400, "INVALID_ID");
        });
    });
});