// Conversor de vídeos a MP4 (H.264 + AAC) para que se reproduzcan con sonido en
// el iPad/navegadores. Los convertidos se guardan en una subcarpeta "MP4" de la
// biblioteca. Es robusto: reintenta re-codificando si "copiar" falla, borra los
// ficheros a medio hacer y reporta el error real de ffmpeg.

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { getLibraryFile } from './scanner.js';
import { loadConfig } from '../config/store.js';

const jobs = new Map(); // id -> { status, progress, output, name, error }
const queue = [];       // ids pendientes de convertir (en orden)
let running = false;    // hay una conversión en marcha
let ffmpegOk = null;

// --- localizar el ffmpeg MODERNO (el de winget/Gyan), no uno viejo del PATH ---
function searchFile(dir, name, depth) {
  if (depth < 0) return null;
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return null; }
  for (const e of entries) {
    if (e.isFile() && e.name.toLowerCase() === name.toLowerCase()) return path.join(dir, e.name);
  }
  for (const e of entries) {
    if (e.isDirectory()) { const r = searchFile(path.join(dir, e.name), name, depth - 1); if (r) return r; }
  }
  return null;
}

function findExe(name) {
  const exe = name + (process.platform === 'win32' ? '.exe' : '');
  const local = process.env.LOCALAPPDATA;
  const tries = [];
  if (local) {
    tries.push(path.join(local, 'Microsoft', 'WinGet', 'Links', exe));
    const pkgs = path.join(local, 'Microsoft', 'WinGet', 'Packages');
    try {
      for (const d of fs.readdirSync(pkgs)) {
        if (/Gyan\.FFmpeg/i.test(d)) {
          const hit = searchFile(path.join(pkgs, d), exe, 3);
          if (hit) tries.push(hit);
        }
      }
    } catch { /* ignora */ }
  }
  for (const t of tries) { try { if (fs.existsSync(t)) return t; } catch { /* ignora */ } }
  return name; // último recurso: el del PATH
}

const FFMPEG = findExe('ffmpeg');
const FFPROBE = findExe('ffprobe');

export function ffmpegAvailable() {
  if (ffmpegOk !== null) return Promise.resolve(ffmpegOk);
  return new Promise((resolve) => {
    let p;
    try { p = spawn(FFMPEG, ['-version'], { windowsHide: true }); }
    catch { ffmpegOk = false; return resolve(false); }
    p.on('error', () => { ffmpegOk = false; resolve(false); });
    p.on('exit', (c) => { ffmpegOk = c === 0; resolve(ffmpegOk); });
  });
}

function probe(file) {
  return new Promise((resolve) => {
    let out = '';
    let p;
    try {
      p = spawn(FFPROBE, ['-v', 'error', '-show_entries',
        'format=duration:stream=codec_type,codec_name', '-of', 'json', file], { windowsHide: true });
    } catch { return resolve({}); }
    p.stdout.on('data', (d) => { out += d; });
    p.on('error', () => resolve({}));
    p.on('exit', () => {
      try {
        const j = JSON.parse(out);
        const v = (j.streams || []).find((s) => s.codec_type === 'video');
        resolve({ vcodec: v && v.codec_name, duration: parseFloat(j.format && j.format.duration) || 0 });
      } catch { resolve({}); }
    });
  });
}

function runFfmpeg(args, onProgress) {
  return new Promise((resolve) => {
    let proc; let tail = '';
    try { proc = spawn(FFMPEG, args, { windowsHide: true }); }
    catch { return resolve({ code: -1, error: 'No se pudo lanzar ffmpeg' }); }
    proc.stderr.on('data', (d) => {
      const s = d.toString();
      tail = (tail + s).slice(-2000);
      const m = /time=(\d+):(\d+):(\d+\.?\d*)/.exec(s);
      if (m) onProgress(m);
    });
    proc.on('error', (e) => resolve({ code: -1, error: e.code === 'ENOENT' ? 'ffmpeg no está instalado' : e.message }));
    proc.on('exit', (code) => resolve({ code, tail }));
  });
}

function lastError(tail) {
  if (!tail) return null;
  const lines = tail.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return lines.length ? lines[lines.length - 1].slice(0, 180) : null;
}

export function getJobs() {
  return [...jobs.entries()].map(([id, j]) => ({ id, ...j }));
}

export function ffmpegPath() { return FFMPEG; }

// '-strict experimental' permite el codificador AAC nativo también en versiones
// antiguas de ffmpeg (donde se considera "experimental"); en las nuevas no molesta.
const AUDIO = ['-c:a', 'aac', '-strict', 'experimental', '-ac', '2', '-b:a', '192k', '-movflags', '+faststart'];
const MAPS = ['-map', '0:v:0', '-map', '0:a:0?']; // 1er vídeo + 1er audio (opcional)

/** Añade un vídeo a la cola de conversión. Devuelve el job (status 'queued'). */
export function enqueue(id) {
  const f = getLibraryFile(id);
  if (!f) throw new Error('Vídeo no encontrado en la biblioteca');
  if (/\.mp4$/i.test(f.path)) throw new Error('Ese vídeo ya es MP4');
  const j = jobs.get(id);
  if (j && (j.status === 'queued' || j.status === 'converting')) return j; // ya está
  jobs.set(id, { status: 'queued', progress: 0, output: null, name: f.name, error: null });
  queue.push(id);
  processQueue();
  return jobs.get(id);
}

/** Encola varios; devuelve cuántos se han añadido. */
export function enqueueMany(ids) {
  let n = 0;
  for (const id of ids || []) {
    try { enqueue(id); n += 1; } catch { /* salta los que ya son mp4 o no existen */ }
  }
  return n;
}

async function processQueue() {
  if (running) return;
  running = true;
  while (queue.length) {
    const id = queue.shift();
    const job = jobs.get(id);
    if (!job || job.status !== 'queued') continue;
    await runConversion(id, job);
  }
  running = false;
}

async function runConversion(id, job) {
  const f = getLibraryFile(id);
  if (!f) { job.status = 'error'; job.error = 'Vídeo no encontrado'; return; }

  const root = (loadConfig().library && loadConfig().library.path) || path.dirname(f.path);
  const mp4dir = path.join(root, 'MP4');
  try { fs.mkdirSync(mp4dir, { recursive: true }); } catch { /* ignora */ }
  const output = path.join(mp4dir, path.basename(f.path).replace(/\.[^.]+$/, '') + '.mp4');
  job.output = output;
  job.status = 'converting';
  job.progress = 0;

  const { vcodec, duration } = await probe(f.path);
  const onProgress = (m) => {
    if (!duration) return;
    const t = (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]);
    job.progress = Math.min(99, Math.round((t / duration) * 100));
  };
  const reencode = ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21'];

  let r;
  if (vcodec === 'h264') {
    r = await runFfmpeg(['-y', '-i', f.path, ...MAPS, '-c:v', 'copy', ...AUDIO, output], onProgress);
    if (r.code !== 0) { job.progress = 0; r = await runFfmpeg(['-y', '-i', f.path, ...MAPS, ...reencode, ...AUDIO, output], onProgress); }
  } else {
    r = await runFfmpeg(['-y', '-i', f.path, ...MAPS, ...reencode, ...AUDIO, output], onProgress);
  }

  if (r.code === 0) {
    job.status = 'done';
    job.progress = 100;
  } else {
    job.status = 'error';
    job.error = r.error || lastError(r.tail) || `ffmpeg terminó con código ${r.code}`;
    try { fs.unlinkSync(output); } catch { /* borra el fichero a medias */ }
  }
}
