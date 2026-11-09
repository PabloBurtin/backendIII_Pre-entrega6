//Los test siempre corren en entorno "test": la app usa la configuración de testing
// y los test se conectan a la base definida en MONGODB_URI_TEST (nunca a la de desarrollo)
process.env.NODE_ENV = "test";

module.exports = {
    file: ["tests/setup.js"],
    spec: ["tests/**/*.test.js"],
    timeout: 10000,
    exit: true
};