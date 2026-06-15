// Genera (y cachea) un certificado autofirmado para el HTTPS opcional.
// Nota: las Smart TV no confían en certificados autofirmados, por eso para la TV
// se usa HTTP en la red local. El HTTPS es útil para el reproductor web en el PC.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import selfsigned from 'selfsigned';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CERT_FILE = path.resolve(__dirname, '../../config/tls-cert.json');

/** Devuelve { key, cert } generándolos la primera vez y cacheándolos. (async) */
export async function getCertificate() {
  if (fs.existsSync(CERT_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CERT_FILE, 'utf8'));
    } catch { /* regenera */ }
  }
  // Incluye localhost y las IPs locales como SAN para reducir avisos del navegador.
  const altNames = [{ type: 2, value: 'localhost' }, { type: 7, ip: '127.0.0.1' }];
  for (const ip of getLanIps()) altNames.push({ type: 7, ip });

  // selfsigned 5.x usa @peculiar/x509 y es asíncrono.
  const pems = await selfsigned.generate(
    [{ name: 'commonName', value: 'castellano-addon.local' }],
    { days: 3650, keySize: 2048, altNames },
  );
  const cert = { key: pems.private, cert: pems.cert };
  fs.writeFileSync(CERT_FILE, JSON.stringify(cert), { mode: 0o600 });
  return cert;
}

// Adaptadores que NO son la red real (virtuales, contenedores, VPN, APIPA).
const VIRTUAL_RE = /(vEthernet|Virtual|VMware|VirtualBox|Hyper-V|Loopback|Bluetooth|Default Switch|WSL|Docker|TAP|Tailscale|ZeroTier|Npcap)/i;

function ifaceScore(i) {
  let s = 0;
  if (!i.virtual) s += 100;
  if (/Wi-?Fi|Wireless|inal[aá]mbric/i.test(i.name)) s += 40;
  else if (/Ethernet/i.test(i.name) && !i.virtual) s += 30;
  if (i.address.startsWith('192.168.')) s += 20;
  else if (i.address.startsWith('10.')) s += 10;
  else if (/^172\.(1[6-9]|2\d|3[01])\./.test(i.address)) s += 3;
  return s;
}

/** Lista de adaptadores IPv4 reales, ordenados (mejor candidato primero). */
export function getNetworkInterfaces() {
  const ifaces = os.networkInterfaces();
  const out = [];
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name] || []) {
      if (iface.family !== 'IPv4' || iface.internal) continue;
      if (iface.address.startsWith('169.254.')) continue; // APIPA (sin red)
      out.push({ name, address: iface.address, virtual: VIRTUAL_RE.test(name) });
    }
  }
  return out.sort((a, b) => ifaceScore(b) - ifaceScore(a));
}

export function getLanIps() {
  return getNetworkInterfaces().map((i) => i.address);
}
