export default function handler(_req: any, res: any) {
  res.status(200).json({ status: 'OK', service: 'codenex-images-api', timestamp: new Date().toISOString() });
}
