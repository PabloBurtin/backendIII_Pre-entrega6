import mongoose from "mongoose";
import { ORDER_STATUS, ORDER_PRIORITY } from "../constants/index.js";

const orderItemSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true, min: 0 }
    },
    { _id: false }
);

const orderSchema = new mongoose.Schema(
    {
        customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true},
        items: {
            type: [orderItemSchema],
            validate: [(items) => items.length > 0, "El pedido debe tener al menos un item"]
        },
        deliveryAddress: { type: String, required: true, trim: true },
        total: { type: Number, required: true, min: 0 },
        status: {
            type: String,
            enum: Object.values(ORDER_STATUS),
            default: ORDER_STATUS.CREATED
        },
        priority: {
            type: String,
            enum: Object.values(ORDER_PRIORITY),
            default: ORDER_PRIORITY.NORMAL
        },
        delivery: { type: mongoose.Schema.Types.ObjectId, ref: "Delivery", default: null }
    },
    { timestamps: true }
);

export const OrderModel = mongoose.model("Order", orderSchema);