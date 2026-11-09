import { UserRepository } from "../repositories/user.repository.js";
import { hashPassword } from "../utils/password.util.js";
import { UserNotFoundError, EmailRequiredError, EmailAlreadyExistsError, InvalidPasswordError } from "../errors/domain.error.js";
import { pick } from "../utils/object.util.js";
import logger from "../utils/logger.util.js";

const MIN_PASSWORD_LENGTH = 6;

const ALLOWED_FIELDS = ["name", "email", "password"];


const validatePassword = (password) => {
    if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
        throw new InvalidPasswordError({ minLength: MIN_PASSWORD_LENGTH });
    }
};

export class UserService {
    static async getAll() {
        return UserRepository.getAll();
    }

    static async getById(id) {
        const user = await UserRepository.getById(id);
        if (!user) throw new UserNotFoundError({ id });
        return user;
    }

    static async create(data) {
        const userData = pick(data, ALLOWED_FIELDS);

        if (!userData.email) throw new EmailRequiredError();
        validatePassword(userData.password);
    
        const existing = await UserRepository.getByEmail(userData.email);
        if (existing) throw new EmailAlreadyExistsError({ email: userData.email });

        const hashedPassword = await hashPassword(userData.password);
        
        const user = await UserRepository.create({ ...userData, password: hashedPassword });
        logger.info("Usuario creado", { userId: user._id, role: user.role });
        return user;
    }

    static async update(id, data) {
        const changes = pick(data, ALLOWED_FIELDS);
        
        if (changes.password !== undefined) {
            validatePassword(changes.password);
            changes.password = await hashPassword(changes.password);
        }

        if (changes.email) {
            const existing = await UserRepository.getByEmail(changes.email);
            if (existing && String(existing._id) !== id) {
                throw new EmailAlreadyExistsError({ email: changes.email });
            }
        }

        const user = await UserRepository.update(id, changes);
        if (!user) throw new UserNotFoundError({ id });
        logger.info("Usuario actualizado", { userId: id, fields: Object.keys(changes) });
        return user;
    }

    static async delete(id) {
        const user = await UserRepository.delete(id);
        if (!user) throw new UserNotFoundError({ id });
        logger.info("Usuario eliminado", { userId: id });
        return user;
    }
}