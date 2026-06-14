// Motor de ranking. Ordena los torrents según las preferencias del usuario.
// Prioridad (de mayor a menor peso):
//   1. Idioma (según languagePriority — el castellano arriba)
//   2. Cacheado en debrid (evita torrents lentos/no precargados)
//   3. Calidad (según qualityPriority)
//   4. Códec preferido
//   5. Seeders (desempate)

function tierIndex(arr, value) {
  if (value == null) return arr.length; // desconocido al final
  const i = arr.indexOf(value);
  return i === -1 ? arr.length : i;
}

function scoreOf(t, ranking) {
  const { languagePriority: langs, qualityPriority: quals, preferCodecs: codecs = [] } = ranking;

  // unknown se trata como el peor idioma de la lista.
  const langCat = t.parsed.language.category === 'unknown' ? null : t.parsed.language.category;
  const langRank = langs.length - tierIndex(langs, langCat);
  const cached = t.cached === true ? 1 : 0;
  const qualRank = quals.length - tierIndex(quals, t.parsed.quality);
  const codecRank = codecs.length - tierIndex(codecs, t.parsed.codec);
  const seeders = Math.min(t.seeders || 0, 99999);

  // Pesos escalonados para que cada criterio domine sobre el siguiente.
  return (
    langRank * 1e13 +
    cached * 1e12 +
    qualRank * 1e9 +
    codecRank * 1e7 +
    seeders
  );
}

/**
 * @param {Array} torrents con .parsed (incluye .language) y .cached
 * @param {object} ranking config.ranking
 * @returns {Array} ordenados de mejor a peor, con .score añadido
 */
export function rankTorrents(torrents, ranking) {
  return torrents
    .map((t) => ({ ...t, score: scoreOf(t, ranking) }))
    .sort((a, b) => b.score - a.score);
}
