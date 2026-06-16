// API de configuración usada por el dashboard.

import express from 'express';
import { getPublicConfig, updateConfig, loadConfig, getSecret, MASK } from '../../config/store.js';
import { getRealDebrid, getTorBox, getJackett, getProwlarr } from '../../clients/index.js';
import { manualSearch } from '../../engine/search.js';
import { ensureMagnet } from '../../engine/magnet.js';
import { LANG_LABEL } from '../../engine/language.js';
import { addTorrent, listDownloads, removeDownload } from '../../download/manager.js';
import { libraryInfo, rescan, listAll } from '../../library/scanner.js';
import { convert, getJobs, ffmpegAvailable } from '../../library/converter.js';
import { getLanIps, getNetworkInterfaces } from '../tls.js';
import { getTunnelInfo } from '../tunnel.js';

import { VERSION } from '../../version.js';

export { VERSION };

const router = express.Router();

// Información de red para instalar el addon en Stremio (IP, URLs, deep link).
router.get('/network', (req, res) => {
  const c = loadConfig();
  const ips = getLanIps();
  const primaryIp = ips[0] || '127.0.0.1';
  const port = c.server.port;
  const manifestUrls = [`http://${primaryIp}:${port}/manifest.json`,
    ...ips.slice(1).map((ip) => `http://${ip}:${port}/manifest.json`)];
  const localUrl = `http://127.0.0.1:${port}/manifest.json`;
  res.json({
    version: VERSION,
    lanIps: ips,
    interfaces: getNetworkInterfaces(),
    port,
    https: c.server.https,
    // Para instalar en el Stremio de ESTE MISMO PC (evita restricciones de http).
    localUrl,
    localDeepLink: `stremio://127.0.0.1:${port}/manifest.json`,
    // Para la TV u otros dispositivos de la red.
    manifestUrl: manifestUrls[0],
    manifestUrls,
    // Deep link que abre Stremio e instala el addon directamente.
    deepLink: `stremio://${primaryIp}:${port}/manifest.json`,
    webInstall: `https://web.stremio.com/#/addons?addon=${encodeURIComponent(manifestUrls[0])}`,
    // Túnel público (HTTPS) para móvil/TV/internet.
    tunnel: (() => {
      const t = getTunnelInfo();
      return {
        enabled: !!(c.server.tunnel && c.server.tunnel.enabled),
        status: t.status,
        error: t.error,
        manifestUrl: t.url ? `${t.url}/manifest.json` : null,
        deepLink: t.url ? `stremio://${t.url.replace(/^https?:\/\//, '')}/manifest.json` : null,
      };
    })(),
    // Reproductor web privado (para ver la biblioteca desde fuera, con contraseña).
    player: (() => {
      const t = getTunnelInfo();
      return {
        configured: !!getSecret('player.password'),
        localUrl: `${localUrl.replace('/manifest.json', '')}/player`,
        remoteUrl: t.url ? `${t.url}/player` : null,
      };
    })(),
    firewallCmd: `netsh advfirewall firewall add rule name="Stremio Addon Castellano" `
      + `dir=in action=allow protocol=TCP localport=${port}`,
  });
});

// Formatea un torrent para la tabla del buscador del dashboard.
function toSearchResult(t) {
  return {
    title: t.title,
    indexer: t.indexer || t.source,
    languageCategory: t.parsed.language.category,
    languageLabel: LANG_LABEL[t.parsed.language.category] || t.parsed.language.category,
    quality: t.parsed.quality,
    source: t.parsed.source,
    codec: t.parsed.codec,
    hdr: t.parsed.hdr,
    season: t.parsed.season,
    episode: t.parsed.episode,
    isPack: t.parsed.isPack,
    size: t.size,
    seeders: t.seeders || 0,
    cached: t.cached,
    infoHash: t.infoHash,
    magnet: ensureMagnet(t),
  };
}

