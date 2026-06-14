# 1. Instalación y primer arranque

## Requisitos

- **Windows** con **Node.js 20 o superior** (recomendado 22/24).
  Comprueba la versión: abre PowerShell y escribe `node --version`.
  Si no lo tienes, descárgalo de <https://nodejs.org> (versión LTS).
- Tus **tokens** de Real Debrid y/o TorBox (los configuras en el dashboard).
- (Muy recomendado) **Jackett** o **Prowlarr** — ver [guía 2](02-jackett-prowlarr.md).

## Paso 1 — Instalar dependencias

Abre **PowerShell** en la carpeta del proyecto y ejecuta (solo la primera vez):

```powershell
npm install
```

## Paso 2 — Arrancar el addon

```powershell
npm start
```

Verás algo así:

```
──────────────────────────────────────────────────────────
  🎬  Addon Castellano para Stremio  ·  v1.0.0
──────────────────────────────────────────────────────────
  Dashboard (config, buscador y descargas):
    → http://localhost:7000
    → http://192.168.1.50:7000   (desde otros equipos de la red)

  Manifest para instalar en Stremio (usa la IP, no localhost):
    → http://192.168.1.50:7000/manifest.json
──────────────────────────────────────────────────────────
```

Anota la **IP** que aparece (en el ejemplo `192.168.1.50`): la necesitarás para
la TV.

## Paso 3 — Configurar en el dashboard

Abre **http://localhost:7000** en el navegador. Pestañas:

- **🔎 Buscador** — buscar torrents a mano (ver [guía 4](04-buscador-y-descargas.md)).
- **📺 Instalar en Stremio** — la URL para Stremio y la info de red.
- **Servidores debrid** — pega tu token de **Real Debrid** y/o **TorBox** y marca
  la casilla para activarlos. Pulsa **Probar conexión** para validar.
  - Real Debrid: token en <https://real-debrid.com/apitoken>
  - TorBox: en <https://torbox.app> → *Settings* → *API*
- **Indexadores** — Jackett/Prowlarr (ver [guía 2](02-jackett-prowlarr.md)).
- **Idioma y calidad** — arrastra para reordenar la prioridad. Por defecto:
  **Castellano › Dual › VOSE › Latino › Inglés**.
- **Descargas** — carpeta de descargas y gestor.

Pulsa **Guardar configuración**. Listo.

## Paso 4 — Mantenerlo encendido

El addon debe estar **arrancado en tu PC** mientras ves la TV (`npm start`).
Para detenerlo, pulsa `Ctrl+C` en PowerShell.

> 💡 **Que arranque solo con Windows:** crea un acceso directo a un `.bat` con
> `cd C:\ruta\al\proyecto && npm start` en la carpeta *Inicio*
> (`shell:startup` en el menú Ejecutar).

## Comprobar que todo está bien

```powershell
npm test
```

Debe decir **14 OK, 0 fallos**.

➡️ Siguiente: **[Jackett / Prowlarr con trackers españoles](02-jackett-prowlarr.md)**.
