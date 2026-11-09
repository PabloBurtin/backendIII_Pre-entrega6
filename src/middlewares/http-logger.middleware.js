import { randomUUID } from "node:crypto";
import logger from "../utils/logger.util.js";
import { runWithRequestContext } from "../utils/request-context.util.js";
import { REQUEST_ID } from "../constants/index.js";

const resolveRequestId = (req) => {
    const incoming = req.get(REQUEST_ID.HEADER);
    return incoming && REQUEST_ID.VALID_FORMAT.test(incoming) ? incoming : randomUUID();
};

export const httpLogger = (req, res, next) => {
    const startedAt = Date.now();
    const requestId = resolveRequestId(req);

    res.setHeader(REQUEST_ID.HEADER, requestId);

    res.on("finish", () => {
        logger.http(`${req.method} ${req.originalUrl} ${res.statusCode}`, {
            requestId,
            statusCode: res.statusCode,
            durationMs: Date.now() - startedAt
        });
    });

    runWithRequestContext({ requestId }, next);
};