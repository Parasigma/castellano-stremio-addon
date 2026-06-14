# 2. Jackett / Prowlarr con trackers españoles ⭐

**Esta es la pieza clave para encontrar contenido en castellano.** El addon, por
sí solo, sabe ordenar y priorizar el español; pero necesita una fuente que
*tenga* ese contenido. Los trackers españoles (DonTorrent, etc.) son donde está
"Modern Family en castellano", y se consultan a través de **Jackett** o
**Prowlarr**.

> Solo necesitas **uno** de los dos. **Jackett** es el más sencillo para empezar.

---

## Opción A — Jackett (recomendado para empezar)

### Instalar

1. Descarga Jackett para Windows desde
   <https://github.com/Jackett/Jackett/releases> (archivo `Jackett.Windows.*.zip`
   o el instalador `Jackett.Installer.Windows.exe`).
2. Instálalo/desescomprímelo y ejecútalo. Se abre en
   **http://127.0.0.1:9117**.

### Añadir trackers españoles

1. En Jackett, pulsa **+ Add Indexer**.
2. Busca y añade indexadores españoles. Algunos habituales:
   - **DonTorrent**
   - **EliteTorrent**
   - **MejorTorrent**
   - **Wolfmax4K**
   - **YGGtorrent** (multi-idioma)
3. Para cada uno pulsa la lupa de **Test** para confirmar que funciona.

> Algunos trackers usan Cloudflare. Si fallan, instala **FlareSolverr**
> (<https://github.com/FlareSolverr/FlareSolverr>) y pon su URL en
> *Jackett → Configuration → FlareSolverr API URL* (`http://localhost:8191`).

### Copiar la API Key

Arriba a la derecha en Jackett verás **API Key**. Cópiala.

### Configurar en el addon

1. En el dashboard del addon → pestaña **Indexadores**.
2. Activa **Jackett**, pon la URL `http://127.0.0.1:9117` y pega la **API Key**.
3. Pulsa **Probar conexión** → debe salir ✓ verde con el nº de categorías.
4. **Guardar configuración**.

---

## Opción B — Prowlarr (más potente, integra con *arr)

1. Instala Prowlarr desde <https://prowlarr.com> (o vía Docker).
   Se abre en **http://127.0.0.1:9696**.
2. **Settings → General → API Key**: cópiala.
3. **Indexers → Add Indexer**: añade los trackers españoles (los mismos de arriba).
4. En el dashboard del addon → **Indexadores** → activa **Prowlarr**, URL
   `http://127.0.0.1:9696`, pega la API Key, **Probar conexión**, **Guardar**.

---

## Consejos para maximizar el castellano

- Cuantos **más trackers españoles** añadas, más resultados en castellano.
- En la pestaña **Idioma y calidad** deja **Castellano** arriba del todo.
- Si una serie no aparece por episodio, prueba a buscar el **pack de temporada**
  (el addon detecta packs y extrae el episodio correcto).
- Mantén Jackett/Prowlarr **abierto** mientras usas el addon.

➡️ Siguiente: **[Instalar el addon en Stremio](03-instalar-en-stremio-tv.md)**.
