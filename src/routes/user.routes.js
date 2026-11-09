import { Router } from "express";
import { UserController } from "../controllers/user.controller.js";

const router = Router();

/**
 * @openapi
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: "Listar usuarios"
 *     responses:
 *       200:
 *         description: "Lista de usuarios"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/UserListResponse"
 *       500:
 *         $ref: "#/components/responses/InternalError"
 */
router.get("/", UserController.getAll);

/**
 * @openapi
 * /api/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: "Obtener un usuario por id"
 *     parameters:
 *       - $ref: "#/components/parameters/IdPath"
 *     responses:
 *       200:
 *         description: "Usuario encontrado"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/UserResponse"
 *       400:
 *         $ref: "#/components/responses/InvalidId"
 *       404:
 *         $ref: "#/components/responses/UserNotFound"
 *       500:
 *         $ref: "#/components/responses/InternalError"
 */
router.get("/:id", UserController.getById);

/**
 * @openapi
 * /api/users:
 *   post:
 *     tags: [Users]
 *     summary: "Crear un usuario"
 *     description: "Crea un usuario con rol USER y contraseña hasheada. La contraseña nunca se devuelve."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/UserInput"
 *     responses:
 *       201:
 *         description: "Usuario creado"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/UserResponse"
 *       400:
 *         $ref: "#/components/responses/UserCreateInvalid"
 *       409:
 *         $ref: "#/components/responses/EmailAlreadyExists"
 *       500:
 *         $ref: "#/components/responses/InternalError"
 */
router.post("/", UserController.create);

/**
 * @openapi
 * /api/users/{id}:
 *   put:
 *     tags: [Users]
 *     summary: "Actualizar un usuario"
 *     parameters:
 *       - $ref: "#/components/parameters/IdPath"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/UserUpdate"
 *     responses:
 *       200:
 *         description: "Usuario actualizado"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/UserResponse"
 *       400:
 *         $ref: "#/components/responses/UserUpdateInvalid"
 *       404:
 *         $ref: "#/components/responses/UserNotFound"
 *       409:
 *         $ref: "#/components/responses/EmailAlreadyExists"
 *       500:
 *         $ref: "#/components/responses/InternalError"
 */
router.put("/:id", UserController.update);

/**
 * @openapi
 * /api/users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: "Eliminar un usuario"
 *     description: "Devuelve el usuario eliminado."
 *     parameters:
 *       - $ref: "#/components/parameters/IdPath"
 *     responses:
 *       200:
 *         description: "Usuario eliminado"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/UserResponse"
 *       400:
 *         $ref: "#/components/responses/InvalidId"
 *       404:
 *         $ref: "#/components/responses/UserNotFound"
 *       500:
 *         $ref: "#/components/responses/InternalError"
 */
router.delete("/:id", UserController.delete);

export default router
