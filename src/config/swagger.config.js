import swaggerJsdoc from "swagger-jsdoc";
import config from "./env.config.js";
import { schemas, parameters, responses } from "./swagger.components.js";

const options = {
    definition: {
        openapi: "3.0.3",
        info: {
            title: "ShipNow API",
            version: "1.0.0",
            description: 
                "API de logística de ShipNow: gestión de usuarios, productos, pedidos y entregas, " +
                "con un módulo de datos simulados (mocks) para pruebas y una herramienta de validación del logger.\n\n" +
                "**Formato de respuesta exitosa:** `{ status: \"success\", message, payload }`.\n\n" +
                "**Formato de error (único para toda la API):** `{ status: \"error\", statusCode, code, message, details? }`. " +
                "Los códigos posibles están en el schema `ErrorResponse`."
        },
        servers: [{ url: `http://localhost:${config.port}`, description: "Servidor local" }],
        tags: [
            { name: "Users", description: "Gestión de usuarios" },
            { name: "Products", description: "Gestión de productos" },
            { name: "Orders", description: "Gestión de pedidos y de su estado" },
            { name: "Deliveries", description: "Gestión de entregas, asignación de repartidor y estado" },
            { name: "Mocks", description: "Datos simulados (no se guardan) y carga de datos de prueba en MongoDB" },
            { name: "Logger", description: "Herramienta de validación del logger. No es una funcionalidad de negocio"},
            { name: "Health", description: "Estado del servidor" }
        ],
        components: { schemas, parameters, responses }
    },
    apis: ["./src/routes/*.js"]
};

export default swaggerJsdoc(options);