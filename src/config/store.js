// Sistema de configuración: carga/guarda config en disco, cifra secretos
// y expone versiones "públicas" (enmascaradas) para el dashboard.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { defaultConfig, SECRET_FIELDS } from './defaults.js';
import { encrypt, decrypt, isEncrypted, generateSecret } from '../utils/crypto.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = path.resolve(__dirname, '../../config');
const CONFIG_FILE = path.join(CONFIG_DIR, 'runtime.json');
const SECRET_FILE = path.join(CONFIG_DIR, 'secret.key');

// --- utilidades de objetos anidados (notación "a.b.c") -------------------

function getPath(obj, dotted) {
  return dotted.split('.').reduce((acc, k) => (acc == null ? acc : acc[k]), obj);
}

function setPath(obj, dotted, value) {
  const keys = dotted.split('.');
  const last = keys.pop();
  const target = keys.reduce((acc, k) => {
    if (acc[k] == null || typeof acc[k] !== 'object') acc[k] = {};
    return acc[k];
  }, obj);
  target[last] = value;
}

// Fusión profunda: la base (defaults) se completa con override (guardado).
function deepMerge(base, override) {
  if (Array.isArray(base)) return override !== undefined ? override : base;
  if (typeof base !== 'object' || base === null) {
    return override !== undefined ? override : base;
  }
  const result = { ...base };
  for (const key of Object.keys(base)) {
    if (override && key in override) {
      result[key] = deepMerge(base[key], override[key]);
    }
  }
  // claves extra presentes solo en override
  if (override) {
    for (const key of Object.keys(override)) {
      if (!(key in result)) result[key] = override[key];
    }
  }
  return result;
}

// --- secreto maestro -----------------------------------------------------

function ensureSecret() {
  if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
  if (!fs.existsSync(SECRET_FILE)) {
    fs.writeFileSync(SECRET_FILE, generateSecret(), { mode: 0o600 });
  }
  return fs.readFileSync(SECRET_FILE, 'utf8').trim();
}

// --- carga / guardado ----------------------------------------------------

let cache = null;
let masterSecret = null;

function loadRaw() {
  if (!fs.existsSync(CONFIG_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch {
    return {};
  }
}

/**
 * Carga la config completa (defaults + guardada). Los secretos quedan
 * cifrados en el objeto; usa getSecret() para leerlos en claro.
 */
export function loadConfig() {
  if (cache) return cache;
  masterSecret = ensureSecret();
  const merged = deepMerge(defaultConfig, loadRaw());

  // autocompletar ruta de descargas en el primer arranque
  if (!merged.download.path) {
    merged.download.path = path.join(os.homedir(), 'Downloads', 'stremio');
  }
  cache = merged;
  return cache;
}

/** Persiste la config en disco (cifrando secretos que aún estén en claro). */
function persist(config) {
  if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
  const toSave = JSON.parse(JSON.stringify(config));
  for (const field of SECRET_FIELDS) {
    const val = getPath(toSave, field);
    if (val) setPath(toSave, field, encrypt(val, masterSecret));
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(toSave, null, 2), { mode: 0o600 });
}

/**
 * Aplica un parche parcial a la config. Para secretos: si llega cadena vacía
 * se mantiene el valor anterior; si llega el marcador "********" no se toca.
 */
export function updateConfig(patch) {
  const config = loadConfig();
  const merged = deepMerge(config, patch);

  for (const field of SECRET_FIELDS) {
    const incoming = getPath(patch, field);
    if (incoming === undefined) continue;
    if (incoming === '' || incoming === MASK) {
      setPath(merged, field, getPath(config, field)); // conservar anterior
    } else {
      setPath(merged, field, encrypt(incoming, masterSecret)); // nuevo valor
    }
  }

  cache = merged;
  persist(merged);
  return getPublicConfig();
}

// --- lectura de secretos en claro ---------------------------------------

/** Devuelve un secreto descifrado (token RD/TorBox, API key indexador). */
export function getSecret(dottedField) {
  const config = loadConfig();
  const val = getPath(config, dottedField);
  return isEncrypted(val) ? decrypt(val, masterSecret) : val || '';
}

// --- versión pública para el dashboard -----------------------------------

const MASK = '********';

/**
 * Config para enviar al frontend: los secretos se sustituyen por un marcador
 * "********" si existen, o "" si están vacíos. Nunca se expone el valor real.
 */
export function getPublicConfig() {
  const config = loadConfig();
  const pub = JSON.parse(JSON.stringify(config));
  for (const field of SECRET_FIELDS) {
    const val = getPath(config, field);
    setPath(pub, field, val ? MASK : '');
  }
  return pub;
}

export { MASK, CONFIG_FILE };