// Devuelve el valor escrito en el formulario si es real, o el guardado en su lugar.
function pickSecret(incoming, field) {
  if (incoming && incoming !== MASK) return incoming;
  return getSecret(field);
}

// Estado general: qué hay configurado (sin exponer secretos).
router.get('/status', (req, res) => {
  const c = loadConfig();
  res.json({
    version: VERSION,
    hito: 6,
    debrid: {
      realdebrid: c.debrid.realdebrid.enabled && !!c.debrid.realdebrid.token,
      torbox: c.debrid.torbox.enabled && !!c.debrid.torbox.token,
    },
    indexers: {
      jackett: c.indexers.jackett.enabled && !!c.indexers.jackett.apiKey,
      prowlarr: c.indexers.prowlarr.enabled && !!c.indexers.prowlarr.apiKey,
      publicSources: c.indexers.publicSources.enabled,
    },
  });
});

// Leer config (enmascarada).
router.get('/config', (req, res) => {
  res.json(getPublicConfig());
});

// Guardar config (parche parcial).
router.post('/config', (req, res) => {
  try {
    const updated = updateConfig(req.body || {});
    res.json({ ok: true, config: updated });
  } catch (err) {
    res.status(400).json({ ok: false, error: String(err.message || err) });
  }
});

// Probar conexión de un servicio. Usa los valores enviados en el body si están
// presentes (para probar antes de guardar) o, si no, los guardados.
router.post('/test/:service', async (req, res) => {
  const { service } = req.params;
  const c = loadConfig();
  const b = req.body || {};
  try {
    let result;
    switch (service) {
      case 'realdebrid':
        result = await getRealDebrid(pickSecret(b.token, 'debrid.realdebrid.token')).testConnection();
        break;
      case 'torbox':
        result = await getTorBox(pickSecret(b.token, 'debrid.torbox.token')).testConnection();
        break;
      case 'jackett':
        result = await getJackett(
          b.url || c.indexers.jackett.url,
          pickSecret(b.apiKey, 'indexers.jackett.apiKey'),
        ).testConnection();
        break;
      case 'prowlarr':
        result = await getProwlarr(
          b.url || c.indexers.prowlarr.url,
          pickSecret(b.apiKey, 'indexers.prowlarr.apiKey'),
        ).testConnection();
        break;
      default:
        return res.status(404).json({ ok: false, error: `Servicio desconocido: ${service}` });
    }
    res.json({ ok: true, result });
  } catch (err) {
    res.status(200).json({ ok: false, error: String(err.message || err) });
  }
});

// --- Buscador manual -----------------------------------------------------

// Busca torrents por texto libre en los indexadores activos.
router.post('/search', async (req, res) => {
  const query = (req.body && req.body.query) || '';
  try {
    const { torrents } = await manualSearch(query);
    res.json({ ok: true, results: torrents.map(toSearchResult) });
  } catch (err) {
    res.status(200).json({ ok: false, error: String(err.message || err) });
  }
});

// Envía un torrent (magnet/infohash) a un servidor debrid para que lo cachee.
router.post('/debrid/add', async (req, res) => {
  const { magnet, service } = req.body || {};
  if (!magnet) return res.status(400).json({ ok: false, error: 'Falta el magnet' });
  const c = loadConfig();
  try {
    let result;
    if (service === 'torbox') {
      if (!(c.debrid.torbox.enabled && getSecret('debrid.torbox.token'))) {
        return res.status(200).json({ ok: false, error: 'TorBox no está configurado/activo' });
      }
      result = await getTorBox().createTorrent(magnet);
    } else if (service === 'realdebrid') {
      if (!(c.debrid.realdebrid.enabled && getSecret('debrid.realdebrid.token'))) {
        return res.status(200).json({ ok: false, error: 'Real Debrid no está configurado/activo' });
      }
      const rd = getRealDebrid();
      const added = await rd.addMagnet(magnet);
      await rd.selectFiles(added.id, 'all').catch(() => {});
      result = added;
    } else {
      return res.status(400).json({ ok: false, error: 'Servicio desconocido' });
    }
    res.json({ ok: true, result });
  } catch (err) {
    res.status(200).json({ ok: false, error: String(err.message || err) });
  }
});

