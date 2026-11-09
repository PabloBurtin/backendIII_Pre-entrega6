import { UserService } from "../services/user.service.js";
import { RESPONSE_STATUS } from "../constants/index.js";

export class UserController {
    static async getAll(req, res) {
        const users = await UserService.getAll();
        return res.status(200).json({
            status: RESPONSE_STATUS.SUCCESS,
            message: "Usuarios obtenidos correctamente",
            payload: users
        });
    }

    static async getById(req, res) {
        const user = await UserService.getById(req.params.id);
        return res.status(200).json({
            status: RESPONSE_STATUS.SUCCESS,
            message: "Usuario encontrado correctamente",
            payload: user
        });
    }

    static async create(req, res) {
        const user = await UserService.create(req.body);
        return res.status(201).json({
            status: RESPONSE_STATUS.SUCCESS,
            message: "Usuario creado correctamente",
            payload: user
        })
    }

    static async update(req, res) {
        const user = await UserService.update(req.params.id, req.body);
        return res.status(200).json({
            status: RESPONSE_STATUS.SUCCESS,
            message: "Usuario actualizado correctamente",
            payload: user
        });
    }

    static async delete(req,res) {
        const user = await UserService.delete(req.params.id);
        return res.status(200).json({
            status: RESPONSE_STATUS.SUCCESS,
            message: "Usuario eliminado correctamente",
            payload: user
        });
    }
}