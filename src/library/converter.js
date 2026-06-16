// Conversor de vídeos a MP4 (H.264 + AAC) para que se reproduzcan en el iPad/
// navegadores. Si el vídeo ya es H.264, solo copia el vídeo y convierte el audio
// (rápido); si es HEVC/otro, re-codifica el vídeo. Usa ffmpeg/ffprobe.

import { spawn } from 'node:child_process';
import { getLibraryFile } from './scanner.js';

const jobs = new Map(); // id -> { status, progress, output, name, error }
let ffmpegOk = null;

/** ¿Está ffmpeg disponible? (cacheado) */
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
        'format=duration:stream=codec_type,codec_name', '-of', 'json', file],
      { windowsHide: true });
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

export function getJobs() {
  return [...jobs.entries()].map(([id, j]) => ({ id, ...j }));
}

/** Inicia la conversión a MP4 de un vídeo de la biblioteca. */
export async function convert(id) {
  const f = getLibraryFile(id);
  if (!f) throw new Error('Vídeo no encontrado en la biblioteca');
  if (/\.mp4$/i.test(f.path)) throw new Error('Ese vídeo ya es MP4');
  const existing = jobs.get(id);
  if (existing && existing.status === 'converting') return existing;

  const output = f.path.replace(/\.[^.]+$/, '') + ' (iPad).mp4';
  const { vcodec, duration } = await probe(f.path);
  const videoArgs = vcodec === 'h264'
    ? ['-c:v', 'copy']
    : ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21'];
  const args = ['-y', '-i', f.path, ...videoArgs,
    '-c:a', 'aac', '-ac', '2', '-b:a', '192k', '-movflags', '+faststart', output];

  const job = { status: 'converting', progress: 0, output, name: f.name, error: null };
  jobs.set(id, job);

  let proc;
  try { proc = spawn('ffmpeg', args, { windowsHide: true }); }
  catch (e) { job.status = 'error'; job.error = 'No se pudo lanzar ffmpeg'; return job; }

  proc.stderr.on('data', (d) => {
    const m = /time=(\d+):(\d+):(\d+\.?\d*)/.exec(d.toString());
    if (m && duration) {
      const t = (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]);
      job.progress = Math.min(99, Math.round((t / duration) * 100));
    }
  });
  proc.on('error', (e) => {
    job.status = 'error';
    job.error = e.code === 'ENOENT' ? 'ffmpeg no está instalado' : e.message;
  });
  proc.on('exit', (code) => {
    if (job.status === 'error') return;
    if (code === 0) { job.status = 'done'; job.progress = 100; }
    else { job.status = 'error'; job.error = `ffmpeg terminó con código ${code}`; }
  });

  return job;
}
