import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { handleApiRequest } from './worker/index';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json());

  // Backend API routes forwarded to Cloudflare Worker handler
  app.all('/api/*', async (req, res) => {
    try {
      const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
      const webReq = new Request(fullUrl, {
        method: req.method,
        headers: req.headers as Record<string, string>,
        body: req.method !== 'GET' && req.method !== 'HEAD' && req.body ? JSON.stringify(req.body) : undefined,
      });

      const env = {
        YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
      };

      const webRes = await handleApiRequest(webReq, env);
      res.status(webRes.status);
      webRes.headers.forEach((val, key) => {
        res.setHeader(key, val);
      });

      const bodyText = await webRes.text();
      res.send(bodyText);
    } catch (err: any) {
      console.error('Worker dispatch error:', err);
      res.status(500).json({ error: 'SERVER_ERROR', message: err?.message || 'Error processing request' });
    }
  });

  if (!isProd) {
    // Mount Vite dev middlewares
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve the built dist directory
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`StreamHub server running on port ${PORT}`);
  });
}

startServer();
