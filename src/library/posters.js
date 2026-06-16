// Resuelve imágenes (poster/thumbnail) y nombre bonito para los vídeos de la
// biblioteca: detecta serie/película + temporada/episodio del nombre del fichero
// y lo busca en Cinemeta (la base de metadatos de Stremio). Para series usa el
// thumbnail real del capítulo. Cachea para no repetir peticiones.

import { requestJson } from '../clients/http.js';
import { parseTitle } from '../engine/parse.js';

const CINEMETA = 'https://v3-cinemeta.strem.io';

const searchCache = new Map();      // 'type:nombre' -> Promise<hit|null>
const seriesMetaCache = new Map();  // ttid -> Promise<meta|null>
const fileCache = new Map();        // fileId -> Promise<result>

function norm(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
function pad(n) { return String(n).padStart(2, '0'); }

// Extrae el título (serie/película) cortando en el primer marcador de
// temporada/episodio/año/calidad.
function extractTitle(rel) {
  let s = String(rel || '').replace(/\.[^.]+$/, '').replace(/[._/\\-]+/g, ' ');
  s = s.split(/\b(s\d{1,2}\s?e\d{1,3}|\d{1,2}x\d{1,3}|temporada|season|cap[ií]tulo|\d{3,4}p|x?26[45]|hevc|19\d\d|20\d\d)\b/i)[0];
  return s.replace(/\s+/g, ' ').trim();
}

function cinemetaSearch(type, query) {
  const key = `${type}:${norm(query)}`;
  if (searchCache.has(key)) return searchCache.get(key);
  const p = (async () => {
    try {
      const { ok, body } = await requestJson(
        `${CINEMETA}/catalog/${type}/top/search=${encodeURIComponent(query)}.json`, { timeout: 12000 });
      if (ok && body && Array.isArray(body.metas) && body.metas.length) {
        const m = body.metas[0];
        return { id: m.id, name: m.name, poster: m.poster, background: m.background };
      }
    } catch { /* ignora */ }
    return null;
  })();
  searchCache.set(key, p);
  return p;
}

function getSeriesMeta(ttid) {
  if (seriesMetaCache.has(ttid)) return seriesMetaCache.get(ttid);
  const p = (async () => {
    try {
      const { ok, body } = await requestJson(`${CINEMETA}/meta/series/${ttid}.json`, { timeout: 12000 });
      if (ok && body && body.meta) return body.meta;
    } catch { /* ignora */ }
    return null;
  })();
  seriesMetaCache.set(ttid, p);
  return p;
}

async function doResolve(file) {
  const rel = file.rel || file.name;
  const parsed = parseTitle(rel);
  const title = extractTitle(rel);
  const empty = { poster: null, posterShape: 'square', name: null, background: null };
  if (!title) return empty;

  if (parsed.season != null && parsed.episode != null) {
    const hit = await cinemetaSearch('series', title);
    if (!hit) return empty;
    const meta = await getSeriesMeta(hit.id);
    const vid = meta && Array.isArray(meta.videos)
      ? meta.videos.find((v) => Number(v.season) === parsed.season
        && (Number(v.episode) === parsed.episode || Number(v.number) === parsed.episode))
      : null;
    const thumb = vid && vid.thumbnail;
    return {
      poster: thumb || hit.poster || null,
      posterShape: thumb ? 'landscape' : 'poster',
      name: `${hit.name} ${parsed.season}x${pad(parsed.episode)}${vid && vid.name ? ' · ' + vid.name : ''}`,
      background: thumb || (meta && meta.background) || hit.background || null,
    };
  }

  const hit = await cinemetaSearch('movie', title);
  if (!hit) return empty;
  return { poster: hit.poster || null, posterShape: 'poster', name: hit.name, background: hit.background || null };
}

/** Devuelve {poster, posterShape, name, background} para un fichero (cacheado). */
export function resolveCatalogMeta(file) {
  if (fileCache.has(file.id)) return fileCache.get(file.id);
  const p = doResolve(file).catch(() => ({ poster: null, posterShape: 'square', name: null, background: null }));
  fileCache.set(file.id, p);
  return p;
}
