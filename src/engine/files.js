// Selección del fichero correcto dentro de un torrent (multi-fichero o pack).

const VIDEO_EXT = /\.(mkv|mp4|avi|m4v|mov|ts|webm|mpg|mpeg|wmv|flv)$/i;

function isVideo(path) {
  return VIDEO_EXT.test(path || '');
}

function matchesEpisode(path, season, episode) {
  if (season == null || episode == null) return false;
  const p = String(path).toLowerCase();
  const ss = String(season);
  const ssPad = ss.padStart(2, '0');
  const ee = String(episode);
  const eePad = ee.padStart(2, '0');
  const patterns = [
    new RegExp(`s0?${ss}\\s?e0?${ee}\\b`, 'i'),
    new RegExp(`\\b0?${ss}x0?${ee}\\b`, 'i'),
    new RegExp(`\\b(?:cap|capitulo|ep|episodio)\\s?0?${ee}\\b`, 'i'),
    new RegExp(`[^0-9]${ssPad}${eePad}[^0-9]`),
  ];
  return patterns.some((re) => re.test(p));
}

/**
 * Elige el fichero de vídeo adecuado.
 * @param {Array} files lista con { id, path, bytes } (o size)
 * @param {object} opts { season, episode }
 * @returns {object|null} el fichero elegido (con su id/index original)
 */
export function pickFile(files, { season, episode } = {}) {
  if (!Array.isArray(files) || files.length === 0) return null;

  const normalized = files.map((f, idx) => ({
    id: f.id ?? f.fileId ?? idx,
    path: f.path || f.name || f.short_name || '',
    bytes: f.bytes ?? f.size ?? 0,
    raw: f,
  }));

  const videos = normalized.filter((f) => isVideo(f.path));
  const pool = videos.length ? videos : normalized;

  // Serie: intenta casar temporada+episodio.
  if (season != null && episode != null) {
    const match = pool.find((f) => matchesEpisode(f.path, season, episode));
    if (match) return match;
  }

  // Si no, el fichero de vídeo más grande (la película o el episodio principal).
  return pool.reduce((max, f) => (f.bytes > (max?.bytes ?? -1) ? f : max), null);
}
