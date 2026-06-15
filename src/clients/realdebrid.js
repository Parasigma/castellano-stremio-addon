// Cliente de Real Debrid (API REST 1.0).
// Docs: https://api.real-debrid.com/  ·  Auth: Bearer <token>
//
// NOTA: Real Debrid retiró /torrents/instantAvailability (2024-2025), por lo que
// la comprobación de cache instantánea ya no es fiable. La estrategia (Hito 2)
// será añadir el magnet y consultar el estado; para detección de cache se usará
// TorBox como detector principal.

import { request, requestJson } from './http.js';

const BASE = 'https://api.real-debrid.com/rest/1.0';

export class RealDebrid {
  constructor(token) {
    this.token = token;
  }

  headers(extra = {}) {
    return { Authorization: `Bearer ${this.token}`, ...extra };
  }

  /** Valida el token y devuelve datos de la cuenta. Lanza error si falla. */
  async testConnection() {
    if (!this.token) throw new Error('Falta el token de Real Debrid');
    const { ok, status, body } = await requestJson(`${BASE}/user`, {
      headers: this.headers(),
    });
    if (status === 401 || status === 403) {
      throw new Error('Token de Real Debrid inválido o sin permisos');
    }
    if (!ok) throw new Error(`Real Debrid respondió HTTP ${status}`);
    return {
      service: 'realdebrid',
      username: body.username,
      email: body.email,
      premium: body.type === 'premium',
      type: body.type,
      expiration: body.expiration, // ISO; fin de la suscripción premium
      points: body.points,
    };
  }

  // --- métodos para el Hito 2 (resolución de streams) --------------------

  /** Añade un magnet/infohash. Devuelve { id, uri }. */
  async addMagnet(magnet) {
    const params = new URLSearchParams({ magnet });
    const { ok, status, body } = await requestJson(`${BASE}/torrents/addMagnet`, {
      method: 'POST',
      headers: this.headers({ 'Content-Type': 'application/x-www-form-urlencoded' }),
      body: params.toString(),
    });
    if (!ok) throw new Error(`addMagnet falló (HTTP ${status})`);
    return body; // { id, uri }
  }

  /** Info de un torrent (estado, ficheros, links). */
  async getTorrentInfo(id) {
    const { ok, status, body } = await requestJson(`${BASE}/torrents/info/${id}`, {
      headers: this.headers(),
    });
    if (!ok) throw new Error(`getTorrentInfo falló (HTTP ${status})`);
    return body;
  }

  /** Selecciona ficheros a descargar ('all' o "1,3,4"). */
  async selectFiles(id, files = 'all') {
    const params = new URLSearchParams({ files });
    const { ok, status } = await requestJson(`${BASE}/torrents/selectFiles/${id}`, {
      method: 'POST',
      headers: this.headers({ 'Content-Type': 'application/x-www-form-urlencoded' }),
      body: params.toString(),
    });
    if (!ok) throw new Error(`selectFiles falló (HTTP ${status})`);
    return true;
  }

  /** Convierte un link de RD en un enlace directo reproducible. */
  async unrestrictLink(link) {
    const params = new URLSearchParams({ link });
    const { ok, status, body } = await requestJson(`${BASE}/unrestrict/link`, {
      method: 'POST',
      headers: this.headers({ 'Content-Type': 'application/x-www-form-urlencoded' }),
      body: params.toString(),
    });
    if (!ok) throw new Error(`unrestrictLink falló (HTTP ${status})`);
    return body; // { download, filename, filesize, ... }
  }

  /** Lista los torrents de la cuenta (con estado y progreso). */
  async listTorrents() {
    const { ok, status, body } = await requestJson(`${BASE}/torrents`, {
      headers: this.headers(),
    });
    if (!ok) throw new Error(`/torrents falló (HTTP ${status})`);
    return Array.isArray(body) ? body : [];
  }

  /** Borra un torrent de la cuenta. */
  async deleteTorrent(id) {
    await request(`${BASE}/torrents/delete/${id}`, {
      method: 'DELETE',
      headers: this.headers(),
    });
    return true;
  }
}
