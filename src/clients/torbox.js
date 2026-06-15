// Cliente de TorBox (API v1).
// Docs: https://api-docs.torbox.app/  ·  Auth: Bearer <token>
// Las respuestas vienen envueltas: { success, error, detail, data }.
//
// TorBox SÍ ofrece comprobación de cache (/torrents/checkcached), por lo que será
// el detector principal de "torrents ya cacheados" en el Hito 2.

import { requestJson } from './http.js';

const BASE = 'https://api.torbox.app/v1/api';

export class TorBox {
  constructor(token) {
    this.token = token;
  }

  headers(extra = {}) {
    return { Authorization: `Bearer ${this.token}`, ...extra };
  }

  /** Valida el token y devuelve datos de la cuenta. Lanza error si falla. */
  async testConnection() {
    if (!this.token) throw new Error('Falta el token de TorBox');
    const { ok, status, body } = await requestJson(`${BASE}/user/me`, {
      headers: this.headers(),
    });
    if (status === 401 || status === 403) {
      throw new Error('Token de TorBox inválido o sin permisos');
    }
    if (!ok) throw new Error(`TorBox respondió HTTP ${status}`);
    if (body && body.success === false) {
      throw new Error(`TorBox: ${body.detail || body.error || 'error desconocido'}`);
    }
    const d = (body && body.data) || {};
    return {
      service: 'torbox',
      email: d.email,
      plan: d.plan, // 0=free, 1+ = planes de pago
      premium: Number(d.plan) > 0,
      expiration: d.premium_expires_at || d.cooldown_until || null,
    };
  }

  // --- métodos para el Hito 2 -------------------------------------------

  /**
   * Comprueba qué infohashes están cacheados.
   * @param {string[]} hashes
   * @returns {Promise<object>} mapa hash -> info (vacío si no cacheado)
   */
  async checkCached(hashes) {
    const list = Array.isArray(hashes) ? hashes : [hashes];
    const params = new URLSearchParams();
    for (const h of list) params.append('hash', h.toLowerCase());
    params.append('format', 'object');
    params.append('list_files', 'false');
    const { ok, status, body } = await requestJson(
      `${BASE}/torrents/checkcached?${params.toString()}`,
      { headers: this.headers() },
    );
    if (!ok) throw new Error(`checkcached falló (HTTP ${status})`);
    return (body && body.data) || {};
  }

  /** Crea/añade un torrent por magnet. Devuelve data con torrent_id. */
  async createTorrent(magnet) {
    // TorBox espera multipart/form-data. No fijamos Content-Type: fetch pone el
    // boundary automáticamente al pasarle un FormData.
    const form = new FormData();
    form.append('magnet', magnet);
    form.append('seed', '3'); // 3 = sembrar según ajustes de la cuenta
    const { ok, status, body } = await requestJson(`${BASE}/torrents/createtorrent`, {
      method: 'POST',
      headers: this.headers(),
      body: form,
    });
    if (!ok) {
      const detail = body && (body.detail || body.error);
      throw new Error(`TorBox createtorrent: ${detail || 'HTTP ' + status}`);
    }
    return (body && body.data) || body;
  }

  /** Obtiene el enlace directo de descarga de un fichero de un torrent. */
  async requestDownloadLink(torrentId, fileId) {
    const params = new URLSearchParams({
      token: this.token,
      torrent_id: String(torrentId),
      file_id: String(fileId),
    });
    const { ok, status, body } = await requestJson(
      `${BASE}/torrents/requestdl?${params.toString()}`,
      { headers: this.headers() },
    );
    if (!ok) throw new Error(`requestdl falló (HTTP ${status})`);
    return (body && body.data) || body; // URL directa
  }

  /** Lista los torrents de la cuenta (bypass_cache para datos frescos). */
  async myList() {
    const { ok, status, body } = await requestJson(
      `${BASE}/torrents/mylist?bypass_cache=true`,
      { headers: this.headers() },
    );
    if (!ok) throw new Error(`mylist falló (HTTP ${status})`);
    return (body && body.data) || [];
  }
}
