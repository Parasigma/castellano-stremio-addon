// Endpoints del protocolo Stremio: manifest, stream y resolve.

import express from 'express';
import fs from 'node:fs';
import { searchStreams } from '../../engine/search.js';
import { getMeta } from '../../engine/meta.js';
import { encodeToken, resolveStream } from '../../engine/resolve.js';
import { ensureMagnet } from '../../engine/magnet.js';
import { LANG_LABEL } from '../../engine/language.js';
import { matchLocalFiles, getFile } from '../../download/manager.js';
import { findInLibrary, getLibraryFile, listAll } from '../../library/scanner.js';
import { getLanIps } from '../tls.js';
import { loadConfig } from '../../config/store.js';
import { VERSION, ADDON_NAME } from '../../version.js';

const router = express.Router();

const MANIFEST = {
  id: 'org.castellano.debrid.addon',
  version: VERSION,
  name: ADDON_NAME,
  description: 'CASTELLAR · Addon centrado en castellano (doblado y VOSE) con '
    + 'Real Debrid, TorBox e indexadores Jackett/Prowlarr. Prioriza el español de España.',
  resources: [
    'stream',
    { name: 'catalog', types: ['castellar'] },
    { name: 'meta', types: ['castellar'], idPrefixes: ['cast:'] },
  ],
  types: ['movie', 'series', 'castellar'],
  idPrefixes: ['tt', 'cast:'],
  catalogs: [
    { type: 'castellar', id: 'biblioteca', name: 'CASTELLAR · Mi biblioteca' },
  ],
  behaviorHints: { configurable: true, configurationRequired: false },
};

// Nombre legible a partir del nombre de fichero.
function prettyName(name) {
  return String(name || '').replace(/\.[^.]+$/, '').replace(/[._]+/g, ' ').trim();
}

// Logo SVG: bandera de España + botón de play + nombre.
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <defs><linearGradient id="b" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#1b2030"/><stop offset="1" stop-color="#0c0e14"/>
  </linearGradient></defs>
  <rect width="256" height="256" rx="52" fill="url(#b)"/>
  <rect x="46" y="58" width="164" height="28" rx="6" fill="#c60b1e"/>
  <rect x="46" y="86" width="164" height="46" fill="#ffc400"/>
  <rect x="46" y="132" width="164" height="28" rx="6" fill="#c60b1e"/>
  <polygon points="115,90 158,109 115,128" fill="#1b2030"/>
  <text x="128" y="206" font-family="Segoe UI,Arial,sans-serif" font-size="33" font-weight="800" letter-spacing="1.5" fill="#fff" text-anchor="middle">CASTELLAR</text>
</svg>`;

router.get('/logo.svg', (req, res) => {
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(LOGO_SVG);
});

router.get('/manifest.json', (req, res) => {
  const base = `${req.protocol}://${req.get('host')}`;
  res.json({ ...MANIFEST, logo: `${base}/logo.svg` });
});

// --- Catálogo "Mi biblioteca": sección propia con tus vídeos --------------
router.get('/catalog/:type/:id.json', (req, res) => {
  if (req.params.type !== 'castellar') return res.json({ metas: [] });
  const base = `${req.protocol}://${req.get('host')}`;
  const metas = listAll().map((v) => ({
    id: `cast:${v.id}`,
    type: 'castellar',
    name: prettyName(v.name),
    poster: `${base}/logo.svg`,
    posterShape: 'square',
  }));
  res.json({ metas });
});

// Detalle (meta) de un elemento del catálogo.
router.get('/meta/:type/:id.json', (req, res) => {
  const base = `${req.protocol}://${req.get('host')}`;
  const { id } = req.params;
  if (!id.startsWith('cast:')) return res.json({ meta: {} });
  const f = getLibraryFile(id.slice(5));
  res.json({
    meta: {
      id,
      type: 'castellar',
      name: f ? prettyName(f.name) : id,
      poster: `${base}/logo.svg`,
      posterShape: 'square',
      description: f ? f.name : '',
    },
  });
});

// --- helpers de presentación --------------------------------------------

function formatSize(bytes) {
  if (!bytes) return '';
  const gb = bytes / 1073741824;
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  return `${(bytes / 1048576).toFixed(0)} MB`;
}

function cachedBadge(cached) {
  if (cached === true) return '⚡ Cacheado';
  if (cached === false) return '⬇️ No cacheado';
  return '';
}

export function toStream(t, baseUrl, season, episode) {
  const magnet = ensureMagnet(t);
  const token = encodeToken({ magnet, infoHash: t.infoHash, season, episode });

  const lang = LANG_LABEL[t.parsed.language.category] || t.parsed.language.category;
  const quality = t.parsed.quality || '';
  const extras = [t.parsed.source, t.parsed.codec, t.parsed.hdr ? 'HDR' : null]
    .filter(Boolean).join(' ');

  const detailLine = [
    formatSize(t.size),
    `👤 ${t.seeders || 0}`,
    cachedBadge(t.cached),
    t.indexer ? `📡 ${t.indexer}` : '',
  ].filter(Boolean).join('  ');

  return {
    name: `CASTELLAR\n${lang} ${quality}`.trim(),
    title: `${t.title}\n${extras ? extras + '\n' : ''}${detailLine}`,
    url: `${baseUrl}/resolve/${token}`,
    behaviorHints: {
      bingeGroup: `castellano-${t.parsed.language.category}-${quality}`,
    },
  };
}

