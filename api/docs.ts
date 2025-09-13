import express from 'express';
import path from 'path';
import fs from 'fs';
import { swaggerSpec } from '../src/config/swagger';
import { getAbsoluteFSPath } from 'swagger-ui-dist';

const app = express();

// Serve swagger-ui-dist static assets with proper MIME types
const swaggerDist = getAbsoluteFSPath();
app.use('/api', express.static(swaggerDist, { fallthrough: true }));

// HTML template that points to our JSON spec
app.get('/api/docs', (_req, res) => {
  const htmlPath = path.join(swaggerDist, 'index.html');
  let html = fs.readFileSync(htmlPath, 'utf8');
  html = html.replace('https://petstore.swagger.io/v2/swagger.json', '/api/docs.json');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

// Serve the JSON spec directly
app.get('/api/docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

export default function handler(req: any, res: any) {
  return app(req, res);
}
