// Cliente de Jackett (API Torznab).
// Jackett expone un endpoint agregado "all" que busca en todos los indexadores
// configurados:  {url}/api/v2.0/indexers/all/results/torznab/api
// Auth por query string: ?apikey=...

import { request } from './http.js';
import { parseTorznab } from './torznab.js';

export class Jackett {
  constructor(url, apiKey) {
    this.url = (url || '').replace(/\/+$/, '');
    this.apiKey = apiKey;
  }

  torznabUrl(params) {
    const qs = new URLSearchParams({ apikey: this.apiKey, ...params });
    return `${this.url}/api/v2.0/indexers/all/results/torznab/api?${qs.toString()}`;
  }

  /** Valida URL + API key consultando las capacidades (t=caps). */
  async testConnection() {
    if (!this.url) throw new Error('Falta la URL de Jackett');
    if (!this.apiKey) throw new Error('Falta la API Key de Jackett');
    const res = await request(this.torznabUrl({ t: 'caps' }));
    const text = await res.text();
    if (res.status === 401 || /unauthor|invalid api/i.test(text)) {
      throw new Error('API Key de Jackett inválida');
    }
    if (!res.ok) throw new Error(`Jackett respondió HTTP ${res.status}`);
    if (!/<caps/i.test(text)) {
      throw new Error('Respuesta inesperada de Jackett (¿es la URL correcta?)');
    }
    // nº de categorías soportadas como dato informativo
    const cats = (text.match(/<category /gi) || []).length;
    return { service: 'jackett', url: this.url, categories: cats };
  }

  /**
   * Busca torrents. type: 'movie' | 'series' | 'search'.
   * @returns {Promise<Array>} torrents normalizados (ver torznab.js)
   */
  async search(query, { type = 'search', season, episode, imdbId } = {}) {
    const params = { t: type === 'movie' ? 'movie' : type === 'series' ? 'tvsearch' : 'search', q: query };
    if (season != null) params.season = season;
    if (episode != null) params.ep = episode;
    if (imdbId) params.imdbid = imdbId.replace('tt', '');
    const res = await request(this.torznabUrl(params), { timeout: 25000 });
    if (!res.ok) throw new Error(`Búsqueda en Jackett falló (HTTP ${res.status})`);
    const xml = await res.text();
    return parseTorznab(xml, 'jackett');
  }
}