// --- stream ---------------------------------------------------------------
// id de película: tt1234567   ·   id de serie: tt1234567:1:5
router.get('/stream/:type/:id.json', async (req, res) => {
  // Vídeo de la biblioteca (catálogo propio): id 'cast:<fileId>'
  if (req.params.id.startsWith('cast:')) {
    const fileId = req.params.id.slice(5);
    const f = getLibraryFile(fileId);
    if (!f) return res.json({ streams: [] });
    const lanIp = getLanIps()[0] || '127.0.0.1';
    const url = `http://${lanIp}:${loadConfig().server.port}/library/${fileId}`;
    return res.json({ streams: [{ name: 'CASTELLAR\n📁 Biblioteca', title: f.name, url, behaviorHints: { bingeGroup: 'biblioteca' } }] });
  }
  const { type } = req.params;
  const [imdbId, seasonStr, episodeStr] = req.params.id.split(':');
  const season = seasonStr != null ? Number(seasonStr) : null;
  const episode = episodeStr != null ? Number(episodeStr) : null;

  if (!['movie', 'series'].includes(type)) return res.json({ streams: [] });

  try {
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    // 1) Streams locales (ya descargados/descargándose en el PC) — van primero,
    //    se reproducen al instante desde tu disco.
    // Los ficheros locales se sirven por la IP de la red local (directo y rápido,
    // sin pasar el vídeo por el túnel). Solo funciona viendo en la misma red.
    const lanIp = getLanIps()[0] || '127.0.0.1';
    const localBase = `http://${lanIp}:${loadConfig().server.port}`;
    const meta = await getMeta(type, imdbId);
    // Biblioteca local (vídeos que el usuario dejó en su carpeta) — van primero.
    const libStreams = meta
      ? findInLibrary({ name: meta.name, season, episode }).map((f) => libraryStream(f, localBase))
      : [];
    const localStreams = meta
      ? matchLocalFiles({ name: meta.name, season, episode }).map((f) => localStream(f, localBase))
      : [];

    // 2) Streams desde debrid/indexadores.
    const { torrents } = await searchStreams({ type, imdbId, season, episode });
    const debridStreams = torrents.map((t) => toStream(t, baseUrl, season, episode));

    res.json({ streams: [...libStreams, ...localStreams, ...debridStreams] });
  } catch (err) {
    console.error('[stream] error:', err.message);
    res.json({ streams: [] });
  }
});

function localStream(f, baseUrl) {
  return {
    name: `CASTELLAR\n💾 Local`,
    title: `${f.name}\n${(f.length / 1073741824).toFixed(2)} GB · en tu PC`,
    url: `${baseUrl}/local/${f.infoHash}/${f.fileIdx}`,
    behaviorHints: { bingeGroup: 'local' },
  };
}

function libraryStream(f, baseUrl) {
  return {
    name: `CASTELLAR\n📁 Biblioteca`,
    title: `${f.name}\n${(f.size / 1073741824).toFixed(2)} GB · en tu PC`,
    url: `${baseUrl}/library/${f.id}`,
    behaviorHints: { bingeGroup: 'biblioteca' },
  };
}

const MIME = {
  mkv: 'video/x-matroska', mp4: 'video/mp4', m4v: 'video/mp4', mov: 'video/quicktime',
  avi: 'video/x-msvideo', webm: 'video/webm', ts: 'video/mp2t', mpg: 'video/mpeg',
  mpeg: 'video/mpeg', wmv: 'video/x-ms-wmv', flv: 'video/x-flv',
};
function mimeFor(name) {
  const ext = (String(name).split('.').pop() || '').toLowerCase();
  return MIME[ext] || 'application/octet-stream';
}

// --- streaming de ficheros locales (con soporte de range) ----------------
router.get('/local/:infoHash/:fileIdx', (req, res) => {
  const info = getFile(req.params.infoHash.toLowerCase(), Number(req.params.fileIdx));
  if (!info) return res.status(404).send('Fichero no disponible (¿descarga aún sin metadatos?)');

  const { file, length, name } = info;
  const range = req.headers.range;
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Type', mimeFor(name));

  if (range) {
    const m = /bytes=(\d+)-(\d*)/.exec(range);
    const start = m ? parseInt(m[1], 10) : 0;
    const end = m && m[2] ? parseInt(m[2], 10) : length - 1;
    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${length}`);
    res.setHeader('Content-Length', end - start + 1);
    file.createReadStream({ start, end }).pipe(res);
  } else {
    res.setHeader('Content-Length', length);
    file.createReadStream().pipe(res);
  }
});

// --- streaming de la biblioteca local (vídeos del usuario, con range) ----
router.get('/library/:id', (req, res) => {
  const f = getLibraryFile(req.params.id);
  if (!f) return res.status(404).send('Fichero no encontrado en la biblioteca');

  const total = f.size;
  const range = req.headers.range;
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Type', mimeFor(f.name));

  if (range) {
    const m = /bytes=(\d+)-(\d*)/.exec(range);
    const start = m ? parseInt(m[1], 10) : 0;
    const end = m && m[2] ? parseInt(m[2], 10) : total - 1;
    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
    res.setHeader('Content-Length', end - start + 1);
    fs.createReadStream(f.path, { start, end }).pipe(res);
  } else {
    res.setHeader('Content-Length', total);
    fs.createReadStream(f.path).pipe(res);
  }
});

// --- resolve --------------------------------------------------------------
// Resolución debrid bajo demanda + redirección 302 al enlace directo.
router.get('/resolve/:token', async (req, res) => {
  try {
    const url = await resolveStream(req.params.token);
    res.redirect(302, url);
  } catch (err) {
    console.error('[resolve] error:', err.message);
    res.status(502).send(`No se pudo reproducir: ${err.message}`);
  }
});

export default router;
