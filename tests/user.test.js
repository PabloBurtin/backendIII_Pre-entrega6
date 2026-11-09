import { expect } from "chai";
import { api, createUser, uniqueEmail, NON_EXISTENT_ID, PASSWORD } from "./helpers/factories.js";
import { expectError, expectSuccess, expectObjectId } from "./helpers/assertions.js";
import { clearDatabase } from "./helpers/db.js";
import { UserModel } from "../src/models/user.model.js";
import { USER_ROLES } from "../src/constants/index.js";

describe("Users", () => {
    beforeEach(clearDatabase);
    after(clearDatabase);

    describe("GET /api/users", () => {
        it("devuelve una lista vacía si no hay usuarios", async () => {
            const res = await api().get("/api/users");

            expectSuccess(res, 200);
            expect(res.body.payload).to.be.an("array").that.is.empty;
        });

        it("lista los usuarios con la estructura esperada y sin exponer la contraseña", async () => {
            await createUser({ name: "Ana" });
            await createUser({ name: "Beto" });

            const res = await api().get("/api/users");

            expectSuccess(res, 200);
            expect(res.body.payload).to.have.lengthOf(2);
            res.body.payload.forEach((user) => {
                expectObjectId(user._id);
                expect(user.name).to.be.a("string");
                expect(user.email).to.match(/@/);
                expect(user.role).to.equal(USER_ROLES.USER);
                expect(user).to.have.property("createdAt");
                expect(user).to.not.have.any.keys("password", "__v");
            });
        });
    });

    describe("GET /api/users/:id", () => {
        it("devuelve el usuario solicitado", async () => {
            const user = await createUser({ name: "Ana" });
            
            const res = await api().get(`/api/users/${user._id}`);

            expectSuccess(res, 200);
            expect(res.body.payload).to.include({ _id: user._id, name: "Ana", email: user.email, role: USER_ROLES.USER });
            expect(res.body.payload).to.not.have.property("password");
        });

        it("responde 404 USER_NOT_FOUND si el usuario no existe", async () => {
            const res = await api().get(`/api/users/${NON_EXISTENT_ID}`);

            expectError(res, 404, "USER_NOT_FOUND");
            expect(res.body.details).to.deep.equal({ id: NON_EXISTENT_ID });
        });

        it("responde 400 INVALID_ID si el id está mal formado", async () => {
            const res = await api().get("/api/users/abc");

            expectError(res, 400, "INVALID_ID");
            expect(res.body.details).to.include({ value: "abc" });
        });
    });

    describe("POST /api/users", () => {
        it("crea un usuario con rol USER aunque se pida otro rol, y guarda la contraseña hasheada", async () => {
            const res = await api()
                .post("/api/users")
                .send({ name: "Ana", email: "ANA@Mail.com", password: PASSWORD, role: USER_ROLES.ADMIN });

            expectSuccess(res, 201);
            const user = res.body.payload;
            expectObjectId(user._id);
            expect(user).to.include({ name: "Ana", email: "ana@mail.com", role: USER_ROLES.USER });
            expect(user).to.not.have.property("password");

            const saved = await UserModel.findById(user._id).select("+password").lean();
            expect(saved.password).to.not.equal(PASSWORD);
            expect(saved.password).to.match(/^\$2[aby]\$/);
        });

        it("responde 400 EMAIL_REQUIRED si falta el email", async () => {
            const res = await api().post("/api/users").send({ name: "Ana", password: PASSWORD });

            expectError(res, 400, "EMAIL_REQUIRED");
        });

        it("responde 400 INVALID_PASSWORD si la contraseña es demasiado corta", async () => {
            const res = await api().post("/api/users").send({ name: "Ana", email: uniqueEmail(), password: "123" });

            expectError(res, 400, "INVALID_PASSWORD");
            expect(res.body.details).to.deep.equal({ minLength: 6 });
        });

        it("responde 400 VALIDATION_ERROR si falta el nombre", async () => {
            const res = await api().post("/api/users").send({ email: uniqueEmail(), password: PASSWORD });

            expectError(res, 400, "VALIDATION_ERROR");
            expect(res.body.details).to.be.an("array");
            expect(res.body.details.map((d) => d.field)).to.include("name");
        });

        it("responde 409 EMAIL_ALREADY_EXISTS si el email ya está registrado", async () => {
            const existing = await createUser();

            const res = await api().post("/api/users").send({ name: "Otro", email: existing.email, password: PASSWORD });

            expectError(res, 409, "EMAIL_ALREADY_EXISTS");
            expect(res.body.details).to.deep.equal({ email: existing.email });
        });

        it("responde 400 INVALID_JSON si el cuerpo no es un JSON válido", async () => {
            const res = await api().post("/api/users").set("Content-Type", "application/json").send("{malo");

            expectError(res, 400, "INVALID_JSON");
        });
    });

    describe("PUT /api/users/:id", () => {
        it("actualiza los campos permitidos e ignora el rol", async () => {
            const user = await createUser({ name: "Ana" });

            const res = await api().put(`/api/users/${user._id}`).send({ name: "Ana María", role: USER_ROLES.ADMIN });

            expectSuccess(res, 200);
            expect(res.body.payload).to.include({ _id: user._id, name: "Ana María", role: USER_ROLES.USER });
            expect(res.body.payload.updatedAt).to.not.equal(user.updatedAt);
        });

        it("hashea la nueva contraseña", async () => {
            const user = await createUser();

            const res = await api().put(`/api/users/${user._id}`).send({ password: "otraClave456" });

            expectSuccess(res, 200);
            const saved = await UserModel.findById(user._id).select("+password").lean();
            expect(saved.password).to.match(/^\$2[aby]\$/);
        });

        it("responde 404 USER_NOT_FOUND si el usuario no existe", async () => {
            const res = await api().put(`/api/users/${NON_EXISTENT_ID}`).send({ name: "x" });

            expectError(res, 404, "USER_NOT_FOUND");
        });

        it("responde 400 INVALID_ID si el id está mal formado", async () => {
            const res = await api().put(`/api/users/abc`).send({ name: "X" });

            expectError(res, 400, "INVALID_ID");
        });

        it("responde 400 INVALID_PASSWORD si la nueva contraseña es corta", async () => {
            const user = await createUser();

            const res = await api().put(`/api/users/${user._id}`).send({ password: "1" });

            expectError(res, 400, "INVALID_PASSWORD");
        });

        it("responde 409 EMAIL_ALREADY_EXISTS si el email pertenece a otro usuario", async () => {
            const first = await createUser();
            const second = await createUser();

            const res = await api().put(`/api/users/${second._id}`).send({ email: first.email });

            expectError(res, 409, "EMAIL_ALREADY_EXISTS");
        });
    });

    describe("DELETE /api/users/:id", () => {
        it("elimina el usuario y lo devuelve", async () => {
            const user = await createUser();

            const res = await api().delete(`/api/users/${user._id}`);

            expectSuccess(res, 200);
            expect(res.body.payload._id).to.equal(user._id);
            expect(await UserModel.findById(user._id)).to.equal(null);
        });

        it("responde 404 USER_NOT_FOUND si el usuario ya no existe", async () => {
            const user = await createUser();
            await api().delete(`/api/users/${user._id}`);

            const res = await api().delete(`/api/users/${user._id}`);

            expectError(res, 404, "USER_NOT_FOUND");
        });

        it("responde 400 INVALID_ID si el id está mal formado", async () => {
            const res = await api().delete("/api/users/abc");

            expectError(res, 400, "INVALID_ID");
        });
    });
});