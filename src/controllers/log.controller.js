import { LogService } from "../services/log.service.js";
import logger from "../utils/logger.util.js";
import { RESPONSE_STATUS } from "../constants/index.js";

export class LogController {
    static test(req, res) {
        const levels = LogService.emitTestLogs();
        return res.status(200).json({
            status: RESPONSE_STATUS.SUCCESS,
            message: "Logs de prueba generados correctamente",
            payload: { activeLevel: logger.level, levels }
        });
    }
}