// Lógica del dashboard: carga config, gestiona pestañas, listas ordenables y guardado.

const LANG_LABELS = {
  castellano: '🇪🇸 Castellano (España)',
  dual: '🔵 Dual (incluye castellano)',
  vose: '🟡 VOSE (subtítulos en español)',
  latino: '🟠 Latino',
  english: '⚪ Inglés / otros',
};

let currentConfig = null;

// --- pestañas ------------------------------------------------------------
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
    tab.classList.add('active');
    document.querySelector(`.panel[data-panel="${tab.dataset.tab}"]`).classList.add('active');
  });
});

// --- listas ordenables (drag & drop) -------------------------------------
function renderSortable(ul, items, labelMap) {
  ul.innerHTML = '';
  items.forEach((value) => {
    const li = document.createElement('li');
    li.draggable = true;
    li.dataset.value = value;
    li.textContent = labelMap ? labelMap[value] || value : value;
    ul.appendChild(li);
  });

  let dragged = null;
  ul.querySelectorAll('li').forEach((li) => {
    li.addEventListener('dragstart', () => { dragged = li; li.classList.add('dragging'); });
    li.addEventListener('dragend', () => { dragged = null; li.classList.remove('dragging'); });
    li.addEventListener('dragover', (e) => {
      e.preventDefault();
      const after = getDragAfter(ul, e.clientY);
      if (after == null) ul.appendChild(dragged);
      else ul.insertBefore(dragged, after);
    });
  });
}

function getDragAfter(ul, y) {
  const els = [...ul.querySelectorAll('li:not(.dragging)')];
  return els.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) return { offset, element: child };
    return closest;
  }, { offset: -Infinity, element: null }).element;
}

function readSortable(ul) {
  return [...ul.querySelectorAll('li')].map((li) => li.dataset.value);
}

// --- carga ---------------------------------------------------------------
async function loadStatus() {
  const r = await fetch('/api/status');
  const s = await r.json();
  document.getElementById('version').textContent = `v${s.version}`;
  const bar = document.getElementById('statusBar');
  const chip = (label, on) => `<span class="chip ${on ? 'on' : ''}">${on ? '✓' : '○'} ${label}</span>`;
  bar.innerHTML =
    chip('Real Debrid', s.debrid.realdebrid) +
    chip('TorBox', s.debrid.torbox) +
    chip('Jackett', s.indexers.jackett) +
    chip('Prowlarr', s.indexers.prowlarr);
}

async function loadConfig() {
  const r = await fetch('/api/config');
  currentConfig = await r.json();
  const c = currentConfig;

  // debrid
  document.getElementById('rd_enabled').checked = c.debrid.realdebrid.enabled;
  document.getElementById('rd_token').value = '';
  document.getElementById('rd_token').placeholder = c.debrid.realdebrid.token ? '•••••••• (guardado)' : 'Pega tu token de Real Debrid';
  document.getElementById('tb_enabled').checked = c.debrid.torbox.enabled;
  document.getElementById('tb_token').value = '';
  document.getElementById('tb_token').placeholder = c.debrid.torbox.token ? '•••••••• (guardado)' : 'Pega tu token de TorBox';

  // indexers
  document.getElementById('jk_enabled').checked = c.indexers.jackett.enabled;
  document.getElementById('jk_url').value = c.indexers.jackett.url;
  document.getElementById('jk_apiKey').value = '';
  document.getElementById('jk_apiKey').placeholder = c.indexers.jackett.apiKey ? '•••••••• (guardado)' : 'API Key de Jackett';
  document.getElementById('pw_enabled').checked = c.indexers.prowlarr.enabled;
  document.getElementById('pw_url').value = c.indexers.prowlarr.url;
  document.getElementById('pw_apiKey').value = '';
  document.getElementById('pw_apiKey').placeholder = c.indexers.prowlarr.apiKey ? '•••••••• (guardado)' : 'API Key de Prowlarr';
  document.getElementById('pub_enabled').checked = c.indexers.publicSources.enabled;

  // ranking
  renderSortable(document.getElementById('languageList'), c.ranking.languagePriority, LANG_LABELS);
  renderSortable(document.getElementById('qualityList'), c.ranking.qualityPriority, null);
  document.getElementById('onlyCastellano').checked = !!c.ranking.onlyCastellano;
  document.getElementById('excludeCam').checked = c.ranking.excludeCam;
  document.getElementById('minSeeders').value = c.ranking.minSeeders;
  document.getElementById('maxResults').value = c.ranking.maxResults;

  // download + biblioteca
  document.getElementById('dl_path').value = c.download.path;
  document.getElementById('dl_maxConcurrent').value = c.download.maxConcurrent;
  document.getElementById('lib_path').value = (c.library && c.library.path) || '';

  // https + túnel
  document.getElementById('https_enabled').checked = !!(c.server && c.server.https && c.server.https.enabled);
  document.getElementById('tunnel_enabled').checked = !!(c.server && c.server.tunnel && c.server.tunnel.enabled);

  // reproductor privado
  document.getElementById('player_password').value = '';
  document.getElementById('player_password').placeholder = (c.player && c.player.password)
    ? '•••••••• (guardada)' : 'Pon una contraseña';
}

