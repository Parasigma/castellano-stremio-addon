// Endpoints del protocolo Stremio: manifest, stream y resolve.

import express from 'express';
import { searchStreams } from '../../engine/search.js';
import { getMeta } from '../../engine/meta.js';
import { encodeToken, resolveStream } from '../../engine/resolve.js';
import { ensureMagnet } from '../../engine/magnet.js';
import { LANG_LABEL } from '../../engine/language.js';
import { matchLocalFiles, getFile } from '../../download/manager.js';
import { getLanIps } from '../tls.js';
import { loadConfig } from '../../config/store.js';

const router = express.Router();

const MANIFEST = {
  id: 'org.castellano.debrid.addon',
  version: '1.1.0',
  name: 'Castellano (Debrid)',
  description: 'Addon centrado en castellano (doblado y VOSE) con Real Debrid, '
    + 'TorBox e indexadores Jackett/Prowlarr. Prioriza el español de España.',
  logo: 'https://dl.strem.io/addon-logo.png',
  resources: ['stream'],
  types: ['movie', 'series'],
  idPrefixes: ['tt'],
  catalogs: [],
  behaviorHints: { configurable: true, configurationRequired: false },
};

router.get('/manifest.json', (req, res) => {
  res.json(MANIFEST);
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
    name: `Castellano\n${lang} ${quality}`.trim(),
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
    const localStreams = meta
      ? matchLocalFiles({ name: meta.name, season, episode }).map((f) => localStream(f, localBase))
      : [];

    // 2) Streams desde debrid/indexadores.
    const { torrents } = await searchStreams({ type, imdbId, season, episode });
    const debridStreams = torrents.map((t) => toStream(t, baseUrl, season, episode));

    res.json({ streams: [...localStreams, ...debridStreams] });
  } catch (err) {
    console.error('[stream] error:', err.message);
    res.json({ streams: [] });
  }
});

function localStream(f, baseUrl) {
  return {
    name: `Castellano\n💾 Local`,
    title: `${f.name}\n${(f.length / 1073741824).toFixed(2)} GB · en tu PC`,
    url: `${baseUrl}/local/${f.infoHash}/${f.fileIdx}`,
    behaviorHints: { bingeGroup: 'local' },
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