// Estado/progreso de los torrents en los debrid, indexado por infohash.
// Lo usa el buscador para mostrar el progreso y pasar de "No cacheado" a "Cacheado".
router.get('/debrid/status', async (req, res) => {
  const c = loadConfig();
  const byHash = {};

  if (c.debrid.torbox.enabled && getSecret('debrid.torbox.token')) {
    try {
      const list = await getTorBox().myList();
      for (const t of Array.isArray(list) ? list : []) {
        const h = (t.hash || '').toLowerCase();
        if (!h) continue;
        const ready = !!t.download_finished || ['completed', 'cached', 'uploading'].includes(t.download_state);
        byHash[h] = {
          provider: 'TorBox',
          progress: Math.round((Number(t.progress) || 0) * 100),
          ready,
          state: t.download_state || (ready ? 'completado' : 'descargando'),
          speed: Number(t.download_speed) || 0,
          eta: Number(t.eta) || 0,
        };
      }
    } catch { /* ignora */ }
  }

  if (c.debrid.realdebrid.enabled && getSecret('debrid.realdebrid.token')) {
    try {
      const list = await getRealDebrid().listTorrents();
      for (const t of list) {
        const h = (t.hash || '').toLowerCase();
        if (!h || byHash[h]) continue;
        byHash[h] = {
          provider: 'Real Debrid',
          progress: Math.round(Number(t.progress) || 0),
          ready: t.status === 'downloaded',
          state: t.status || 'descargando',
          speed: Number(t.speed) || 0,
          eta: 0,
        };
      }
    } catch { /* ignora */ }
  }

  res.json({ ok: true, byHash });
});

// --- Biblioteca local -----------------------------------------------------
router.get('/library', (req, res) => {
  res.json({ ok: true, ...libraryInfo() });
});

router.post('/library/rescan', (req, res) => {
  const count = rescan();
  res.json({ ok: true, count });
});

// Lista todos los vídeos de la biblioteca (para el conversor del panel).
router.get('/library/list', (req, res) => {
  res.json({ ok: true, videos: listAll() });
});

// --- Conversor a MP4 (para iPad) -----------------------------------------
router.get('/convert', async (req, res) => {
  res.json({ ok: true, ffmpeg: await ffmpegAvailable(), jobs: getJobs() });
});

router.post('/convert/:id', async (req, res) => {
  if (!(await ffmpegAvailable())) {
    return res.status(200).json({ ok: false, error: 'ffmpeg no está instalado. Vuelve a ejecutar el instalador (INSTALAR.bat).' });
  }
  try {
    const job = await convert(req.params.id);
    res.json({ ok: true, job });
  } catch (err) {
    res.status(200).json({ ok: false, error: String(err.message || err) });
  }
});

// --- Descargas locales ---------------------------------------------------

// Inicia una descarga al PC.
router.post('/downloads', async (req, res) => {
  const { magnet } = req.body || {};
  if (!magnet) return res.status(400).json({ ok: false, error: 'Falta el magnet' });
  try {
    const info = await addTorrent(magnet);
    res.json({ ok: true, download: info });
  } catch (err) {
    res.status(200).json({ ok: false, error: String(err.message || err) });
  }
});

// Lista las descargas con su progreso.
router.get('/downloads', (req, res) => {
  res.json({ ok: true, downloads: listDownloads() });
});

// Elimina una descarga (con ?files=1 borra también del disco).
router.delete('/downloads/:infoHash', async (req, res) => {
  const deleteFiles = req.query.files === '1' || req.query.files === 'true';
  const removed = await removeDownload(req.params.infoHash.toLowerCase(), deleteFiles);
  res.json({ ok: true, removed });
});

export default router;
