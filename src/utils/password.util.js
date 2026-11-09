import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

export const hashPassword = (plainPassword) => bcrypt.hash(plainPassword, SALT_ROUNDS);

export const comparePassword = (plainPassword, hashedPassword) => bcrypt.compare(plainPassword, hashedPassword)