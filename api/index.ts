export default function handler(_req: any, res: any) {
  res.status(200).json({ success: true, version: '1.0.0', name: 'codenex-images-api' });
}
