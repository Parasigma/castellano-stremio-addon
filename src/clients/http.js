// Helper HTTP común para los clientes: fetch con timeout y errores claros.

const DEFAULT_TIMEOUT = 15000;

/**
 * fetch con timeout vía AbortController.
 * @param {string} url
 * @param {object} [options]
 * @param {number} [options.timeout]
 */
export async function request(url, options = {}) {
  const { timeout = DEFAULT_TIMEOUT, ...rest } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...rest, signal: controller.signal });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Tiempo de espera agotado (${timeout / 1000}s) al conectar con ${hostOf(url)}`);
    }
    // ECONNREFUSED, DNS, etc.
    throw new Error(`No se pudo conectar con ${hostOf(url)} (${err.cause?.code || err.message})`);
  } finally {
    clearTimeout(timer);
  }
}

/** Igual que request() pero devuelve JSON, con manejo de errores. */
export async function requestJson(url, options = {}) {
  const res = await request(url, options);
  let body = null;
  const text = await res.text();
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { ok: res.ok, status: res.status, body };
}

function hostOf(url) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
