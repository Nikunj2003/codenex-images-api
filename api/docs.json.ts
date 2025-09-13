import { swaggerSpec } from '../src/config/swagger';

export default function handler(_req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).send(swaggerSpec);
}
