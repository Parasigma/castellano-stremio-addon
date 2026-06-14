# 5. Solución de problemas

## No aparece NADA / muy pocos resultados en Stremio

1. **¿Tienes Jackett o Prowlarr configurado y activo?** Es lo más habitual.
   Sin trackers españoles apenas hay resultados (y casi nada en castellano).
   Ver [guía 2](02-jackett-prowlarr.md).
2. Comprueba en *Indexadores* que pulsando **Probar conexión** sale ✓ verde.
3. Asegúrate de que Jackett/Prowlarr está **abierto** en el PC.
4. Prueba el **Buscador** del dashboard con el mismo título: si ahí tampoco salen
   resultados, el problema es la fuente, no el addon.

## Hay resultados, pero no en castellano

- Añade **más trackers españoles** en Jackett/Prowlarr (DonTorrent, EliteTorrent,
  MejorTorrent, Wolfmax4K…).
- Algunos trackers están tras Cloudflare: instala **FlareSolverr** y configúralo
  en Jackett (ver [guía 2](02-jackett-prowlarr.md)).
- Verifica que en *Idioma y calidad* el **Castellano** está arriba del todo.

## La Smart TV no conecta con el addon

1. ¿TV y PC en la **misma red** (mismo WiFi/router)?
2. Usa la **IP** del PC en la URL, **no** `localhost`
   (ej. `http://192.168.1.50:7000/manifest.json`).
3. Abre el **puerto en el Firewall** (PowerShell **como administrador**):
   ```powershell
   netsh advfirewall firewall add rule name="Stremio Addon Castellano" dir=in action=allow protocol=TCP localport=7000
   ```
4. Comprueba desde el navegador del móvil/otro equipo de la red:
   abre `http://IP-DEL-PC:7000` — si carga el dashboard, la red está bien.
5. Truco: inicia sesión con la **misma cuenta de Stremio** en PC y TV para que el
   addon se **sincronice** sin escribir la URL con el mando.

## "Probar conexión" del debrid falla

- **Token inválido**: regenera el token (Real Debrid: `real-debrid.com/apitoken`;
  TorBox: *Settings → API*) y vuelve a pegarlo.
- Comprueba que tu suscripción **premium** sigue activa (lo muestra el resultado).

## Un stream da error al reproducir

- Real Debrid ya **no** comprueba cache de forma fiable: si el torrent no está
  cacheado en RD, no se puede reproducir al instante. Elige uno marcado
  **⚡ Cacheado** (los detecta **TorBox**) o usa **💾 Descargar al PC**.
- Prueba otra versión/fuente del mismo contenido.

## Las descargas locales se quedan a 0% / 0 peers

- Espera un poco: los torrents con pocos seeders tardan en arrancar.
- Asegúrate de que tu red/antivirus no bloquea el tráfico P2P de `node.exe`.
- Prueba un torrent con **más seeders**.

## El addon no arranca

- `node --version` debe ser **20 o superior**.
- Si el puerto 7000 está ocupado: cambia `server.port` en `config/runtime.json`
  (o cierra el otro proceso) y reinicia.
- Reinstala dependencias: borra `node_modules` y ejecuta `npm install`.

## Empezar de cero

Para resetear la configuración (mantiene el código):

```powershell
Remove-Item config/runtime.json, config/secret.key, config/downloads.json -ErrorAction SilentlyContinue
```

Luego `npm start` y vuelve a configurar.

## Ejecutar las pruebas del motor

```powershell
npm test
```

Si dice **14 OK, 0 fallos**, el motor (detección de castellano, ranking, etc.)
funciona correctamente.

---

¿Sigues con problemas? Revisa la consola de PowerShell donde corre `npm start`:
los errores se muestran ahí en español.
