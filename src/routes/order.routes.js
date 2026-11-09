import { Router } from "express";
import { OrderController } from "../controllers/order.controller.js";

const router = Router();

/**
 * @openapi
 * /api/orders:
 *   get:
 *     tags: [Orders]
 *     summary: "Listar pedidos"
 *     description: "Del más reciente al más antiguo. Se puede filtrar por estado."
 *     parameters:
 *       - $ref: "#/components/parameters/OrderStatusQuery"
 *     responses:
 *       200:
 *         description: "Lista de pedidos"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/OrderListResponse"
 *       400:
 *         $ref: "#/components/responses/OrderStatusFilterInvalid"
 *       500:
 *         $ref: "#/components/responses/InternalError"
 */
router.get("/", OrderController.getAll);

/**
 * @openapi
 * /api/orders/{id}:
 *   get:
 *     tags: [Orders]
 *     summary: "Obtener un pedido por id"
 *     parameters:
 *       - $ref: "#/components/parameters/IdPath"
 *     responses:
 *       200:
 *         description: "Pedido encontrado"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/OrderResponse"
 *       400:
 *         $ref: "#/components/responses/InvalidId"
 *       404:
 *         $ref: "#/components/responses/OrderNotFound"
 *       500:
 *         $ref: "#/components/responses/InternalError"
 */
router.get("/:id", OrderController.getById);

/**
 * @openapi
 * /api/orders:
 *   post:
 *     tags: [Orders]
 *     summary: "Crear un pedido"
 *     description: "El cliente debe existir. El total se calcula con los items y el pedido nace en estado CREATED."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/OrderInput"
 *     responses:
 *       201:
 *         description: "Pedido creado"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/OrderResponse"
 *       400:
 *         $ref: "#/components/responses/OrderCreateInvalid"
 *       404:
 *         $ref: "#/components/responses/UserNotFound"
 *       500:
 *         $ref: "#/components/responses/InternalError"
 */
router.post("/", OrderController.create);

/**
 * @openapi
 * /api/orders/{id}:
 *   put:
 *     tags: [Orders]
 *     summary: "Actualizar un pedido"
 *     description: "Modifica items, dirección o prioridad. No modifica el estado ni el cliente."
 *     parameters:
 *       - $ref: "#/components/parameters/IdPath"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/OrderUpdate"
 *     responses:
 *       200:
 *         description: "Pedido actualizado"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/OrderResponse"
 *       400:
 *         $ref: "#/components/responses/OrderUpdateInvalid"
 *       404:
 *         $ref: "#/components/responses/OrderNotFound"
 *       500:
 *         $ref: "#/components/responses/InternalError"
 */
router.put("/:id", OrderController.update);

/**
 * @openapi
 * /api/orders/{id}/status:
 *   patch:
 *     tags: [Orders]
 *     summary: "Cambiar el estado de un pedido"
 *     description: "Solo se permiten ciertas transiciones (por ejemplo, CREATED a ASSIGNED o CANCELLED; DELIVERED y CANCELLED son finales). Al cancelar un pedido se elimina su entrega."
 *     parameters:
 *       - $ref: "#/components/parameters/IdPath"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/OrderStatusUpdate"
 *     responses:
 *       200:
 *         description: "Estado actualizado"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/OrderResponse"
 *       400:
 *         $ref: "#/components/responses/OrderStatusUpdateInvalid"
 *       404:
 *         $ref: "#/components/responses/OrderNotFound"
 *       500:
 *         $ref: "#/components/responses/InternalError"
 */
router.patch("/:id/status", OrderController.updateStatus);

/**
 * @openapi
 * /api/orders/{id}:
 *   delete:
 *     tags: [Orders]
 *     summary: "Eliminar un pedido"
 *     description: "Devuelve el pedido eliminado. Si tenía una entrega, también se elimina."
 *     parameters:
 *       - $ref: "#/components/parameters/IdPath"
 *     responses:
 *       200:
 *         description: "Pedido eliminado"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/OrderResponse"
 *       400:
 *         $ref: "#/components/responses/InvalidId"
 *       404:
 *         $ref: "#/components/responses/OrderNotFound"
 *       500:
 *         $ref: "#/components/responses/InternalError"
 */
router.delete("/:id", OrderController.delete);

export default router;