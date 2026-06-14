// Pruebas del motor (parse + idioma + ranking) con títulos reales de ejemplo.
// Ejecutar:  node tests/engine.test.mjs

import assert from 'node:assert';
import { parseTitle } from '../src/engine/parse.js';
import { detectLanguage } from '../src/engine/language.js';
import { rankTorrents } from '../src/engine/rank.js';
import { toStream } from '../src/server/routes/stremio.js';
import { decodeToken } from '../src/engine/resolve.js';

let passed = 0;
let failed = 0;
function check(desc, fn) {
  try { fn(); passed++; console.log('  ✓', desc); }
  catch (e) { failed++; console.log('  ✗', desc, '→', e.message); }
}

console.log('\n— Detección de idioma —');
const langCases = [
  ['Modern Family S01E01 1080p Castellano', 'castellano'],
  ['Modern Family Temporada 1 Español [HDTV]', 'castellano'],
  ['Modern Family 1x01 Español Latino', 'latino'],
  ['Modern Family S01E01 Dual', 'dual'],
  ['Modern Family S01E01 VOSE 720p', 'vose'],
  ['Modern Family S01E01 1080p WEB-DL English', 'english'],
  ['Modern.Family.S01E01.MicroHD.1080p.Cast', 'castellano'],
  ['Some Movie 2021 1080p x265', 'unknown'],
];
for (const [title, expected] of langCases) {
  check(`"${title}" → ${expected}`, () => {
    assert.strictEqual(detectLanguage(title).category, expected);
  });
}

console.log('\n— Análisis de título —');
check('extrae calidad, códec y SxxExx', () => {
  const p = parseTitle('Modern.Family.S03E05.1080p.BluRay.x265-GRP');
  assert.strictEqual(p.quality, '1080p');
  assert.strictEqual(p.codec, 'x265');
  assert.strictEqual(p.source, 'BluRay');
  assert.strictEqual(p.season, 3);
  assert.strictEqual(p.episode, 5);
});
check('detecta CAM', () => {
  assert.strictEqual(parseTitle('Pelicula 2024 HDCAM').source, 'CAM');
});
check('detecta pack de temporada', () => {
  const p = parseTitle('Modern Family Temporada 2 Completa Castellano');
  assert.strictEqual(p.season, 2);
  assert.strictEqual(p.isPack, true);
});

console.log('\n— Ranking (el castellano manda) —');
check('ordena castellano por encima de inglés aunque tenga menos seeders', () => {
  const ranking = {
    languagePriority: ['castellano', 'dual', 'vose', 'latino', 'english'],
    qualityPriority: ['2160p', '1080p', '720p', '480p'],
    preferCodecs: ['x265', 'x264'],
  };
  const make = (title, seeders, cached = null) => ({
    title, seeders, cached,
    parsed: { ...parseTitle(title), language: detectLanguage(title) },
  });
  const torrents = [
    make('Modern Family S01E01 1080p WEB English', 5000),
    make('Modern Family S01E01 720p HDTV Castellano', 12),
    make('Modern Family S01E01 1080p Latino', 800),
  ];
  const ranked = rankTorrents(torrents, ranking);
  assert.ok(/Castellano/i.test(ranked[0].title), 'el primero debe ser castellano');
  assert.ok(/English/i.test(ranked[ranked.length - 1].title), 'el último debe ser inglés');
});
check('cacheado gana a no cacheado dentro del mismo idioma', () => {
  const ranking = {
    languagePriority: ['castellano', 'english'],
    qualityPriority: ['1080p', '720p'],
    preferCodecs: [],
  };
  const make = (title, cached) => ({
    title, seeders: 100, cached,
    parsed: { ...parseTitle(title), language: detectLanguage(title) },
  });
  const ranked = rankTorrents([
    make('Show S01E01 1080p Castellano A', false),
    make('Show S01E01 1080p Castellano B', true),
  ], ranking);
  assert.ok(/Castellano B/.test(ranked[0].title), 'el cacheado va primero');
});

console.log('\n— Generación del stream para Stremio —');
check('construye name/title/url y token resoluble', () => {
  const title = 'Modern.Family.S01E01.1080p.BluRay.Castellano-GRP';
  const torrent = {
    title,
    size: 1610612736, // 1.5 GB
    seeders: 42,
    cached: true,
    indexer: 'DonTorrent',
    infoHash: 'aabbccddeeff00112233445566778899aabbccdd',
    magnet: null,
    parsed: { ...parseTitle(title), language: detectLanguage(title) },
  };
  const s = toStream(torrent, 'http://192.168.1.50:7000', 1, 1);
  assert.ok(/Castellano/.test(s.name), 'name incluye el idioma');
  assert.ok(/1080p/.test(s.name), 'name incluye la calidad');
  assert.ok(/⚡ Cacheado/.test(s.title), 'title marca cacheado');
  assert.ok(/1\.50 GB/.test(s.title), 'title incluye el tamaño');
  assert.ok(/👤 42/.test(s.title), 'title incluye seeders');
  assert.ok(s.url.startsWith('http://192.168.1.50:7000/resolve/'), 'url apunta a resolve');
  // el token debe decodificarse y, al no haber magnet, construirse desde el infohash
  const token = s.url.split('/resolve/')[1];
  const payload = decodeToken(token);
  assert.ok(payload.magnet.includes('aabbccddeeff'), 'magnet construido desde infohash');
  assert.strictEqual(payload.season, 1);
  assert.strictEqual(payload.episode, 1);
});

console.log(`\nResultado: ${passed} OK, ${failed} fallos\n`);
process.exit(failed ? 1 : 0);
