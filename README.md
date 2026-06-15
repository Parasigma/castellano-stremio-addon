# CASTELLAR — Addon castellano para Stremio

Addon de Stremio centrado en contenido en **castellano** (doblado y subtitulado),
con integración de **Real Debrid** y **TorBox**, indexadores **Jackett/Prowlarr**,
**buscador manual** y **servidor de descargas local** para Smart TV.

📖 **Documentación en español:** [`docs/GUIA-COMPLETA.md`](docs/GUIA-COMPLETA.md) · [índice por temas](docs/README.es.md)

## 🚀 Instalación en 1 línea (Windows, PC nuevo)

Abre **PowerShell** y pega esto. Instala Node, Git, Jackett, FlareSolverr y la app,
y crea los accesos directos:

```powershell
irm https://raw.githubusercontent.com/Parasigma/castellano-stremio-addon/main/install.ps1 -OutFile "$env:TEMP\inst.ps1"; & "$env:TEMP\inst.ps1"
```

Luego arranca con el acceso directo **«Iniciar Addon Castellano»** del escritorio
(o `iniciar.bat`) y abre **http://localhost:7000**.

> ¿Ya tienes el repo clonado? Doble clic en **`INSTALAR.bat`**. Para actualizar a
> los últimos cambios: **`actualizar.bat`** (hace `git pull` + `npm install`).

## Arranque rápido (manual)

```bash
npm install
npm start
```

Abre el dashboard en http://localhost:7000 · Manifest para Stremio en
`http://TU-IP:7000/manifest.json`

## Características

- 🇪🇸 **Prioridad castellano**: ordena Castellano › Dual › VOSE › Latino › Inglés.
- 🔌 **Debrid**: Real Debrid + TorBox (TorBox como detector de cache fiable).
- 🔎 **Indexadores**: Jackett/Prowlarr (trackers españoles) + fuentes públicas.
- 🖥️ **Dashboard**: configuración, buscador manual y gestor de descargas.
- 💾 **Descargas locales**: descarga al PC y reproduce en la TV (range requests).
- 🔐 Tokens **cifrados** en reposo (AES-256-GCM).
- 🌐 Panel de instalación con IP/URL, deep-link y HTTPS opcional.

## Estructura

```
src/
  index.js                Punto de entrada (HTTP + HTTPS opcional)
  config/                 Config por defecto, carga/guardado y cifrado
  clients/                Real Debrid, TorBox, Jackett, Prowlarr, públicas
  engine/                 parse · language · rank · meta · search · resolve · files
  download/manager.js     Descargas locales con WebTorrent
  server/                 App Express, TLS y rutas (api + protocolo Stremio)
public/                   Dashboard web (HTML/CSS/JS)
docs/                     Documentación en español (guías 1–5)
tests/engine.test.mjs     Pruebas del motor (npm test)
config/                   Datos en tiempo de ejecución (cifrados, ignorados por git)
```

## Pruebas

```bash
npm test    # 14 pruebas del motor (idioma, parsing, ranking, streams)
```
