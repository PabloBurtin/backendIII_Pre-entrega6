import { MockService } from "../services/mock.service.js";

export class MockController {
    static getUsers(req, res) {
        res.status(200).json(MockService.getUsers(req.query.qty));
    }

    static getCouriers(req, res) {
        res.status(200).json(MockService.getCouriers(req.query.qty));
    }

    static getOrders(req, res) {
        res.status(200).json(MockService.getOrders(req.query.qty, req.query.status));
    }

    static getDeliveries(req, res) {
        res.status(200).json(MockService.getDeliveries(req.query.qty));
    }

    static async seedUsers(req, res) {
        res.status(201).json(await MockService.seedUsers(req.query.qty));
    }

    static async seed(req, res) {
        res.status(201).json(await MockService.seed(req.query.qty));
    }

    static async seedDelivery(req, res) {
        res.status(201).json(await MockService.seedDelivery(req.query.orderId));
    }
}