// Servidor "público" para el túnel: expone ÚNICAMENTE los endpoints del
// protocolo Stremio (manifest, stream, resolve, local). NO sirve el dashboard
// ni la API de configuración, para que al exponerlo por el túnel no queden
// accesibles tus tokens ni tus ajustes.

import express from 'express';
import stremioRouter from './routes/stremio.js';
import playerRouter from './routes/player.js';

export function createPublicApp() {
  const app = express();

  // Va detrás del túnel de Cloudflare (HTTPS): respeta X-Forwarded-Proto para que
  // los enlaces de reproducción se generen con https y Stremio los acepte.
  app.set('trust proxy', true);

  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  // Protocolo Stremio (manifest, stream, resolve, library, local).
  app.use('/', stremioRouter);

  // Reproductor web privado (protegido por contraseña). Accesible por el túnel.
  app.use('/player', playerRouter);

  // Cualquier otra ruta: 404 (no exponemos panel ni configuración).
  app.use((req, res) => res.status(404).send('Not found'));

  return app;
}
