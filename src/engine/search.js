// Orquestador de búsqueda: dado un ID de IMDb (+ temporada/episodio en series),
// consulta todas las fuentes activas, filtra, comprueba cache en debrid y ordena.

import { loadConfig, getSecret } from '../config/store.js';
import { getJackett, getProwlarr, getTorBox } from '../clients/index.js';
import { searchApibay } from '../clients/public/apibay.js';
import { getMeta } from './meta.js';
import { parseTitle } from './parse.js';
import { detectLanguage } from './language.js';
import { rankTorrents } from './rank.js';
import { resolveInfoHash } from './torrentfile.js';

/** Construye las consultas de texto a lanzar contra cada fuente. */
function buildQueries(type, name, year, season, episode) {
  const q = new Set();
  if (type === 'series' && season != null && episode != null) {
    const s = String(season).padStart(2, '0');
    const e = String(episode).padStart(2, '0');
    q.add(`${name} S${s}E${e}`);
    q.add(`${name} ${season}x${e}`);
    q.add(`${name} temporada ${season} castellano`);
    q.add(`${name} castellano`);
  } else {
    q.add(year ? `${name} ${year}` : name);
    q.add(`${name} castellano`);
    q.add(`${name} español`);
  }
  return [...q];
}

async function fromJackett(queries, type, season, episode, imdbId) {
  const jk = getJackett();
  const results = await Promise.allSettled(
    queries.map((query) => jk.search(query, { type, season, episode, imdbId })),
  );
  return results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
}

async function fromProwlarr(queries) {
  const pw = getProwlarr();
  const results = await Promise.allSettled(queries.map((query) => pw.search(query)));
  return results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
}

async function fromPublic(queries) {
  const results = await Promise.allSettled(queries.map((query) => searchApibay(query)));
  return results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
}

// Clave de deduplicado: infohash si lo hay, si no el enlace o el título.
const keyOf = (t) => t.infoHash || t.downloadUrl || t.title;

/** Quita duplicados por clave quedándose con el de más seeders. */
function dedupeBy(torrents) {
  const map = new Map();
  let n = 0;
  for (const t of torrents) {
    const key = keyOf(t) || `__${n++}`;
    const prev = map.get(key);
    if (!prev || (t.seeders || 0) > (prev.seeders || 0)) map.set(key, t);
  }
  return [...map.values()];
}

/** Descarga el .torrent de los resultados sin infohash para obtenerlo. */
async function enrichInfoHashes(torrents) {
  const need = torrents.filter((t) => !t.infoHash && t.downloadUrl).slice(0, 50);
  await Promise.allSettled(need.map(async (t) => {
    const info = await resolveInfoHash(t.downloadUrl);
    if (info) {
      t.infoHash = info.infoHash;
      if (!t.magnet) t.magnet = info.magnet;
    }
  }));
  return torrents;
}

/** Filtra por episodio (series), CAM y mínimo de seeders. */
function filterTorrents(torrents, { type, season, episode }, ranking) {
  return torrents.filter((t) => {
    if (!t.infoHash && !t.magnet) return false; // sin forma de reproducirlo
    if (ranking.excludeCam && t.parsed.source === 'CAM') return false;
    if ((t.seeders || 0) < (ranking.minSeeders || 0)) return false;

    if (type === 'series' && season != null) {
      const p = t.parsed;
      if (p.season !== season) return false; // temporada debe coincidir
      // episodio concreto, o pack de esa temporada (episodio nulo)
      if (p.episode != null && episode != null && p.episode !== episode) return false;
    }
    return true;
  });
}

/** Marca .cached usando TorBox (detector fiable). null si TorBox no está activo. */
async function checkCache(torrents) {
  const config = loadConfig();
  const tbEnabled = config.debrid.torbox.enabled && getSecret('debrid.torbox.token');
  if (!tbEnabled) {
    torrents.forEach((t) => { t.cached = null; });
    return torrents;
  }
  try {
    const tb = getTorBox();
    const hashes = torrents.map((t) => t.infoHash).filter(Boolean).slice(0, 100);
    const cachedMap = await tb.checkCached(hashes);
    torrents.forEach((t) => {
      t.cached = !!(cachedMap && cachedMap[t.infoHash]);
    });
  } catch {
    torrents.forEach((t) => { t.cached = null; });
  }
  return torrents;
}

/** Lanza las fuentes activas en paralelo para una lista de consultas. */
async function gatherFromSources(queries, { type = 'search', season, episode, imdbId } = {}) {
  const config = loadConfig();
  const tasks = [];
  if (config.indexers.jackett.enabled && getSecret('indexers.jackett.apiKey')) {
    tasks.push(fromJackett(queries, type, season, episode, imdbId));
  }
  if (config.indexers.prowlarr.enabled && getSecret('indexers.prowlarr.apiKey')) {
    tasks.push(fromProwlarr(queries));
  }
  if (config.indexers.publicSources.enabled) {
    tasks.push(fromPublic(queries));
  }
  const settled = await Promise.allSettled(tasks);
  return settled.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
}

/**
 * Pre-dedupe + resolver infohashes (.torrent) + dedupe final + análisis
 * (parse + idioma). Async porque puede descargar ficheros .torrent.
 */
async function enrichAndAnalyze(torrents) {
  torrents = dedupeBy(torrents);            // pre-dedupe (evita descargar repetidos)
  torrents = await enrichInfoHashes(torrents);
  torrents = dedupeBy(torrents);            // dedupe final (fusiona por infohash)
  return torrents.map((t) => {
    const parsed = parseTitle(t.title);
    parsed.language = detectLanguage(t.title);
    return { ...t, parsed };
  });
}

/**
 * Búsqueda principal (desde Stremio, por ID de IMDb).
 * @returns {Promise<{meta:object|null, torrents:Array}>}
 */
export async function searchStreams({ type, imdbId, season, episode }) {
  const config = loadConfig();
  const meta = await getMeta(type, imdbId);
  const name = meta?.name;
  if (!name) return { meta: null, torrents: [] };

  const queries = buildQueries(type, name, meta.year, season, episode);
  let torrents = await enrichAndAnalyze(await gatherFromSources(queries, { type, season, episode, imdbId }));

  torrents = filterTorrents(torrents, { type, season, episode }, config.ranking);
  await checkCache(torrents);
  torrents = rankTorrents(torrents, config.ranking).slice(0, config.ranking.maxResults || 30);

  return { meta, torrents };
}

/**
 * Búsqueda manual por texto libre (desde el dashboard). Sin filtro de episodio.
 * @param {string} query
 * @returns {Promise<{torrents:Array}>}
 */
export async function manualSearch(query) {
  const config = loadConfig();
  const clean = String(query || '').trim();
  if (!clean) return { torrents: [] };

  // Una consulta tal cual + otra sesgada a castellano.
  const queries = [...new Set([clean, `${clean} castellano`])];
  let torrents = await enrichAndAnalyze(await gatherFromSources(queries, { type: 'search' }));

  // Solo aplicamos CAM y mínimo de seeders (sin filtro de temporada/episodio).
  torrents = torrents.filter((t) => {
    if (!t.infoHash && !t.magnet) return false;
    if (config.ranking.excludeCam && t.parsed.source === 'CAM') return false;
    if ((t.seeders || 0) < (config.ranking.minSeeders || 0)) return false;
    return true;
  });
  await checkCache(torrents);
  torrents = rankTorrents(torrents, config.ranking).slice(0, config.ranking.maxResults || 30);

  return { torrents };
}
