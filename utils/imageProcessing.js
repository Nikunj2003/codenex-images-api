"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeWhiteBorders = removeWhiteBorders;
exports.ensureDimensions = ensureDimensions;
const sharp_1 = __importDefault(require("sharp"));
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Remove white borders from a base64 image
 * @param base64Image - Base64 encoded image string
 * @param threshold - White color threshold (0-255), default 240
 * @returns Base64 encoded image without borders
 */
async function removeWhiteBorders(base64Image, threshold = 240) {
    try {
        // Convert base64 to buffer
        const buffer = Buffer.from(base64Image, 'base64');
        // Load image with sharp
        const image = (0, sharp_1.default)(buffer);
        const metadata = await image.metadata();
        if (!metadata.width || !metadata.height) {
            logger_1.default.warn('Could not get image dimensions for border removal');
            return base64Image;
        }
        // Get raw pixel data
        const { data, info } = await image
            .raw()
            .toBuffer({ resolveWithObject: true });
        const width = info.width;
        const height = info.height;
        const channels = info.channels;
        // Find the actual content boundaries by detecting non-white pixels
        let minX = width;
        let minY = height;
        let maxX = 0;
        let maxY = 0;
        // Scan pixels to find content boundaries
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * channels;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                // Check if pixel is not white (or near white)
                if (r < threshold || g < threshold || b < threshold) {
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                }
            }
        }
        // If no content found or borders are minimal, return original
        if (minX >= maxX || minY >= maxY) {
            logger_1.default.info('No significant borders detected');
            return base64Image;
        }
        // Check if borders are significant (more than 1% of image)
        const borderPixels = (minX + (width - maxX - 1) + minY + (height - maxY - 1));
        const totalPixels = (width + height) * 2;
        const borderPercentage = (borderPixels / totalPixels) * 100;
        if (borderPercentage < 1) {
            logger_1.default.info(`Minimal borders detected (${borderPercentage.toFixed(2)}%), keeping original`);
            return base64Image;
        }
        // Calculate crop dimensions
        const cropWidth = maxX - minX + 1;
        const cropHeight = maxY - minY + 1;
        logger_1.default.info(`Removing borders: cropping from ${width}x${height} to ${cropWidth}x${cropHeight}`);
        logger_1.default.info(`Border removed: top=${minY}px, bottom=${height - maxY - 1}px, left=${minX}px, right=${width - maxX - 1}px`);
        // Crop the image to remove borders
        const croppedBuffer = await (0, sharp_1.default)(buffer)
            .extract({
            left: minX,
            top: minY,
            width: cropWidth,
            height: cropHeight
        })
            .toBuffer();
        // Convert back to base64
        return croppedBuffer.toString('base64');
    }
    catch (error) {
        logger_1.default.error('Error removing white borders:', error);
        // Return original image if processing fails
        return base64Image;
    }
}
/**
 * Ensure image matches target dimensions, scaling if needed
 * @param base64Image - Base64 encoded image
 * @param targetWidth - Target width
 * @param targetHeight - Target height
 * @returns Base64 encoded image at target dimensions
 */
async function ensureDimensions(base64Image, targetWidth, targetHeight) {
    try {
        const buffer = Buffer.from(base64Image, 'base64');
        // Resize to exact dimensions, using cover strategy to fill the frame
        const resizedBuffer = await (0, sharp_1.default)(buffer)
            .resize(targetWidth, targetHeight, {
            fit: 'cover',
            position: 'center'
        })
            .toBuffer();
        return resizedBuffer.toString('base64');
    }
    catch (error) {
        logger_1.default.error('Error ensuring dimensions:', error);
        return base64Image;
    }
}
//# sourceMappingURL=imageProcessing.js.map