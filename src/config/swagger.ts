import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';
import { version } from '../../package.json';

const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Codenex Images API',
      version,
      description: 'AI-powered image generation and editing API using Google Gemini 2.5 Flash Image model',
      contact: {
        name: 'Nikunj Khitha',
        url: 'https://nikunj.tech',
        email: 'support@codenex.images'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://api.codenex-images.com',
        description: 'Production server'
      }
    ],
    security: [
      {
        BearerAuth: []
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: '**JWT Authentication Required**\n\n⚠️ **How to get your JWT token:**\n\n1. **Login** to the application at http://localhost:5174\n2. Open browser **DevTools** (F12)\n3. Go to **Application** tab > **Local Storage**\n4. Find the key starting with `@@auth0spajs@@`\n5. Expand it and copy the **access_token** value\n6. Click the **Authorize** button above\n7. Paste the token (without "Bearer " prefix)\n\n✅ Token will persist across page refreshes'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            auth0Id: { type: 'string', example: 'auth0|1234567890' },
            email: { type: 'string', format: 'email', example: 'user@example.com' },
            name: { type: 'string', example: 'John Doe' },
            picture: { type: 'string', format: 'uri', example: 'https://example.com/avatar.jpg' },
            hasApiKey: { type: 'boolean', example: true },
            generationCount: { type: 'integer', example: 42 },
            dailyGenerationCount: { type: 'integer', example: 2 },
            lastGenerationDate: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Generation: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439012' },
            userId: { type: 'string', example: '507f1f77bcf86cd799439011' },
            auth0Id: { type: 'string', example: 'auth0|1234567890' },
            prompt: { type: 'string', example: 'A beautiful sunset over mountains' },
            negativePrompt: { type: 'string', example: 'blurry, low quality' },
            imageUrl: { type: 'string', format: 'uri', nullable: true },
            imageData: { type: 'string', description: 'Base64 encoded image', nullable: true },
            settings: {
              type: 'object',
              properties: {
                temperature: { type: 'number', minimum: 0, maximum: 2, example: 1.0 },
                seed: { type: 'integer', nullable: true, example: 12345 },
                width: { type: 'integer', minimum: 64, maximum: 2048, example: 1024 },
                height: { type: 'integer', minimum: 64, maximum: 2048, example: 1024 },
                referenceImages: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Array of base64 encoded reference images'
                }
              }
            },
            metadata: {
              type: 'object',
              properties: {
                model: { type: 'string', example: 'gemini-2.5-flash-image-preview' },
                generationTime: { type: 'number', example: 1234567890 }
              }
            },
            isEdit: { type: 'boolean', example: false },
            editInstruction: { type: 'string', nullable: true },
            maskData: { type: 'string', nullable: true, description: 'Base64 encoded mask image' },
            status: { 
              type: 'string', 
              enum: ['pending', 'processing', 'completed', 'failed'],
              example: 'completed'
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        GenerationRequest: {
          type: 'object',
          required: ['auth0Id', 'prompt'],
          properties: {
            auth0Id: { type: 'string', example: 'auth0|1234567890' },
            prompt: { 
              type: 'string', 
              minLength: 1, 
              maxLength: 5000,
              example: 'A futuristic city with flying cars and neon lights'
            },
            settings: {
              type: 'object',
              properties: {
                temperature: { type: 'number', minimum: 0, maximum: 2, example: 1.0 },
                seed: { type: 'integer', nullable: true, example: 12345 },
                width: { type: 'integer', minimum: 64, maximum: 2048, example: 1024 },
                height: { type: 'integer', minimum: 64, maximum: 2048, example: 1024 },
                negativePrompt: { type: 'string', example: 'blurry, distorted' },
                referenceImages: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Array of base64 encoded reference images',
                  example: ['iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==']
                }
              }
            }
          }
        },
        EditRequest: {
          type: 'object',
          required: ['auth0Id', 'instruction', 'originalImage'],
          properties: {
            auth0Id: { type: 'string', example: 'auth0|1234567890' },
            instruction: { 
              type: 'string', 
              minLength: 1, 
              maxLength: 5000,
              example: 'Change the sky to sunset colors'
            },
            originalImage: { 
              type: 'string', 
              description: 'Base64 encoded original image',
              example: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
            },
            maskImage: { 
              type: 'string', 
              nullable: true,
              description: 'Base64 encoded mask image (white pixels indicate areas to edit)'
            },
            referenceImages: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of base64 encoded reference images for style guidance'
            },
            temperature: { type: 'number', minimum: 0, maximum: 2, example: 1.0 },
            seed: { type: 'integer', nullable: true }
          }
        },
        SegmentRequest: {
          type: 'object',
          required: ['auth0Id', 'image', 'query'],
          properties: {
            auth0Id: { type: 'string', example: 'auth0|1234567890' },
            image: { 
              type: 'string', 
              description: 'Base64 encoded image to segment',
              example: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
            },
            query: { 
              type: 'string', 
              minLength: 1, 
              maxLength: 500,
              example: 'the red car in the foreground'
            }
          }
        },
        SegmentationResult: {
          type: 'object',
          properties: {
            masks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  label: { type: 'string', example: 'red car' },
                  box_2d: {
                    type: 'array',
                    items: { type: 'number' },
                    minItems: 4,
                    maxItems: 4,
                    example: [100, 200, 300, 400],
                    description: '[x, y, width, height]'
                  },
                  mask: { 
                    type: 'string',
                    description: 'Base64 encoded binary mask image'
                  }
                }
              }
            }
          }
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Operation completed successfully' },
            data: { type: 'object' }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                message: { type: 'string', example: 'An error occurred' },
                status: { type: 'integer', example: 400 },
                stack: { type: 'string', description: 'Stack trace (development only)' }
              }
            }
          }
        },
        GenerationLimitResponse: {
          type: 'object',
          properties: {
            allowed: { type: 'boolean', example: true },
            reason: { type: 'string', example: 'Within daily limit' },
            message: { type: 'string', nullable: true },
            dailyGenerations: { type: 'integer', example: 1 },
            hasApiKey: { type: 'boolean', example: false }
          }
        }
      },
      responses: {
        BadRequest: {
          description: 'Invalid request',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        },
        Unauthorized: {
          description: 'Missing or invalid authentication',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        },
        Forbidden: {
          description: 'Access denied',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        },
        InternalServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'JWT authentication information and verification'
      },
      {
        name: 'Users',
        description: 'User management endpoints'
      },
      {
        name: 'Generations',
        description: 'Image generation and editing endpoints'
      },
      {
        name: 'Health',
        description: 'Application health check'
      },
      {
        name: 'Cron',
        description: 'Cron job management endpoints'
      }
    ]
  },
  // In serverless (Vercel), avoid scanning source files to reduce cold start and prevent file resolution issues
  apis: isServerless
    ? []
    : [
        path.join(process.cwd(), 'src', 'routes', '*.ts'),
        path.join(process.cwd(), 'src', 'app.ts'),
      ],
};

let swaggerSpec: ReturnType<typeof swaggerJsdoc>;
try {
  swaggerSpec = swaggerJsdoc(options);
} catch (_err) {
  // Fallback to definition-only spec
  swaggerSpec = swaggerJsdoc({ ...options, apis: [] });
}

export { swaggerSpec };