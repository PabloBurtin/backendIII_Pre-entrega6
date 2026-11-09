import { expect } from "chai";
import { ERROR_DICTIONARY } from "../../src/errors/error.dictionary.js";

export const expectError = (res, statusCode, code) => {
    expect(res.status).to.equal(statusCode);
    expect(res.headers["content-type"]).to.match(/application\/json/);
    expect(res.body).to.include({ status: "error", statusCode, code });
    expect(res.body.message, "el mensaje debe venir del diccionario de errores").to.equal(ERROR_DICTIONARY[code].message);
    expect(ERROR_DICTIONARY[code].statusCode, "el status debe coincidir con el diccionario").to.equal(statusCode);
};

export const expectSuccess = (res, statusCode = 200) => {
    expect(res.status).to.equal(statusCode);
    expect(res.headers["content-type"]).to.match(/application\/json/);
    expect(res.body).to.have.property("status", "success");
    expect(res.body.message).to.be.a("string").that.is.not.empty;
    expect(res.body).to.have.property("payload");
}

export const expectObjectId = (value) => expect(value).to.match(/^[a-f\d]{24}$/);