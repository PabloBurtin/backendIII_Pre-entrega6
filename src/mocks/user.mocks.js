import { faker } from "@faker-js/faker";
import  { MOCKING_PARAMETERS, USER_ROLES } from "../constants/index.js";

const RANDOM_ROLES = [USER_ROLES.USER, USER_ROLES.COURIER];

export const generateMockUser = (role) => {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const username = faker.internet.username({ firstName, lastName}).toLowerCase();

    return {
        _id: faker.database.mongodbObjectId(),
        name: `${firstName} ${lastName}`,
        email: `${username}${faker.string.numeric(3)}@${MOCKING_PARAMETERS.EMAIL_DOMAIN}`,
        password: MOCKING_PARAMETERS.DEFAULT_PASSWORD,
        role: role ?? faker.helpers.arrayElement(RANDOM_ROLES)
    };
};

export const generateMockUsers = (qty, role) => Array.from({ length: qty }, () => generateMockUser(role));