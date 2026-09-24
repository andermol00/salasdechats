# No Trace

Salas de chat temporales sin cuentas. Elige **1, 3, 6, 12 o 24 horas**, comparte el código y entra con un apodo. Al expirar la sala, sus mensajes, archivos, reacciones, cola de radio y presencia se eliminan juntos de PostgreSQL. El servidor limpia las salas vencidas cuando recibe peticiones; no necesitas guardar historial.

## Funciones

- **Chat compartido:** mensajes, imágenes, recibos de lectura, indicador «está escribiendo», personas conectadas y contador de no leídos en la pestaña.
- **Sesión al recargar:** apodo, identificador y sala se recuerdan solo en el navegador (`localStorage`).
- **Radio de YouTube:** pega enlaces para añadir canciones a la cola. Reproducción, pausa y siguiente son compartidos. El control está **en el encabezado**; abre un panel pequeño superpuesto y minimízalo sin desmontar el reproductor. Cada oyente debe pulsar **Escuchar** una vez debido a la política de audio del navegador. Algunos vídeos restringidos por YouTube no permiten reproducción embebida.
- **GIFs reales sin API key:** 12 archivos `.gif` animados incluidos en `public/gifs/`. Busca por reacción y pulsa uno para enviarlo. También puedes subir un GIF pequeño (hasta ~290 KB) o pegar un enlace directo HTTPS terminado en `.gif`. Los GIFs incluidos se guardan en los mensajes solo por ID, por lo que no inflan la base de datos. El catálogo funciona sin servicios externos; la búsqueda es local, no una búsqueda en GIPHY.
- **YouTube en mensajes:** los enlaces a vídeos normales se pueden reproducir en el chat.
- **Ventana flotante:** en Chrome/Edge compatibles, el botón `⧉` abre una ventana pequeña con el chat sobre otras pestañas (Document Picture-in-Picture).
- **Notificaciones:** sonido y avisos del navegador mientras la web esté abierta.

## Stack

Next.js App Router, React, PostgreSQL y Drizzle ORM. Los mensajes se sincronizan cada ~1,4 s.

## Desarrollo local

1. Instala dependencias: `npm install`.
2. Crea `.env` tomando `.env.example` como base y configura `DATABASE_URL`.
3. Arranca: `npm run dev`.
4. Abre `http://localhost:3000`.

El esquema se prepara automáticamente cuando el servidor accede a PostgreSQL. También puedes ejecutar `npx drizzle-kit push`.

## Subir a GitHub

Sube **todo el proyecto descomprimido**, incluida la carpeta `public/gifs/` con los `.gif`. No subas `.env` ni un ZIP en lugar de los archivos fuente. `.gitignore` excluye los secretos.

Los GIFs ya generados funcionan en Render sin herramientas adicionales. Si quieres recrearlos localmente y tienes ImageMagick, usa `bash scripts/generate-gifs.sh`.

## Render.com

### Blueprint

`render.yaml` declara un servicio Node llamado `notrace` y una PostgreSQL llamada `notrace-db`. En Render: **New + → Blueprint → conectar este repositorio**. Render asignará `DATABASE_URL` al servicio.

Si ya creaste el servicio web manualmente, **no necesitas crear un Blueprint adicional**; puedes crear o vincular una base y configurar `DATABASE_URL` directamente en ese servicio.

### Servicio manual

1. Crea PostgreSQL en la **misma región** que el servicio. Su nombre puede ser `notrace-db` o cualquier otro.
2. Copia la **Internal Database URL** si Render permite acceso interno entre estos recursos; si la base está fuera de ese entorno, usa la URL pública correspondiente.
3. En tu Web Service ve a **Environment → Add Environment Variable** y asigna `DATABASE_URL` a esa URL. No publiques la URL en GitHub.
4. Runtime: **Node**, versión recomendada **22**.
5. Build Command: `npm install --include=dev && npm run build`.
6. Start Command: `bash scripts/start.sh`.

No configures `GIPHY_API_KEY`: **No Trace ya no usa GIPHY**.

### Verificar la base de datos

Visita `https://TU-APP.onrender.com/api/health`. El estado correcto indica `ok: true`, `database: "connected"` y `schema: "ready"`.

- `database: "missing"` → falta `DATABASE_URL`.
- `database: "unreachable"` → comprueba URL, región y credenciales.
- `database: "no_schema"` → comprueba permisos del usuario PostgreSQL.

Render puede imponer límites al número de bases gratuitas. También se puede usar Neon o Supabase con una connection string PostgreSQL en `DATABASE_URL`.

## Archivos principales

- `src/components/chat-view.tsx`: chat, GIFs, reacciones y ventana flotante.
- `src/components/radio-panel.tsx`: radio compacta y reproductor persistente.
- `src/components/gif-picker.tsx`, `src/lib/gifs.ts`, `public/gifs/`: catálogo GIF sin API.
- `src/app/api/rooms/[code]/radio/route.ts`: controles y cola de radio.
- `src/app/api/rooms/[code]/messages/route.ts`: validación y envío de mensajes.
- `src/db/schema.ts`, `src/db/ensure-schema.ts`: almacenamiento temporal y esquema.
- `render.yaml`, `scripts/start.sh`: despliegue en Render.
