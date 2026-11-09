import { UserModel } from "../models/user.model.js";

const PROJECTION = "-__v";

export class UserRepository {
    static async getAll() {
        return UserModel.find().select(PROJECTION).lean();
    }

    static async getById(id) {
        return UserModel.findById(id).select(PROJECTION).lean();
    }

    static async getByEmail(email) {
        return UserModel.findOne({ email: email.toLowerCase() }).select(PROJECTION).lean();
    }

    static async getByEmailWithPassword(email) {
        return UserModel.findOne({ email: email.toLowerCase() }).select("+password").lean();
    }

    static async create(data) {
        const user = await UserModel.create(data);
        const { password, __v, ...safeUser } = user.toObject();
        return safeUser;
    }

    static async update(id, data) {
        return UserModel.findByIdAndUpdate(id, data, { returnDocument: "after", runValidators: true })
            .select(PROJECTION)
            .lean();
    }

    static async delete(id) {
        return UserModel.findByIdAndDelete(id).select(PROJECTION).lean();
    }
}

