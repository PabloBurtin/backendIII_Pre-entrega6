import mongoose from "mongoose";
import { PRODUCT_STATUS } from "../constants/index.js";

const productSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true},
        description: { type: String, default: "" },
        price: { type: Number, required: true, min: 0 },
        stock: { type: Number, required: true, min: 0, default: 0 },
        status: {
            type: String,
            enum: Object.values(PRODUCT_STATUS),
            default: PRODUCT_STATUS.AVAILABLE
        } 
    },
    { timestamps: true }
);

export const ProductModel = mongoose.model("Product", productSchema);