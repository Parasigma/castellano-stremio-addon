// Factory de clientes: construye instancias a partir de la config guardada
// (descifrando los secretos) o de valores proporcionados explícitamente.

import { loadConfig, getSecret } from '../config/store.js';
import { RealDebrid } from './realdebrid.js';
import { TorBox } from './torbox.js';
import { Jackett } from './jackett.js';
import { Prowlarr } from './prowlarr.js';

export { RealDebrid, TorBox, Jackett, Prowlarr };

export function getRealDebrid(token) {
  return new RealDebrid(token ?? getSecret('debrid.realdebrid.token'));
}

export function getTorBox(token) {
  return new TorBox(token ?? getSecret('debrid.torbox.token'));
}

export function getJackett(url, apiKey) {
  const c = loadConfig();
  return new Jackett(url ?? c.indexers.jackett.url, apiKey ?? getSecret('indexers.jackett.apiKey'));
}

export function getProwlarr(url, apiKey) {
  const c = loadConfig();
  return new Prowlarr(url ?? c.indexers.prowlarr.url, apiKey ?? getSecret('indexers.prowlarr.apiKey'));
}
