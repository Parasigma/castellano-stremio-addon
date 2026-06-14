// Configuración por defecto del addon.
// Se fusiona con la config guardada del usuario (config/runtime.json).

export const defaultConfig = {
  server: {
    port: 7000,
    host: '0.0.0.0', // escucha en toda la red local para que la TV pueda conectar
    // HTTPS opcional (certificado autofirmado). Útil para el reproductor web de
    // Stremio en este mismo PC; en Smart TV se usa HTTP, que funciona en la LAN.
    https: { enabled: false, port: 7443 },
  },

  // Servidores debrid de pago (se rellenan desde el dashboard).
  debrid: {
    realdebrid: { enabled: false, token: '' },
    torbox: { enabled: false, token: '' },
  },

  // Indexadores: de dónde se sacan los torrents.
  indexers: {
    // Jackett / Prowlarr corriendo en tu PC (mejor cobertura en castellano).
    jackett: { enabled: false, url: 'http://127.0.0.1:9117', apiKey: '' },
    prowlarr: { enabled: false, url: 'http://127.0.0.1:9696', apiKey: '' },
    // Fuentes públicas de apoyo (mayormente inglés).
    publicSources: { enabled: true },
  },

  // Reglas de ordenación de resultados. El castellano manda.
  ranking: {
    // Prioridad de idioma (de mayor a menor). Reordenable desde el dashboard.
    languagePriority: ['castellano', 'dual', 'vose', 'latino', 'english'],
    // Prioridad de calidad.
    qualityPriority: ['2160p', '1080p', '720p', '480p'],
    // Códecs preferidos (los primeros puntúan más).
    preferCodecs: ['x265', 'x264'],
    excludeCam: true, // descarta CAM/TS/SCREENER
    minSeeders: 0,
    maxResults: 30,
  },

  // Servidor de descargas local (Hito 4).
  download: {
    path: '', // se autocompleta en el primer arranque a <userprofile>/Downloads/stremio
    maxConcurrent: 3,
  },
};

// Campos que contienen secretos y deben cifrarse en reposo / enmascararse en la UI.
// Ruta con notación de puntos dentro del objeto de config.
export const SECRET_FIELDS = [
  'debrid.realdebrid.token',
  'debrid.torbox.token',
  'indexers.jackett.apiKey',
  'indexers.prowlarr.apiKey',
];
