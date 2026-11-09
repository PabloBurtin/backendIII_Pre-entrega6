import { ProductModel } from "../models/product.model.js";

const PROJECTION = "-__v"

export class ProductRepository {
    static async getAll() {
        return ProductModel.find().select(PROJECTION).lean();
    }

    static async getById(id) {
        return ProductModel.findById(id).select(PROJECTION).lean();
    }

    static async create(data) {
        const product = await ProductModel.create(data);
        const { __v, ...safeProduct } = product.toObject();
        return safeProduct;
    }

    static async update(id, data) {
        return ProductModel.findByIdAndUpdate(id, data, { returnDocument: "after", runValidators: true })
            .select(PROJECTION)
            .lean();
    }

    static async delete(id) {
        return ProductModel.findByIdAndDelete(id).select(PROJECTION).lean();
    }
}