# VELA

Salas de chat temporales. Enciendes un código, hablas con quien lo conozca y a las **24 horas** la sala, los mensajes y la presencia se apagan solos. No hay cuentas ni historial permanente.

Inspirado en la idea de compartir un código para coincidir en la misma sala, con una experiencia propia: recargas y sigues dentro, avisos de mensajes, temas y ajustes de lectura.

## Qué incluye

- Crear o entrar a una sala con apodo + código
- Persistencia local: si recargas, vuelves a la misma sala con el mismo usuario
- Caducidad real de 24 horas (PostgreSQL + limpieza automática)
- **Sincronización incremental**: tras la primera carga solo viajan los mensajes nuevos
- Indicador de "escribiendo…" y lista de personas en línea
- Límite anti-flood por usuario
- Reconexión automática con reintentos si se corta la red
- Envío de fotos y GIF (se comprimen en el navegador y también se borran)
- Notificaciones sonoras y del sistema (cuando la pestaña no está activa)
- Ajustes: apodo, avisos, tamaño de texto, hora, Enter para enviar
- Interfaz sobria de colores sólidos, sin cuentas ni historial
- Enlace de invitación para compartir
- Pensado para subir a **GitHub** y desplegar en **Render.com**

## Stack

- Next.js (App Router)
- PostgreSQL + Drizzle ORM
- Tiempo real ligero por sincronización cada ~1.4s

## Arranque local

1. Instala dependencias:

```bash
npm install
```

2. Crea un archivo `.env` (no se sube a GitHub):

```bash
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db
```

3. Crea las tablas:

```bash
npx drizzle-kit push
```

4. Arranca:

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Subir a GitHub

En la carpeta del proyecto:

```bash
git init
git add .
git commit -m "VELA: salas de chat temporales de 24 horas"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/vela.git
git push -u origin main
```

`.env` queda fuera del repositorio gracias a `.gitignore`. En GitHub solo vive `.env.example` como plantilla.

## Desplegar en Render.com

### Opción A — Blueprint (`render.yaml`) — recomendada

1. Sube el repo a GitHub (sin ZIP dentro, todo descomprimido en la raíz).
2. En Render: **New +** → **Blueprint**.
3. Conecta el repositorio y sincroniza.
4. Render crea el web service `vela-chat` y la base `vela-db`, e inyecta `DATABASE_URL`.

El arranque aplica el esquema y luego sirve Next.js (`scripts/start.sh`).

### Opción B — Manual

1. Crea una **PostgreSQL** en Render y copia la Internal Database URL.
2. Crea un **Web Service** desde el repo con **Language: Node**.
3. Build command:

```bash
npm install --include=dev && npm run build
```

4. Start command:

```bash
bash scripts/start.sh
```

5. Environment:

| Clave | Valor |
| --- | --- |
| `DATABASE_URL` | URL de la base Render |
| `NODE_ENV` | `production` |
| `NODE_VERSION` | `22` |
| `NPM_CONFIG_PRODUCTION` | `false` |
| `NPM_CONFIG_INCLUDE` | `dev` |
| `GIPHY_API_KEY` | API key opcional de GIPHY para buscar GIFs |

### Activar el buscador de GIFs

En Render abre **vela-chat → Environment → Add Environment Variable** y añade:

```text
GIPHY_API_KEY=tu_clave_de_giphy
```

La clave se lee solamente en el servidor mediante `/api/gifs`; nunca se envía al navegador. Si no la añades, el botón GIF sigue funcionando para pegar enlaces directos o elegir un GIF desde un archivo.

## Problemas típicos en Render

**`mix phx.digest` / "no mix.exs was found"**
Render detectó el proyecto como Elixir. El servicio debe ser **Node**. Bórralo y crea uno nuevo por **Blueprint**, o cambia el Language a Node.

**`Cannot find module '@tailwindcss/postcss'` o `tsc: not found`**
Render puso `NODE_ENV=production` y `npm install` saltó las devDependencies. Por eso el build usa `npm install --include=dev` y las variables `NPM_CONFIG_PRODUCTION=false` / `NPM_CONFIG_INCLUDE=dev`.

**`self signed certificate` al conectar a Postgres**
Ya está resuelto: la app usa SSL sin verificación estricta fuera de localhost, y `drizzle.config.ts` añade `sslmode=no-verify`.

**El deploy queda en "in progress" y luego falla el healthcheck**
Comprueba que `DATABASE_URL` esté enlazada a la base y revisa los logs del start: el esquema se aplica antes de arrancar.

## Cómo funciona la sesión

El apodo, color, `userId` y última sala se guardan **solo en tu navegador** (`localStorage`). Por eso, al recargar sigues dentro. Si cambias de dispositivo o borras datos del sitio, tendrás que entrar de nuevo. El servidor no guarda cuentas.

## Licencia de uso

Proyecto listo para clonar, desplegar y adaptar.
