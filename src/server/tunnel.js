// Gestión del túnel de Cloudflare (cloudflared).
//
// El túnel se ejecuta como un proceso INDEPENDIENTE (tunel.bat), no desde el addon.
// Ventaja: la URL pública se mantiene ESTABLE aunque reinicies el addon (solo
// cambia si cierras el túnel). El addon simplemente LEE la URL del log que escribe
// tunel.bat (config/tunnel.log).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG = path.resolve(__dirname, '../../config/tunnel.log');

const URL_RE = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/gi;

/**
 * Lee la URL pública actual del túnel desde el log que escribe tunel.bat.
 * @returns {{status:string, url:string|null, error:string|null}}
 */
export function getTunnelInfo() {
  try {
    if (!fs.existsSync(LOG)) {
      return { status: 'off', url: null, error: null };
    }
    // La URL aparece al inicio del log; leemos solo los primeros 256 KB.
    const fd = fs.openSync(LOG, 'r');
    const buf = Buffer.alloc(262144);
    const n = fs.readSync(fd, buf, 0, buf.length, 0);
    fs.closeSync(fd);
    const txt = buf.toString('utf8', 0, n);
    const matches = txt.match(URL_RE);
    const url = matches && matches.length ? matches[matches.length - 1] : null;
    return { status: url ? 'running' : 'starting', url, error: null };
  } catch (e) {
    return { status: 'error', url: null, error: e.message };
  }
}
