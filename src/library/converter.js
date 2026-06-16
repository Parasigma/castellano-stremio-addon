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
let ffmpegOk = null;

export function ffmpegAvailable() {
  if (ffmpegOk !== null) return Promise.resolve(ffmpegOk);
  return new Promise((resolve) => {
    let p;
    try { p = spawn('ffmpeg', ['-version'], { windowsHide: true }); }
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
      p = spawn('ffprobe', ['-v', 'error', '-show_entries',
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
    try { proc = spawn('ffmpeg', args, { windowsHide: true }); }
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

// '-strict experimental' permite el codificador AAC nativo también en versiones
// antiguas de ffmpeg (donde se considera "experimental"); en las nuevas no molesta.
const AUDIO = ['-c:a', 'aac', '-strict', 'experimental', '-ac', '2', '-b:a', '192k', '-movflags', '+faststart'];
const MAPS = ['-map', '0:v:0', '-map', '0:a:0?']; // 1er vídeo + 1er audio (opcional)

/** Inicia la conversión a MP4 de un vídeo de la biblioteca. Devuelve el job. */
export async function convert(id) {
  const f = getLibraryFile(id);
  if (!f) throw new Error('Vídeo no encontrado en la biblioteca');
  if (/\.mp4$/i.test(f.path)) throw new Error('Ese vídeo ya es MP4');
  const existing = jobs.get(id);
  if (existing && existing.status === 'converting') return existing;

  const root = (loadConfig().library && loadConfig().library.path) || path.dirname(f.path);
  const mp4dir = path.join(root, 'MP4');
  try { fs.mkdirSync(mp4dir, { recursive: true }); } catch { /* ignora */ }
  const output = path.join(mp4dir, path.basename(f.path).replace(/\.[^.]+$/, '') + '.mp4');

  const { vcodec, duration } = await probe(f.path);
  const job = { status: 'converting', progress: 0, output, name: f.name, error: null };
  jobs.set(id, job);

  const onProgress = (m) => {
    if (!duration) return;
    const t = (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]);
    job.progress = Math.min(99, Math.round((t / duration) * 100));
  };
  const reencode = ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21'];

  (async () => {
    let r;
    if (vcodec === 'h264') {
      // Rápido: copia el vídeo, solo convierte audio.
      r = await runFfmpeg(['-y', '-i', f.path, ...MAPS, '-c:v', 'copy', ...AUDIO, output], onProgress);
      if (r.code !== 0) { // si copiar no sirve, re-codifica
        job.progress = 0;
        r = await runFfmpeg(['-y', '-i', f.path, ...MAPS, ...reencode, ...AUDIO, output], onProgress);
      }
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
  })();

  return job;
}
