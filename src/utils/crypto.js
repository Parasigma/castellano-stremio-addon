// Cifrado simétrico de secretos (tokens, API keys) en reposo.
// Usa AES-256-GCM con una clave derivada de un secreto local generado
// automáticamente en el primer arranque (config/secret.key, en .gitignore).

import crypto from 'node:crypto';

const PREFIX = 'enc:v1:';

/**
 * Deriva una clave de 32 bytes a partir del secreto maestro.
 * @param {string} masterSecret
 * @returns {Buffer}
 */
function deriveKey(masterSecret) {
  return crypto.createHash('sha256').update(masterSecret, 'utf8').digest();
}

/**
 * Cifra un texto plano. Devuelve una cadena "enc:v1:<base64>".
 * Si el valor ya está cifrado o está vacío, lo devuelve tal cual.
 */
export function encrypt(plaintext, masterSecret) {
  if (!plaintext) return '';
  if (typeof plaintext === 'string' && plaintext.startsWith(PREFIX)) {
    return plaintext; // ya cifrado, no lo volvemos a cifrar
  }
  const key = deriveKey(masterSecret);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(String(plaintext), 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, tag, encrypted]).toString('base64');
  return PREFIX + payload;
}

/**
 * Descifra una cadena "enc:v1:<base64>". Si no está cifrada, la devuelve tal cual.
 */
export function decrypt(value, masterSecret) {
  if (!value || typeof value !== 'string') return '';
  if (!value.startsWith(PREFIX)) return value; // texto plano (compatibilidad)
  try {
    const key = deriveKey(masterSecret);
    const raw = Buffer.from(value.slice(PREFIX.length), 'base64');
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const data = raw.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    return ''; // clave incorrecta o dato corrupto
  }
}

/** Indica si un valor está cifrado. */
export function isEncrypted(value) {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

/** Genera un nuevo secreto maestro aleatorio. */
export function generateSecret() {
  return crypto.randomBytes(32).toString('hex');
}
