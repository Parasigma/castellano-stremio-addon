// Reproductor web PRIVADO de la biblioteca. Protegido por contraseña.
// Se monta tanto en la app local como en la pública (túnel), para poder verlo
// desde fuera de casa. Solo expone: login, lista de la biblioteca y streaming.
// NO expone configuración ni tokens.

import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { getSecret } from '../../config/store.js';
import { listAll, getLibraryFile } from '../../library/scanner.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PAGE = path.resolve(__dirname, '../../../public/player.html');

const router = express.Router();
router.use(express.json());

// --- sesiones en memoria (token -> caducidad) ----------------------------
const sessions = new Map();
const TTL = 30 * 24 * 60 * 60 * 1000; // 30 días

function newToken() {
  const t = crypto.randomBytes(24).toString('hex');
  sessions.set(t, Date.now() + TTL);
  return t;
}
function validToken(t) {
  const exp = sessions.get(t);
  if (!exp) return false;
  if (Date.now() > exp) { sessions.delete(t); return false; }
  return true;
}
function requireAuth(req, res, next) {
  const t = req.query.t || req.headers['x-player-token'];
  if (t && validToken(t)) return next();
  res.status(401).json({ ok: false, error: 'No autorizado' });
}

const MIME = {
  mp4: 'video/mp4', m4v: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
  mkv: 'video/x-matroska', avi: 'video/x-msvideo', ts: 'video/mp2t',
};
function mimeFor(name) {
  return MIME[(String(name).split('.').pop() || '').toLowerCase()] || 'application/octet-stream';
}

// --- página del reproductor ----------------------------------------------
router.get('/', (req, res) => res.sendFile(PAGE));

// --- login ----------------------------------------------------------------
router.post('/login', (req, res) => {
  const pw = getSecret('player.password');
  if (!pw) return res.status(403).json({ ok: false, error: 'El reproductor no está configurado (falta contraseña).' });
  if (req.body && req.body.password === pw) {
    return res.json({ ok: true, token: newToken() });
  }
  res.status(401).json({ ok: false, error: 'Contraseña incorrecta' });
});

// --- lista de vídeos -------------------------------------------------------
router.get('/list', requireAuth, (req, res) => {
  res.json({ ok: true, videos: listAll().map((v) => ({ id: v.id, name: v.name, rel: v.rel, size: v.size })) });
});

// --- streaming con soporte de range ---------------------------------------
router.get('/stream/:id', requireAuth, (req, res) => {
  const f = getLibraryFile(req.params.id);
  if (!f) return res.status(404).send('No encontrado');
  const total = f.size;
  const range = req.headers.range;
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Type', mimeFor(f.name));
  if (range) {
    const m = /bytes=(\d+)-(\d*)/.exec(range);
    const start = m ? parseInt(m[1], 10) : 0;
    const end = m && m[2] ? parseInt(m[2], 10) : total - 1;
    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
    res.setHeader('Content-Length', end - start + 1);
    fs.createReadStream(f.path, { start, end }).pipe(res);
  } else {
    res.setHeader('Content-Length', total);
    fs.createReadStream(f.path).pipe(res);
  }
});

export default router;
