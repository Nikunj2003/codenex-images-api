import { Router } from 'express';
import * as userController from '../controllers/userController';
import { 
  validateCreateUser,
  validateUserApiKey,
  validateAuth0Id,
  sanitizeInput 
} from '../middleware/validation';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create or update user
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - auth0Id
 *               - email
 *             properties:
 *               auth0Id:
 *                 type: string
 *                 example: "auth0|1234567890"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *               picture:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/avatar.jpg"
 *     responses:
 *       200:
 *         description: User created or updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
router.post(
  '/',
  authenticate,
  sanitizeInput,
  validateCreateUser,
  userController.createOrUpdateUser
);

/**
 * @swagger
 * /api/users/{auth0Id}:
 *   get:
 *     summary: Get user by auth0Id
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: auth0Id
 *         required: true
 *         schema:
 *           type: string
 *         description: Auth0 user ID
 *         example: "auth0|1234567890"
 *     responses:
 *       200:
 *         description: User found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  '/:auth0Id',
  authenticate,
  validateAuth0Id,
  userController.getUser
);

/**
 * @swagger
 * /api/users/{auth0Id}/api-key:
 *   put:
 *     summary: Update user's Gemini API key
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: auth0Id
 *         required: true
 *         schema:
 *           type: string
 *         example: "auth0|1234567890"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               apiKey:
 *                 type: string
 *                 nullable: true
 *                 description: Encrypted Gemini API key or null to remove
 *                 example: "encrypted_api_key_string"
 *     responses:
 *       200:
 *         description: API key updated successfully
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
 *                   example: "API key updated"
 *                 hasApiKey:
 *                   type: boolean
 *                   example: true
 */
router.put(
  '/:auth0Id/api-key',
  authenticate,
  validateAuth0Id,
  sanitizeInput,
  validateUserApiKey,
  userController.updateUserApiKey
);

/**
 * @swagger
 * /api/users/{auth0Id}/stats:
 *   get:
 *     summary: Get user generation statistics
 *     tags: [Users]
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
 *         description: User statistics retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalGenerations:
 *                   type: integer
 *                   example: 42
 *                 todayGenerations:
 *                   type: integer
 *                   example: 2
 *                 hasApiKey:
 *                   type: boolean
 *                   example: true
 *                 lastGenerationDate:
 *                   type: string
 *                   format: date-time
 */
router.get(
  '/:auth0Id/stats',
  authenticate,
  validateAuth0Id,
  userController.getUserStats
);

/**
 * @swagger
 * /api/users/{auth0Id}/can-generate:
 *   get:
 *     summary: Check if user can generate (within limits)
 *     tags: [Users]
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
 *         description: Generation limit check result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenerationLimitResponse'
 */
router.get(
  '/:auth0Id/can-generate',
  authenticate,
  validateAuth0Id,
  userController.checkCanGenerate
);

/**
 * @swagger
 * /api/users/{auth0Id}:
 *   delete:
 *     summary: Delete user account
 *     tags: [Users]
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
 *         description: User deleted successfully
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
 *                   example: "User deleted successfully"
 *       404:
 *         description: User not found
 */
router.delete(
  '/:auth0Id',
  authenticate,
  validateAuth0Id,
  userController.deleteUser
);

export default router;