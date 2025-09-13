import app from '../src/app';
import { connectDB } from '../src/config/database';

// Ensure DB connection before handling each request (idempotent inside connectDB)
export default async function vercelHandler(req: any, res: any) {
  const url = req.url || '';
  const skipDb = url.startsWith('/api/health') || url.startsWith('/api/docs') || url.startsWith('/api/docs.json');

  if (!skipDb) {
    try {
      await connectDB();
    } catch (err) {
      // Proceed anyway; routes that require DB will surface errors appropriately
    }
  }
  // Delegate directly to Express (compatible with Vercel Node runtime)
  return app(req, res);
}

// Disable Vercel body parsing to let Express handle it
export const config = {
  api: {
    bodyParser: false,
  },
};
