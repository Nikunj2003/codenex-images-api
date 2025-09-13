import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from '../src/config/swagger';

// Create a tiny Express instance just for docs
import express from 'express';
const app = express();

// Mount at '/api' so static assets resolve under /api/*
app.use('/api', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

export default function handler(req: any, res: any) {
  return app(req, res);
}
