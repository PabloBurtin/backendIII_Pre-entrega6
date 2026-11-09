import { expect } from "chai";
import { api } from "./helpers/factories.js";
import { expectError } from "./helpers/assertions.js";

describe("Rutas inexistentes", () => {
    it("GET a una ruta que no existe responde 404 ROUTE_NOT_FOUND con método y ruta en details", async () => {
        const res = await api().get("/api/nada");

        expectError(res, 404, "ROUTE_NOT_FOUND");
        expect(res.body.details).to.deep.equal({ method: "GET", path: "/api/nada" });
    });

    it("POST a una ruta que no existe responde 404 ROUTE_NOT_FOUND", async () => {
        const res = await api().post("/api/nada").send({ a: 1 });

        expectError(res, 404, "ROUTE_NOT_FOUND");
        expect(res.body.details).to.deep.equal({ method: "POST", path: "/api/nada" });
    });

    it("un método no soportado en una ruta existente también responde 404 ROUTE_NOT_FOUND", async () => {
        const res = await api().delete("/api/users");

        expectError(res, 404, "ROUTE_NOT_FOUND");
        expect(res.body.details).to.deep.equal({ method: "DELETE", path: "/api/users" });
    });

    it("incluye la query string en details.path", async () => {
        const res = await api().get("/api/nada?x=1");

        expectError(res, 404, "ROUTE_NOT_FOUND");
        expect(res.body.details.path).to.equal("/api/nada?x=1");
    });
});

describe("Cabeceras comunes", () => {
    it("toda respuesta (incluso un error) lleva el header x-request-id", async () => {
        const res = await api().get("/api/nada");

        expect(res.headers).to.have.property("x-request-id");
    });
});