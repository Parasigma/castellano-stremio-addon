# 3. Instalar el addon en Stremio (PC y Smart TV)

El addon corre en tu PC. Stremio (en el PC o en la TV) se conecta a él por la red
local usando la **URL del manifest**.

## Encontrar la URL del manifest

En el dashboard → pestaña **📺 Instalar en Stremio**. Verás algo como:

```
http://192.168.1.50:7000/manifest.json
```

Usa la **IP de tu PC** (no `localhost`) para que la TV pueda conectar.
Tienes botones para **copiarla** y para **instalar directamente**.

---

## A) Instalar en Stremio en el PC

1. Abre Stremio en el ordenador.
2. Pulsa el botón **▶️ Instalar en Stremio (app)** del dashboard (abre Stremio con
   el addon), **o** ve a **Addons**, pega la URL en *"Addon Repository Url"* y
   pulsa **Install**.

---

## B) Instalar en la Smart TV

Requisito: la **TV y el PC en la misma red** (mismo router/WiFi).

### Android TV / Google TV / Fire TV (app Stremio)

1. Abre Stremio en la TV.
2. Ve a **Addons** (o *Complementos*).
3. En el campo de URL, escribe la URL del manifest con la IP de tu PC:
   `http://192.168.1.50:7000/manifest.json`
   (Escribir con el mando es incómodo: ver el truco de abajo.)
4. Pulsa **Install / Instalar**.

> 💡 **Truco para no escribir con el mando:** instala el addon primero en la
> cuenta de Stremio del PC (apartado A). Si en la TV inicias sesión con la
> **misma cuenta de Stremio**, el addon aparece **sincronizado** automáticamente.

### ¿La TV exige HTTPS?

La mayoría de apps de Stremio en TV aceptan **HTTP** en la red local (es lo
normal y funciona). Si tu versión exigiera HTTPS, activa el **HTTPS opcional** en
la pestaña *Instalar* (ver abajo) o, mejor, usa la sincronización por cuenta.

---

## Reproducir

1. En la TV, abre una película o serie.
2. Verás la lista de streams **con el castellano arriba**, cada uno indicando:
   - idioma (🇪🇸 Castellano, 🔵 Dual, 🟡 VOSE…), calidad (1080p…), tamaño, seeders,
   - si está **⚡ Cacheado** (reproduce al instante) o **⬇️ No cacheado**,
   - y **💾 Local** si lo tienes descargado en el PC.
3. Pulsa el que quieras. El addon lo resuelve en tu debrid y reproduce.

> Prioriza los streams **⚡ Cacheado** o **💾 Local** para evitar esperas.

---

## Si la TV no conecta con el PC (firewall)

En el PC, abre el puerto en el Firewall de Windows. En la pestaña *Instalar* tienes
el comando listo para copiar; ejecútalo en **PowerShell como administrador**:

```powershell
netsh advfirewall firewall add rule name="Stremio Addon Castellano" dir=in action=allow protocol=TCP localport=7000
```

Más ayuda en **[Solución de problemas](05-solucion-de-problemas.md)**.

---

## HTTPS opcional (avanzado)

En la pestaña **Instalar** puedes activar **HTTPS con certificado autofirmado**
(sirve en `https://TU-IP:7443/manifest.json`). Útil para el **reproductor web**
de Stremio en el propio PC (tendrás que aceptar el aviso de certificado).
Las Smart TV **no** confían en certificados autofirmados, así que para la TV usa
HTTP o la sincronización por cuenta. Requiere **reiniciar el addon** tras guardar.

➡️ Siguiente: **[Buscador manual y descargas](04-buscador-y-descargas.md)**.
