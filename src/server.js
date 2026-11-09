import mongoose from "mongoose";
import app from "./app.js";
import config from "./config/env.config.js";
import logger from "./utils/logger.util.js";
import { LOG_FILE_PARAMETERS } from "./constants/index.js";

const crash = (message, error) => {
    logger.fatal(message, { error: error?.message, stack: error?.stack });
    process.exitCode = 1;
    setTimeout(() => process.exit(1), LOG_FILE_PARAMETERS.FLUSH_TIMEOUT_MS);
};

process.on("uncaughtException", (error) => crash("Excepción no capturada", error));
process.on("unhandledRejection", (reason) =>
    crash("Promesa rechazada sin manejar", reason instanceof Error ? reason : new Error(String(reason)))
);

async function startServer() {
    try {
        await mongoose.connect(config.mongoUri);
        logger.info("Conexión a MongoDB establecida");

        app.listen(config.port, (error) => {
            if (error) return crash("No se pudo abrir el puerto del servidor", error);
            logger.info(`Servidor ShipNow escuchando en el puerto ${config.port}`, { environment: config.nodeEnv });
        });
    } catch (error) {
        crash("No se pudo iniciar el servidor: falló la conexión a MongoDB", error);
    }
}

startServer();