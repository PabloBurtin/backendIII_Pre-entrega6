import { Router } from "express";
import { DeliveryController } from "../controllers/delivery.controller.js";

const router = Router();

/**
 * @openapi
 * /api/deliveries:
 *   get:
 *     tags: [Deliveries]
 *     summary: "Listar entregas"
 *     description: "Del más reciente al más antiguo. Se puede filtrar por estado."
 *     parameters:
 *       - $ref: "#/components/parameters/DeliveryStatusQuery"
 *     responses:
 *       200:
 *         description: "Lista de entregas"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/DeliveryListResponse"
 *       400:
 *         $ref: "#/components/responses/DeliveryStatusFilterInvalid"
 *       500:
 *         $ref: "#/components/responses/InternalError"
 */
router.get("/", DeliveryController.getAll);

/**
 * @openapi
 * /api/deliveries/{id}:
 *   get:
 *     tags: [Deliveries]
 *     summary: "Obtener una entrega por id"
 *     parameters:
 *       - $ref: "#/components/parameters/IdPath"
 *     responses:
 *       200:
 *         description: "Entrega encontrada"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/DeliveryResponse"
 *       400:
 *         $ref: "#/components/responses/InvalidId"
 *       404:
 *         $ref: "#/components/responses/DeliveryNotFound"
 *       500:
 *         $ref: "#/components/responses/InternalError"
 */
router.get("/:id", DeliveryController.getById);

/**
 * @openapi
 * /api/deliveries:
 *   post:
 *     tags: [Deliveries]
 *     summary: "Crear una entrega para un pedido"
 *     description: "El pedido debe existir, estar en estado CREATED y no tener entrega. Con repartidor la entrega nace ASSIGNED y el pedido pasa a ASSIGNED; sin repartidor nace PENDING."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/DeliveryInput"
 *     responses:
 *       201:
 *         description: "Entrega creada"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/DeliveryResponse"
 *       400:
 *         $ref: "#/components/responses/DeliveryCreateInvalid"
 *       404:
 *         $ref: "#/components/responses/DeliveryCreateNotFound"
 *       409:
 *         $ref: "#/components/responses/DeliveryAlreadyExists"
 *       500:
 *         $ref: "#/components/responses/InternalError"
 */
router.post("/", DeliveryController.create);

/**
 * @openapi
 * /api/deliveries/{id}:
 *   put:
 *     tags: [Deliveries]
 *     summary: "Asignar o reasignar el repartidor"
 *     description: "Si la entrega estaba PENDING pasa a ASSIGNED. No se puede reasignar una entrega ya entregada."
 *     parameters:
 *       - $ref: "#/components/parameters/IdPath"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/DeliveryCourierUpdate"
 *     responses:
 *       200:
 *         description: "Entrega actualizada"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/DeliveryResponse"
 *       400:
 *         $ref: "#/components/responses/DeliveryUpdateInvalid"
 *       404:
 *         $ref: "#/components/responses/DeliveryUpdateNotFound"
 *       500:
 *         $ref: "#/components/responses/InternalError"
 */
router.put("/:id", DeliveryController.update);

/**
 * @openapi
 * /api/deliveries/{id}/status:
 *   patch:
 *     tags: [Deliveries]
 *     summary: "Cambiar el estado de una entrega"
 *     description: "Transiciones permitidas: PENDING a ASSIGNED (requiere repartidor), ASSIGNED a IN_TRANSIT, IN_TRANSIT a DELIVERED. El estado del pedido sigue al de su entrega."
 *     parameters:
 *       - $ref: "#/components/parameters/IdPath"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/DeliveryStatusUpdate"
 *     responses:
 *       200:
 *         description: "Estado actualizado"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/DeliveryResponse"
 *       400:
 *         $ref: "#/components/responses/DeliveryStatusUpdateInvalid"
 *       404:
 *         $ref: "#/components/responses/DeliveryNotFound"
 *       500:
 *         $ref: "#/components/responses/InternalError"
 */
router.patch("/:id/status", DeliveryController.updateStatus);

/**
 * @openapi
 * /api/deliveries/{id}:
 *   delete:
 *     tags: [Deliveries]
 *     summary: "Eliminar una entrega"
 *     description: "Devuelve la entrega eliminada. El pedido queda sin entrega y vuelve a CREATED (salvo que ya esté entregado)."
 *     parameters:
 *       - $ref: "#/components/parameters/IdPath"
 *     responses:
 *       200:
 *         description: "Entrega eliminada"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/DeliveryResponse"
 *       400:
 *         $ref: "#/components/responses/InvalidId"
 *       404:
 *         $ref: "#/components/responses/DeliveryNotFound"
 *       500:
 *         $ref: "#/components/responses/InternalError"
 */
router.delete("/:id", DeliveryController.delete);

export default router;