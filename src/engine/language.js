// Detección de idioma del torrent — el núcleo del addon.
// Distingue castellano (España), latino, dual, VOSE e inglés.
//
// Reglas clave:
//  - "latino"/"latam" → latino (lo que NO quieres por defecto).
//  - "castellano"/"cast"/"esp"/"español de España" → castellano.
//  - "español"/"spanish" SIN marca de latino → se asume castellano (lo más
//    habitual en trackers españoles).
//  - "dual"/"multi" → audio dual (suele incluir castellano).
//  - "vose"/"subtitulado"/"subs esp" → subtítulos en español (V.O.).

function norm(title) {
  return ' ' + String(title || '')
    .toLowerCase()
    .replace(/[._\-\[\]()/+]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() + ' ';
}

export function detectLanguage(title) {
  const t = norm(title);

  const flags = {
    castellano: false,
    latino: false,
    dual: false,
    vose: false,
    english: false,
  };

  // Latino primero (para desambiguar "español latino").
  if (/\b(latino|latinoameric|latam)\b/.test(t)
      || /espa(?:n|ñ)ol\s+latino/.test(t)
      || /\b(lat|mx|mex)\b/.test(t)) {
    flags.latino = true;
  }

  // Castellano explícito.
  if (/\b(castellano|cast|esp|es-es|spa)\b/.test(t)
      || /espa(?:n|ñ)ol\s+(?:de\s+)?espa(?:n|ñ)a/.test(t)) {
    flags.castellano = true;
  }

  // "español"/"spanish" ambiguo sin marca de latino → se asume castellano.
  if (!flags.latino && (/\bespa(?:n|ñ)ol\b/.test(t) || /\bspanish\b/.test(t))) {
    flags.castellano = true;
  }

  if (/\b(dual|multi)\b/.test(t)) flags.dual = true;

  if (/\bvose?\b/.test(t)
      || /\bv\.?o\.?s\b/.test(t)
      || /\bsubtitulad/.test(t)
      || /\bsubs?\s?(?:esp|español|castellano|es)\b/.test(t)) {
    flags.vose = true;
  }

  if (/\b(english|eng|ingles)\b/.test(t)) flags.english = true;

  // Categoría principal por prioridad de utilidad para el usuario.
  let category;
  if (flags.castellano) category = 'castellano';
  else if (flags.dual) category = 'dual';
  else if (flags.vose) category = 'vose';
  else if (flags.latino) category = 'latino';
  else if (flags.english) category = 'english';
  else category = 'unknown';

  return { category, flags };
}

// Etiquetas legibles para mostrar en Stremio.
export const LANG_LABEL = {
  castellano: '🇪🇸 Castellano',
  dual: '🔵 Dual',
  vose: '🟡 VOSE',
  latino: '🟠 Latino',
  english: '🇬🇧 Inglés',
  unknown: '❔ Desconocido',
};
