# 4. Buscador manual y descargas al PC

Además de la búsqueda automática desde Stremio, el dashboard tiene un **buscador
manual** y un **gestor de descargas** para usar tu PC como servidor.

---

## Buscador manual

Pestaña **🔎 Buscador**.

1. Escribe lo que buscas, p.ej. `Modern Family temporada 1`.
2. Pulsa **Buscar**. Los resultados salen **ordenados con el castellano arriba**,
   con su idioma, calidad, fuente, códec, tamaño, seeders y si está **⚡ Cacheado**.
3. Cada resultado tiene botones:
   - **⬆️ Enviar a TorBox / Real Debrid** — lo añade a tu debrid para que lo
     **cachee** (luego aparecerá como cacheado en Stremio y se reproduce al instante).
   - **💾 Descargar al PC** — lo descarga a tu ordenador (ver siguiente sección).
   - **📋 Copiar magnet** — copia el enlace magnet.

> Si no salen resultados: revisa que **Jackett/Prowlarr** estén activos y
> probados (ver [guía 2](02-jackett-prowlarr.md)). En España las fuentes públicas
> suelen estar bloqueadas.

---

## Descargas al PC (tu ordenador como servidor)

Útil cuando un torrent **no está cacheado** en el debrid: lo descargas a tu PC y
la TV lo reproduce desde ahí, sin esperas ni cortes.

### Iniciar una descarga

- Desde el **Buscador**, botón **💾 Descargar al PC**, **o**
- Pestaña **Descargas** → pega un **magnet** y pulsa **Descargar**.

### Ver el progreso

En la pestaña **Descargas** verás cada descarga con:

- barra de **progreso**, **velocidad**, **peers**, tamaño descargado y **tiempo
  restante** estimado;
- botones **🗑️ Quitar** (saca de la lista, conserva ficheros) y
  **🗑️ Quitar y borrar ficheros** (borra del disco).

La lista se **autoactualiza** cada 2 segundos mientras estás en esa pestaña.

### Reproducir lo descargado en la TV

Una vez la descarga tiene metadatos (aparecen sus ficheros), el addon la ofrece
**automáticamente como un stream `💾 Local`** en Stremio cuando abras esa
película/serie. Reproduce directamente desde tu disco, con soporte de avance/
retroceso (range requests).

La carpeta de descargas se configura en **Descargas → Carpeta de descargas**
(por defecto `…\Downloads\stremio`).

### Notas

- Las descargas se **reanudan** al reiniciar el addon (se recuerdan los magnets).
- La descarga usa la red P2P (DHT/peers), que **no** depende de webs bloqueadas,
  así que suele funcionar aunque las fuentes públicas web estén bloqueadas.
- Si tu TV no reproduce algún `.mkv` concreto por su códec/audio, es una
  limitación del reproductor de la TV; prueba otra versión del torrent.

➡️ Siguiente: **[Solución de problemas](05-solucion-de-problemas.md)**.
