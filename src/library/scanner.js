// Biblioteca local: escanea la carpeta configurada en busca de vídeos que TÚ
// hayas dejado ahí (descargados por tu cuenta) y los empareja con lo que pide
// Stremio (por nombre + temporada/episodio), para ofrecerlos como streams.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { loadConfig } from '../config/store.js';
import { parseTitle } from '../engine/parse.js';

const VIDEO = /\.(mkv|mp4|avi|m4v|mov|ts|webm|mpg|mpeg|wmv|flv)$/i;
const MAX_FILES = 8000;
const MAX_DEPTH = 8;
const TTL_MS = 30000; // re-escanea como mucho cada 30 s

let index = new Map(); // id -> { path, size, rel }
let lastScan = 0;

function libDir() {
  const p = loadConfig().library && loadConfig().library.path;
  return p && fs.existsSync(p) ? p : null;
}

function walk(dir, root, depth) {
  if (depth > MAX_DEPTH || index.size >= MAX_FILES) return;
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (index.size >= MAX_FILES) return;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      walk(full, root, depth + 1);
    } else if (VIDEO.test(e.name)) {
      let size = 0;
      try { size = fs.statSync(full).size; } catch { /* ignora */ }
      const id = crypto.createHash('sha1').update(full).digest('hex').slice(0, 16);
      index.set(id, { path: full, size, rel: path.relative(root, full) });
    }
  }
}

/** Re-escanea si ha pasado el TTL (o se fuerza). */
export function ensureScanned(force = false) {
  if (!force && Date.now() - lastScan < TTL_MS && index.size) return;
  const dir = libDir();
  index = new Map();
  lastScan = Date.now();
  if (dir) walk(dir, dir, 0);
}

export function rescan() {
  ensureScanned(true);
  return index.size;
}

export function libraryInfo() {
  const dir = libDir();
  ensureScanned();
  return { path: (loadConfig().library && loadConfig().library.path) || '', exists: !!dir, count: index.size };
}

function normalize(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/**
 * Busca vídeos de la biblioteca que casen con lo pedido.
 * @returns {Array<{id,name,size}>}
 */
export function findInLibrary({ name, season, episode } = {}) {
  if (!name) return [];
  ensureScanned();
  const target = normalize(name);
  const out = [];
  for (const [id, f] of index) {
    // Emparejamos usando carpeta + nombre de fichero (ruta relativa completa).
    const hay = normalize(f.rel);
    if (!hay.includes(target)) continue;
    if (season != null) {
      const p = parseTitle(f.rel);
      if (p.season !== season) continue;
      if (episode != null && p.episode != null && p.episode !== episode) continue;
    }
    out.push({ id, name: path.basename(f.path), size: f.size });
  }
  return out;
}

/** Devuelve { path, size, name } de un fichero de la biblioteca por su id. */
export function getLibraryFile(id) {
  ensureScanned();
  const f = index.get(id);
  if (!f) return null;
  return { path: f.path, size: f.size, name: path.basename(f.path) };
}
