import { Router } from "express";
import { ProductController } from "../controllers/product.controller.js";

const router = Router();

/**
 * @openapi
 * /api/products:
 *   get:
 *     tags: [Products]
 *     summary: "Listar productos con stock"
 *     description: "Devuelve solo los productos con stock mayor a 0."
 *     responses:
 *       200:
 *         description: "Lista de productos con stock"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ProductListResponse"
 *       500:
 *         $ref: "#/components/responses/InternalError"
 */
router.get("/", ProductController.getAll);

/**
 * @openapi
 * /api/products/{id}:
 *   get:
 *     tags: [Products]
 *     summary: "Obtener un producto por id"
 *     parameters:
 *       - $ref: "#/components/parameters/IdPath"
 *     responses:
 *       200:
 *         description: "Producto encontrado"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ProductResponse"
 *       400:
 *         $ref: "#/components/responses/InvalidId"
 *       404:
 *         $ref: "#/components/responses/ProductNotFound"
 *       500:
 *         $ref: "#/components/responses/InternalError"
 */
router.get("/:id", ProductController.getById);

/**
 * @openapi
 * /api/products:
 *   post:
 *     tags: [Products]
 *     summary: "Crear un producto"
 *     description: "El estado (AVAILABLE u OUT_OF_STOCK) lo calcula el sistema según el stock."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/ProductInput"
 *     responses:
 *       201:
 *         description: "Producto creado"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ProductResponse"
 *       400:
 *         $ref: "#/components/responses/ProductCreateInvalid"
 *       500:
 *         $ref: "#/components/responses/InternalError"
 */
router.post("/", ProductController.create);

/**
 * @openapi
 * /api/products/{id}:
 *   put:
 *     tags: [Products]
 *     summary: "Actualizar un producto"
 *     parameters:
 *       - $ref: "#/components/parameters/IdPath"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/ProductUpdate"
 *     responses:
 *       200:
 *         description: "Producto actualizado"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ProductResponse"
 *       400:
 *         $ref: "#/components/responses/ProductUpdateInvalid"
 *       404:
 *         $ref: "#/components/responses/ProductNotFound"
 *       500:
 *         $ref: "#/components/responses/InternalError"
 */
router.put("/:id", ProductController.update);

/**
 * @openapi
 * /api/products/{id}:
 *   delete:
 *     tags: [Products]
 *     summary: "Eliminar un producto"
 *     description: "Devuelve el producto eliminado."
 *     parameters:
 *       - $ref: "#/components/parameters/IdPath"
 *     responses:
 *       200:
 *         description: "Producto eliminado"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ProductResponse"
 *       400:
 *         $ref: "#/components/responses/InvalidId"
 *       404:
 *         $ref: "#/components/responses/ProductNotFound"
 *       500:
 *         $ref: "#/components/responses/InternalError"
 */
router.delete("/:id", ProductController.delete);

export default router