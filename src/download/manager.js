// Gestor de descargas locales con WebTorrent.
// Descarga torrents al disco del PC y permite hacer streaming de los ficheros
// (con soporte de "range") para que la TV los reproduzca sin pasar por debrid.

import WebTorrent from 'webtorrent';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../config/store.js';
import { extractInfoHash } from '../engine/magnet.js';
import { parseTitle } from '../engine/parse.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_FILE = path.resolve(__dirname, '../../config/downloads.json');

let client = null;
let guardInstalled = false;

// Red de seguridad: un error interno de WebTorrent (tiene bugs intermitentes)
// no debe tumbar todo el addon. Solo se ignoran errores de la pila de torrents.
function installCrashGuard() {
  if (guardInstalled) return;
  guardInstalled = true;
  process.on('uncaughtException', (err) => {
    const stack = (err && err.stack) || '';
    if (/webtorrent|torrent\.js|bittorrent|ut_metadata|chunk-store|memory-chunk/i.test(stack)) {
      console.error('[download] Error de WebTorrent ignorado (el addon sigue activo):', err.message);
      return;
    }
    console.error('Excepción no capturada:', err);
    process.exit(1);
  });
}

function getClient() {
  if (!client) {
    installCrashGuard();
    client = new WebTorrent();
    client.on('error', (e) => console.error('[download] cliente:', e.message));
  }
  return client;
}

function downloadDir() {
  const p = loadConfig().download.path;
  if (p && !fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
  return p;
}

// --- persistencia de la lista de magnets (para re-añadir al reiniciar) ----

function loadMagnets() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveMagnet(magnet) {
  const list = loadMagnets();
  const ih = extractInfoHash(magnet);
  if (!list.some((m) => extractInfoHash(m) === ih)) {
    list.push(magnet);
    fs.writeFileSync(STATE_FILE, JSON.stringify(list, null, 2));
  }
}

function removeMagnet(infoHash) {
  const list = loadMagnets().filter((m) => extractInfoHash(m) !== infoHash);
  fs.writeFileSync(STATE_FILE, JSON.stringify(list, null, 2));
}

// --- info pública de un torrent ------------------------------------------

function infoOf(t) {
  return {
    infoHash: t.infoHash,
    name: t.name || '(obteniendo metadatos…)',
    progress: Math.round((t.progress || 0) * 1000) / 10,
    downloadSpeed: t.downloadSpeed || 0,
    numPeers: t.numPeers || 0,
    downloaded: t.downloaded || 0,
    length: t.length || 0,
    timeRemaining: t.timeRemaining || 0,
    done: !!t.done,
    ready: !!t.ready,
    files: (t.files || []).map((f, idx) => ({
      idx,
      name: f.name,
      length: f.length,
      progress: Math.round((f.progress || 0) * 1000) / 10,
    })),
  };
}

function findTorrent(infoHash) {
  const c = getClient();
  return c.torrents.find((t) => t.infoHash === infoHash) || null;
}

// --- API del gestor -------------------------------------------------------

/** Re-añade los torrents persistidos al arrancar (sin bloquear). */
export function initDownloads() {
  const magnets = loadMagnets();
  if (!magnets.length) return;
  for (const m of magnets) {
    try { addTorrent(m); } catch { /* ignora errores al re-añadir */ }
  }
}

/** Añade un magnet y empieza a descargar. Resuelve enseguida con el infohash. */
export function addTorrent(magnet) {
  return new Promise((resolve, reject) => {
    if (!magnet) return reject(new Error('Falta el magnet'));
    const c = getClient();
    const ih = extractInfoHash(magnet);
    const existing = ih && findTorrent(ih);
    if (existing) return resolve(infoOf(existing));

    try {
      const torrent = c.add(magnet, { path: downloadDir() });
      torrent.on('error', (e) => console.error('[download] error:', e.message));
      torrent.on('ready', () => saveMagnet(magnet));
      // Resolvemos ya: la descarga sigue en segundo plano.
      resolve(infoOf(torrent));
    } catch (e) {
      reject(e);
    }
  });
}

/** Lista todas las descargas con su progreso. */
export function listDownloads() {
  if (!client) return [];
  return client.torrents.map(infoOf);
}

/** Elimina un torrent. deleteFiles=true borra también los ficheros del disco. */
export function removeDownload(infoHash, deleteFiles = false) {
  return new Promise((resolve) => {
    removeMagnet(infoHash);
    const t = findTorrent(infoHash);
    if (!t) return resolve(false);
    t.destroy({ destroyStore: !!deleteFiles }, () => resolve(true));
  });
}

/**
 * Devuelve un fichero para streaming: { file, length } o null si no está listo.
 * @returns {{file: object, length: number, name: string}|null}
 */
export function getFile(infoHash, fileIdx) {
  const t = findTorrent(infoHash);
  if (!t || !t.ready || !t.files || !t.files[fileIdx]) return null;
  const file = t.files[fileIdx];
  return { file, length: file.length, name: file.name };
}

/**
 * Busca ficheros ya descargándose que casen con un contenido (para ofrecerlos
 * como streams locales en Stremio).
 * @param {{name:string, season?:number, episode?:number}} q
 * @returns {Array<{infoHash:string, fileIdx:number, name:string, length:number, ready:boolean}>}
 */
export function matchLocalFiles({ name, season, episode }) {
  if (!client || !name) return [];
  const target = normalize(name);
  const out = [];
  for (const t of client.torrents) {
    if (!t.ready || !t.files) continue;
    const torrentMatches = normalize(t.name).includes(target);
    t.files.forEach((f, idx) => {
      if (!isVideo(f.name)) return;
      const p = parseTitle(f.name);
      const nameOk = torrentMatches || normalize(f.name).includes(target);
      if (!nameOk) return;
      if (season != null) {
        if (p.season !== season) return;
        if (episode != null && p.episode != null && p.episode !== episode) return;
      }
      out.push({ infoHash: t.infoHash, fileIdx: idx, name: f.name, length: f.length, ready: true });
    });
  }
  return out;
}

function normalize(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function isVideo(name) {
  return /\.(mkv|mp4|avi|m4v|mov|ts|webm|mpg|mpeg|wmv|flv)$/i.test(name || '');
}
