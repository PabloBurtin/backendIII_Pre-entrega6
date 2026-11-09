import { expect } from "chai";
import { api } from "./helpers/factories.js";
import { expectSuccess } from "./helpers/assertions.js";
import logger from "../src/utils/logger.util.js";
import { LOG_LEVELS, LOG_LEVEL_BY_ENVIRONMENT, LOG_LEVEL_PRIORITIES, ENVIRONMENTS } from "../src/constants/index.js";

describe("Logger", () => {
    describe("GET /api/logs/loggerTest", () => {
        it("emite los seis niveles e informa cuáles se registran en el entorno de testing", async () => {
            const res = await api().get("/api/logs/loggerTest");

            expectSuccess(res, 200);
            const { activeLevel, levels } = res.body.payload;
            expect(activeLevel).to.equal(LOG_LEVEL_BY_ENVIRONMENT[ENVIRONMENTS.TEST]);
            expect(levels.map((l) => l.level)).to.deep.equal(
                [LOG_LEVELS.DEBUG, LOG_LEVELS.HTTP, LOG_LEVELS.INFO, LOG_LEVELS.WARNING, LOG_LEVELS.ERROR, LOG_LEVELS.FATAL]
            );
            levels.forEach(({ level, registrado }) => {
                const shouldBeRegistered = LOG_LEVEL_PRIORITIES[level] <= LOG_LEVEL_PRIORITIES[activeLevel];
                expect(registrado, `nivel ${level}`).to.equal(shouldBeRegistered);
            });
        });

        it("devuelve el header x-request-id generado por el middleware HTTP", async () => {
            const res = await api().get("/api/logs/loggerTest");

            expect(res.headers).to.have.property("x-request-id");
            expect(res.headers["x-request-id"]).to.match(/^[\w-]{8,}$/);
        });

        it("respeta un x-request-id válido enviado por el cliente", async () => {
            const res = await api().get("/api/logs/loggerTest").set("x-request-id", "mi-prueba-1");

            expect(res.headers["x-request-id"]).to.equal("mi-prueba-1");
        });

        it("descarta un x-request-id con formato inseguro y genera uno nuevo", async () => {
            const res = await api().get("/api/logs/loggerTest").set("x-request-id", "<script>alert(1)</script>");

            expect(res.headers["x-request-id"]).to.not.contain("<");
            expect(res.headers["x-request-id"]).to.match(/^[\w-]+$/);
        });
    });

    describe("Configuración del logger", () => {
        it("expone los seis niveles definidos", () => {
            Object.values(LOG_LEVELS).forEach((level) => expect(logger[level], `logger.${level}`).to.be.a("function"));
        });

        it("usa el nivel del entorno de testing y no escribe en consola ni archivos", () => {
            expect(logger.level).to.equal(LOG_LEVEL_BY_ENVIRONMENT[ENVIRONMENTS.TEST]);
            expect(logger.silent).to.equal(true);
        });
    });
});