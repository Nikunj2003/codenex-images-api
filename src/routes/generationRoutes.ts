import { Router } from 'express';
import * as generationController from '../controllers/generationController';
import { 
  validateGenerateImage,
  validateEditImage,
  validateSegmentImage,
  validateAuth0Id,
  validatePaginationQuery,
  validateBase64Image,
  sanitizeInput 
} from '../middleware/validation';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * /api/generations/generate:
 *   post:
 *     summary: Generate a new AI image
 *     tags: [Generations]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GenerationRequest'
 *           examples:
 *             basic:
 *               summary: Basic generation
 *               value:
 *                 auth0Id: "auth0|1234567890"
 *                 prompt: "A futuristic city with flying cars"
 *                 settings:
 *                   temperature: 1.0
 *                   width: 1024
 *                   height: 1024
 *             withReference:
 *               summary: Generation with reference images
 *               value:
 *                 auth0Id: "auth0|1234567890"
 *                 prompt: "A landscape in watercolor style"
 *                 settings:
 *                   temperature: 0.8
 *                   referenceImages: ["data:image/png;base64,..."]
 *                   negativePrompt: "blurry, low quality"
 *     responses:
 *       200:
 *         description: Image generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Generation'
 *       400:
 *         description: Invalid request or generation limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Gemini API error
 */
router.post(
  '/generate',
  authenticate,
  sanitizeInput,
  validateGenerateImage,
  validateBase64Image('originalImage'),
  validateBase64Image('maskImage'),
  generationController.generateImage
);

/**
 * @swagger
 * /api/generations/edit:
 *   post:
 *     summary: Edit an existing image with AI
 *     tags: [Generations]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EditRequest'
 *           examples:
 *             simpleEdit:
 *               summary: Simple edit without mask
 *               value:
 *                 auth0Id: "auth0|1234567890"
 *                 instruction: "Change the sky to sunset colors"
 *                 originalImage: "data:image/png;base64,..."
 *                 temperature: 1.0
 *             maskedEdit:
 *               summary: Edit with mask
 *               value:
 *                 auth0Id: "auth0|1234567890"
 *                 instruction: "Replace the car with a bicycle"
 *                 originalImage: "data:image/png;base64,..."
 *                 maskImage: "data:image/png;base64,..."
 *                 referenceImages: ["data:image/png;base64,..."]
 *     responses:
 *       200:
 *         description: Image edited successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Generation'
 *       400:
 *         description: Invalid request or limit exceeded
 *       500:
 *         description: Gemini API error
 */
router.post(
  '/edit',
  authenticate,
  sanitizeInput,
  validateEditImage,
  validateBase64Image('originalImage'),
  validateBase64Image('maskImage'),
  generationController.editImage
);

/**
 * @swagger
 * /api/generations/segment:
 *   post:
 *     summary: Segment objects in an image
 *     tags: [Generations]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SegmentRequest'
 *           example:
 *             auth0Id: "auth0|1234567890"
 *             image: "data:image/png;base64,..."
 *             query: "the red car in the foreground"
 *     responses:
 *       200:
 *         description: Segmentation completed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SegmentationResult'
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Segmentation failed
 */
router.post(
  '/segment',
  authenticate,
  sanitizeInput,
  validateSegmentImage,
  validateBase64Image('image'),
  generationController.segmentImage
);

/**
 * @swagger
 * /api/generations/history/{auth0Id}:
 *   get:
 *     summary: Get user's generation history
 *     tags: [Generations]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: auth0Id
 *         required: true
 *         schema:
 *           type: string
 *         example: "auth0|1234567890"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *         description: Items per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt]
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Generation history retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 generations:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Generation'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 20
 *                     total:
 *                       type: integer
 *                       example: 42
 *                     totalPages:
 *                       type: integer
 *                       example: 3
 */
router.get(
  '/history/:auth0Id',
  authenticate,
  validateAuth0Id,
  validatePaginationQuery,
  generationController.getGenerationHistory
);

/**
 * @swagger
 * /api/generations/today/{auth0Id}:
 *   get:
 *     summary: Get today's generation count
 *     tags: [Generations]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: auth0Id
 *         required: true
 *         schema:
 *           type: string
 *         example: "auth0|1234567890"
 *     responses:
 *       200:
 *         description: Today's generation count
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                   example: 2
 *                 limit:
 *                   type: integer
 *                   example: 2
 *                   description: Daily limit (2 for free users, unlimited with API key)
 *                 hasApiKey:
 *                   type: boolean
 *                   example: false
 */
router.get(
  '/today/:auth0Id',
  authenticate,
  validateAuth0Id,
  generationController.getTodayGenerations
);

/**
 * @swagger
 * /api/generations/{generationId}/{auth0Id}:
 *   delete:
 *     summary: Delete a generation
 *     tags: [Generations]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: generationId
 *         required: true
 *         schema:
 *           type: string
 *         example: "507f1f77bcf86cd799439012"
 *       - in: path
 *         name: auth0Id
 *         required: true
 *         schema:
 *           type: string
 *         example: "auth0|1234567890"
 *     responses:
 *       200:
 *         description: Generation deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Generation deleted successfully"
 *       404:
 *         description: Generation not found
 *       403:
 *         description: Unauthorized to delete this generation
 */
router.delete(
  '/:generationId/:auth0Id',
  authenticate,
  validateAuth0Id,
  generationController.deleteGeneration
);

export default router;