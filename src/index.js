// Punto de entrada del addon. Arranca el servidor (HTTP y, opcionalmente, HTTPS)
// y muestra las URLs útiles para instalar en Stremio.

import http from 'node:http';
import https from 'node:https';
import { createApp } from './server/app.js';
import { createPublicApp } from './server/public-app.js';
import { getTunnelInfo } from './server/tunnel.js';
import { loadConfig } from './config/store.js';
import { initDownloads } from './download/manager.js';
import { rescan } from './library/scanner.js';
import { getLanIps, getCertificate } from './server/tls.js';
import { VERSION } from './server/routes/api.js';

const config = loadConfig();
const app = createApp();

// Reanuda descargas pendientes de sesiones anteriores.
initDownloads();

// Escanea la biblioteca al arrancar para que el catálogo "Mi biblioteca" esté
// listo en cuanto Stremio lo pida (evita que cachee una lista vacía en frío).
try {
  const n = rescan();
  console.log(`  Biblioteca: ${n} vídeo(s) indexados.`);
} catch (err) {
  console.error('  No se pudo escanear la biblioteca:', err.message);
}

const { port, host, https: httpsCfg, tunnel: tunnelCfg } = config.server;
const lanIp = getLanIps()[0] || '127.0.0.1';

// Servidor HTTP (el que usa la Smart TV en la red local).
http.createServer(app).listen(port, host, () => {
  printBanner();
});

// Túnel público opcional: servidor "solo-Stremio" en un puerto aparte.
// El túnel (cloudflared) se ejecuta APARTE con tunel.bat, para que su URL sea
// estable aunque reinicies el addon.
if (tunnelCfg && tunnelCfg.enabled) {
  const publicPort = tunnelCfg.port || 7001;
  http.createServer(createPublicApp()).listen(publicPort, '127.0.0.1', () => {
    console.log(`  Servidor público (solo Stremio) en http://127.0.0.1:${publicPort}`);
    const t = getTunnelInfo();
    if (t.url) console.log(`  Túnel activo: ${t.url}/manifest.json`);
    else console.log('  ⚠️  Ejecuta  tunel.bat  para abrir el túnel público (URL para la TV).');
  });
}

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
  console.log(`  🎬  CASTELLAR  ·  Addon castellano para Stremio  ·  v${VERSION}`);
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
