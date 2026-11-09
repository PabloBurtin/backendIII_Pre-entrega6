import express from "express";
import cors from "cors";
import productRoutes from "./routes/product.routes.js"
import userRoutes from "./routes/user.routes.js"
import mockRoutes from "./routes/mock.routes.js"
import logRoutes from "./routes/log.routes.js";
import orderRoutes from "./routes/order.routes.js";
import deliveryRoutes from "./routes/delivery.routes.js";
import healthRoutes from "./routes/health.routes.js"
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger.config.js"
import { notFoundHandler, errorHandler } from "./middlewares/error.middleware.js";
import { httpLogger } from "./middlewares/http-logger.middleware.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(httpLogger);
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: "ShipNow API - Documentación" }));
app.get("/api/docs.json", (req, res) => res.json(swaggerSpec));

app.use("/api/health", healthRoutes);
app.use("/api/products", productRoutes);
app.use("/api/users", userRoutes);
app.use("/api/mocks", mockRoutes);
app.use("/api/logs", logRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/deliveries", deliveryRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;