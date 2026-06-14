// Resolución debrid bajo demanda: convierte un torrent en un enlace directo
// reproducible. Se ejecuta cuando el usuario PULSA play en Stremio (no antes),
// para no resolver decenas de torrents en cada búsqueda.
//
// Estrategia: intenta TorBox primero (tiene cache fiable) y luego Real Debrid.

import { loadConfig, getSecret } from '../config/store.js';
import { getTorBox, getRealDebrid } from '../clients/index.js';
import { pickFile } from './files.js';

// --- token compacto para meter en la URL del stream ----------------------

export function encodeToken(payload) {
  const json = JSON.stringify(payload);
  return Buffer.from(json, 'utf8').toString('base64url');
}

export function decodeToken(token) {
  const json = Buffer.from(token, 'base64url').toString('utf8');
  return JSON.parse(json);
}

// --- resolución por servicio --------------------------------------------

async function resolveTorBox({ magnet, infoHash, season, episode }) {
  const tb = getTorBox();
  if (!tb.token) throw new Error('TorBox no configurado');

  // Añade (o reutiliza) el torrent.
  let created;
  try {
    created = await tb.createTorrent(magnet);
  } catch (e) {
    created = null;
  }

  // Localiza el torrent y sus ficheros en la cuenta.
  let torrentId = created?.torrent_id ?? created?.id;
  let files = created?.files;
  if (!files || torrentId == null) {
    const list = await tb.myList();
    const found = list.find((x) => (x.hash || '').toLowerCase() === infoHash);
    if (found) {
      torrentId = found.id;
      files = found.files;
    }
  }
  if (torrentId == null) throw new Error('TorBox no devolvió el torrent');

  const file = pickFile(files || [], { season, episode });
  if (!file) throw new Error('No se encontró fichero de vídeo en TorBox');

  const link = await tb.requestDownloadLink(torrentId, file.id);
  const url = typeof link === 'string' ? link : link?.url || link;
  if (!url) throw new Error('TorBox no devolvió enlace de descarga');
  return url;
}

async function resolveRealDebrid({ magnet, season, episode }) {
  const rd = getRealDebrid();
  if (!rd.token) throw new Error('Real Debrid no configurado');

  const added = await rd.addMagnet(magnet);
  let info = await rd.getTorrentInfo(added.id);

  // Elige el fichero (episodio o el más grande) y selecciónalo.
  const file = pickFile(info.files || [], { season, episode });
  const fileId = file ? file.id : 'all';
  await rd.selectFiles(added.id, String(fileId));

  info = await rd.getTorrentInfo(added.id);
  if (info.status !== 'downloaded') {
    // No está cacheado: habría que esperar a la descarga en RD.
    await rd.deleteTorrent(added.id).catch(() => {});
    throw new Error(
      'El torrent no está cacheado en Real Debrid (se descargaría primero). '
      + 'Prueba otra fuente o usa la descarga local (Hito 4).',
    );
  }

  const link = info.links && info.links[0];
  if (!link) throw new Error('Real Debrid no devolvió enlace');
  const un = await rd.unrestrictLink(link);
  if (!un.download) throw new Error('No se pudo desbloquear el enlace en Real Debrid');
  return un.download;
}

/**
 * Resuelve un token a una URL directa reproducible.
 * @returns {Promise<string>} URL
 */
export async function resolveStream(token) {
  const payload = decodeToken(token); // { magnet, infoHash, season, episode }
  const config = loadConfig();

  const errors = [];

  if (config.debrid.torbox.enabled && getSecret('debrid.torbox.token')) {
    try {
      return await resolveTorBox(payload);
    } catch (e) {
      errors.push(`TorBox: ${e.message}`);
    }
  }

  if (config.debrid.realdebrid.enabled && getSecret('debrid.realdebrid.token')) {
    try {
      return await resolveRealDebrid(payload);
    } catch (e) {
      errors.push(`Real Debrid: ${e.message}`);
    }
  }

  if (errors.length === 0) {
    throw new Error('No hay ningún servidor debrid configurado y activo.');
  }
  throw new Error(errors.join(' · '));
}
