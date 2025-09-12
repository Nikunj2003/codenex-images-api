import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * /api/auth/token-info:
 *   get:
 *     summary: Information on how to obtain JWT tokens
 *     tags: [Authentication]
 *     security: []
 *     description: |
 *       This endpoint provides information on how to obtain JWT tokens for API authentication.
 *       
 *       ## Getting a JWT Token
 *       
 *       ### Method 1: Via the Web Application
 *       1. Navigate to http://localhost:8080
 *       2. Click "Login" and authenticate with Auth0
 *       3. Open browser DevTools (F12)
 *       4. Go to Application > Local Storage
 *       5. Find the key starting with `@@auth0spajs@@`
 *       6. Copy the `body.access_token` value
 *       
 *       ### Method 2: Using Auth0 API (Machine-to-Machine)
 *       ```bash
 *       curl --request POST \
 *         --url https://dev-vd8f0h03yhlx1330.us.auth0.com/oauth/token \
 *         --header 'content-type: application/json' \
 *         --data '{
 *           "client_id": "YOUR_M2M_CLIENT_ID",
 *           "client_secret": "YOUR_M2M_CLIENT_SECRET",
 *           "audience": "https://codenex-images-api",
 *           "grant_type": "client_credentials"
 *         }'
 *       ```
 *       
 *       ### Using the Token
 *       Include the token in the Authorization header:
 *       ```
 *       Authorization: Bearer YOUR_JWT_TOKEN
 *       ```
 *       
 *       ### Token Details
 *       - **Issuer**: https://dev-vd8f0h03yhlx1330.us.auth0.com/
 *       - **Audience**: https://codenex-images-api
 *       - **Algorithm**: RS256
 *       - **Expiration**: Tokens typically expire after 24 hours
 *     responses:
 *       200:
 *         description: Token information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "See the endpoint description for detailed instructions"
 *                 auth0:
 *                   type: object
 *                   properties:
 *                     domain:
 *                       type: string
 *                       example: "dev-vd8f0h03yhlx1330.us.auth0.com"
 *                     audience:
 *                       type: string
 *                       example: "https://codenex-images-api"
 *                     tokenEndpoint:
 *                       type: string
 *                       example: "https://dev-vd8f0h03yhlx1330.us.auth0.com/oauth/token"
 *                 instructions:
 *                   type: object
 *                   properties:
 *                     webApp:
 *                       type: string
 *                       example: "Login at http://localhost:8080 and check browser DevTools"
 *                     api:
 *                       type: string
 *                       example: "Use the OAuth2 client credentials flow"
 */
router.get('/token-info', (_req: Request, res: Response) => {
  res.json({
    message: 'See the Swagger documentation for detailed instructions on obtaining JWT tokens',
    auth0: {
      domain: process.env.AUTH0_DOMAIN || 'dev-vd8f0h03yhlx1330.us.auth0.com',
      audience: process.env.AUTH0_AUDIENCE || 'https://codenex-images-api',
      tokenEndpoint: `https://${process.env.AUTH0_DOMAIN || 'dev-vd8f0h03yhlx1330.us.auth0.com'}/oauth/token`,
      jwksUri: `https://${process.env.AUTH0_DOMAIN || 'dev-vd8f0h03yhlx1330.us.auth0.com'}/.well-known/jwks.json`
    },
    instructions: {
      webApp: 'Login at http://localhost:8080 and extract token from browser localStorage',
      api: 'Use OAuth2 client credentials flow with your Machine-to-Machine application',
      swagger: 'Click the "Authorize" button in Swagger UI and paste your JWT token'
    },
    tokenFormat: {
      header: 'Authorization: Bearer YOUR_JWT_TOKEN',
      algorithm: 'RS256',
      typical_expiry: '86400 seconds (24 hours)'
    }
  });
});

/**
 * @swagger
 * /api/auth/verify:
 *   get:
 *     summary: Verify JWT token (test endpoint)
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     description: |
 *       Test endpoint to verify if your JWT token is valid.
 *       This endpoint will return information about the authenticated user if the token is valid.
 *     responses:
 *       200:
 *         description: Token is valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   type: object
 *                   properties:
 *                     sub:
 *                       type: string
 *                       example: "auth0|1234567890"
 *                     aud:
 *                       type: string
 *                       example: "https://codenex-images-api"
 *                     iss:
 *                       type: string
 *                       example: "https://dev-vd8f0h03yhlx1330.us.auth0.com/"
 *                     exp:
 *                       type: number
 *                       example: 1234567890
 *                     iat:
 *                       type: number
 *                       example: 1234567890
 *       401:
 *         description: Token is invalid or missing
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "No authorization token provided"
 */
router.get('/verify', authenticate, (req: Request, res: Response) => {
  // This route will be protected by the authenticate middleware
  // If we reach here, the token is valid
  res.json({
    valid: true,
    user: req.auth,
    message: 'Token is valid and authentication successful'
  });
});

export default router;