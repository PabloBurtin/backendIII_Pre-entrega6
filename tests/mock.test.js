import { expect } from "chai";
import { api, createUser, createCourier, createOrder, createDelivery, NON_EXISTENT_ID } from "./helpers/factories.js";
import { expectError, expectObjectId } from "./helpers/assertions.js";
import { clearDatabase } from "./helpers/db.js";
import { MockRepository } from "../src/repositories/mock.repository.js";
import { UserModel } from "../src/models/user.model.js";
import { OrderModel } from "../src/models/order.model.js";
import { DeliveryModel } from "../src/models/delivery.model.js";
import {
    USER_ROLES, ORDER_STATUS, ORDER_PRIORITY, DELIVERY_STATUS,
    DELIVERY_STATUS_BY_ORDER_STATUS, MOCKING_PARAMETERS
} from "../src/constants/index.js";

const { DEFAULT_QTY, MAX_QTY, DEFAULT_PASSWORD } = MOCKING_PARAMETERS;

const withFailingRepository = async (method, run) => {
    const original = MockRepository[method];
    MockRepository[method] = async () => { throw new Error("falla simulada de MongoDB"); };
    try {
        return await run();
    } finally {
        MockRepository[method] = original;
    }
};

describe("Mocks", () => {
    beforeEach(clearDatabase);
    after(clearDatabase);

    describe("GET /api/mocks/users (datos simulados, no se guardan)", () => {
        it("devuelve la cantidad pedida de usuarios con la estructura y roles válidos", async () => {
            const res = await api().get("/api/mocks/users?qty=5");

            expect(res.status).to.equal(200);
            expect(res.body).to.be.an("array").with.lengthOf(5);
            res.body.forEach((user) => {
                expectObjectId(user._id);
                expect(user.name).to.be.a("string").that.is.not.empty;
                expect(user.email).to.match(/^[^@]+@test\.com$/);
                expect(user.password).to.equal(DEFAULT_PASSWORD);
                expect(user.role).to.be.oneOf([USER_ROLES.USER, USER_ROLES.COURIER]);
            });
        });

        it("usa la cantidad por defecto si no se envía qty", async () => {
            const res = await api().get("/api/mocks/users");

            expect(res.status).to.equal(200);
            expect(res.body).to.have.lengthOf(DEFAULT_QTY);
        });

        it("no escribe nada en la base de datos", async () => {
            await api().get("/api/mocks/users?qty=5");
            await api().get("/api/mocks/orders?qty=5");
            await api().get("/api/mocks/deliveries?qty=5");

            expect(await UserModel.countDocuments()).to.equal(0);
            expect(await OrderModel.countDocuments()).to.equal(0);
            expect(await DeliveryModel.countDocuments()).to.equal(0);
        });

        it("genera emails distintos en una misma tanda", async () => {
            const res = await api().get(`/api/mocks/users?qty=${MAX_QTY}`);

            const emails = res.body.map((u) => u.email);
            expect(new Set(emails).size).to.equal(emails.length);
        });
    });

    describe("GET /api/mocks/couriers", () => {
        it("devuelve únicamente repartidores (rol COURIER)", async () => {
            const res = await api().get("/api/mocks/couriers?qty=4");

            expect(res.status).to.equal(200);
            expect(res.body).to.have.lengthOf(4);
            res.body.forEach((courier) => expect(courier.role).to.equal(USER_ROLES.COURIER));
        });
    });

    describe("GET /api/mocks/orders", () => {
        it("devuelve pedidos con estados, prioridades, items y total coherentes", async () => {
            const res = await api().get("/api/mocks/orders?qty=8");

            expect(res.status).to.equal(200);
            expect(res.body).to.have.lengthOf(8);
            res.body.forEach((order) => {
                expectObjectId(order._id);
                expectObjectId(order.customer);
                expect(order.status).to.be.oneOf(Object.values(ORDER_STATUS));
                expect(order.priority).to.be.oneOf(Object.values(ORDER_PRIORITY));
                expect(order.deliveryAddress).to.be.a("string").that.is.not.empty;
                expect(order.items).to.be.an("array").that.is.not.empty;
                const expectedTotal = order.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
                expect(order.total).to.be.closeTo(expectedTotal, 0.01);
                if (order.status === ORDER_STATUS.CANCELLED) expect(order.delivery).to.equal(null);
                else expectObjectId(order.delivery);
            });
        });

        it("fuerza el estado de todos los pedidos con ?status=", async () => {
            const res = await api().get(`/api/mocks/orders?qty=5&status=${ORDER_STATUS.DELIVERED}`);

            expect(res.status).to.equal(200);
            res.body.forEach((order) => expect(order.status).to.equal(ORDER_STATUS.DELIVERED));
        });
    });

    describe("GET /api/mocks/deliveries", () => {
        it("devuelve entregas cuyo estado es coherente con el de su pedido", async () => {
            const res = await api().get("/api/mocks/deliveries?qty=20");

            expect(res.status).to.equal(200);
            expect(res.body).to.be.an("array");
            res.body.forEach((delivery) => {
                expectObjectId(delivery._id);
                expectObjectId(delivery.order);
                expect(delivery.status).to.be.oneOf(Object.values(DELIVERY_STATUS));
                if (delivery.status === DELIVERY_STATUS.PENDING) {
                    expect(delivery.courier).to.equal(null);
                    expect(delivery.assignedAt).to.equal(null);
                } else {
                    expectObjectId(delivery.courier);
                    expect(delivery.assignedAt).to.be.a("string");
                }
                if (delivery.status === DELIVERY_STATUS.DELIVERED) {
                    expect(new Date(delivery.deliveredAt) >= new Date(delivery.assignedAt)).to.equal(true);
                } else {
                    expect(delivery.deliveredAt).to.equal(null);
                }
            });
        });
    });

    describe("Validación de la cantidad (qty) en los GET", () => {
        const cases = [
            ["no numérica", "abc", "debe ser un número entero"],
            ["decimal", "2.5", "debe ser un número entero"],
            ["negativa", "-5", "no puede ser negativa"],
            ["cero", "0", "mínima"],
            ["mayor al máximo", String(MAX_QTY + 1), "máxima"]
        ];

        ["users", "couriers", "orders", "deliveries"].forEach((resource) => {
            cases.forEach(([label, qty, reasonFragment]) => {
                it(`GET /api/mocks/${resource}: responde 400 INVALID_QUANTITY con cantidad ${label} (${qty})`, async () => {
                    const res = await api().get(`/api/mocks/${resource}?qty=${qty}`);

                    expectError(res, 400, "INVALID_QUANTITY");
                    expect(res.body.details).to.include({ received: qty, min: MOCKING_PARAMETERS.MIN_QTY, max: MAX_QTY });
                    expect(res.body.details.reason).to.contain(reasonFragment);
                });
            });
        });

        it("GET /api/mocks/orders: responde 400 INVALID_STATUS si ?status= no existe", async () => {
            const res = await api().get("/api/mocks/orders?qty=3&status=FOO");

            expectError(res, 400, "INVALID_STATUS");
            expect(res.body.details).to.deep.equal({ received: "FOO", allowed: Object.values(ORDER_STATUS) });
        });
    });

    describe("POST /api/mocks/seed/users", () => {
        it("inserta los usuarios en la base, con la contraseña de prueba hasheada", async () => {
            const res = await api().post("/api/mocks/seed/users?qty=3");

            expect(res.status).to.equal(201);
            expect(res.body).to.deep.equal({ insertados: 3, coleccion: "usuarios" });

            const saved = await UserModel.find().select("+password").lean();
            expect(saved).to.have.lengthOf(3);
            saved.forEach((user) => {
                expect(user.role).to.be.oneOf([USER_ROLES.USER, USER_ROLES.COURIER]);
                expect(user.password).to.match(/^\$2[aby]\$/);
                expect(user.password).to.not.equal(DEFAULT_PASSWORD);
            });
        });

        it("responde 400 INVALID_QUANTITY y no inserta nada si la cantidad es inválida", async () => {
            const res = await api().post("/api/mocks/seed/users?qty=-1");

            expectError(res, 400, "INVALID_QUANTITY");
            expect(await UserModel.countDocuments()).to.equal(0);
        });

        it("responde 500 MOCK_SEED_FAILED si MongoDB falla al insertar", async () => {
            const res = await withFailingRepository("insertUsers", () => api().post("/api/mocks/seed/users?qty=3"));

            expectError(res, 500, "MOCK_SEED_FAILED");
            expect(res.body.details).to.deep.equal({ collection: "usuarios" });
            expect(await UserModel.countDocuments()).to.equal(0);
        });
    });

    describe("POST /api/mocks/seed", () => {
        it("inserta clientes, repartidores, pedidos y entregas relacionados entre sí", async () => {
            const res = await api().post("/api/mocks/seed?qty=6");

            expect(res.status).to.equal(201);
            const { usuarios, repartidores, pedidos, entregas } = res.body.insertados;
            expect(usuarios).to.equal(6);
            expect(repartidores).to.equal(2);
            expect(pedidos).to.equal(6);

            expect(await UserModel.countDocuments({ role: USER_ROLES.USER })).to.equal(usuarios);
            expect(await UserModel.countDocuments({ role: USER_ROLES.COURIER })).to.equal(repartidores);
            expect(await OrderModel.countDocuments()).to.equal(pedidos);
            expect(await DeliveryModel.countDocuments()).to.equal(entregas);

            const orders = await OrderModel.find().lean();
            for (const order of orders) {
                const customer = await UserModel.findById(order.customer).lean();
                expect(customer, "el cliente del pedido existe").to.not.equal(null);
                expect(customer.role).to.equal(USER_ROLES.USER);

                if (order.status === ORDER_STATUS.CANCELLED) {
                    expect(order.delivery).to.equal(null);
                    continue;
                }
                const delivery = await DeliveryModel.findById(order.delivery).lean();
                expect(delivery, "la entrega del pedido existe").to.not.equal(null);
                expect(String(delivery.order)).to.equal(String(order._id));
                expect(delivery.status).to.equal(DELIVERY_STATUS_BY_ORDER_STATUS[order.status]);
                if (delivery.courier) {
                    const courier = await UserModel.findById(delivery.courier).lean();
                    expect(courier.role).to.equal(USER_ROLES.COURIER);
                }
            }
        });

        it("responde 400 INVALID_QUANTITY y no inserta nada si la cantidad es inválida", async () => {
            expectError(await api().post("/api/mocks/seed?qty=abc"), 400, "INVALID_QUANTITY");
            expectError(await api().post(`/api/mocks/seed?qty=${MAX_QTY + 1}`), 400, "INVALID_QUANTITY");
            expect(await UserModel.countDocuments()).to.equal(0);
        });

        it("responde 500 MOCK_SEED_FAILED y revierte lo ya insertado si falla a mitad de la carga", async () => {
            const res = await withFailingRepository("insertOrders", () => api().post("/api/mocks/seed?qty=4"));

            expectError(res, 500, "MOCK_SEED_FAILED");
            expect(res.body.details).to.deep.equal({ collection: "pedidos" });
            expect(await UserModel.countDocuments()).to.equal(0);
            expect(await OrderModel.countDocuments()).to.equal(0);
        });
    });

    describe("POST /api/mocks/seed/deliveries", () => {
        let order;
        let courier;

        beforeEach(async () => {
            const customer = await createUser();
            courier = await createCourier();
            order = await createOrder(customer._id);
        });

        it("crea una entrega PENDING (sin repartidor) para un pedido CREATED y la vincula al pedido", async () => {
            const res = await api().post(`/api/mocks/seed/deliveries?orderId=${order._id}`);

            expect(res.status).to.equal(201);
            expect(res.body).to.include({ insertados: 1, coleccion: "entregas" });
            expect(res.body.entrega).to.include({ order: order._id, courier: null, status: DELIVERY_STATUS.PENDING });

            const saved = await OrderModel.findById(order._id).lean();
            expect(String(saved.delivery)).to.equal(res.body.entrega._id);
            expect(await DeliveryModel.countDocuments()).to.equal(1);
        });

        it("asigna un repartidor existente si el pedido ya está ASSIGNED", async () => {
            await api().patch(`/api/orders/${order._id}/status`).send({ status: ORDER_STATUS.ASSIGNED });

            const res = await api().post(`/api/mocks/seed/deliveries?orderId=${order._id}`);

            expect(res.status).to.equal(201);
            expect(res.body.entrega).to.include({ order: order._id, courier: courier._id, status: DELIVERY_STATUS.ASSIGNED });
            expect(res.body.entrega.assignedAt).to.be.a("string");
        });

        it("responde 400 INVALID_ID si falta orderId", async () => {
            const res = await api().post("/api/mocks/seed/deliveries");

            expectError(res, 400, "INVALID_ID");
            expect(res.body.details).to.include({ field: "orderId" });
        });

        it("responde 400 INVALID_ID si orderId está mal formado", async () => {
            expectError(await api().post("/api/mocks/seed/deliveries?orderId=abc"), 400, "INVALID_ID");
        });

        it("responde 404 ORDER_NOT_FOUND si el pedido no existe", async () => {
            expectError(await api().post(`/api/mocks/seed/deliveries?orderId=${NON_EXISTENT_ID}`), 404, "ORDER_NOT_FOUND");
        });

        it("responde 409 DELIVERY_ALREADY_EXISTS si el pedido ya tiene entrega", async () => {
            await createDelivery(order._id, courier._id);

            expectError(await api().post(`/api/mocks/seed/deliveries?orderId=${order._id}`), 409, "DELIVERY_ALREADY_EXISTS");
        });

        it("responde 400 INVALID_STATUS si el pedido está cancelado", async () => {
            await api().patch(`/api/orders/${order._id}/status`).send({ status: ORDER_STATUS.CANCELLED });

            const res = await api().post(`/api/mocks/seed/deliveries?orderId=${order._id}`);

            expectError(res, 400, "INVALID_STATUS");
            expect(res.body.details).to.include({ orderStatus: ORDER_STATUS.CANCELLED });
        });

        it("responde 409 NO_COURIERS_AVAILABLE si no hay repartidores cargados", async () => {
            await UserModel.deleteMany({ role: USER_ROLES.COURIER });

            const res = await api().post(`/api/mocks/seed/deliveries?orderId=${order._id}`);

            expectError(res, 409, "NO_COURIERS_AVAILABLE");
            expect(await DeliveryModel.countDocuments()).to.equal(0);
        });

        it("responde 500 MOCK_SEED_FAILED y no deja la entrega huérfana si falla el vínculo con el pedido", async () => {
            const res = await withFailingRepository("linkDelivery", () => api().post(`/api/mocks/seed/deliveries?orderId=${order._id}`));

            expectError(res, 500, "MOCK_SEED_FAILED");
            expect(await DeliveryModel.countDocuments()).to.equal(0);
        });
    });
});