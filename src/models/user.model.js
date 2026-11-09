import mongoose from "mongoose";
import { USER_ROLES } from "../constants/index.js";

const userSchema = new mongoose.Schema( 
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, trim: true, unique: true, lowercase: true},
        password: { type: String, required: true, select: false},
        role: {
            type: String,
            enum: Object.values(USER_ROLES),
            default: USER_ROLES.USER
        }
    },
    { timestamps: true }
);

export const UserModel = mongoose.model("User", userSchema);