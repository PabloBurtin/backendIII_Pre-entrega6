import { OrderService } from "../services/order.service.js";
import { RESPONSE_STATUS } from "../constants/index.js";

export class OrderController {
    static async getAll(req, res) {
        const orders = await OrderService.getAll(req.query.status);
        return res.status(200).json({
            status: RESPONSE_STATUS.SUCCESS,
            message: "Pedidos obtenidos correctamente",
            payload: orders
        });
    }

    static async getById(req, res) {
        const order = await OrderService.getById(req.params.id);
        return res.status(200).json({
            status: RESPONSE_STATUS.SUCCESS,
            message: "Pedido encontrado correctamente",
            payload: order
        });
    }

    static async create(req, res) {
        const order = await OrderService.create(req.body);
        return res.status(201).json({
            status: RESPONSE_STATUS.SUCCESS,
            message: "Pedido creado correctamente",
            payload: order
        });
    }

    static async update(req, res) {
        const order = await OrderService.update(req.params.id, req.body);
        return res.status(200).json({
            status: RESPONSE_STATUS.SUCCESS,
            message: "Pedido actualizado correctamente",
            payload: order
        });
    }

    static async updateStatus(req, res) {
        const order = await OrderService.updateStatus(req.params.id, req.body.status);
        return res.status(200).json({
            status: RESPONSE_STATUS.SUCCESS,
            message: "El estado del pedido fue actualizado correctamente",
            payload: order
        });
    }

    static async delete(req, res) {
        const order = await OrderService.delete(req.params.id);
        return res.status(200).json({
            status: RESPONSE_STATUS.SUCCESS,
            message: "Pedido eliminado correctamente",
            payload: order
        });
    }
}