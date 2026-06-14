// Parser ligero de respuestas Torznab (XML) sin dependencias externas.
// Extrae los <item> y sus atributos torznab (seeders, peers, infohash, size...).

/**
 * @param {string} xml
 * @param {string} source etiqueta de origen (p.ej. 'jackett')
 * @returns {Array} torrents normalizados
 */
export function parseTorznab(xml, source = 'jackett') {
  if (!xml || typeof xml !== 'string') return [];
  const items = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  return items.map((item) => parseItem(item, source)).filter(Boolean);
}

function parseItem(item, source) {
  const title = decode(tag(item, 'title'));
  if (!title) return null;

  const attrs = torznabAttrs(item);
  const link = decode(tag(item, 'link'));
  const enclosure = (item.match(/<enclosure[^>]*url="([^"]+)"/i) || [])[1];
  const enclosureUrl = enclosure ? decode(enclosure) : null;

  const magnet = attrs.magneturl
    || (link && link.startsWith('magnet:') ? link : null)
    || (enclosureUrl && enclosureUrl.startsWith('magnet:') ? enclosureUrl : null);

  const infoHash = (attrs.infohash || extractInfoHash(magnet) || '').toLowerCase() || null;
  const size = Number(attrs.size || tag(item, 'size') || 0) || 0;

  return {
    source,
    indexer: decode(attrs.indexer || tag(item, 'jackettindexer') || ''),
    title,
    size,
    seeders: toInt(attrs.seeders),
    leechers: toInt(attrs.peers) - toInt(attrs.seeders) >= 0
      ? toInt(attrs.peers) - toInt(attrs.seeders)
      : toInt(attrs.peers),
    magnet,
    infoHash,
    // si no hay magnet, downloadUrl puede ser un .torrent para resolver luego
    downloadUrl: !magnet && (enclosureUrl || link) ? (enclosureUrl || link) : null,
    publishDate: tag(item, 'pubDate'),
  };
}

// --- utilidades XML ------------------------------------------------------

function tag(xml, name) {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'))
    || xml.match(new RegExp(`<${name}[^>]*>([^<]*)`, 'i'));
  return m ? m[1].trim() : '';
}

function torznabAttrs(item) {
  const attrs = {};
  const re = /<torznab:attr\s+name="([^"]+)"\s+value="([^"]*)"/gi;
  let m;
  while ((m = re.exec(item)) !== null) {
    attrs[m[1].toLowerCase()] = decode(m[2]);
  }
  return attrs;
}

function extractInfoHash(magnet) {
  if (!magnet) return null;
  const m = magnet.match(/btih:([a-fA-F0-9]{40}|[a-zA-Z2-7]{32})/);
  return m ? m[1] : null;
}

function toInt(v) {
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? 0 : n;
}

function decode(s) {
  if (!s) return s;
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}
