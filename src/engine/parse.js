// Analiza el título de un torrent y extrae calidad, fuente, códec, HDR,
// temporada/episodio y año. Pensado para nombres en español e inglés.

/** Normaliza: minúsculas, separadores a espacios, con espacios de guarda. */
function norm(title) {
  return ' ' + String(title || '')
    .toLowerCase()
    .replace(/[._\-\[\]()/+]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() + ' ';
}

export function parseTitle(title) {
  const t = norm(title);

  // --- calidad / resolución ---
  let quality = null;
  if (/\b(2160p|4k|uhd)\b/.test(t)) quality = '2160p';
  else if (/\b1080p\b/.test(t)) quality = '1080p';
  else if (/\b720p\b/.test(t)) quality = '720p';
  else if (/\b(480p|sd)\b/.test(t)) quality = '480p';

  // --- fuente ---
  let source = null;
  if (/\b(cam|hdcam|ts|telesync|telecine|tc|screener|scr)\b/.test(t)) source = 'CAM';
  else if (/\b(blu-?ray|bdrip|brrip|bdremux|remux|bd)\b/.test(t)) source = 'BluRay';
  else if (/\bmicrohd\b/.test(t)) source = 'MicroHD';
  else if (/\b(web-?dl|webrip|web)\b/.test(t)) source = 'WEB';
  else if (/\bhdtv\b/.test(t)) source = 'HDTV';
  else if (/\b(dvdrip|dvd)\b/.test(t)) source = 'DVD';

  // --- códec ---
  let codec = null;
  if (/\b(x265|h\.?265|hevc)\b/.test(t)) codec = 'x265';
  else if (/\b(x264|h\.?264|avc)\b/.test(t)) codec = 'x264';

  const hdr = /\b(hdr10\+?|hdr|dolby\s?vision|dovi|dv)\b/.test(t);

  // --- año ---
  const yearMatch = t.match(/\b(19\d{2}|20\d{2})\b/);
  const year = yearMatch ? Number(yearMatch[1]) : null;

  // --- temporada / episodio ---
  let season = null;
  let episode = null;
  let m;
  if ((m = t.match(/\bs(\d{1,2})\s?e(\d{1,3})\b/))) {
    season = +m[1]; episode = +m[2];
  } else if ((m = t.match(/\b(\d{1,2})x(\d{1,3})\b/))) {
    season = +m[1]; episode = +m[2];
  } else {
    if ((m = t.match(/\btemporada\s?(\d{1,2})\b/))) season = +m[1];
    if ((m = t.match(/\bs(\d{1,2})\b/)) && season == null) season = +m[1];
    if ((m = t.match(/\b(?:cap(?:itulo)?|ep(?:isodio)?)\s?(\d{1,3})\b/))) episode = +m[1];
  }

  // ¿es un pack de temporada (temporada conocida, sin episodio concreto)?
  const isPack = season != null && episode == null
    && /\b(season|temporada|complet|pack|colecc|s\d{1,2})\b/.test(t);

  return { quality, source, codec, hdr, year, season, episode, isPack };
}
