import { expect } from "chai";
import { api, createUser, createCourier, createOrder, createDelivery, NON_EXISTENT_ID } from "./helpers/factories.js";
import { expectError, expectSuccess, expectObjectId } from "./helpers/assertions.js";
import { clearDatabase } from "./helpers/db.js";
import { OrderModel } from "../src/models/order.model.js";
import { DeliveryModel } from "../src/models/delivery.model.js";
import { ORDER_STATUS, DELIVERY_STATUS, DELIVERY_STATUS_TRANSITIONS } from "../src/constants/index.js";

describe("Deliveries", () => {
    let customer;
    let courier;
    let order;

    beforeEach(async () => {
        await clearDatabase();
        customer = await createUser();
        courier = await createCourier();
        order = await createOrder(customer._id);
    });
    after(clearDatabase);

    const patchStatus = (id, status) => api().patch(`/api/deliveries/${id}/status`).send({ status });

    describe("GET /api/deliveries", () => {
        it("devuelve una lista vacía si no hay entregas", async () => {
            const res = await api().get("/api/deliveries");

            expectSuccess(res, 200);
            expect(res.body.payload).to.be.an("array").that.is.empty;
        });

        it("lista las entregas con la estructura esperada", async () => {
            const delivery = await createDelivery(order._id, courier._id);

            const res = await api().get("/api/deliveries");

            expectSuccess(res, 200);
            expect(res.body.payload).to.have.lengthOf(1);
            const [item] = res.body.payload;
            expectObjectId(item._id);
            expect(item).to.include({ _id: delivery._id, order: order._id, courier: courier._id, status: DELIVERY_STATUS.ASSIGNED });
            expect(item).to.have.all.keys("_id", "order", "courier", "status", "assignedAt", "deliveredAt", "createdAt", "updatedAt");
        });

        it("filtra por estado", async () => {
            await createDelivery(order._id, courier._id);
            const otherOrder = await createOrder(customer._id);
            await createDelivery(otherOrder._id);

            const assigned = await api().get(`/api/deliveries?status=${DELIVERY_STATUS.ASSIGNED}`);
            const pending = await api().get(`/api/deliveries?status=${DELIVERY_STATUS.PENDING}`);

            expect(assigned.body.payload).to.have.lengthOf(1);
            expect(pending.body.payload).to.have.lengthOf(1);
            expect(pending.body.payload[0].courier).to.equal(null);
        });

        it("responde 400 INVALID_STATUS si el filtro de estado no existe", async () => {
            const res = await api().get("/api/deliveries?status=FOO");

            expectError(res, 400, "INVALID_STATUS");
            expect(res.body.details).to.deep.equal({ received: "FOO", allowed: Object.values(DELIVERY_STATUS) });
        });
    });

    describe("GET /api/deliveries/:id", () => {
        it("devuelve la entrega solicitada", async () => {
            const delivery = await createDelivery(order._id, courier._id);

            const res = await api().get(`/api/deliveries/${delivery._id}`);

            expectSuccess(res, 200);
            expect(res.body.payload).to.include({ _id: delivery._id, order: order._id, courier: courier._id });
            expect(res.body.payload.deliveredAt).to.equal(null);
        });

        it("responde 404 DELIVERY_NOT_FOUND si no existe", async () => {
            const res = await api().get(`/api/deliveries/${NON_EXISTENT_ID}`);

            expectError(res, 404, "DELIVERY_NOT_FOUND");
            expect(res.body.details).to.deep.equal({ id: NON_EXISTENT_ID });
        });

        it("responde 400 INVALID_ID si el id está mal formado", async () => {
            expectError(await api().get("/api/deliveries/abc"), 400, "INVALID_ID");
        });
    });

    describe("POST /api/deliveries", () => {
        it("con repartidor: crea la entrega ASSIGNED y deja el pedido en ASSIGNED, vinculado a la entrega", async () => {
            const res = await api().post("/api/deliveries").send({ order: order._id, courier: courier._id });

            expectSuccess(res, 201);
            const delivery = res.body.payload;
            expectObjectId(delivery._id);
            expect(delivery).to.include({ order: order._id, courier: courier._id, status: DELIVERY_STATUS.ASSIGNED, deliveredAt: null });
            expect(delivery.assignedAt).to.be.a("string");

            const savedOrder = await OrderModel.findById(order._id).lean();
            expect(savedOrder.status).to.equal(ORDER_STATUS.ASSIGNED);
            expect(String(savedOrder.delivery)).to.equal(delivery._id);
        });

        it("sin repartidor: crea la entrega PENDING y el pedido sigue en CREATED", async () => {
            const res = await api().post("/api/deliveries").send({ order: order._id });

            expectSuccess(res, 201);
            expect(res.body.payload).to.include({ status: DELIVERY_STATUS.PENDING, courier: null, assignedAt: null });
            expect((await OrderModel.findById(order._id)).status).to.equal(ORDER_STATUS.CREATED);
        });

        it("ignora el estado enviado en el body", async () => {
            const res = await api().post("/api/deliveries").send({ order: order._id, status: DELIVERY_STATUS.DELIVERED });

            expectSuccess(res, 201);
            expect(res.body.payload.status).to.equal(DELIVERY_STATUS.PENDING);
        });

        it("responde 400 VALIDATION_ERROR si falta el pedido", async () => {
            const res = await api().post("/api/deliveries").send({});

            expectError(res, 400, "VALIDATION_ERROR");
            expect(res.body.details).to.deep.equal([{ field: "order", message: "El pedido es obligatorio" }]);
        });

        it("responde 400 INVALID_ID si el pedido tiene un id mal formado", async () => {
            expectError(await api().post("/api/deliveries").send({ order: "abc" }), 400, "INVALID_ID");
        });

        it("responde 404 ORDER_NOT_FOUND si el pedido no existe", async () => {
            expectError(await api().post("/api/deliveries").send({ order: NON_EXISTENT_ID }), 404, "ORDER_NOT_FOUND");
        });

        it("responde 404 USER_NOT_FOUND si el repartidor no existe", async () => {
            const res = await api().post("/api/deliveries").send({ order: order._id, courier: NON_EXISTENT_ID });

            expectError(res, 404, "USER_NOT_FOUND");
            expect(await DeliveryModel.countDocuments()).to.equal(0);
        });

        it("responde 400 INVALID_COURIER si el usuario indicado no es repartidor", async () => {
            const res = await api().post("/api/deliveries").send({ order: order._id, courier: customer._id });

            expectError(res, 400, "INVALID_COURIER");
            expect(res.body.details).to.deep.equal({ id: customer._id, role: "USER" });
            expect(await DeliveryModel.countDocuments()).to.equal(0);
        });

        it("responde 409 DELIVERY_ALREADY_EXISTS si el pedido ya tiene entrega", async () => {
            const delivery = await createDelivery(order._id, courier._id);

            const res = await api().post("/api/deliveries").send({ order: order._id });

            expectError(res, 409, "DELIVERY_ALREADY_EXISTS");
            expect(res.body.details).to.deep.equal({ orderId: order._id, deliveryId: delivery._id });
        });

        it("responde 400 INVALID_STATUS si el pedido no está en CREATED", async () => {
            await api().patch(`/api/orders/${order._id}/status`).send({ status: ORDER_STATUS.CANCELLED });

            const res = await api().post("/api/deliveries").send({ order: order._id });

            expectError(res, 400, "INVALID_STATUS");
            expect(res.body.details).to.include({ orderStatus: ORDER_STATUS.CANCELLED });
        });
    });

    describe("PUT /api/deliveries/:id (asignar repartidor)", () => {
        it("asigna el repartidor a una entrega PENDING: pasa a ASSIGNED y el pedido también", async () => {
            const delivery = await createDelivery(order._id);

            const res = await api().put(`/api/deliveries/${delivery._id}`).send({ courier: courier._id });

            expectSuccess(res, 200);
            expect(res.body.payload).to.include({ courier: courier._id, status: DELIVERY_STATUS.ASSIGNED });
            expect(res.body.payload.assignedAt).to.be.a("string");
            expect((await OrderModel.findById(order._id)).status).to.equal(ORDER_STATUS.ASSIGNED);
        });

        it("reasigna el repartidor de una entrega ASSIGNED", async () => {
            const delivery = await createDelivery(order._id, courier._id);
            const otherCourier = await createCourier();

            const res = await api().put(`/api/deliveries/${delivery._id}`).send({ courier: otherCourier._id });

            expectSuccess(res, 200);
            expect(res.body.payload).to.include({ courier: otherCourier._id, status: DELIVERY_STATUS.ASSIGNED });
        });

        it("responde 400 VALIDATION_ERROR si falta el repartidor", async () => {
            const delivery = await createDelivery(order._id);

            const res = await api().put(`/api/deliveries/${delivery._id}`).send({});

            expectError(res, 400, "VALIDATION_ERROR");
            expect(res.body.details).to.deep.equal([{ field: "courier", message: "El repartidor es obligatorio" }]);
        });

        it("responde 400 INVALID_COURIER si el usuario no es repartidor", async () => {
            const delivery = await createDelivery(order._id);

            expectError(await api().put(`/api/deliveries/${delivery._id}`).send({ courier: customer._id }), 400, "INVALID_COURIER");
        });

        it("responde 404 USER_NOT_FOUND si el repartidor no existe", async () => {
            const delivery = await createDelivery(order._id);

            expectError(await api().put(`/api/deliveries/${delivery._id}`).send({ courier: NON_EXISTENT_ID }), 404, "USER_NOT_FOUND");
        });

        it("responde 404 DELIVERY_NOT_FOUND si la entrega no existe", async () => {
            expectError(await api().put(`/api/deliveries/${NON_EXISTENT_ID}`).send({ courier: courier._id }), 404, "DELIVERY_NOT_FOUND");
        });

        it("responde 400 INVALID_ID si el id está mal formado", async () => {
            expectError(await api().put("/api/deliveries/abc").send({ courier: courier._id }), 400, "INVALID_ID");
        });

        it("responde 400 INVALID_STATUS si la entrega ya fue entregada", async () => {
            const delivery = await createDelivery(order._id, courier._id);
            await patchStatus(delivery._id, DELIVERY_STATUS.IN_TRANSIT);
            await patchStatus(delivery._id, DELIVERY_STATUS.DELIVERED);

            const res = await api().put(`/api/deliveries/${delivery._id}`).send({ courier: courier._id });

            expectError(res, 400, "INVALID_STATUS");
            expect(res.body.details).to.include({ deliveryStatus: DELIVERY_STATUS.DELIVERED });
        });
    });

    describe("PATCH /api/deliveries/:id/status", () => {
        it("avanza hasta DELIVERED y el pedido sigue el estado de su entrega", async () => {
            const delivery = await createDelivery(order._id, courier._id);

            const inTransit = await patchStatus(delivery._id, DELIVERY_STATUS.IN_TRANSIT);
            expectSuccess(inTransit, 200);
            expect(inTransit.body.payload.status).to.equal(DELIVERY_STATUS.IN_TRANSIT);
            expect((await OrderModel.findById(order._id)).status).to.equal(ORDER_STATUS.IN_TRANSIT);

            const delivered = await patchStatus(delivery._id, DELIVERY_STATUS.DELIVERED);
            expectSuccess(delivered, 200);
            expect(delivered.body.payload.status).to.equal(DELIVERY_STATUS.DELIVERED);
            expect(delivered.body.payload.deliveredAt).to.be.a("string");
            expect((await OrderModel.findById(order._id)).status).to.equal(ORDER_STATUS.DELIVERED);
        });

        it("responde 400 INVALID_STATUS si la transición no está permitida", async () => {
            const delivery = await createDelivery(order._id, courier._id);

            const res = await patchStatus(delivery._id, DELIVERY_STATUS.DELIVERED);

            expectError(res, 400, "INVALID_STATUS");
            expect(res.body.details).to.deep.include({
                from: DELIVERY_STATUS.ASSIGNED,
                to: DELIVERY_STATUS.DELIVERED,
                allowed: DELIVERY_STATUS_TRANSITIONS[DELIVERY_STATUS.ASSIGNED]
            });
        });

        it("responde 400 INVALID_STATUS al pasar a ASSIGNED una entrega sin repartidor", async () => {
            const delivery = await createDelivery(order._id);

            const res = await patchStatus(delivery._id, DELIVERY_STATUS.ASSIGNED);

            expectError(res, 400, "INVALID_STATUS");
            expect(res.body.details.reason).to.match(/repartidor/);
        });

        it("no permite volver atrás desde un estado final", async () => {
            const delivery = await createDelivery(order._id, courier._id);
            await patchStatus(delivery._id, DELIVERY_STATUS.IN_TRANSIT);
            await patchStatus(delivery._id, DELIVERY_STATUS.DELIVERED);

            const res = await patchStatus(delivery._id, DELIVERY_STATUS.IN_TRANSIT);

            expectError(res, 400, "INVALID_STATUS");
            expect(res.body.details.allowed).to.deep.equal([]);
        });

        it("responde 400 INVALID_STATUS si el estado no existe", async () => {
            const delivery = await createDelivery(order._id, courier._id);

            const res = await patchStatus(delivery._id, "FOO");

            expectError(res, 400, "INVALID_STATUS");
            expect(res.body.details).to.deep.equal({ received: "FOO", allowed: Object.values(DELIVERY_STATUS) });
        });

        it("responde 404 DELIVERY_NOT_FOUND si la entrega no existe", async () => {
            expectError(await patchStatus(NON_EXISTENT_ID, DELIVERY_STATUS.IN_TRANSIT), 404, "DELIVERY_NOT_FOUND");
        });

        it("responde 400 INVALID_ID si el id está mal formado", async () => {
            expectError(await patchStatus("abc", DELIVERY_STATUS.IN_TRANSIT), 400, "INVALID_ID");
        });
    });

    describe("DELETE /api/deliveries/:id", () => {
        it("elimina la entrega y deja el pedido sin entrega, otra vez en CREATED", async () => {
            const delivery = await createDelivery(order._id, courier._id);

            const res = await api().delete(`/api/deliveries/${delivery._id}`);

            expectSuccess(res, 200);
            expect(res.body.payload._id).to.equal(delivery._id);
            expect(await DeliveryModel.findById(delivery._id)).to.equal(null);
            const savedOrder = await OrderModel.findById(order._id).lean();
            expect(savedOrder.delivery).to.equal(null);
            expect(savedOrder.status).to.equal(ORDER_STATUS.CREATED);
        });

        it("responde 404 DELIVERY_NOT_FOUND si ya no existe", async () => {
            const delivery = await createDelivery(order._id);
            await api().delete(`/api/deliveries/${delivery._id}`);

            expectError(await api().delete(`/api/deliveries/${delivery._id}`), 404, "DELIVERY_NOT_FOUND");
        });

        it("responde 400 INVALID_ID si el id está mal formado", async () => {
            expectError(await api().delete("/api/deliveries/abc"), 400, "INVALID_ID");
        });
    });
});