// Fuente única de la versión: se lee de package.json.
// Para "subir de versión" basta con cambiar "version" en package.json.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'));

export const VERSION = pkg.version;
export const ADDON_NAME = 'CASTELLAR';
