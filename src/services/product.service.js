import { ProductRepository } from "../repositories/product.repository.js";
import { PRODUCT_STATUS } from "../constants/index.js";
import { ProductNotFoundError } from "../errors/domain.error.js";
import { pick } from "../utils/object.util.js";
import logger from "../utils/logger.util.js";

const statusFromStock = (stock) => stock > 0 ? PRODUCT_STATUS.AVAILABLE : PRODUCT_STATUS.OUT_OF_STOCK;

const ALLOWED_FIELDS = [ "name", "description", "price", "stock"];

const warnIfOutOfStock = (product) => {
    if (product.status === PRODUCT_STATUS.OUT_OF_STOCK) {
        logger.warning("Producto sin stock", { productId: product._id });
    }
};

export class ProductService {
    
    static async getAll() {
        const products = await ProductRepository.getAll();
        return products.filter((p) => p.stock > 0);
    }

    static async getById(id) {
        const product = await ProductRepository.getById(id);
        if (!product) {
            throw new ProductNotFoundError({ id });
        }
        return product;
    }

    static async create(productData) {
        const product = await ProductRepository.create({ ...productData, status: statusFromStock(productData.stock ?? 0) });
        logger.info("Producto creado", { productId: product._id, status: product.status });
        warnIfOutOfStock(product);
        return product;
    }

    static async update(id, data) {
        const changes = pick(data, ALLOWED_FIELDS);
        if (changes.stock !== undefined) changes.status = statusFromStock(changes.stock);

        const product = await ProductRepository.update(id, changes);
        if (!product) {
            throw new ProductNotFoundError({ id });
        }
        logger.info("Producto actualizado", { productId: id, fields: Object.keys(changes) });
        warnIfOutOfStock(product);
        return product;
    }

    static async delete(id) {
        const product = await ProductRepository.delete(id);
        if (!product) {
            throw new ProductNotFoundError({ id });
        }
        logger.info("Producto eliminado", { productId: id });
        return product;
    }
}