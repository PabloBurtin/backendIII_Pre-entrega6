import { connectTestDb, dropAndCloseTestDb, clearDatabase } from "./helpers/db.js";

before(async () => {
    await connectTestDb();
    await clearDatabase();
});

after(async () => {
    await dropAndCloseTestDb();
});