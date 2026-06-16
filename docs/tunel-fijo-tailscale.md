# URL fija con Tailscale (gratis) — para que no cambie nunca

Con esto tendrás una **URL permanente** (ej. `https://mi-pc.mi-red.ts.net`) para el
reproductor y para instalar el addon en la TV. **Ya no cambia entre reinicios.**

## 1. Instalar Tailscale (una vez)
1. Descarga e instala Tailscale en el PC servidor: <https://tailscale.com/download>
2. Inícialo e **inicia sesión** (crea una cuenta gratis, p.ej. con Google).
3. Verás que el PC aparece como un dispositivo en tu "tailnet".

## 2. Activar el servidor público del addon (puerto 7001)
En el panel del addon → pestaña **📺 Instalar → sección ③** → marca **"Activar
acceso por túnel"** → **Guardar configuración** → reinicia el addon.
*(Esto arranca el servidor seguro en el puerto 7001, que es lo que Tailscale va a
exponer. No hace falta `tunel.bat` con este método.)*

## 3. Levantar el túnel fijo
Ejecuta **`funnel.bat`** (en la carpeta del addon). La primera vez:
- Si Tailscale pide **activar "Funnel"**, te dará un enlace; ábrelo y acepta.
- Cuando funcione, mostrará tu **URL fija**: `https://....ts.net`
- **Deja esa ventana abierta.**

> Para que arranque solo con Windows, puedes poner un acceso directo a `funnel.bat`
> en la carpeta de Inicio (Win+R → `shell:startup`).

## 4. Decirle al addon la URL fija
Panel → pestaña **🎬 Reproductor** → campo **"URL pública fija"** → pega
`https://....ts.net` → **Guardar configuración**.

¡Listo! A partir de ahora:
- **Reproductor (tu mujer):** `https://....ts.net/player` (fija, con su contraseña).
- **Addon en la TV:** instálalo UNA vez con `https://....ts.net/manifest.json`
  (la pestaña Reproductor / Instalar ya te muestran estas URLs fijas).

## Notas
- La URL fija es gratis y con HTTPS válido (sin páginas de aviso).
- Solo necesitas tener `funnel.bat` (Tailscale) abierto y el addon arrancado.
- Si reinicias el PC, vuelve a abrir el addon y `funnel.bat`: **la URL será la misma**.
