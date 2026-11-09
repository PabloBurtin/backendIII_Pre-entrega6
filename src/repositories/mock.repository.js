import { UserModel } from "../models/user.model.js";
import { OrderModel } from "../models/order.model.js";
import { DeliveryModel } from "../models/delivery.model.js";
import { USER_ROLES } from "../constants/index.js";

export class MockRepository {
    static async insertUsers(users) {
        const inserted = await UserModel.insertMany(users);
        return inserted.length;
    }

    static async insertOrders(orders) {
        const inserted = await OrderModel.insertMany(orders);
        return inserted.length;
    }

    static async insertDeliveries(deliveries) {
        const inserted = await DeliveryModel.insertMany(deliveries);
        return inserted.length;
    }

    static async deleteUsers(ids) {
        await UserModel.deleteMany({ _id: { $in: ids } });
    }

    static async deleteOrders(ids) {
        await OrderModel.deleteMany({ _id: { $in: ids } });
    }

    static async deleteDeliveries(ids) {
        await DeliveryModel.deleteMany({ _id: { $in: ids } });
    }

    static async findOrderById(id) {
        return OrderModel.findById(id).select("_id status delivery").lean();
    }

    static async findCourierIds() {
        const couriers = await UserModel.find({ role: USER_ROLES.COURIER }).select("_id").lean();
        return couriers.map((courier) => courier._id);
    }

    static async linkDelivery(orderId, deliveryId) {
        await OrderModel.updateOne({ _id: orderId }, { delivery: deliveryId });
    }
}