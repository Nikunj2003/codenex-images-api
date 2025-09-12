/**
 * Remove white borders from a base64 image
 * @param base64Image - Base64 encoded image string
 * @param threshold - White color threshold (0-255), default 240
 * @returns Base64 encoded image without borders
 */
export declare function removeWhiteBorders(base64Image: string, threshold?: number): Promise<string>;
/**
 * Ensure image matches target dimensions, scaling if needed
 * @param base64Image - Base64 encoded image
 * @param targetWidth - Target width
 * @param targetHeight - Target height
 * @returns Base64 encoded image at target dimensions
 */
export declare function ensureDimensions(base64Image: string, targetWidth: number, targetHeight: number): Promise<string>;
//# sourceMappingURL=imageProcessing.d.ts.map