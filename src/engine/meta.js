// Resuelve el ID de IMDb (tt...) a nombre y año usando Cinemeta,
// el servicio de metadatos oficial de Stremio. Necesario porque Stremio
// pide streams por ID, pero los indexadores buscan por nombre.

import { requestJson } from '../clients/http.js';

const CINEMETA = 'https://v3-cinemeta.strem.io';

const cache = new Map();

/**
 * @param {'movie'|'series'} type
 * @param {string} imdbId  p.ej. "tt1442437"
 * @returns {Promise<{name:string, year:string, originalName:string}|null>}
 */
export async function getMeta(type, imdbId) {
  const key = `${type}:${imdbId}`;
  if (cache.has(key)) return cache.get(key);

  let result = null;
  try {
    const { ok, body } = await requestJson(`${CINEMETA}/meta/${type}/${imdbId}.json`);
    if (ok && body && body.meta) {
      const m = body.meta;
      result = {
        name: m.name,
        originalName: m.originalName || m.name,
        year: String(m.year || m.releaseInfo || '').slice(0, 4),
      };
    }
  } catch {
    result = null;
  }

  cache.set(key, result);
  return result;
}