// --- guardado ------------------------------------------------------------
function buildPatch() {
  const tokenOrEmpty = (id) => document.getElementById(id).value.trim();
  return {
    debrid: {
      realdebrid: { enabled: document.getElementById('rd_enabled').checked, token: tokenOrEmpty('rd_token') },
      torbox: { enabled: document.getElementById('tb_enabled').checked, token: tokenOrEmpty('tb_token') },
    },
    indexers: {
      jackett: {
        enabled: document.getElementById('jk_enabled').checked,
        url: document.getElementById('jk_url').value.trim(),
        apiKey: tokenOrEmpty('jk_apiKey'),
      },
      prowlarr: {
        enabled: document.getElementById('pw_enabled').checked,
        url: document.getElementById('pw_url').value.trim(),
        apiKey: tokenOrEmpty('pw_apiKey'),
      },
      publicSources: { enabled: document.getElementById('pub_enabled').checked },
    },
    ranking: {
      languagePriority: readSortable(document.getElementById('languageList')),
      qualityPriority: readSortable(document.getElementById('qualityList')),
      onlyCastellano: document.getElementById('onlyCastellano').checked,
      excludeCam: document.getElementById('excludeCam').checked,
      minSeeders: Number(document.getElementById('minSeeders').value) || 0,
      maxResults: Number(document.getElementById('maxResults').value) || 30,
    },
    download: {
      path: document.getElementById('dl_path').value.trim(),
      maxConcurrent: Number(document.getElementById('dl_maxConcurrent').value) || 3,
    },
    library: {
      path: document.getElementById('lib_path').value.trim(),
    },
    player: {
      password: tokenOrEmpty('player_password'),
    },
    server: {
      https: { enabled: document.getElementById('https_enabled').checked },
      tunnel: { enabled: document.getElementById('tunnel_enabled').checked },
    },
  };
}

document.getElementById('saveBtn').addEventListener('click', async () => {
  const msg = document.getElementById('saveMsg');
  msg.textContent = 'Guardando…';
  msg.classList.remove('error');
  try {
    const r = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPatch()),
    });
    const data = await r.json();
    if (!data.ok) throw new Error(data.error || 'Error desconocido');
    msg.textContent = '✓ Guardado correctamente';
    await loadStatus();
    await loadConfig();
  } catch (err) {
    msg.textContent = '✗ ' + err.message;
    msg.classList.add('error');
  }
  setTimeout(() => { msg.textContent = ''; msg.classList.remove('error'); }, 4000);
});

// --- probar conexión -----------------------------------------------------
// Envía los valores escritos en el formulario (aunque no se hayan guardado).
function testPayload(service) {
  switch (service) {
    case 'realdebrid': return { token: document.getElementById('rd_token').value.trim() };
    case 'torbox': return { token: document.getElementById('tb_token').value.trim() };
    case 'jackett': return {
      url: document.getElementById('jk_url').value.trim(),
      apiKey: document.getElementById('jk_apiKey').value.trim(),
    };
    case 'prowlarr': return {
      url: document.getElementById('pw_url').value.trim(),
      apiKey: document.getElementById('pw_apiKey').value.trim(),
    };
    default: return {};
  }
}

function describeResult(service, r) {
  switch (service) {
    case 'realdebrid':
      return `✓ ${r.username || ''} · ${r.premium ? 'Premium' : r.type} · expira ${fmtDate(r.expiration)}`;
    case 'torbox':
      return `✓ ${r.email || ''} · ${r.premium ? 'Plan ' + r.plan : 'Free'}${r.expiration ? ' · expira ' + fmtDate(r.expiration) : ''}`;
    case 'jackett':
      return `✓ Conectado (${r.categories} categorías disponibles)`;
    case 'prowlarr':
      return `✓ Conectado · v${r.version || '?'} · ${r.indexers} indexador(es)`;
    default: return '✓ Conectado';
  }
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d) ? iso : d.toLocaleDateString('es-ES');
}

