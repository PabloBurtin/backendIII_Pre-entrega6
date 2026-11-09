import { expect } from "chai";
import { api } from "./helpers/factories.js";
import {
    USER_ROLES, PRODUCT_STATUS, ORDER_STATUS, ORDER_PRIORITY, DELIVERY_STATUS
} from "../src/constants/index.js";
import { ERROR_CODES } from "../src/errors/error.dictionary.js";

const EXPECTED_TAGS = ["Users", "Products", "Orders", "Deliveries", "Mocks", "Logger", "Health"];

describe("Swagger", () => {
    describe("GET /api/docs", () => {
        it("redirige a /api/docs/ (barra final)", async () => {
            const res = await api().get("/api/docs");

            expect(res.status).to.equal(301);
            expect(res.headers.location).to.equal("/api/docs/");
        });

        it("sirve la interfaz de Swagger UI en HTML", async () => {
            const res = await api().get("/api/docs/");

            expect(res.status).to.equal(200);
            expect(res.headers["content-type"]).to.match(/text\/html/);
            expect(res.text).to.contain("swagger-ui");
            expect(res.text).to.contain("ShipNow API - Documentación");
        });
    });

    describe("GET /api/docs.json", () => {
        let spec;

        before(async () => {
            const res = await api().get("/api/docs.json");
            expect(res.status).to.equal(200);
            expect(res.headers["content-type"]).to.match(/application\/json/);
            spec = res.body;
        });

        it("incluye la información general: versión OpenAPI, nombre, versión, descripción y servidor local", () => {
            expect(spec.openapi).to.match(/^3\.0\./);
            expect(spec.info).to.include({ title: "ShipNow API", version: "1.0.0" });
            expect(spec.info.description).to.be.a("string").that.is.not.empty;
            expect(spec.servers).to.be.an("array").that.is.not.empty;
            expect(spec.servers[0].url).to.match(/^http:\/\/localhost:\d+$/);
        });

        it("agrupa la documentación en los tags esperados", () => {
            expect(spec.tags.map((t) => t.name)).to.have.members(EXPECTED_TAGS);
        });

        it("cada tag tiene al menos un endpoint documentado", () => {
            const usedTags = new Set(Object.values(spec.paths).flatMap((methods) => Object.values(methods).flatMap((op) => op.tags)));
            EXPECTED_TAGS.forEach((tag) => expect(usedTags.has(tag), `tag ${tag}`).to.equal(true));
        });

        it("cada endpoint documenta un resumen y una respuesta exitosa, y los de negocio también una de error", () => {
            Object.entries(spec.paths).forEach(([path, methods]) => {
                Object.entries(methods).forEach(([method, op]) => {
                    const label = `${method.toUpperCase()} ${path}`;
                    expect(op.summary, `${label}: summary`).to.be.a("string").that.is.not.empty;
                    const statuses = Object.keys(op.responses);
                    expect(statuses.some((s) => s.startsWith("2")), `${label}: respuesta exitosa`).to.equal(true);
                    // El health check no puede fallar de forma controlada: solo documenta el 200
                    if (!op.tags.includes("Health")) {
                        expect(statuses.some((s) => /^[45]/.test(s)), `${label}: respuesta de error`).to.equal(true);
                    }
                });
            });
        });

        it("define los schemas reutilizables de usuario, pedido, item, entrega, error y éxito", () => {
            expect(spec.components.schemas).to.include.keys(
                "User", "Order", "OrderItem", "Delivery", "Product", "ErrorResponse", "SuccessResponse"
            );
        });

        it("sus enumeraciones coinciden con las constantes del proyecto", () => {
            const { schemas } = spec.components;
            expect(schemas.User.properties.role.enum).to.have.members(Object.values(USER_ROLES));
            expect(schemas.Product.properties.status.enum).to.have.members(Object.values(PRODUCT_STATUS));
            expect(schemas.Order.properties.status.enum).to.have.members(Object.values(ORDER_STATUS));
            expect(schemas.Order.properties.priority.enum).to.have.members(Object.values(ORDER_PRIORITY));
            expect(schemas.Delivery.properties.status.enum).to.have.members(Object.values(DELIVERY_STATUS));
        });

        it("el schema de error lista exactamente los códigos del diccionario de errores", () => {
            expect(spec.components.schemas.ErrorResponse.properties.code.enum).to.have.members(Object.values(ERROR_CODES));
        });

        it("documenta que el logger es una herramienta de validación y no una funcionalidad de negocio", () => {
            const operation = spec.paths["/api/logs/loggerTest"].get;

            expect(operation.tags).to.deep.equal(["Logger"]);
            expect(operation.description).to.match(/no una funcionalidad de negocio/);
        });

        it("documenta los endpoints principales de la consigna", () => {
            expect(spec.paths).to.include.keys(
                "/api/users", "/api/users/{id}",
                "/api/orders", "/api/orders/{id}", "/api/orders/{id}/status",
                "/api/deliveries", "/api/deliveries/{id}", "/api/deliveries/{id}/status",
                "/api/mocks/users", "/api/mocks/seed", "/api/logs/loggerTest", "/api/health"
            );
        });
    });
});