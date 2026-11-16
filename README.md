# Repe

Buscador de ejercicios de gimnasio: escribís "press arnold" y llegás a una ficha con video, qué músculos trabaja, cómo hacerlo, recomendaciones y errores comunes.

> **¿Cómo debe funcionar la app?** Las reglas de negocio, explicadas para alguien no técnico, están en [docs/funcionamiento.md](docs/funcionamiento.md). Si cambiás un comportamiento, actualizalo ahí también.

Stack: Next.js 16 (App Router, Cache Components) + TypeScript + Tailwind CSS 4, Postgres con Drizzle ORM (Neon en producción, PGlite local en desarrollo), Vercel AI SDK con Gemini y YouTube Data API.

## Arrancar en tu máquina (Windows, macOS o Linux)

Requisito: [Node.js 22 o superior](https://nodejs.org/).

```bash
npm install
npm run setup     # crea la base local e importa los 876 ejercicios
npm run dev       # abre http://localhost:3000
```

Sin claves ya podés buscar ejercicios y ver los datos básicos con las imágenes del dataset. Los nombres que no están corregidos en `data/overrides.json` aparecen en inglés hasta que corras la traducción (ver abajo).

> **Importante con la base local:** cerrá `npm run dev` (Ctrl+C) antes de correr cualquier comando `seed:*` o `video:*`, y volvé a levantarlo después. La base local no se puede usar desde dos procesos a la vez; los comandos te avisan si la app sigue abierta. Con Neon no hace falta.

## Sumar IA y videos

1. Copiá `.env.example` como `.env.local`.
2. **Gemini:** creá una clave en [Google AI Studio](https://aistudio.google.com/apikey) y pegala en `GOOGLE_GENERATIVE_AI_API_KEY`.
3. **YouTube:** en [Google Cloud Console](https://console.cloud.google.com/) creá un proyecto, habilitá *YouTube Data API v3* y creá una clave de API. Pegala en `YOUTUBE_API_KEY`.
4. Traducí los nombres al español (una sola vez):

   ```bash
   npm run seed:translate
   npm run seed:overrides   # vuelve a aplicar tus correcciones manuales
   ```

5. Reiniciá `npm run dev`. Cada ficha se completa sola la primera vez que alguien la abre y queda guardada.

Para pregenerar fichas y videos antes de publicar (así el público nunca dispara la IA):

```bash
npm run seed:enrich -- --limit 50                 # fichas y videos de los 50 primeros (los revisados primero)
npm run seed:enrich -- --limit 90 --only videos   # solo videos (~90 búsquedas por día de cuota)
```

## Ejercicios alternativos

Cada ficha muestra hasta 3 alternativas con otro equipamiento (por ejemplo, polea → mancuernas). Se calculan con:

```bash
npm run seed:alternatives                  # los que falten (reanudable)
npm run seed:alternatives -- --limit 40    # solo 40
npm run seed:alternatives -- --redo        # recalcula todos
npm run seed:alternatives -- --delay 8000  # más espera entre lotes si Gemini corta por límite por minuto
```

La IA sugiere nombres en lotes de 20 y cada uno se busca en el catálogo con el mismo buscador que la importación por foto: solo se guardan las coincidencias seguras. Al terminar muestra cuántos quedaron con 3, 2, 1 o ninguna alternativa. Con la base local, cerrá `npm run dev` antes de correrlo; después, `npm run db:copy-to-neon` también copia las alternativas.

## Panel de administración (`/admin`)

En http://localhost:3000/admin ves todos los ejercicios y les asignás el video que quieras, sin tocar la base ni la terminal.

1. Definí `ADMIN_TOKEN` en `.env.local` (cualquier texto largo y secreto) y reiniciá la app.
2. Entrá a `/admin` e ingresá ese token.
3. Filtrá por "Sin video", "Video automático" o "Video manual", o buscá por nombre.
4. En cada ejercicio: "Buscar en YouTube ↗" abre una búsqueda de demos; copiá el link del que te guste, pegalo y tocá **Guardar**.

También podés quitar un video, pedir una demo automática (si hay `YOUTUBE_API_KEY`) o abrir la ficha. Lo que guardás queda en la base y en `data/overrides.json`. En producción el panel funciona igual, pero `overrides.json` no se actualiza (el disco de Vercel es de solo lectura). Usá un `ADMIN_TOKEN` distinto y largo en producción.

### Imágenes

Cada ejercicio trae dos fotos del catálogo (inicio y final del movimiento). En `/admin`, sección **Imágenes**, podés subir las tuyas (JPG, PNG o WebP, hasta 4 MB), pegar un link, quitar, reordenar y elegir la principal: es la que se ve en el buscador, en "Los más buscados" y en las rutinas.

- En tu computadora, las imágenes subidas se guardan en `.data/uploads`.
- Al publicar en Vercel, creá un Blob Store (Storage → Blob, tiene plan gratuito) y agregá `BLOB_READ_WRITE_TOKEN`: las subidas van ahí automáticamente.

## Rutinas

Desde cualquier ficha, "Agregar a mi rutina" guarda el ejercicio (con series y repeticiones opcionales) en una o varias rutinas. En "Mis rutinas" las ves, tildás lo que vas haciendo (los tildes se reinician cada día), reordenás y borrás. Sin cuenta se guardan en el navegador del dispositivo; con login de Google se guardan en la base (tabla `routines`) y al entrar por primera vez se suben las que había en el navegador.

### Login con Google

1. En [Google Cloud Console](https://console.cloud.google.com/) → APIs y servicios → **Pantalla de consentimiento de OAuth**: configurala como "Externo" (alcances: `openid`, `email`, `profile`).
2. **Credenciales → Crear credenciales → ID de cliente de OAuth** → tipo "Aplicación web".
3. En **URI de redireccionamiento autorizados** agregá una por cada lugar donde corra la app:
   - `http://localhost:3000/api/auth/google/callback`
   - `https://TU-DOMINIO/api/auth/google/callback` (producción)
4. Copiá el ID y el secreto en `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` (en `.env.local` y en Vercel) y reiniciá.

Sin esas variables el botón "Entrar" no aparece y todo sigue funcionando sin cuenta. Las tablas `users`, `sessions` y `routines` las crea la migración `0003` (`npm run db:migrate`; con la base local se aplica sola al arrancar).

### Importar una rutina desde una foto

Con sesión iniciada, en "Mis rutinas" → **Importar desde una foto** subís una captura o foto de tu rutina. Gemini lee los días y ejercicios (con series y repeticiones), cada ejercicio se busca en el catálogo y elegís qué día importar; podés corregir el ejercicio elegido, cambiar series/repeticiones o crear la ficha si no existe. Tope por usuario: `SCAN_USER_DAILY_CAP` fotos por día (10 por defecto), además de `LLM_DAILY_CAP`.

#### Fotos que no se leyeron bien

Para mejorar la lectura de rutinas con estructuras distintas (de otros gimnasios, apps o planillas), se guarda la foto junto con lo que leyó la IA cuando:

- la IA falla (`ai_error`) o no encuentra ejercicios (`empty`);
- la mitad o más de los ejercicios quedan sin coincidencia en el catálogo (`unmatched`);
- el usuario toca **"¿La lectura salió mal? Avisanos"** en la pantalla de revisión (`reported`, con su comentario);
- el archivo llega en un formato que no aceptamos (`format`).

Se registra en la tabla `scan_failures` (migración `0004`) y la imagen va a:

- **Tu computadora:** `.data/scan-failures/`.
- **Producción:** un store de Vercel Blob **privado** aparte (el de las imágenes de ejercicios es público y no se puede cambiar). Crealo en Storage → Create → Blob → acceso *Private* y conectalo al proyecto con el prefijo **`SCAN_FAILURES`** (así crea `SCAN_FAILURES_STORE_ID` y no pisa `BLOB_STORE_ID`/`BLOB_READ_WRITE_TOKEN` del store público). Alternativa: un token fijo en `SCAN_FAILURES_BLOB_TOKEN`. Sin ese token, en Vercel se guarda solo el registro, sin la imagen.

Se guardan hasta 5 por usuario por día y todo se borra a los `SCAN_FAILURES_RETENTION_DAYS` días (30 por defecto). Para verlas:

```bash
npm run scan:failures                 # las últimas 20, con lo que leyó la IA
npm run scan:failures -- --download   # baja las imágenes del Blob privado a .data/scan-failures-download
```

## Elegir el video a mano desde la terminal

Si un ejercicio tiene video cargado a mano, se muestra ese y nunca se busca en YouTube.

```bash
npm run video:set -- press-arnold https://www.youtube.com/watch?v=XXXXXXXXXXX
npm run video:unset -- press-arnold
```

Queda guardado en la base y en `data/overrides.json`, así no se pierde si volvés a importar el catálogo. Si tenés `YOUTUBE_API_KEY`, se valida que el video exista y se pueda insertar (cuesta 1 unidad de cuota).

La búsqueda automática elige una **demo corta** del movimiento: busca "<nombre en inglés> exercise demo" (hay muchas más demos sin narración que en español), mira la duración de los resultados y se queda con el primero de entre 8 y 90 segundos; si no hay, el más corto de hasta 4 minutos. El video se reproduce sin sonido y en bucle.

Si cambiás el criterio o un video automático no te gusta:

```bash
npm run video:refresh -- press-arnold   # vuelve a buscar el de ese ejercicio
npm run video:refresh -- --all          # vuelve a buscar todos los automáticos (los manuales no se tocan)
```

Orden para elegir el video: manual → guardado de una búsqueda anterior → búsqueda en YouTube (si queda cuota) → imágenes del dataset y enlace "Ver videos en YouTube".

## Corregir nombres y alias

Editá `data/overrides.json` (la clave es el id del dataset o el slug) y corré `npm run seed:overrides`. Para revisar todo el catálogo: `npm run seed:export` genera `data/ejercicios.csv`.

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | App en modo desarrollo |
| `npm run build` / `npm start` | Compila y sirve en modo producción |
| `npm test` | Tests (sin red: IA y YouTube simulados) |
| `npm run lint` / `npm run typecheck` | Calidad de código |
| `npm run setup` | Migraciones + importación + overrides |
| `npm run db:generate` | Genera una migración nueva si cambiás `src/db/schema.ts` (con la base local se aplica sola al arrancar; con Neon, `npm run db:migrate`) |
| `npm run seed:translate` | Traduce nombres con IA (reanudable) |
| `npm run seed:enrich` | Pregenera fichas y videos |
| `npm run seed:export` | Exporta el catálogo a CSV |
| `npm run video:set` / `video:unset` | Video elegido a mano |
| `npm run video:refresh` | Vuelve a buscar videos automáticos |

## Pasar tu base local a Neon

Si ya trabajaste en local (traducciones, fichas generadas, videos e imágenes elegidos), copiá todo a Neon sin volver a llamar a la IA:

1. En `.env.local`, agregá `NEON_DATABASE_URL=` con la cadena de Neon (dejá `DATABASE_URL` vacío).
2. Cerrá `npm run dev` y corré `npm run db:copy-to-neon`.

Se puede repetir: actualiza lo que ya existe. Las imágenes subidas desde tu PC se suben a Vercel Blob si tenés `BLOB_READ_WRITE_TOKEN`.

## Deploy en Vercel + Neon

1. Creá un proyecto en [Neon](https://neon.com/) y copiá la cadena de conexión con pooling.
2. En tu máquina, poné esa cadena en `DATABASE_URL` de `.env.local` y corré `npm run setup` y `npm run seed:translate` (cargan la base de producción).
3. Subí el repo a GitHub e importalo en [Vercel](https://vercel.com/). Cargá las mismas variables de `.env.local`, con `NEXT_PUBLIC_SITE_URL` apuntando a tu dominio.
4. Probá en producción: buscá "press arnold", abrí la ficha y reproducí el video.

El plan Hobby de Vercel es solo para uso personal o no comercial.

## Protección de costos

- Cada ficha y cada video se piden una sola vez y se guardan; el tráfico normal sale de la caché.
- Topes diarios configurables: IA (`LLM_DAILY_CAP`), búsquedas de YouTube (`YOUTUBE_DAILY_CAP`), fichas nuevas en total y por IP.
- Para ponerle un techo de gasto a la IA, configurá un límite en la consola de Google.

## Estructura

```
src/app/                 páginas y endpoints (home, ficha, /api/…)
src/components/          buscador, ficha, video
src/db/                  esquema Drizzle y conexión (Neon o PGlite)
src/lib/                 IA, YouTube, búsqueda, enriquecimiento, límites
scripts/                 seed, traducción, videos manuales
data/overrides.json      correcciones manuales
drizzle/                 migraciones SQL
tests/unit/              tests con Vitest
```

Datos de ejercicios: [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (dominio público). Fuentes Inter y Space Grotesk (licencia OFL) incluidas en `src/app/fonts`.

Decisiones respecto del plan original: se usa `npm` en lugar de `pnpm` (viene con Node); la base local de desarrollo es PGlite para no depender de Docker ni de una cuenta; los scripts refrescan la caché de la app con `/api/revalidate` y `ADMIN_TOKEN`; el test end-to-end con Playwright quedó pendiente.
