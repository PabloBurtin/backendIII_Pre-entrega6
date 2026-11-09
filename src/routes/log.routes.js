import { Router } from "express";
import { LogController } from "../controllers/log.controller.js";

const router = Router();

/**
 * @openapi
 * /api/logs/loggerTest:
 *   get:
 *     tags: [Logger]
 *     summary: "Probar el logger (herramienta de validación)"
 *     description: "Emite un log de cada nivel (debug, http, info, warning, error y fatal) y responde cuáles quedaron registrados según el entorno. Es una herramienta interna para validar la configuración del logger, no una funcionalidad de negocio."
 *     responses:
 *       200:
 *         description: "Logs generados"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/LoggerTestResponse"
 *       500:
 *         $ref: "#/components/responses/InternalError"
 */
router.get("/loggerTest", LogController.test);

export default router;