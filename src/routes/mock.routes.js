import { Router } from "express";
import { MockController } from "../controllers/mock.controller.js";

const router = Router();

/**
 * @openapi
 * /api/mocks/users:
 *   get:
 *     tags: [Mocks]
 *     summary: "Generar usuarios simulados (no se guardan)"
 *     description: "Devuelve un arreglo con usuarios USER o COURIER aleatorios. No escribe en la base de datos."
 *     parameters:
 *       - $ref: "#/components/parameters/QtyQuery"
 *     responses:
 *       200:
 *         description: "Usuarios simulados"
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/MockUser"
 *       400:
 *         $ref: "#/components/responses/MockQuantityInvalid"
 *       500:
 *         $ref: "#/components/responses/InternalError"
 */
router.get("/users", MockController.getUsers);

/**
 * @openapi
 * /api/mocks/couriers:
 *   get:
 *     tags: [Mocks]
 *     summary: "Generar repartidores simulados (no se guardan)"
 *     description: "Devuelve un arreglo de usuarios con rol COURIER. No escribe en la base de datos."
 *     parameters:
 *       - $ref: "#/components/parameters/QtyQuery"
 *     responses:
 *       200:
 *         description: "Repartidores simulados"
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/MockUser"
 *       400:
 *         $ref: "#/components/responses/MockQuantityInvalid"
 *       500:
 *         $ref: "#/components/responses/InternalError"
 */
router.get("/couriers", MockController.getCouriers);

/**
 * @openapi
 * /api/mocks/orders:
 *   get:
 *     tags: [Mocks]
 *     summary: "Generar pedidos simulados (no se guardan)"
 *     description: "Cada pedido apunta a un cliente simulado y, salvo los CANCELLED, a una entrega simulada. No escribe en la base de datos."
 *     parameters:
 *       - $ref: "#/components/parameters/QtyQuery"
 *       - $ref: "#/components/parameters/MockOrderStatusQuery"
 *     responses:
 *       200:
 *         description: "Pedidos simulados"
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/MockOrder"
 *       400:
 *         $ref: "#/components/responses/MockOrdersInvalid"
 *       500:
 *         $ref: "#/components/responses/InternalError"
 */
router.get("/orders", MockController.getOrders);

/**
 * @openapi
 * /api/mocks/deliveries:
 *   get:
 *     tags: [Mocks]
 *     summary: "Generar entregas simuladas (no se guardan)"
 *     description: "El estado de cada entrega es coherente con el del pedido. No escribe en la base de datos."
 *     parameters:
 *       - $ref: "#/components/parameters/QtyQuery"
 *     responses:
 *       200:
 *         description: "Entregas simuladas"
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/MockDelivery"
 *       400:
 *         $ref: "#/components/responses/MockQuantityInvalid"
 *       500:
 *         $ref: "#/components/responses/InternalError"
 */
router.get("/deliveries", MockController.getDeliveries);

/**
 * @openapi
 * /api/mocks/seed:
 *   post:
 *     tags: [Mocks]
 *     summary: "Insertar un conjunto completo de datos de prueba"
 *     description: "Inserta en MongoDB clientes, repartidores, pedidos y entregas relacionados. No espera body: la cantidad se indica con el parámetro qty. Si la inserción falla a mitad de camino, se intenta revertir lo ya insertado. Cada ejecución agrega datos nuevos."
 *     parameters:
 *       - $ref: "#/components/parameters/QtyQuery"
 *     responses:
 *       201:
 *         description: "Datos insertados"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SeedResult"
 *       400:
 *         $ref: "#/components/responses/MockQuantityInvalid"
 *       500:
 *         $ref: "#/components/responses/MockSeedFailed"
 */
router.post("/seed", MockController.seed);

/**
 * @openapi
 * /api/mocks/seed/users:
 *   post:
 *     tags: [Mocks]
 *     summary: "Insertar usuarios de prueba"
 *     description: "Inserta usuarios USER o COURIER aleatorios con la contraseña de prueba hasheada. No espera body: la cantidad se indica con el parámetro qty."
 *     parameters:
 *       - $ref: "#/components/parameters/QtyQuery"
 *     responses:
 *       201:
 *         description: "Usuarios insertados"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SeedUsersResult"
 *       400:
 *         $ref: "#/components/responses/MockQuantityInvalid"
 *       500:
 *         $ref: "#/components/responses/MockSeedFailed"
 */
router.post("/seed/users", MockController.seedUsers);

/**
 * @openapi
 * /api/mocks/seed/deliveries:
 *   post:
 *     tags: [Mocks]
 *     summary: "Crear una entrega de prueba para un pedido existente"
 *     description: "Genera una entrega para el pedido indicado con un repartidor existente, y la vincula al pedido. No espera body: el pedido se indica con el parámetro orderId."
 *     parameters:
 *       - $ref: "#/components/parameters/OrderIdQuery"
 *     responses:
 *       201:
 *         description: "Entrega insertada"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SeedDeliveryResult"
 *       400:
 *         $ref: "#/components/responses/MockDeliveryInvalid"
 *       404:
 *         $ref: "#/components/responses/OrderNotFound"
 *       409:
 *         $ref: "#/components/responses/MockDeliveryConflict"
 *       500:
 *         $ref: "#/components/responses/MockSeedFailed"
 */
router.post("/seed/deliveries", MockController.seedDelivery);

export default router;