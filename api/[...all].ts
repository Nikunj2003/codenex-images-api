import serverless from 'serverless-http';
import app from '../src/app';
import { connectDB } from '../src/config/database';

// Wrap Express with serverless adaptor
const handler = serverless(app);

// Ensure DB connection before handling each request (idempotent inside connectDB)
export default async function vercelHandler(req: any, res: any) {
  try {
    await connectDB();
  } catch (err) {
    // Proceed anyway; routes that require DB will surface errors appropriately
  }
  // Delegate to Express
  return handler(req as any, res as any);
}

// Disable Vercel body parsing to let Express handle it
export const config = {
  api: {
    bodyParser: false,
  },
};
