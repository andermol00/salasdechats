# No Trace

Salas de chat temporales sin cuentas. Eliges la duración (1, 3, 6, 12 o 24 horas), compartes un código y cuando el tiempo termina se borra todo: sala, mensajes, fotos, reacciones, presencia y lecturas.

Inspirado en la idea de compartir un código para coincidir en la misma sala, con experiencia propia: recargas y sigues dentro, avisos de mensajes, reacciones, recibos de lectura y reproducción de YouTube dentro del chat.

---

## Qué incluye

**Salas**
- Crear o entrar con apodo + código compartido.
- Duración configurable: 1, 3, 6, 12 o 24 horas.
- Caducidad real en PostgreSQL, con limpieza automática y borrado en cascada.
- Si recargas la página, sigues dentro de la misma sala.
- Enlace de invitación para compartir.

**Chat**
- Franja de personas siempre visible, con presencia en línea y estado “escribiendo…”.
- Reacciones por mensaje (❤️ 😂 🔥 👍) con contador.
- Recibos de lectura: `✓ enviado` / `✓✓ leído`.
- Contador de mensajes no leídos estilo Telegram, con botón para saltar al más reciente.
- El número de no leídos se refleja en el título de la pestaña: `(3) No Trace · sala`.
- Al abrir o recargar, el chat va directo al mensaje más reciente.
- Envío de fotos (comprimidas en el navegador), stickers y enlaces de YouTube reproducibles.

**Radio compartida (YouTube)**
- Cualquiera pega un enlace de YouTube y se suma a la cola de la sala.
- La reproducción está sincronizada: todos escuchan el mismo segundo.
- El servidor guarda la posición exacta y cada cliente corrige su desfase automáticamente.
- Controles compartidos: reproducir, pausar, siguiente y vaciar cola.
- El título de cada vídeo se obtiene por oEmbed de YouTube, sin API key.

**Ventana flotante del chat**
- Botón `⧉` abre el chat en una ventana pequeña siempre visible.
- Usa la Document Picture-in-Picture API, así que puedes seguir leyendo y escribiendo
  mientras navegas por otras pestañas de Chrome o Edge.
- Muestra mensajes, quién escribe, quién está en línea y el composer.

**Stickers animados sin API key**
- 18 stickers SVG animados incluidos en el propio código.
- No dependen de GIPHY, Tencent ni ningún servicio externo: funcionan offline.
- Se envían como mensaje temporal más y se borran con la sala.

**Ajustes y avisos**
- Apodo editable, notificaciones del sistema y sonido.
- Tamaño de texto (S/M/L), hora en los mensajes, Enter para enviar.

**Diseño**
- Colores sólidos, sin degradados ni imágenes de fondo.
- Optimizado para móvil: header, personas y composer fijos; solo el hilo hace scroll.

---

## Stack

- Next.js (App Router)
- PostgreSQL + Drizzle ORM
- Tiempo real ligero por sincronización cada ~1.4s

---

## Arranque local

1. Instala dependencias:

```bash
npm install
```

2. Crea un archivo `.env` (no se sube a GitHub):

```bash
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db
```

3. Arranca:

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). Las tablas se crean solas en la primera petición.

---

## Subir a GitHub

```bash
git init
git add .
git commit -m "No Trace: salas de chat temporales"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git push -u origin main
```

`.env` queda fuera del repositorio gracias a `.gitignore`. En GitHub solo vive `.env.example` como plantilla.

---

## Desplegar en Render.com

### Opción A — Blueprint (`render.yaml`) — recomendada

1. Sube el repo a GitHub (todo descomprimido en la raíz, sin ZIP).
2. En Render: **New +** → **Blueprint**.
3. Conecta el repositorio y sincroniza.
4. Render crea el Web Service y la base de datos, e inyecta `DATABASE_URL` automáticamente.

El `render.yaml` de este repo usa estos nombres:

| Recurso | Nombre |
| --- | --- |
| Web Service | `notrace` |
| PostgreSQL | `notrace-db` |

