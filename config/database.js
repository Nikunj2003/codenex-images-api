"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDBStatus = exports.disconnectDB = exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const config_1 = __importDefault(require("./config"));
const logger_1 = __importDefault(require("../utils/logger"));
let isConnected = false;
const connectDB = async () => {
    if (isConnected) {
        logger_1.default.info('MongoDB already connected');
        return;
    }
    try {
        if (!config_1.default.mongodb.uri) {
            throw new Error('MongoDB URI is not configured');
        }
        const conn = await mongoose_1.default.connect(config_1.default.mongodb.uri, {
            dbName: 'codenex-images',
            retryWrites: true,
            w: 'majority',
        });
        isConnected = true;
        logger_1.default.info(`MongoDB connected: ${conn.connection.host}`);
        // Handle connection events
        mongoose_1.default.connection.on('error', (err) => {
            logger_1.default.error('MongoDB connection error:', err);
            isConnected = false;
        });
        mongoose_1.default.connection.on('disconnected', () => {
            logger_1.default.warn('MongoDB disconnected');
            isConnected = false;
        });
        // Graceful shutdown
        process.on('SIGINT', async () => {
            await mongoose_1.default.connection.close();
            logger_1.default.info('MongoDB connection closed through app termination');
            process.exit(0);
        });
    }
    catch (error) {
        logger_1.default.error('MongoDB connection failed:', error);
        isConnected = false;
        // Retry connection after 5 seconds
        if (config_1.default.env !== 'test') {
            logger_1.default.info('Retrying MongoDB connection in 5 seconds...');
            setTimeout(exports.connectDB, 5000);
        }
    }
};
exports.connectDB = connectDB;
const disconnectDB = async () => {
    if (!isConnected) {
        return;
    }
    try {
        await mongoose_1.default.connection.close();
        isConnected = false;
        logger_1.default.info('MongoDB disconnected successfully');
    }
    catch (error) {
        logger_1.default.error('Error disconnecting from MongoDB:', error);
    }
};
exports.disconnectDB = disconnectDB;
const getDBStatus = () => isConnected;
exports.getDBStatus = getDBStatus;
exports.default = { connectDB: exports.connectDB, disconnectDB: exports.disconnectDB, getDBStatus: exports.getDBStatus };
//# sourceMappingURL=database.js.map