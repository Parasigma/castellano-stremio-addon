// Resuelve el infohash de resultados que solo traen un enlace de descarga
// (.torrent), típico de los trackers españoles vía Jackett. El enlace puede:
//   - redirigir a un magnet:  -> extraemos el infohash del magnet
//   - servir un fichero .torrent -> lo parseamos para sacar el infohash

import http from 'node:http';
import https from 'node:https';
import { extractInfoHash, buildMagnet } from './magnet.js';

/**
 * @param {string} url enlace de descarga (Jackett /dl/...)
 * @returns {Promise<{infoHash:string, magnet:string}|null>}
 */
export async function resolveInfoHash(url, { maxRedirects = 6, timeout = 12000 } = {}) {
  let current = url;
  for (let i = 0; i <= maxRedirects; i++) {
    const r = await fetchOnce(current, timeout);

    if (r.redirect) {
      if (r.redirect.startsWith('magnet:')) {
        const ih = extractInfoHash(r.redirect);
        return ih ? { infoHash: ih, magnet: r.redirect } : null;
      }
      try { current = new URL(r.redirect, current).toString(); } catch { return null; }
      continue;
    }

    if (r.body && r.body.length) {
      try {
        const parseTorrent = (await import('parse-torrent')).default;
        const parsed = await Promise.resolve(parseTorrent(r.body));
        if (parsed && parsed.infoHash) {
          const ih = String(parsed.infoHash).toLowerCase();
          // Conservamos los trackers reales del .torrent (ahí están los peers).
          const trackers = Array.isArray(parsed.announce) ? parsed.announce : [];
          return { infoHash: ih, magnet: buildMagnet(ih, parsed.name, trackers) };
        }
      } catch { /* no era un .torrent válido */ }
      return null;
    }

    return null;
  }
  return null;
}

function fetchOnce(url, timeout) {
  return new Promise((resolve) => {
    let lib;
    try { lib = url.startsWith('https') ? https : http; } catch { return resolve({}); }
    const req = lib.get(url, (res) => {
      const status = res.statusCode || 0;
      const loc = res.headers.location;
      if (status >= 300 && status < 400 && loc) {
        res.resume();
        return resolve({ redirect: loc });
      }
      if (status !== 200) { res.resume(); return resolve({}); }
      const chunks = [];
      let size = 0;
      res.on('data', (c) => {
        chunks.push(c);
        size += c.length;
        if (size > 10 * 1024 * 1024) { req.destroy(); resolve({}); } // tope 10MB
      });
      res.on('end', () => resolve({ body: Buffer.concat(chunks) }));
      res.on('error', () => resolve({}));
    });
    req.on('error', () => resolve({}));
    req.setTimeout(timeout, () => { req.destroy(); resolve({}); });
  });
}