> Los nombres son solo etiquetas del panel de Render. Puedes cambiarlos por los que
> quieras: la aplicación nunca los lee, solo usa la variable `DATABASE_URL`.

### Opción B — Manual

1. Crea una **PostgreSQL** en Render: **New +** → **Postgres**.
   - **Name:** `notrace-db` (o el que prefieras).
   - **Region:** la misma del Web Service (por ejemplo Oregon).
   - Espera a que el estado sea `Available`.
2. Copia su **Database URL**:
   - **Internal Database URL** si el Web Service está en el mismo proyecto.
   - **External Database URL** si está en otro proyecto.
3. Crea el **Web Service** desde tu repo con **Language: Node**.
4. Build Command:

```bash
npm install --include=dev && npm run build
```

5. Start Command:

```bash
bash scripts/start.sh
```

6. Environment → **Add Environment Variable**:

| Clave | Valor |
| --- | --- |
| `DATABASE_URL` | la Database URL de `notrace-db` |
| `NODE_ENV` | `production` |
| `NODE_VERSION` | `22` |
| `NPM_CONFIG_PRODUCTION` | `false` |
| `NPM_CONFIG_INCLUDE` | `dev` |
| `GIPHY_API_KEY` | opcional, para buscar GIFs |

---

## Base de datos `notrace-db`

La app necesita PostgreSQL. Sin ella no se pueden crear salas.

### Crear `notrace-db` en Render

1. **New +** → **Postgres**.
2. **Name:** `notrace-db`.
3. **Region:** la misma de tu Web Service.
4. **Create Database** y espera a `Available`.
5. Copia la **Internal Database URL** (o la **External** si el servicio está en otro proyecto).
6. En tu Web Service: **Environment → Add Environment Variable**:
   - Key: `DATABASE_URL`
   - Value: la URL copiada.
7. **Save**. Render redespliega automáticamente.

### Enlazar en un clic (más rápido)

En `notrace-db`: **Connect → Link existing database** → selecciona tu Web Service.
Render inyecta `DATABASE_URL` sin copiar nada.

### Si Render no te deja crear otra base gratis

Render permite **una PostgreSQL gratuita por cuenta**. Alternativas gratis:

