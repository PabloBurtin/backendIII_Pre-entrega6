import { Router } from "express";

const router = Router();

/**
 * @openapi
 * /api/health:
 *   get:
 *      tags: [Health]
 *      summary: "Estado del servidor"
 *      responses:
 *        200:
 *          description: "El servidor está activo"
 *          content:
 *            application/json:
 *              schema:
 *                $ref: "#/components/schemas/HealthResponse"
 */
router.get("/", (req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

export default router;