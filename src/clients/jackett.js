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
   * Busca torrents por texto plano (t=search). Usamos búsqueda de texto en lugar
   * de tvsearch/movie porque la mayoría de trackers españoles (Cardigann) NO
   * soportan tvsearch ni imdbid; el episodio/temporada va en el texto de la
   * consulta y luego se filtra analizando el título.
   * @returns {Promise<Array>} torrents normalizados (ver torznab.js)
   */
  async search(query) {
    const res = await request(this.torznabUrl({ t: 'search', q: query }), { timeout: 25000 });
    if (!res.ok) throw new Error(`Búsqueda en Jackett falló (HTTP ${res.status})`);
    const xml = await res.text();
    return parseTorznab(xml, 'jackett');
  }
}
