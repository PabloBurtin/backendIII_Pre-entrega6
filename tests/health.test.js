import { expect } from "chai";
import { api } from "./helpers/factories.js"

describe("Health", () => {
    it("GET /api/health responde 200 con status ok y timestamp", async () => {
        const res = await api().get("/api/health");

        expect(res.status).to.equal(200);
        expect(res.body).to.have.property("status", "ok");
        expect(new Date(res.body.timestamp).toString()).to.not.equal("Invalid Date");
    });
});