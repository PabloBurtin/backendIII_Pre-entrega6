import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import config from "../config/env.config.js";
import { getRequestId } from "./request-context.util.js";
import { ENVIRONMENTS, LOG_LEVELS, LOG_LEVEL_PRIORITIES, LOG_COLORS, LOG_LEVEL_BY_ENVIRONMENT, LOG_FILE_PARAMETERS } from "../constants/index.js";

const { combine, timestamp, errors, colorize, printf, json } = winston.format;

winston.addColors(LOG_COLORS);

const timestampFormat = timestamp({ format: "YYYY-MM-DD HH:mm:ss" });

const addRequestId = winston.format((info) => {
    const requestId = getRequestId();
    if (requestId && !info.requestId) info.requestId = requestId;
    return info;
});

const fileFormat = combine(timestampFormat, errors({ stack: true }), json());

const textConsoleFormat = combine(
    timestampFormat,
    errors({ stack: true }),
    ...(config.isDevelopment? [colorize()] : []),
    printf(({timestamp, level, message, stack, ...meta }) => {
        const context = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
        return `${timestamp} [${level}] ${message}${context}${stack ? `\n${stack}` : ""}`;
    })
)

const consoleFormat = config.isProduction ? fileFormat : textConsoleFormat;


const rotatingFileOptions = {
    dirname: LOG_FILE_PARAMETERS.DIRECTORY,
    datePattern: LOG_FILE_PARAMETERS.DATE_PATTERN,
    maxSize: LOG_FILE_PARAMETERS.MAX_SIZE,
    maxFiles: LOG_FILE_PARAMETERS.MAX_FILES,
    zippedArchive: true,
    format: fileFormat
};

const logger = winston.createLogger({
    levels: LOG_LEVEL_PRIORITIES,
    format: addRequestId(),
    level: LOG_LEVEL_BY_ENVIRONMENT[config.nodeEnv],
    silent: config.nodeEnv === ENVIRONMENTS.TEST,
    transports: [
        new winston.transports.Console({ format: consoleFormat }),
        
        new DailyRotateFile({
            ...rotatingFileOptions,
            filename: "error-%DATE%.log",
            level: LOG_LEVELS.ERROR,
            createSymlink: true,
            symlinkName: "error.log"
        }),

        new DailyRotateFile({
            ...rotatingFileOptions,
            filename: "combined-%DATE%.log"
        })
    ],
    exitOnError: false
});

export default logger;