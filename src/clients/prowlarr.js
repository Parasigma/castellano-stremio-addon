// Cliente de Prowlarr (API v1, JSON).
// Auth por cabecera X-Api-Key (también admite ?apikey=).
// Docs: https://prowlarr.com/docs/api/

import { requestJson } from './http.js';

export class Prowlarr {
  constructor(url, apiKey) {
    this.url = (url || '').replace(/\/+$/, '');
    this.apiKey = apiKey;
  }

  headers() {
    return { 'X-Api-Key': this.apiKey };
  }

  /** Valida URL + API key consultando el estado del sistema y nº de indexadores. */
  async testConnection() {
    if (!this.url) throw new Error('Falta la URL de Prowlarr');
    if (!this.apiKey) throw new Error('Falta la API Key de Prowlarr');

    const status = await requestJson(`${this.url}/api/v1/system/status`, {
      headers: this.headers(),
    });
    if (status.status === 401) throw new Error('API Key de Prowlarr inválida');
    if (!status.ok) throw new Error(`Prowlarr respondió HTTP ${status.status}`);

    // nº de indexadores configurados (informativo)
    let indexers = 0;
    try {
      const idx = await requestJson(`${this.url}/api/v1/indexer`, { headers: this.headers() });
      if (idx.ok && Array.isArray(idx.body)) indexers = idx.body.length;
    } catch { /* informativo, ignoramos */ }

    return {
      service: 'prowlarr',
      url: this.url,
      version: status.body?.version,
      indexers,
    };
  }

  /**
   * Busca en todos los indexadores. Devuelve torrents normalizados.
   * @returns {Promise<Array>}
   */
  async search(query, { categories } = {}) {
    const params = new URLSearchParams({ query });
    // 2000 = Movies, 5000 = TV (categorías Newznab estándar)
    for (const c of categories || [2000, 5000]) params.append('categories', String(c));
    params.append('type', 'search');
    const { ok, status, body } = await requestJson(
      `${this.url}/api/v1/search?${params.toString()}`,
      { headers: this.headers(), timeout: 25000 },
    );
    if (!ok) throw new Error(`Búsqueda en Prowlarr falló (HTTP ${status})`);
    return (Array.isArray(body) ? body : []).map(normalizeProwlarrResult).filter(Boolean);
  }
}

function normalizeProwlarrResult(r) {
  const magnet = r.magnetUrl || r.guid?.startsWith?.('magnet:') ? r.magnetUrl || r.guid : null;
  return {
    source: 'prowlarr',
    indexer: r.indexer,
    title: r.title,
    size: r.size,
    seeders: r.seeders ?? 0,
    leechers: r.leechers ?? 0,
    magnet,
    infoHash: (r.infoHash || extractInfoHash(magnet) || '').toLowerCase() || null,
    downloadUrl: r.downloadUrl || null,
    publishDate: r.publishDate,
  };
}

function extractInfoHash(magnet) {
  if (!magnet) return null;
  const m = magnet.match(/btih:([a-fA-F0-9]{40}|[a-zA-Z2-7]{32})/);
  return m ? m[1] : null;
}
