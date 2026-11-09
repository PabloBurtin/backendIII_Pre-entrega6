import { expect } from "chai";
import { api, NON_EXISTENT_ID } from "./helpers/factories.js";
import { expectError, expectSuccess, expectObjectId } from "./helpers/assertions.js";
import { clearDatabase } from "./helpers/db.js";
import { ProductModel } from "../src/models/product.model.js";
import { PRODUCT_STATUS } from "../src/constants/index.js";

const createProduct = async (overrides = {}) => {
    const res = await api().post("/api/products").send({ name: "Caja", price: 10, stock: 5, ...overrides });
    expect(res.status, "no se pudo crear el producto de prueba").to.equal(201);
    return res.body.payload;
};

describe("Products", () => {
    beforeEach(clearDatabase);
    after(clearDatabase);

    describe("GET /api/products", () => {
        it("lista solo los productos con stock, con la estructura esperada", async () => {
            await createProduct({ name: "Con stock", stock: 3 });
            await createProduct({ name: "Sin stock", stock: 0 });

            const res = await api().get("/api/products");

            expectSuccess(res, 200);
            expect(res.body.payload).to.have.lengthOf(1);
            const [product] = res.body.payload;
            expectObjectId(product._id);
            expect(product).to.include({ name: "Con stock", price: 10, stock: 3, status: PRODUCT_STATUS.AVAILABLE });
            expect(product).to.not.have.property("__v");
        });
    });

    describe("GET /api/products/:id", () => {
        it("devuelve el producto solicitado, aunque no tenga stock", async () => {
            const product = await createProduct({ stock: 0 });

            const res = await api().get(`/api/products/${product._id}`);

            expectSuccess(res, 200);
            expect(res.body.payload).to.include({ _id: product._id, status: PRODUCT_STATUS.OUT_OF_STOCK });
        });

        it("responde 404 PRODUCT_NOT_FOUND si no existe", async () => {
            const res = await api().get(`/api/products/${NON_EXISTENT_ID}`);

            expectError(res, 404, "PRODUCT_NOT_FOUND");
            expect(res.body.details).to.deep.equal({ id: NON_EXISTENT_ID });
        });

        it("responde 400 INVALID_ID si el id está mal formado", async () => {
            expectError(await api().get("/api/products/abc"), 400, "INVALID_ID");
        });
    });

    describe("POST /api/products", () => {
        it("crea el producto y calcula el estado a partir del stock (ignora el status del body)", async () => {
            const res = await api()
                .post("/api/products")
                .send({ name: "Caja", price: 10, stock: 0, status: PRODUCT_STATUS.AVAILABLE });

                expectSuccess(res, 201);
                expect(res.body.payload).to.include({ name: "Caja", price: 10, stock: 0, status: PRODUCT_STATUS.OUT_OF_STOCK });
                expect(await ProductModel.countDocuments()).to.equal(1);
        });

        it("usa stock 0 por defecto", async () => {
            const res = await api().post("/api/products").send({ name: "Caja", price: 10 });

            expectSuccess(res, 201);
            expect(res.body.payload).to.include({ stock: 0, status: PRODUCT_STATUS.OUT_OF_STOCK });
        });

        it("responde 400 VALIDATION_ERROR si el precio es negativo", async () => {
            const res = await api().post("/api/products").send({ name: "Mala", price: -5 });

            expectError(res, 400, "VALIDATION_ERROR");
            expect(res.body.details.map((d) => d.field)).to.include("price");
        });

        it("responde 400 VALIDATION_ERROR si falta datos obligatorios", async () => {
            const res = await api().post("/api/products").send({ price: 5 });

            expectError(res, 400, "VALIDATION_ERROR");
            expect(res.body.details.map((d) => d.field)).to.include("name");
        });
    });

    describe("PUT /api/products/:id", () => {
        it("actualiza el producto y recalcula el estado si cambia el stock", async () => {
            const product = await createProduct({ stock: 5 });

            const res = await api().put(`/api/products/${product._id}`).send({ stock: 0, price: 15 });

            expectSuccess(res, 200);
            expect(res.body.payload).to.include({ price: 15, stock: 0, status: PRODUCT_STATUS.OUT_OF_STOCK });
        });

        it("ignora el status enviado en el body", async () => {
            const product = await createProduct({ stock: 5 });

            const res = await api().put(`/api/products/${product._id}`).send({ status: PRODUCT_STATUS.OUT_OF_STOCK });

            expectSuccess(res, 200);
            expect(res.body.payload.status).to.equal(PRODUCT_STATUS.AVAILABLE);
        });

        it("responde 404 PRODUCT_NOT_FOUND si el producto no existe", async () => {
            expectError(await api().put(`/api/products/${NON_EXISTENT_ID}`).send({ price: 1 }), 404, "PRODUCT_NOT_FOUND");
        });

        it("responde 400 INVALID_ID si el id está mal formado", async () => {
            expectError(await api().put("/api/products/abc").send({ price: 1 }), 400, "INVALID_ID");
        });

        it("responde 400 VALIDATION_ERROR si el precio es negativo", async () => {
            const product = await createProduct();

            expectError(await api().put(`/api/products/${product._id}`).send({ price: -1 }), 400, "VALIDATION_ERROR");
        });
    });

    describe("DELETE /api/products/:id", () => {
        it("elimina el producto y lo devuelve", async () => {
            const product = await createProduct();

            const res = await api().delete(`/api/products/${product._id}`);

            expectSuccess(res, 200);
            expect(res.body.payload._id).to.equal(product._id);
            expect(await ProductModel.findById(product._id)).to.equal(null);
        });

        it("responde 404 PRODUCT_NOT_FOUND si ya no existe", async () => {
            const product = await createProduct();
            await api().delete(`/api/products/${product._id}`);

            expectError(await api().delete(`/api/products/${product._id}`), 404, "PRODUCT_NOT_FOUND");
        });

        it("responde 400 INVALID_ID si el id está mal formado", async () => {
            expectError(await api().delete("/api/products/abc"), 400, "INVALID_ID");
        });
    });
});