document.querySelectorAll('.test-btn').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const service = btn.dataset.service;
    const msg = document.querySelector(`.test-msg[data-msg="${service}"]`);
    btn.disabled = true;
    msg.className = 'test-msg';
    msg.textContent = 'Probando…';
    try {
      const r = await fetch(`/api/test/${service}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload(service)),
      });
      const data = await r.json();
      if (data.ok) {
        msg.classList.add('ok');
        msg.textContent = describeResult(service, data.result);
      } else {
        msg.classList.add('error');
        msg.textContent = '✗ ' + data.error;
      }
    } catch (err) {
      msg.classList.add('error');
      msg.textContent = '✗ ' + err.message;
    } finally {
      btn.disabled = false;
    }
  });
});

// --- buscador manual -----------------------------------------------------
function fmtSize(bytes) {
  if (!bytes) return '';
  const gb = bytes / 1073741824;
  return gb >= 1 ? `${gb.toFixed(2)} GB` : `${(bytes / 1048576).toFixed(0)} MB`;
}

function resultCard(r) {
  const el = document.createElement('div');
  el.className = 'result';
  el.dataset.infohash = (r.infoHash || '').toLowerCase();

  const badges = [];
  badges.push(`<span class="badge lang-${r.languageCategory}">${r.languageLabel}</span>`);
  if (r.quality) badges.push(`<span class="badge">${r.quality}</span>`);
  if (r.source) badges.push(`<span class="badge">${r.source}</span>`);
  if (r.codec) badges.push(`<span class="badge">${r.codec}</span>`);
  if (r.hdr) badges.push(`<span class="badge">HDR</span>`);
  if (r.isPack) badges.push(`<span class="badge">📦 Pack T${r.season ?? ''}</span>`);
  if (r.size) badges.push(`<span class="badge">${fmtSize(r.size)}</span>`);
  badges.push(`<span class="badge">👤 ${r.seeders}</span>`);
  const cc = r.cached === true ? 'cached' : (r.cached === false ? 'notcached' : '');
  const ct = r.cached === true ? '⚡ Cacheado' : (r.cached === false ? '⬇️ No cacheado' : '❔ cache?');
  badges.push(`<span class="badge cache-badge ${cc}">${ct}</span>`);
  badges.push(`<span class="badge">📡 ${r.indexer}</span>`);

  el.innerHTML = `
    <div class="result-title">${escapeHtml(r.title)}</div>
    <div class="result-meta">${badges.join('')}</div>
    <div class="cache-status hint small"></div>
    <div class="result-actions">
      <button class="mini-btn" data-act="torbox">⬆️ Enviar a TorBox</button>
      <button class="mini-btn" data-act="realdebrid">⬆️ Enviar a Real Debrid</button>
      <button class="mini-btn" data-act="download">💾 Descargar al PC</button>
      <button class="mini-btn" data-act="copy">📋 Copiar magnet</button>
      <span class="action-msg"></span>
    </div>`;

  const msg = el.querySelector('.action-msg');
  el.querySelectorAll('.mini-btn').forEach((btn) => {
    btn.addEventListener('click', () => handleAction(btn.dataset.act, r, btn, msg));
  });
  return el;
}

async function handleAction(act, r, btn, msg) {
  if (act === 'copy') {
    try { await navigator.clipboard.writeText(r.magnet); msg.textContent = '✓ Magnet copiado'; }
    catch { msg.textContent = r.magnet; }
    return;
  }
  btn.disabled = true;
  msg.textContent = 'Enviando…';
  try {
    const endpoint = act === 'download' ? '/api/downloads' : '/api/debrid/add';
    const body = act === 'download'
      ? { magnet: r.magnet }
      : { magnet: r.magnet, service: act };
    const resp = await fetch(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const data = await resp.json();
    if (data.ok) {
      if (act === 'torbox' || act === 'realdebrid') {
        const prov = act === 'torbox' ? 'TorBox' : 'Real Debrid';
        msg.textContent = `✓ Enviado a ${prov}. Mira el progreso aquí abajo ↓`;
        if (r.infoHash) sentToDebrid.add(r.infoHash.toLowerCase());
        startStatusPolling(); // empieza a mostrar el progreso y cuándo se cachea
      } else if (act === 'download') {
        msg.textContent = '✓ Descarga iniciada. Mira el progreso en la pestaña "Descargas".';
      } else {
        msg.textContent = '✓ Hecho';
      }
    } else {
      msg.textContent = '✗ ' + (data.error || 'Error');
    }
  } catch (err) {
    msg.textContent = '✗ ' + err.message;
  } finally {
    btn.disabled = false;
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// Infohashes que el usuario ha enviado a debrid en esta sesión (para dar feedback
// aunque el debrid todavía no los liste).
const sentToDebrid = new Set();

// Consulta el progreso en los debrid y actualiza cada resultado (badge + estado).
async function refreshDebridStatus() {
  let map = {};
  try {
    const r = await fetch('/api/debrid/status');
    const d = await r.json();
    map = d.byHash || {};
  } catch { return; }
  document.querySelectorAll('#searchResults .result[data-infohash]').forEach((card) => {
    const ih = card.dataset.infohash;
    if (!ih) return;
    const st = map[ih];
    const statusEl = card.querySelector('.cache-status');
    const badge = card.querySelector('.cache-badge');
    if (!st) {
      // Aún no aparece en el debrid; si lo acabamos de enviar, avisamos.
      if (sentToDebrid.has(ih) && statusEl) {
        statusEl.textContent = '⏳ Añadido al debrid, esperando a que empiece a descargar… (suele tardar; con pocos seeders va lento)';
      }
      return;
    }
    if (st.ready) {
      if (statusEl) statusEl.innerHTML = '<span style="color:var(--ok)">✅ Cacheado — ya se puede ver en Stremio</span>';
      if (badge) { badge.className = 'badge cache-badge cached'; badge.textContent = '⚡ Cacheado'; }
    } else {
      const eta = st.eta > 0 ? ` · ~${Math.round(st.eta / 60)} min` : '';
      const spd = st.speed > 0 ? ` · ${(st.speed / 1048576).toFixed(1)} MB/s` : '';
      if (statusEl) statusEl.textContent = `⏳ ${st.provider}: ${st.progress}% (${st.state})${spd}${eta}`;
      if (badge) { badge.className = 'badge cache-badge notcached'; badge.textContent = `⬇️ ${st.progress}%`; }
    }
  });
}

// Tras enviar a debrid, va refrescando el progreso unos minutos.
let statusTimer = null;
function startStatusPolling() {
  refreshDebridStatus();
  clearInterval(statusTimer);
  let n = 0;
  statusTimer = setInterval(() => {
    n += 1;
    const onTab = document.querySelector('.panel[data-panel="buscador"]').classList.contains('active');
    if (n > 60 || !onTab) { clearInterval(statusTimer); return; }
    refreshDebridStatus();
  }, 6000);
}

async function doSearch() {
  const query = document.getElementById('searchInput').value.trim();
  if (!query) return;
  const info = document.getElementById('searchInfo');
  const container = document.getElementById('searchResults');
  container.innerHTML = '<div class="spinner">Buscando en tus indexadores…</div>';
  info.textContent = '';
  try {
    const resp = await fetch('/api/search', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }),
    });
    const data = await resp.json();
    container.innerHTML = '';
    if (!data.ok) { info.textContent = '✗ ' + data.error; return; }
    if (!data.results.length) {
      info.textContent = 'Sin resultados. ¿Tienes Jackett/Prowlarr configurado y activo? (en España las fuentes públicas suelen estar bloqueadas)';
      return;
    }
    info.textContent = `${data.results.length} resultado(s), ordenados con el castellano primero.`;
    data.results.forEach((r) => container.appendChild(resultCard(r)));
    refreshDebridStatus(); // refleja lo que ya esté en debrid (progreso/cacheado)
  } catch (err) {
    container.innerHTML = '';
    info.textContent = '✗ ' + err.message;
  }
}

document.getElementById('refreshStatusBtn').addEventListener('click', refreshDebridStatus);
document.getElementById('searchBtn').addEventListener('click', doSearch);
document.getElementById('searchInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doSearch();
});

// --- descargas locales ---------------------------------------------------
function fmtSpeed(bytesPerSec) {
  if (!bytesPerSec) return '0 KB/s';
  const mb = bytesPerSec / 1048576;
  return mb >= 1 ? `${mb.toFixed(1)} MB/s` : `${(bytesPerSec / 1024).toFixed(0)} KB/s`;
}

function downloadCard(d) {
  const el = document.createElement('div');
  el.className = 'result';
  const eta = d.done ? '' : (d.timeRemaining && isFinite(d.timeRemaining)
    ? `⏳ ${Math.round(d.timeRemaining / 60000)} min` : '');
  el.innerHTML = `
    <div class="result-title">${escapeHtml(d.name)}</div>
    <div class="progress"><span style="width:${d.progress}%"></span></div>
    <div class="dl-stats">
      <span class="${d.done ? 'dl-done' : ''}">${d.done ? '✅ Completado' : d.progress + '%'}</span>
      <span>⬇️ ${fmtSpeed(d.downloadSpeed)}</span>
      <span>👥 ${d.numPeers} peers</span>
      <span>${fmtSize(d.downloaded)} / ${fmtSize(d.length)}</span>
      ${eta ? `<span>${eta}</span>` : ''}
    </div>
    <div class="result-actions" style="margin-top:10px">
      <button class="mini-btn" data-act="del">🗑️ Quitar</button>
      <button class="mini-btn" data-act="delfiles">🗑️ Quitar y borrar ficheros</button>
      <span class="action-msg"></span>
    </div>`;
  const msg = el.querySelector('.action-msg');
  el.querySelector('[data-act="del"]').addEventListener('click', () => removeDl(d.infoHash, false, msg));
  el.querySelector('[data-act="delfiles"]').addEventListener('click', () => removeDl(d.infoHash, true, msg));
  return el;
}

async function removeDl(infoHash, files, msg) {
  msg.textContent = 'Quitando…';
  await fetch(`/api/downloads/${infoHash}?files=${files ? 1 : 0}`, { method: 'DELETE' });
  loadDownloads();
}

async function loadDownloads() {
  const container = document.getElementById('downloadsList');
  try {
    const r = await fetch('/api/downloads');
    const data = await r.json();
    container.innerHTML = '';
    if (!data.downloads || !data.downloads.length) {
      container.innerHTML = '<p class="hint small">Sin descargas activas.</p>';
      return;
    }
    data.downloads.forEach((d) => container.appendChild(downloadCard(d)));
  } catch (err) {
    container.innerHTML = `<p class="hint small">Error: ${err.message}</p>`;
  }
}

document.getElementById('dl_addBtn').addEventListener('click', async () => {
  const input = document.getElementById('dl_magnet');
  const magnet = input.value.trim();
  if (!magnet) return;
  await fetch('/api/downloads', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ magnet }),
  });
  input.value = '';
  loadDownloads();
});
document.getElementById('dl_refresh').addEventListener('click', loadDownloads);

// Auto-refresca la lista mientras la pestaña Descargas está visible.
let dlTimer = null;
document.querySelector('.tab[data-tab="download"]').addEventListener('click', () => {
  loadDownloads();
  clearInterval(dlTimer);
  dlTimer = setInterval(() => {
    if (document.querySelector('.panel[data-panel="download"]').classList.contains('active')) {
      loadDownloads();
    } else {
      clearInterval(dlTimer);
    }
  }, 2000);
});

// --- panel de instalación ------------------------------------------------
async function loadNetwork() {
  try {
    const r = await fetch('/api/network');
    const n = await r.json();
    document.getElementById('localUrl').value = n.localUrl;
    document.getElementById('localDeepLink').href = n.localDeepLink;
    document.getElementById('manifestUrl').value = n.manifestUrl;
    document.getElementById('deepLink').href = n.deepLink;
    document.getElementById('webInstall').href = n.webInstall;
    document.getElementById('firewallCmd').value = n.firewallCmd;
    const ifs = n.interfaces || [];
    const lines = ifs.map((it, idx) => {
      const tag = it.virtual
        ? ' <span style="color:var(--muted)">— adaptador virtual, IGNORAR</span>'
        : (idx === 0 ? ' <span style="color:var(--ok)">— ✅ usa esta (Wi-Fi/red)</span>' : '');
      return `${escapeHtml(it.name)}: <b>${it.address}</b>${tag}`;
    }).join('<br>');
    document.getElementById('netInfo').innerHTML =
      `Puerto ${n.port}. IPs detectadas en este PC:<br>${lines || '—'}`;

    // Túnel público (HTTPS) para móvil/TV
    const tn = n.tunnel || {};
    const tInfo = document.getElementById('tunnelInfo');
    if (tn.manifestUrl) {
      document.getElementById('tunnelUrl').value = tn.manifestUrl;
      document.getElementById('tunnelDeepLink').href = tn.deepLink || '#';
      tInfo.innerHTML = '<span style="color:var(--ok)">✅ Túnel activo.</span> Instala esta URL en el Stremio del móvil/PC (con tu cuenta) y se sincronizará a la TV. Mientras <b>tunel.bat</b> siga abierto, esta URL <b>no cambia</b> aunque reinicies el addon.';
    } else {
      document.getElementById('tunnelUrl').value = '';
      if (!tn.enabled) {
        tInfo.innerHTML = 'Túnel desactivado. Actívalo arriba, pulsa <b>Guardar</b>, reinicia el addon (iniciar.bat) y ejecuta <b>tunel.bat</b>.';
      } else if (tn.status === 'starting') {
        tInfo.textContent = '⏳ Abriendo el túnel… espera unos segundos (se actualiza solo).';
      } else if (tn.status === 'error') {
        tInfo.textContent = '✗ ' + (tn.error || 'Error del túnel');
      } else {
        tInfo.innerHTML = '▶️ Ejecuta <b>tunel.bat</b> (doble clic, deja la ventana abierta). La URL aparecerá aquí en unos segundos.';
      }
      if (tn.enabled && tn.status !== 'error') {
        clearTimeout(window.__tnTimer);
        window.__tnTimer = setTimeout(loadNetwork, 3000);
      }
    }

    // Reproductor privado
    const pl = n.player || {};
    document.getElementById('playerUrl').value = pl.remoteUrl || pl.localUrl || '';
    const pinfo = document.getElementById('playerInfo');
    if (!pl.configured) {
      pinfo.textContent = 'Pon una contraseña arriba y pulsa Guardar para activarlo.';
    } else if (!pl.remoteUrl) {
      pinfo.innerHTML = '⚠️ Activa el túnel (sección ③) para usarlo desde fuera de casa. Ahora solo funciona en tu red local.';
    } else {
      pinfo.innerHTML = '<span style="color:var(--ok)">✓ Listo: abre esa URL en el iPad, mete la contraseña y a ver los vídeos.</span>';
    }
  } catch (err) {
    document.getElementById('netInfo').textContent = 'No se pudo cargar la info de red: ' + err.message;
  }
}

function copyFrom(inputId, btn) {
  const val = document.getElementById(inputId).value;
  navigator.clipboard.writeText(val).then(() => {
    const old = btn.textContent; btn.textContent = '✓ Copiado';
    setTimeout(() => { btn.textContent = old; }, 1500);
  });
}
document.getElementById('copyLocal').addEventListener('click', (e) => copyFrom('localUrl', e.target));
document.getElementById('copyManifest').addEventListener('click', (e) => copyFrom('manifestUrl', e.target));
document.getElementById('copyFirewall').addEventListener('click', (e) => copyFrom('firewallCmd', e.target));
document.getElementById('copyTunnel').addEventListener('click', (e) => copyFrom('tunnelUrl', e.target));
document.getElementById('copyPlayer').addEventListener('click', (e) => copyFrom('playerUrl', e.target));

// --- biblioteca local ----------------------------------------------------
async function loadLibraryInfo() {
  try {
    const r = await fetch('/api/library');
    const d = await r.json();
    const el = document.getElementById('lib_info');
    if (!d.path) el.textContent = 'Sin carpeta configurada.';
    else if (!d.exists) el.textContent = `⚠️ La carpeta no existe: ${d.path}`;
    else el.textContent = `✓ ${d.count} vídeo(s) detectado(s) en la biblioteca.`;
  } catch { /* noop */ }
}
document.getElementById('lib_rescan').addEventListener('click', async (e) => {
  const el = document.getElementById('lib_info');
  el.textContent = 'Re-escaneando…';
  try {
    const r = await fetch('/api/library/rescan', { method: 'POST' });
    const d = await r.json();
    el.textContent = `✓ ${d.count} vídeo(s) detectado(s).`;
  } catch (err) { el.textContent = '✗ ' + err.message; }
});

// --- reproductor + conversor ---------------------------------------------
document.getElementById('openPlayer').addEventListener('click', () => window.open('/player', '_blank'));

function updateConvCard(el, job) {
  const s = el.querySelector('.conv-status');
  const btn = el.querySelector('[data-conv]');
  const bar = el.querySelector('.progress');
  const fill = el.querySelector('.progress > span');
  if (!s) return;
  if (job.status === 'converting') {
    if (btn) btn.disabled = true;
    if (bar) bar.style.display = 'block';
    if (fill) fill.style.width = (job.progress || 0) + '%';
    s.textContent = `⏳ Convirtiendo… ${job.progress}%`;
  } else if (job.status === 'done') {
    if (btn) btn.disabled = true;
    if (bar) bar.style.display = 'block';
    if (fill) fill.style.width = '100%';
    s.innerHTML = '<span style="color:var(--ok)">✅ Hecho. Pulsa "Cargar vídeos" para verlo en MP4.</span>';
  } else if (job.status === 'error') {
    if (btn) btn.disabled = false;
    if (bar) bar.style.display = 'none';
    s.innerHTML = `<span style="color:var(--accent)">✗ ${job.error || 'error'}</span>`;
  }
}

async function loadConvList() {
  const info = document.getElementById('ffmpegInfo');
  const list = document.getElementById('convList');
  list.innerHTML = '<div class="spinner">Cargando…</div>';
  try {
    const vids = (await (await fetch('/api/library/list')).json()).videos || [];
    const conv = await (await fetch('/api/convert')).json();
    info.textContent = conv.ffmpeg
      ? `✓ ffmpeg listo (${conv.ffmpegPath})`
      : '✗ ffmpeg no instalado (reinstala con INSTALAR.bat)';
    const jobsById = {};
    (conv.jobs || []).forEach((j) => { jobsById[j.id] = j; });
    list.innerHTML = '';
    if (!vids.length) {
      list.innerHTML = '<p class="hint small">No hay vídeos. Configura la carpeta de biblioteca en la pestaña Descargas.</p>';
      return;
    }
    vids.forEach((v) => {
      const isMp4 = /\.mp4$/i.test(v.name);
      const el = document.createElement('div');
      el.className = 'result';
      el.dataset.convid = v.id;
      const action = isMp4
        ? '<span class="badge cached">✓ ya es MP4</span>'
        : `<button class="mini-btn" data-conv="${v.id}">🎬 Convertir a MP4</button>`;
      el.innerHTML = `<div class="result-title">${escapeHtml(v.name)}</div>
        <div class="progress" style="display:none"><span style="width:0%"></span></div>
        <div class="result-actions">${action}<span class="conv-status hint small"></span></div>`;
      list.appendChild(el);
      if (jobsById[v.id]) updateConvCard(el, jobsById[v.id]);
    });
    list.querySelectorAll('[data-conv]').forEach((b) => b.addEventListener('click', () => startConvert(b.dataset.conv)));
  } catch (e) {
    list.innerHTML = `<p class="hint small">Error: ${e.message}</p>`;
  }
}

async function startConvert(id) {
  const el = document.querySelector(`.result[data-convid="${id}"]`);
  const s = el && el.querySelector('.conv-status');
  if (s) s.textContent = 'Iniciando…';
  try {
    const d = await (await fetch('/api/convert/' + id, { method: 'POST' })).json();
    if (!d.ok) { if (s) s.innerHTML = `<span style="color:var(--accent)">✗ ${d.error}</span>`; return; }
    startConvPolling();
  } catch (e) { if (s) s.textContent = '✗ ' + e.message; }
}

let convTimer = null;
function startConvPolling() {
  clearInterval(convTimer);
  convTimer = setInterval(async () => {
    if (!document.querySelector('.panel[data-panel="reproductor"]').classList.contains('active')) {
      clearInterval(convTimer); return;
    }
    try {
      const conv = await (await fetch('/api/convert')).json();
      let active = false;
      (conv.jobs || []).forEach((j) => {
        const el = document.querySelector(`.result[data-convid="${j.id}"]`);
        if (el) updateConvCard(el, j);
        if (j.status === 'converting') active = true;
      });
      if (!active) clearInterval(convTimer);
    } catch (e) { /* noop */ }
  }, 2000);
}

document.getElementById('loadConvBtn').addEventListener('click', loadConvList);
document.querySelector('.tab[data-tab="reproductor"]').addEventListener('click', loadConvList);

// --- init ----------------------------------------------------------------
loadStatus();
loadConfig();
loadNetwork();
loadLibraryInfo();
