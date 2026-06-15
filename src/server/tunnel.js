// Gestiona un túnel de Cloudflare (cloudflared) para exponer el servidor público
// "solo-Stremio" con una URL HTTPS de verdad, accesible desde el móvil/TV/internet.
//
// Usa "quick tunnels" (gratis, sin cuenta): la URL es https://<aleatorio>.trycloudflare.com
// OJO: esa URL CAMBIA cada vez que se reinicia el addon. El dashboard muestra la actual.

import { spawn } from 'node:child_process';

let tunnelUrl = null;
let proc = null;
let status = 'off'; // off | starting | running | error
let lastError = null;

const URL_RE = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i;

export function getTunnelInfo() {
  return { status, url: tunnelUrl, error: lastError };
}

/**
 * Arranca cloudflared apuntando al puerto local indicado.
 * @param {number} localPort
 */
export function startTunnel(localPort) {
  if (proc) return; // ya arrancado
  status = 'starting';
  lastError = null;

  const args = ['tunnel', '--no-autoupdate', '--url', `http://localhost:${localPort}`];

  try {
    proc = spawn('cloudflared', args, { windowsHide: true });
  } catch (e) {
    status = 'error';
    lastError = 'cloudflared no está instalado';
    console.error('[tunnel] no se pudo lanzar cloudflared:', e.message);
    return;
  }

  const onData = (buf) => {
    const text = buf.toString();
    const m = text.match(URL_RE);
    if (m && !tunnelUrl) {
      tunnelUrl = m[0];
      status = 'running';
      console.log(`\n  🌍 Túnel público (para móvil/TV/internet):`);
      console.log(`     ${tunnelUrl}/manifest.json\n`);
    }
  };

  proc.stdout.on('data', onData);
  proc.stderr.on('data', onData); // cloudflared loguea por stderr

  proc.on('error', (e) => {
    status = 'error';
    lastError = e.code === 'ENOENT' ? 'cloudflared no está instalado' : e.message;
    console.error('[tunnel] error:', lastError);
    proc = null;
  });

  proc.on('exit', (code) => {
    if (status !== 'error') status = 'off';
    tunnelUrl = null;
    proc = null;
    if (code) console.error(`[tunnel] cloudflared terminó (código ${code})`);
  });
}

export function stopTunnel() {
  if (proc) { try { proc.kill(); } catch { /* noop */ } proc = null; }
  tunnelUrl = null;
  status = 'off';
}
