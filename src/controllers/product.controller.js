import { ProductService } from "../services/product.service.js";
import { RESPONSE_STATUS } from "../constants/index.js";


export class ProductController {
    static async getAll(req,res) {
        const products = await ProductService.getAll();
        return res.status(200).json({
            status: RESPONSE_STATUS.SUCCESS, 
            message: "Productos obtenidos exitosamente",
            payload: products
        })
    }

    static async getById(req, res) {
        const product = await ProductService.getById(req.params.id);
        return res.status(200).json({
            status: RESPONSE_STATUS.SUCCESS,
            message: "Producto encontrado exitosamente",
            payload: product
        })
    }

    static async create(req, res) {
        const product = await ProductService.create(req.body);
        return res.status(201).json({
            status: RESPONSE_STATUS.SUCCESS,
            message: "Producto creado exitosamente",
            payload: product
        })
    }

    static async update(req, res) {
        const product = await ProductService.update(req.params.id, req.body);
        return res.status(200).json({
            status: RESPONSE_STATUS.SUCCESS,
            message: "Producto actualizado correctamente",
            payload: product
        })
    }

    static async delete(req, res) {
        const product = await ProductService.delete(req.params.id);
        return res.status(200).json({
            status: RESPONSE_STATUS.SUCCESS,
            message: "Producto borrado correctamente",
            payload: product
        })
    }
}