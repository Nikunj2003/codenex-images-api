import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from '../src/config/swagger';

// Create a tiny Express instance just for docs
import express from 'express';
const app = express();
app.use('/', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

export default function handler(req: any, res: any) {
  return app(req, res);
}
