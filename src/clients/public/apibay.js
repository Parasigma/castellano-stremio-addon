// Fuente pública de apoyo: apibay (API JSON pública).
// Devuelve infohash directamente, ideal para comprobar cache en debrid.
// Mayormente contenido en inglés; el castellano viene sobre todo de Jackett/Prowlarr.

import { requestJson } from '../http.js';
import { buildMagnet } from '../../engine/magnet.js';

const BASE = 'https://apibay.org';
const NULL_HASH = '0000000000000000000000000000000000000000';

/**
 * @param {string} query
 * @returns {Promise<Array>} torrents normalizados
 */
export async function searchApibay(query) {
  try {
    const { ok, body } = await requestJson(`${BASE}/q.php?q=${encodeURIComponent(query)}`, {
      timeout: 12000,
    });
    if (!ok || !Array.isArray(body)) return [];
    return body
      .filter((r) => r.info_hash && r.info_hash !== NULL_HASH)
      .map((r) => ({
        source: 'public',
        indexer: 'apibay',
        title: r.name,
        size: Number(r.size) || 0,
        seeders: Number(r.seeders) || 0,
        leechers: Number(r.leechers) || 0,
        infoHash: r.info_hash.toLowerCase(),
        magnet: buildMagnet(r.info_hash.toLowerCase(), r.name),
        downloadUrl: null,
        publishDate: r.added ? new Date(Number(r.added) * 1000).toISOString() : null,
      }));
  } catch {
    return [];
  }
}
