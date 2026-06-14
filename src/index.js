// Punto de entrada del addon. Arranca el servidor (HTTP y, opcionalmente, HTTPS)
// y muestra las URLs útiles para instalar en Stremio.

import http from 'node:http';
import https from 'node:https';
import { createApp } from './server/app.js';
import { loadConfig } from './config/store.js';
import { initDownloads } from './download/manager.js';
import { getLanIps, getCertificate } from './server/tls.js';
import { VERSION } from './server/routes/api.js';

const config = loadConfig();
const app = createApp();

// Reanuda descargas pendientes de sesiones anteriores.
initDownloads();

const { port, host, https: httpsCfg } = config.server;
const lanIp = getLanIps()[0] || '127.0.0.1';

// Servidor HTTP (el que usa la Smart TV en la red local).
http.createServer(app).listen(port, host, () => {
  printBanner();
});

// Servidor HTTPS opcional (para el reproductor web de Stremio en este PC).
if (httpsCfg && httpsCfg.enabled) {
  getCertificate()
    .then(({ key, cert }) => {
      https.createServer({ key, cert }, app).listen(httpsCfg.port, host, () => {
        console.log(`  HTTPS (autofirmado): https://${lanIp}:${httpsCfg.port}/manifest.json\n`);
      });
    })
    .catch((err) => console.error('  No se pudo iniciar HTTPS:', err.message));
}

function printBanner() {
  const line = '─'.repeat(58);
  console.log(`\n${line}`);
  console.log(`  🎬  Addon Castellano para Stremio  ·  v${VERSION}`);
  console.log(line);
  console.log('  Dashboard (config, buscador y descargas):');
  console.log(`    → http://localhost:${port}`);
  console.log(`    → http://${lanIp}:${port}   (desde otros equipos de la red)`);
  console.log('');
  console.log('  Manifest para instalar en Stremio (usa la IP, no localhost):');
  console.log(`    → http://${lanIp}:${port}/manifest.json`);
  console.log(line);
  console.log('  Pulsa Ctrl+C para detener el servidor.\n');
}