1. **Neon** — [neon.tech](https://neon.tech)
2. **Supabase** — [supabase.com](https://supabase.com)

Crea el proyecto, copia la connection string y pégala en `DATABASE_URL`.

### Verificar la conexión

Abre:

```text
https://TU-APP.onrender.com/api/health
```

Respuesta esperada:

```json
{ "ok": true, "database": "connected", "schema": "ready", "app": "no-trace" }
```

| Respuesta | Significado |
| --- | --- |
| `"database":"missing"` | Falta la variable `DATABASE_URL` |
| `"database":"unreachable"` | La URL es incorrecta o el servidor no responde |
| `"schema":"no_schema"` | Conecta, pero no pudo crear las tablas |

Las tablas (`rooms`, `messages`, `members`, `reactions`) se crean automáticamente en la primera petición, así que funciona incluso si el Start Command es el de Render por defecto.

---

## Stickers y GIFs sin API key

El proyecto **no usa ninguna API key** para stickers ni GIFs:

- Los stickers son SVG animados incluidos en `src/lib/stickers.ts`.
- Se renderizan con animaciones CSS definidas en `src/app/globals.css`.
- Funcionan sin conexión a servicios externos y sin límites de peticiones.

Para añadir tus propios stickers, edita el arreglo `STICKERS`:

```ts
{
  id: "mi-sticker",
  label: "Mi sticker",
  svg: `<svg viewBox="0 0 64 64">…</svg>`,
}
```

Se enviarán con el formato `stick:<id>` y se validan en el servidor contra la lista
permitida, así que no se puede inyectar SVG arbitrario.

Para imágenes propias sigue disponible el botón 🖼️ (se comprimen en el navegador).

## Radio compartida (YouTube)

- Endpoint: `POST /api/rooms/[code]/radio` con `action`: `add`, `play`, `pause`,
  `seek`, `next`, `remove` o `clear`.
- El estado vive en la tabla `radio_tracks` (cola) y en columnas de `rooms`
  (`radio_video_id`, `radio_title`, `radio_playing`, `radio_pos_ms`, `radio_updated_at`).
- La posición se calcula como `pos_ms + (ahora − updated_at)` mientras suena, así que
  cualquier cliente puede reconstruir el segundo exacto.
- La ventana de corrección de desfase es de 4 segundos; si un cliente se aleja más,
  hace `seekTo` automáticamente.
- Los navegadores exigen un gesto del usuario para reproducir audio: por eso cada
  persona pulsa **Escuchar** una vez dentro del chat.

> Nota: reproducir vídeos de YouTube embebidos requiere que el vídeo permita
> inserción. Algunos vídeos con restricciones de derechos no se pueden reproducir.

## Ventana flotante (Picture-in-Picture)

- Disponible en **Chrome 116+** y **Edge**. En otros navegadores aparece un aviso.
- El botón `⧉` del encabezado abre el chat en una ventana superpuesta.
- Se copian las hojas de estilo al documento flotante para que herede el tema.
- Al cerrarla, la app lo detecta y vuelve al chat normal.

---

## Problemas típicos en Render

**`Error: DATABASE_URL is required` durante el build**
Ya no ocurre: la conexión a PostgreSQL es perezosa, así que el build no necesita la variable. En runtime sí es obligatoria.

**El log muestra `yarn install; yarn build` en vez de tus comandos**
Significa que el servicio no está usando `render.yaml`. Corrige en **Settings**:
- Build Command: `npm install --include=dev && npm run build`
- Start Command: `bash scripts/start.sh`

**`mix phx.digest` / “no mix.exs was found”**
Render detectó el proyecto como Elixir. El servicio debe ser **Node**. Bórralo y créalo por **Blueprint**, o cambia el Language a Node.

**`Cannot find module '@tailwindcss/postcss'` o `tsc: not found`**
Render puso `NODE_ENV=production` y `npm install` saltó las devDependencies. Por eso el build usa `npm install --include=dev` y las variables `NPM_CONFIG_PRODUCTION=false` / `NPM_CONFIG_INCLUDE=dev`.

**`self signed certificate` al conectar a PostgreSQL**
Ya está resuelto: la app usa SSL sin verificación estricta fuera de localhost, y `drizzle.config.ts` añade `sslmode=no-verify`.

**La sala no se crea y aparece un aviso amarillo**
Es la pantalla de diagnóstico de No Trace: indica que falta `DATABASE_URL` o que la URL no conecta.

---

## Cómo funciona la sesión

El apodo, color, `userId` y última sala se guardan **solo en tu navegador** (`localStorage`). Por eso, al recargar sigues dentro. Si cambias de dispositivo o borras los datos del sitio, tendrás que entrar de nuevo. El servidor no guarda cuentas.

---

## Estructura del proyecto

```text
src/app/api/rooms/                     Crear sala y entrar
src/app/api/rooms/[code]/sync/         Sincronización (~1.4s)
src/app/api/rooms/[code]/messages/     Enviar texto, fotos y GIFs
src/app/api/rooms/[code]/reactions/    Reacciones por mensaje
src/app/api/rooms/[code]/react/        Endpoint compatible
src/app/api/rooms/[code]/read/         Recibos de lectura
src/app/api/rooms/[code]/typing/       Estado “escribiendo…”
src/app/api/rooms/[code]/leave/        Salir de la sala
src/app/api/gifs/                      Proxy seguro hacia GIPHY
src/app/api/health/                    Diagnóstico de base de datos
src/db/ensure-schema.ts                Crea y repara el esquema solo
src/lib/server/rooms.ts                Lógica de salas, mensajes y reacciones
src/components/chat-view.tsx           Interfaz del chat
src/components/landing-view.tsx        Pantalla de inicio
scripts/start.sh                       Aplica el esquema y arranca Next.js
```

---

## Licencia de uso

Proyecto listo para clonar, desplegar y adaptar.
