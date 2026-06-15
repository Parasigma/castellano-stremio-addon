# 📺 CASTELLAR — Guía completa (addon castellano para Stremio)

> Manual único y completo: qué es, cómo instalarlo paso a paso (incluido Jackett),
> cómo usarlo, y solución de problemas.
>
> Documentación por temas (versión separada): [`README.es.md`](README.es.md).

---

## Índice

1. [Qué es y cómo funciona](#1-qué-es-y-cómo-funciona)
2. [Requisitos](#2-requisitos)
3. [Instalación paso a paso](#3-instalación-paso-a-paso)
   - 3.1 [El addon](#31-instalar-el-addon)
   - 3.2 [Jackett + trackers españoles](#32-instalar-jackett--trackers-españoles-clave)
   - 3.3 [Tokens de Real Debrid y TorBox](#33-configurar-real-debrid-y-torbox)
   - 3.4 [Instalar en Stremio (PC y Smart TV)](#34-instalar-en-stremio-pc-y-smart-tv)
4. [Cómo usar el addon](#4-cómo-usar-el-addon)
   - 4.1 [Ver series y películas](#41-ver-series-y-películas)
   - 4.2 [Buscador manual](#42-buscador-manual)
   - 4.3 [Descargas al PC](#43-descargas-al-pc)
   - 4.4 [Las pestañas del dashboard](#44-las-pestañas-del-dashboard)
5. [Solución de problemas](#5-solución-de-problemas)
6. [Preguntas frecuentes (FAQ)](#6-preguntas-frecuentes-faq)
7. [Mantenimiento](#7-mantenimiento)
8. [Privacidad y seguridad](#8-privacidad-y-seguridad)

---

## 1. Qué es y cómo funciona

Es un **addon de Stremio** que corre en tu PC y se especializa en encontrar
películas y series en **castellano (España)**, tanto **dobladas** como en
**versión original subtitulada (VOSE)**. Usa tus servidores de pago
(**Real Debrid** y **TorBox**) y trackers españoles a través de **Jackett**.

Flujo cuando le das a una serie en Stremio:

```
Stremio (TV/PC) ──pide streams──▶ Addon (tu PC)
                                    │
                                    ├─▶ averigua el título (Cinemeta)
                                    ├─▶ busca en Jackett (+ Prowlarr / públicas)
                                    ├─▶ analiza idioma y calidad de cada resultado
                                    ├─▶ ORDENA con el castellano arriba
                                    ├─▶ marca lo que está cacheado en tu debrid
                                    └─▶ devuelve la lista ordenada
Pulsas ▶ ──▶ resuelve ese torrent en Real Debrid/TorBox y reproduce
         └─▶ o reproduce un torrent ya descargado en tu PC (stream "Local")
```

**Orden de prioridad por defecto:** 🇪🇸 Castellano › 🔵 Dual › 🟡 VOSE › 🟠 Latino › 🇬🇧 Inglés.
Dentro de cada idioma, primero lo **cacheado** (reproducción instantánea).

> **Por qué Jackett es imprescindible:** el addon sabe *ordenar* y *priorizar* el
> castellano, pero necesita una fuente que *tenga* ese contenido. En España, las
> fuentes públicas (The Pirate Bay, etc.) están bloqueadas por los operadores y
> casi todo su contenido es inglés. Los trackers españoles (DonTorrent…) viven
> dentro de Jackett.

---

## 2. Requisitos

- **Windows 10/11.**
- **Node.js 20 o superior** (recomendado 22/24). Comprobar: en PowerShell,
  `node --version`. Descarga: <https://nodejs.org> (versión LTS).
- **Cuenta y token** de Real Debrid y/o TorBox.
- **Jackett** (se instala en el paso 3.2; es gratis).
- La **TV y el PC en la misma red** (mismo router/WiFi).

---

## 3. Instalación paso a paso

### 3.0 Instalación automática en 1 clic (recomendada)

En el PC que vayas a usar de **servidor**, abre **PowerShell** y pega esta línea.
Instala Node.js, Git, Jackett, FlareSolverr y la app, y crea los accesos directos
(pedirá permisos de administrador):

```powershell
irm https://raw.githubusercontent.com/Parasigma/castellano-stremio-addon/main/install.ps1 -OutFile "$env:TEMP\inst.ps1"; & "$env:TEMP\inst.ps1"
```

Al terminar:
1. Arranca el addon con el acceso directo **«Iniciar Addon Castellano»** del
   escritorio (o `iniciar.bat`).
2. Abre **http://localhost:7000** y sigue con los pasos 3.3 (tokens) y 3.2
   (añadir trackers en Jackett).

> Si prefieres hacerlo a mano o entender cada pieza, sigue los apartados 3.1–3.4.

#### Trabajar desde dos ordenadores (GitHub)

El código vive en GitHub, así que puedes editarlo en un PC y usarlo en otro:

- **Subir cambios** (en el PC donde editas): `git add -A && git commit -m "cambios" && git push`
- **Traer cambios** (en el PC servidor): doble clic en **`actualizar.bat`**
  (hace `git pull` + `npm install`), o `git pull`.

Tus **tokens y configuración NO se suben** (están en `config/`, ignorado por git):
cada PC tiene su propia configuración local y cifrada.

---

### 3.1 Instalar el addon

En **PowerShell**, dentro de la carpeta del proyecto:

```powershell
npm install     # solo la primera vez
npm start
```

Verás un recuadro con las URLs. **Anota la IP** que aparece (algo como
`192.168.1.50`): la usarás para la TV.

```
  Dashboard (config, buscador y descargas):
    → http://localhost:7000
    → http://192.168.1.50:7000   (desde otros equipos de la red)
  Manifest para instalar en Stremio (usa la IP, no localhost):
    → http://192.168.1.50:7000/manifest.json
```

Abre **http://localhost:7000** en el navegador: ese es el **dashboard**.

Para **detenerlo**: `Ctrl+C` en esa ventana de PowerShell.

---

### 3.2 Instalar Jackett + trackers españoles (CLAVE)

#### Instalar Jackett

Si tienes **winget** (Windows 10/11 moderno), instálalo con un comando:

```powershell
winget install --id Jackett.Jackett --exact --silent --accept-package-agreements --accept-source-agreements
```

Si no, descárgalo de <https://github.com/Jackett/Jackett/releases>
(`Jackett.Installer.Windows.exe`).

Jackett arranca como **servicio** y queda accesible en
**http://127.0.0.1:9117**.

#### Obtener la API Key de Jackett

Tienes dos formas:

- **En la web:** abre <http://127.0.0.1:9117>; la **API Key** está arriba a la
  derecha.
- **Desde el archivo** (PowerShell):
  ```powershell
  (Get-Content "$env:ProgramData\Jackett\ServerConfig.json" -Raw | ConvertFrom-Json).APIKey
  ```

#### Conectar Jackett con el addon

1. Dashboard del addon → pestaña **Indexadores**.
2. Activa **Jackett**, URL `http://127.0.0.1:9117`, pega la **API Key**.
3. Pulsa **Probar conexión** → debe salir ✓ verde.
4. **Guardar configuración**.

#### Añadir trackers españoles (en la web de Jackett)

> Esto se hace en la web de Jackett (no por el addon), porque algunos trackers
> piden resolver protección anti-bots.

1. Abre <http://127.0.0.1:9117> y pulsa **+ Add Indexer**.
2. En el buscador escribe el nombre y añade (icono **+**) los que te interesen:
   - **DonTorrent**, **MejorTorrent**, **EliteTorrent**, **TodoTorrents**,
     **Wolfmax4K**, **PctNew/PctMix**… (todos en español).
   - También puedes filtrar por idioma escribiendo `spanish`.
3. Tras añadir cada uno, pulsa el icono de **lupa (Test)** para comprobar que
   funciona.

##### Si un tracker falla por "Cloudflare" / captcha

Muchos sitios españoles están tras Cloudflare. Para esos necesitas
**FlareSolverr**:

1. Instálalo (lo más fácil con Docker):
   `docker run -d -p 8191:8191 --restart unless-stopped ghcr.io/flaresolverr/flaresolverr:latest`
   (o descarga la versión para Windows desde su repo:
   <https://github.com/FlareSolverr/FlareSolverr/releases>).
2. En Jackett → **Configuration** (engranaje arriba) → **FlareSolverr API URL**:
   pon `http://localhost:8191` → **Save**.
3. Vuelve a probar los trackers que fallaban.

> Empieza por 2–3 trackers que pasen el **Test** en verde. Con eso ya tendrás
> resultados en castellano. Puedes añadir más cuando quieras.

---

### 3.3 Configurar Real Debrid y TorBox

1. Dashboard → pestaña **Servidores debrid**.
2. **Real Debrid:** activa la casilla y pega tu token de
   <https://real-debrid.com/apitoken>.
3. **TorBox:** activa la casilla y pega tu token de
   <https://torbox.app> → *Settings* → *API*.
4. Pulsa **Probar conexión** en cada uno: debe mostrar tu usuario, plan y fecha de
   caducidad.
5. **Guardar configuración**.

> **Importante:** Real Debrid ya **no** informa de forma fiable de qué está
> cacheado. Por eso el addon usa **TorBox** para detectar los torrents
> ⚡ cacheados. Si puedes, ten **ambos** activos.

---

### 3.4 Instalar en Stremio (PC y Smart TV)

En el dashboard → pestaña **📺 Instalar en Stremio** verás la URL del manifest
(con la IP de tu PC) y botones para copiar/instalar.

**En el PC (app de Windows):** usa la URL **localhost**
`http://127.0.0.1:7000/manifest.json` (sección ① del panel). Pulsa **▶️ Instalar
aquí** o pégala en *Addons* de Stremio y **Install**.

> ⚠️ Si pegas la URL con la **IP** (`http://192.168.x.x:7000/...`) en el Stremio
> del **mismo PC**, puede dar **«url not fetched»** porque la app exige HTTPS para
> direcciones que no sean `localhost`. Para el mismo PC usa siempre `127.0.0.1`;
> la URL con IP es solo para la **TV/otros dispositivos**.

**En la Smart TV:**

1. Abre Stremio en la TV → **Addons**.
2. Escribe la URL `http://TU-IP:7000/manifest.json` y pulsa **Install**.

> 💡 **Truco para no teclear con el mando:** instala el addon en Stremio en el PC
> e **inicia sesión con la misma cuenta de Stremio** en la TV. El addon aparece
> sincronizado solo.

**Si la TV no conecta**, abre el puerto en el Firewall (PowerShell **como
administrador**):

```powershell
netsh advfirewall firewall add rule name="Stremio Addon Castellano" dir=in action=allow protocol=TCP localport=7000
```

---

## 4. Cómo usar el addon

### 4.1 Ver series y películas

1. Asegúrate de que en el PC están **arrancados** el addon (`npm start`) y
   **Jackett**.
2. En Stremio (TV o PC), abre una serie o película.
3. Verás la lista de streams **con el castellano arriba**. Cada uno indica:
   - **Idioma**: 🇪🇸 Castellano · 🔵 Dual · 🟡 VOSE · 🟠 Latino · 🇬🇧 Inglés
   - **Calidad** (1080p, 720p, 2160p…), fuente (BluRay, WEB…), códec, tamaño, seeders
   - **⚡ Cacheado** (reproduce al instante) / **⬇️ No cacheado**
   - **💾 Local** si lo tienes descargado en tu PC
4. Elige preferiblemente uno **⚡ Cacheado** o **💾 Local** para evitar esperas.

### 4.2 Buscador manual

Pestaña **🔎 Buscador** del dashboard. Sirve para buscar a mano (por ejemplo
cuando quieres un pack de temporada concreto).

1. Escribe, p.ej. `Modern Family temporada 1`, y pulsa **Buscar**.
2. Los resultados salen ordenados con el castellano primero.
3. Cada resultado tiene botones:
   - **⬆️ Enviar a TorBox / Real Debrid**: lo añade a tu debrid para que lo
     **cachee** (luego saldrá como ⚡ cacheado en Stremio).
   - **💾 Descargar al PC**: lo descarga a tu ordenador.
   - **📋 Copiar magnet**.

### 4.3 Descargas al PC

Útil cuando un torrent **no está cacheado**: lo descargas a tu PC y la TV lo
reproduce desde ahí, sin cortes.

1. Inícialas desde el **Buscador** (**💾 Descargar al PC**) o desde la pestaña
   **Descargas** pegando un magnet.
2. En **Descargas** ves el progreso, velocidad, peers y tiempo restante, y puedes
   **quitar** la descarga (con o sin borrar ficheros).
3. Cuando la descarga tiene datos, el addon la ofrece **automáticamente** como
   stream **💾 Local** en Stremio para esa peli/serie.

La carpeta de descargas se ajusta en **Descargas → Carpeta de descargas**.

### 4.4 Las pestañas del dashboard

| Pestaña | Para qué |
|---------|----------|
| 🔎 **Buscador** | Buscar torrents a mano y enviarlos a debrid o descargarlos. |
| 📺 **Instalar en Stremio** | URL del manifest, IP, firewall y HTTPS opcional. |
| **Servidores debrid** | Tokens de Real Debrid y TorBox (+ Probar conexión). |
| **Indexadores** | Jackett / Prowlarr / fuentes públicas (+ Probar conexión). |
| **Idioma y calidad** | Reordenar prioridades (arrastrar), excluir CAM, mín. seeders. |
| **Descargas** | Carpeta, descargas simultáneas y gestor con progreso. |

---

## 5. Solución de problemas

### No aparece nada / muy pocos resultados en Stremio
1. **¿Jackett está arrancado y con trackers añadidos?** Es la causa nº 1.
   Abre <http://127.0.0.1:9117> y comprueba que tienes indexadores y que pasan el
   **Test**.
2. En el addon → *Indexadores* → **Probar conexión** debe salir ✓.
3. Prueba el **Buscador** del dashboard con el mismo título: si ahí tampoco hay
   resultados, el problema es la fuente (Jackett), no el addon.

### Hay resultados pero no en castellano
- Añade **más trackers españoles** en Jackett.
- Si fallan por Cloudflare, instala **FlareSolverr** (ver 3.2).
- En *Idioma y calidad*, deja **Castellano** arriba del todo.

### Instalar en MÓVIL o Smart TV (la TV no gestiona addons)
La app de Stremio en la **TV no permite añadir addons**: hay que instalarlos en
el **móvil/PC con tu cuenta** y se **sincronizan** a la TV. Pero el móvil/PC
**exigen HTTPS** (una URL `http://192.168...` se queda cargando y no instala).

**Solución: activa el túnel HTTPS** (pestaña 📺 Instalar → sección ③):
1. Marca **"Activar acceso por túnel (Cloudflare)"** → **Guardar configuración**.
2. **Reinicia el addon** (`iniciar.bat`). A los pocos segundos, en esa sección
   aparecerá una **URL pública HTTPS** (`https://....trycloudflare.com/manifest.json`).
3. Inicia sesión en Stremio (móvil/PC) con **tu cuenta** e instala esa URL.
4. Inicia sesión con la **misma cuenta** en la TV → el addon **se sincroniza** solo.

Notas del túnel:
- Expone **solo** los endpoints de Stremio (en un puerto aparte); tu panel y tus
  **tokens NO se exponen**.
- La URL **cambia cada vez que reinicias** el addon (es un túnel gratuito). Si
  reinicias, vuelve a coger la URL nueva del panel y reinstala en Stremio.
- Necesita `cloudflared` (el instalador lo incluye).

### Stremio dice «url not fetched» / no carga el addon
- **Móvil/TV:** usa el **túnel HTTPS** (ver justo arriba). El `http` no vale ahí.
- **En el mismo PC:** usa la URL **localhost** `http://127.0.0.1:7000/manifest.json`
  (sección ① del panel «Instalar»), no la de la IP. La app de Stremio exige HTTPS
  para direcciones que no sean `localhost`, por eso la IP por http falla en el
  propio PC.
- **En Stremio Web** (web.stremio.com, que va por HTTPS) no puedes cargar un addon
  por http: usa la app de escritorio, o activa el HTTPS opcional, o instala el
  addon en el PC e inicia sesión con la misma cuenta en la TV (se sincroniza).
- Comprueba que el addon está **arrancado** y que abre `http://127.0.0.1:7000`.

### El buscador no encuentra nada aunque Jackett esté en verde
- «Probar conexión» en verde solo significa que el addon **alcanza** Jackett, no
  que Jackett tenga trackers. Abre <http://127.0.0.1:9117> y comprueba que tienes
  **indexadores añadidos** y que pasan el **Test**.
- Asegúrate de estar en la **última versión** del addon (ejecuta `actualizar.bat`):
  versiones antiguas no resolvían los `.torrent` de los trackers españoles.

### La Smart TV no conecta
1. TV y PC en la **misma red**.
2. Usa la **IP** del PC en la URL, no `localhost`.
3. Abre el **puerto en el Firewall** (comando en 3.4).
4. Prueba desde el móvil: abre `http://IP-DEL-PC:7000`; si carga el dashboard, la
   red va bien.
5. Alternativa: misma **cuenta de Stremio** en PC y TV (sincroniza el addon).

### "Probar conexión" del debrid falla
- Token inválido → regenéralo y vuelve a pegarlo.
- Revisa que tu suscripción **premium** sigue activa.

### Un stream da error al reproducir
- Si no está **⚡ cacheado**, puede no reproducir al instante (sobre todo en Real
  Debrid, que ya no informa de cache). Elige uno **⚡ Cacheado** (los detecta
  TorBox) o usa **💾 Descargar al PC**.
- Prueba otra versión/fuente del mismo contenido.

### Una descarga local se queda a 0% / 0 peers
- Espera: con pocos seeders tarda en arrancar.
- Comprueba que el antivirus/firewall no bloquea `node.exe`.
- Prueba un torrent con **más seeders**.

### El addon no arranca
- `node --version` ≥ 20.
- Si el puerto 7000 está ocupado, cambia `server.port` en
  `config/runtime.json` y reinicia.
- Reinstala dependencias: borra `node_modules` y `npm install`.

### Jackett no responde en 9117
- Comprueba el servicio: en PowerShell, `Get-Service Jackett*` (debe estar
  *Running*). Si no, `Start-Service JackettService` (como administrador) o abre
  Jackett desde el menú Inicio.

### Empezar de cero (resetear configuración)
```powershell
Remove-Item config/runtime.json, config/secret.key, config/downloads.json -ErrorAction SilentlyContinue
```
Luego `npm start` y vuelve a configurar.

---

## 6. Preguntas frecuentes (FAQ)

**¿Tengo que dejar el PC encendido?**
Sí, mientras veas la TV deben estar arrancados el addon (`npm start`) y Jackett.

**¿Es legal / privado?**
El addon usa tus cuentas de pago y tus indexadores. Tus tokens se guardan
**cifrados** en tu PC y no salen de él. El uso del contenido es responsabilidad
tuya, igual que con cualquier otro addon.

**¿Real Debrid o TorBox?**
Mejor **los dos**. TorBox detecta lo cacheado de forma fiable; Real Debrid añade
catálogo. El addon prueba TorBox primero y luego Real Debrid.

**¿Necesito Prowlarr si ya tengo Jackett?**
No. Con uno basta. Jackett es más sencillo para empezar.

**¿Por qué no usa fuentes públicas y ya está?**
Porque en España están bloqueadas y casi todo es inglés. El valor está en los
trackers españoles vía Jackett.

**¿Puedo cambiar el orden de idiomas/calidades?**
Sí, en *Idioma y calidad* arrastra los elementos. El de arriba manda.

**¿Cómo veo algo que no está cacheado en ningún sitio?**
Usa **💾 Descargar al PC** desde el Buscador; cuando baje, aparece como stream
**Local** en Stremio.

---

## 7. Mantenimiento

**Arrancar el addon automáticamente con Windows:**
crea un archivo `iniciar-addon.bat` con:
```bat
cd /d C:\Users\ANDREA\Documents\scrapper
npm start
```
y pon un acceso directo a ese `.bat` en la carpeta de inicio (pulsa `Win+R`,
escribe `shell:startup`, y pega ahí el acceso directo). Jackett ya arranca solo
(es un servicio).

**Comprobar que el motor funciona:**
```powershell
npm test      # debe decir 14 OK, 0 fallos
```

**Actualizar dependencias** (si hiciera falta):
```powershell
npm install
```

---

## 8. Privacidad y seguridad

- Los **tokens** (Real Debrid, TorBox, API key de Jackett) se guardan **cifrados**
  con AES-256-GCM en `config/runtime.json`. La clave está en `config/secret.key`.
- Nada de esto se envía a servidores externos: todo ocurre entre tu PC, tus
  servicios de pago y tu TV en la red local.
- El dashboard solo es accesible desde tu red local. Aun así, no expongas el
  puerto 7000 a Internet.
- Si borras `config/secret.key`, tendrás que volver a introducir los tokens.

---

*Addon Castellano para Stremio · v1.0.0 · Documentación en español.*
