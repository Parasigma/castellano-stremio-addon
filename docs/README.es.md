# Addon Castellano para Stremio — Documentación

> Addon scraper centrado en **castellano** (doblado y subtitulado) que usa tus
> servidores de pago **Real Debrid** y **TorBox**, indexadores **Jackett/Prowlarr**
> y un **servidor de descargas local** para reproducir en tu Smart TV.

El addon prioriza el **español de España** sobre el inglés y el latino, tiene un
**dashboard** con buscador manual y gestor de descargas, y permite usar tu PC como
servidor para reproducir torrents que no estén cacheados en el debrid.

---

## 📚 Guías paso a paso

1. **[Instalación y primer arranque](01-instalacion.md)** — instalar y abrir el dashboard.
2. **[Jackett / Prowlarr con trackers españoles](02-jackett-prowlarr.md)** — ⭐ lo
   que de verdad hace que aparezca el castellano. **Empieza por aquí si no
   encuentras contenido en español.**
3. **[Instalar el addon en Stremio (PC y Smart TV)](03-instalar-en-stremio-tv.md)**.
4. **[Buscador manual y descargas al PC](04-buscador-y-descargas.md)**.
5. **[Solución de problemas](05-solucion-de-problemas.md)**.

---

## 🚀 Arranque rápido

```powershell
npm install      # solo la primera vez
npm start
```

Abre **http://localhost:7000**, configura tus tokens en la pestaña *Servidores
debrid*, tus indexadores en *Indexadores*, y consulta la pestaña *📺 Instalar en
Stremio* para la URL que pegar en Stremio.

> ⚠️ **Para que aparezca castellano necesitas Jackett o Prowlarr** con trackers
> españoles. Las fuentes públicas (The Pirate Bay, etc.) están bloqueadas por la
> mayoría de ISP españoles y casi todo su contenido es en inglés.
> Ver **[guía 2](02-jackett-prowlarr.md)**.

---

## 🧩 ¿Cómo funciona? (resumen)

```
Stremio (TV) ──pide streams──▶ Addon (tu PC)
                                  │
                                  ├─▶ busca en Jackett/Prowlarr (+ públicas)
                                  ├─▶ analiza idioma/calidad y ORDENA castellano 1º
                                  ├─▶ comprueba cache en TorBox / Real Debrid
                                  └─▶ devuelve streams ordenados
Al pulsar ▶  ──▶ el addon resuelve el torrent en el debrid y reproduce
            └─▶ o reproduce desde un torrent descargado en tu PC
```

## 🔒 Privacidad

Tus tokens se guardan **cifrados** (`config/runtime.json`) en tu ordenador y
**nunca** salen de él. La clave de cifrado está en `config/secret.key`.

## 🛠️ Estado del proyecto

Todos los hitos completados (v1.0.0):

- ✅ Hito 0 — Esqueleto + configuración + dashboard.
- ✅ Hito 1 — Clientes Real Debrid + TorBox + Jackett/Prowlarr + "Probar conexión".
- ✅ Hito 2 — Búsqueda + ranking castellano + reproducción en Stremio.
- ✅ Hito 3 — Buscador manual en el dashboard.
- ✅ Hito 4 — Descargas locales + servidor de streaming a la TV.
- ✅ Hito 5 — Documentación completa.
- ✅ Hito 6 — Pulido de red (IP, puerto, firewall, HTTPS opcional).

Comprobar que el motor funciona: `npm test` (14 pruebas).
