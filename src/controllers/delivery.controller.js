import { DeliveryService } from "../services/delivery.service.js";
import { RESPONSE_STATUS } from "../constants/index.js";

export class DeliveryController {
    static async getAll(req, res) {
        const deliveries = await DeliveryService.getAll(req.query.status);
        return res.status(200).json({
            status: RESPONSE_STATUS.SUCCESS,
            message: "Entregas obtenidas correctamente",
            payload: deliveries
        });
    }

    static async getById(req, res) {
        const delivery = await DeliveryService.getById(req.params.id);
        return res.status(200).json({
            status: RESPONSE_STATUS.SUCCESS,
            message: "Entrega encontrada correctamente",
            payload: delivery
        });
    }

    static async create(req, res) {
        const delivery = await DeliveryService.create(req.body);
        return res.status(201).json({
            status: RESPONSE_STATUS.SUCCESS,
            message: "Entrega creada correctamente",
            payload: delivery
        });
    }

    static async update(req, res) {
        const delivery = await DeliveryService.update(req.params.id, req.body);
        return res.status(200).json({
            status: RESPONSE_STATUS.SUCCESS,
            message: "Entrega actualizada correctamente",
            payload: delivery
        });
    }

    static async updateStatus(req, res) {
        const delivery = await DeliveryService.updateStatus(req.params.id, req.body.status);
        return res.status(200).json({
            status: RESPONSE_STATUS.SUCCESS,
            message: "Estado de entrega actualizado correctamente",
            payload: delivery
        });
    }

    static async delete(req, res) {
        const delivery = await DeliveryService.delete(req.params.id);
        return res.status(200).json({
            status: RESPONSE_STATUS.SUCCESS,
            message: "Entrega eliminada correctamente",
            payload: delivery
        });
    }
}