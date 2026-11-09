import dotenv from "dotenv";
import { ENVIRONMENTS } from "../constants/index.js";


dotenv.config();

const REQUIRED_VARS = ["PORT", "MONGODB_URI", "NODE_ENV"];

const missing = REQUIRED_VARS.filter((name) => !process.env[name]);

if (missing.length > 0) {
    throw new Error(
        `Configuración inválida: faltan las variables de entorno ${missing.join(",")}. ` + 
        `Revisa tu archivo .env (usá .env.example como guía).`
    );
}

const port = Number(process.env.PORT);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(
        `Configuración inválida: PORT debe ser un entero entre 1 y 65535 (recibido: "${process.env.PORT}").`
    );
}

const allowedEnvironments = Object.values(ENVIRONMENTS);
if (!allowedEnvironments.includes(process.env.NODE_ENV)) {
    throw new Error(
        `Configuración inválida: NODE_ENV debe ser uno de ${allowedEnvironments.join(", ")} `+
        `(recibido: "${process.env.NODE_ENV}").`
    );
}

if (process.env.NODE_ENV === ENVIRONMENTS.TEST && !process.env.MONGODB_URI_TEST) {
    throw new Error("Configuración inválida: falla MONGODB_URI_TEST (base de datos de testing). Revisa tu archivo .env");
}

const config = Object.freeze({
    port,
    mongoUri: process.env.MONGODB_URI,
    mongoUriTest: process.env.MONGODB_URI_TEST,
    nodeEnv: process.env.NODE_ENV, 
    isDevelopment: process.env.NODE_ENV === ENVIRONMENTS.DEVELOPMENT,
    isProduction: process.env.NODE_ENV === ENVIRONMENTS.PRODUCTION
});

export default config;