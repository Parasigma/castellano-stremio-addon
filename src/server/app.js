// Aplicación Express: sirve el dashboard estático y la API de configuración.
// Los endpoints del protocolo Stremio (manifest/stream/...) se montarán aquí
// en hitos posteriores.

import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import apiRouter from './routes/api.js';
import stremioRouter from './routes/stremio.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, '../../public');

export function createApp() {
  const app = express();

  app.use(express.json({ limit: '1mb' }));

  // CORS abierto: Stremio (y el dashboard desde otra IP de la LAN) deben poder
  // llamar al addon. En red local es seguro.
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  // API del dashboard.
  app.use('/api', apiRouter);

  // Protocolo Stremio (manifest, stream, resolve).
  app.use('/', stremioRouter);

  // Dashboard estático.
  app.use('/', express.static(PUBLIC_DIR));

  return app;
}
