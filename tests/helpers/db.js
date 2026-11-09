import mongoose from "mongoose";
import config from "../../src/config/env.config.js";

export const connectTestDb = async () => {
    await mongoose.connect(config.mongoUriTest);

    const dbName = mongoose.connection.name;
    if (!/test/i.test(dbName)) {
        await mongoose.disconnect();
        throw new Error(
            `Los test solo pueden correr contra una base de testing (su nombre debe contener "test"). ` +
            `Base configurada: "${dbName}". Revisa MONGODB_URI_TEST en tu archivo .env`
        );
    }
};

export const clearDatabase = async () => {
    const collections = Object.values(mongoose.connection.collections);
    await Promise.all(collections.map((collection) => collection.deleteMany({})));
};

export const dropAndCloseTestDb = async () => {
    if (mongoose.connection.readyState !== 1) return;

    if (/test/i.test(mongoose.connection.name)) {
        await mongoose.connection.dropDatabase();
    }
    await mongoose.disconnect();
};