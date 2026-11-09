import { OrderModel } from "../models/order.model.js";

const PROJECTION = "-__v";

export class OrderRepository {
    static async getAll(filter = {}) {
        return OrderModel.find(filter).select(PROJECTION).sort({ createdAt: -1 }).lean();
    }

    static async getById(id) {
        return OrderModel.findById(id).select(PROJECTION).lean();
    }

    static async create(data) {
        const order = await OrderModel.create(data);
        const { __v, ...safeOrder } = order.toObject();
        return safeOrder;
    }

    static async update(id, data) {
        return OrderModel.findByIdAndUpdate(id, data, { returnDocument: "after", runValidators: true })
            .select(PROJECTION)
            .lean();
    }

    static async delete(id) {
        return OrderModel.findByIdAndDelete(id).select(PROJECTION).lean();
    }
}