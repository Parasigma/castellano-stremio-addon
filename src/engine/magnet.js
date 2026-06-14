// Utilidades de magnet/infohash.

// Trackers públicos habituales para reconstruir un magnet a partir del infohash.
const TRACKERS = [
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://open.stealth.si:80/announce',
  'udp://tracker.torrent.eu.org:451/announce',
  'udp://tracker.openbittorrent.com:6969/announce',
  'udp://exodus.desync.com:6969/announce',
  'udp://opentracker.i2p.rocks:6969/announce',
];

/** Construye un magnet a partir de un infohash (y nombre opcional). */
export function buildMagnet(infoHash, name) {
  if (!infoHash) return null;
  const trackers = TRACKERS.map((t) => `&tr=${encodeURIComponent(t)}`).join('');
  const dn = name ? `&dn=${encodeURIComponent(name)}` : '';
  return `magnet:?xt=urn:btih:${infoHash}${dn}${trackers}`;
}

/** Extrae el infohash de un magnet (hex de 40 o base32 de 32). */
export function extractInfoHash(magnet) {
  if (!magnet) return null;
  const m = magnet.match(/btih:([a-fA-F0-9]{40}|[a-zA-Z2-7]{32})/);
  return m ? m[1].toLowerCase() : null;
}

/** Devuelve un magnet usable: el que ya hay, o uno construido desde el infohash. */
export function ensureMagnet(torrent) {
  if (torrent.magnet) return torrent.magnet;
  if (torrent.infoHash) return buildMagnet(torrent.infoHash, torrent.title);
  return null;
}
