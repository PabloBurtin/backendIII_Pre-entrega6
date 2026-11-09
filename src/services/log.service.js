import logger from "../utils/logger.util.js";
import { LOG_LEVELS } from "../constants/index.js";

const TEST_LEVELS = [
    LOG_LEVELS.DEBUG,
    LOG_LEVELS.HTTP,
    LOG_LEVELS.INFO,
    LOG_LEVELS.WARNING,
    LOG_LEVELS.ERROR,
    LOG_LEVELS.FATAL
];

export class LogService {
    static emitTestLogs() {
        return TEST_LEVELS.map((level) => {
            logger[level](`Log de prueba de nivel ${level}`, { origen: "logger-test" })
            return { level, registrado: logger.isLevelEnabled(level) };
        });
    }
}