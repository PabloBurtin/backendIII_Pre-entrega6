import { DeliveryModel } from "../models/delivery.model.js";

const PROJECTION = "-__v";

export class DeliveryRepository {
    static async getAll(filter = {}) {
        return DeliveryModel.find(filter).select(PROJECTION).sort({ createdAt: -1 }).lean();
    }

    static async getById(id) {
        return DeliveryModel.findById(id).select(PROJECTION).lean();
    }

    static async create(data) {
        const delivery = await DeliveryModel.create(data);
        const { __v, ...safeDelivery } = delivery.toObject();
        return safeDelivery;
    }

    static async update(id, data) {
        return DeliveryModel.findByIdAndUpdate(id, data, { returnDocument: "after", runValidators: true })
            .select(PROJECTION)
            .lean();
    }

    static async delete(id) {
        return DeliveryModel.findByIdAndDelete(id).select(PROJECTION).lean();
    }
}