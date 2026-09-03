# Agenda Inteligente

Agenda de citas con recordatorios automáticos para profesionales que cobran
por su tiempo (consultores, terapeutas, tatuadores, manicuristas,
fotógrafos, etc.).

## Stack

- **Backend:** Node.js + Express + SQLite
- **Frontend:** Angular (web), consumiendo el backend por HTTP. Es la
  versión de prueba mientras no hay un teléfono Android a mano; el plan es
  migrar esta misma funcionalidad a una app Android nativa (Java +
  Retrofit) más adelante.
- **Notificaciones:** push antes de cada cita, vía Firebase Cloud Messaging
  (al navegador con la web, a la app cuando exista)

## Alcance V1

- Crear, editar y cancelar citas
- Vista de calendario simple (día/semana)
- Ficha básica de cliente (nombre, teléfono)
- Recordatorio automático push antes de cada cita
- Login simple para el dueño de la agenda

## Estado actual

- [x] Backend Node.js + Express inicializado, corriendo local con un endpoint de prueba
- [x] Modelo de datos SQLite (`clientes`, `citas`) + CRUD de `clientes`
- [x] CRUD de `citas`
- [x] Login del dueño de la agenda
- [x] Recordatorios automáticos (cron + Firebase Cloud Messaging) — proyecto
      Firebase real configurado (`turnero-ec3cd`), envío de push activado
- [x] Frontend web en Angular (login, clientes, agenda día/semana, activar
      push) — Firebase configurado, notificaciones push del navegador
      funcionando
- [x] Módulo de postulaciones de trabajo (CRUD + panel de estadísticas +
      entrevistas en la Agenda) — ver sección propia más abajo
- [x] Detección automática de postulaciones y cambios de estado vía email
      (IMAP; Chiletrabajos, Computrabajo, LinkedIn y Trabajando.cl) — falta
      "entrevista" y el descarte propio de Chiletrabajos, pendiente de
      ejemplos reales
- [x] Descripción del aviso por scraping (solo Chiletrabajos, el único
      portal cuyo mail trae el link real) + recordatorio de seguimiento
      por Telegram a los 2 días sin novedades
- [x] Bandeja de revisión de mails sin identificar (se guardan completos
      en vez de perderse, se cargan a Postulaciones con un clic) +
      estimación heurística de probabilidad de llamada por postulación +
      compatibilidad de cada oferta con el perfil de la usuaria (con IA) —
      ver secciones propias más abajo
- [x] Annie: asistente conversacional en el sidebar (Claude API) — feed de
      actividad real de postulaciones y chat para agendar/mover entrevistas
      **o eventos personales sueltos** por lenguaje natural, con
      recordatorio push antes de cada entrevista (igual que las citas) —
      ver sección propia más abajo
- [x] Agenda con vista de mes y semana + eventos/recordatorios sueltos
      cargados directo desde la pantalla (no solo entrevistas), con su
      propio recordatorio por Telegram — ver sección propia más abajo
- [x] Resumen semanal por Telegram (domingos) con el pulso general de la
      búsqueda laboral — ver sección propia más abajo
- [x] Diseños hechos a mano por Ana (Procreate) convertidos a stickers:
      patrón de flores de fondo en toda la app + lettering en login/sidebar
      — ver "Diseño: stickers hechos a mano por Ana" más abajo
- [x] Pantalla de Configuración (perfil con nombre/email/contraseña/foto,
      notificaciones push on/off, idioma español/inglés con traducción
      completa de la interfaz, tema claro/oscuro) — ver secciones propias
      más abajo, backend y frontend
- [x] Web responsive (iPhone/iPad/tablet) — ver "Responsive (mobile/tablet)" más abajo
- [x] App Android (Kotlin + Jetpack Compose + Retrofit) — paridad completa
      con la web (Agenda, Postulaciones, Annie chat+voz, Configuración,
      push real vía Firebase) — ver "App Android" más abajo
- [x] Multi-tenancy real en el backend (`usuario_id` en postulaciones/
      eventos/actividad, cuenta "dueña" para los cron de un solo mailbox/
      Telegram) + límite diario de mensajes de Annie por cuenta — pasos
      previos para poder publicar la app públicamente, ver "Publicación en
      Google Play" más abajo
- [ ] Publicación pública en Google Play — código listo (firma de release,
      ProGuard, multi-tenancy, assets de la ficha); falta el hosting real
      del backend y los pasos de Play Console que necesitan a una persona
      (ver "Publicación en Google Play" más abajo)
- [x] Perfil/CV por cuenta (`usuarios.perfil_cv`, ya no un único
      `perfil.txt` global) — la compatibilidad con IA tiene sentido para
      cualquier cuenta — ver "Perfil/CV y compatibilidad por cuenta"
- [ ] Compatibilidad 100% automática para Computrabajo (conectar la
      cuenta real de Ana vía sesión exportada, sin tocar su login de
      Google) — mecanismo de cookies verificado en vivo, falta mapear el
      panel de "mis postulaciones" en sí; pausado por un límite de
      velocidad/anti-bot del lado de Computrabajo — ver "Computrabajo:
      sesión conectada" más abajo
      (cuenta de desarrollador, testing cerrado, política de privacidad) —
      ver "Publicación en Google Play" más abajo

## Backend (`backend/`)

### Cómo correrlo

```
cd backend
npm install
npm run dev     # reinicia solo al guardar cambios (usa node --watch)
```

o `npm start` para correrlo sin auto-reinicio.

Por defecto levanta en `http://localhost:4000` (puerto 3000 quedó libre para
otro proceso que ya estaba usándolo en esta máquina). Se puede cambiar con
la variable de entorno `PORT`, ej: `PORT=5000 npm run dev`.

### Variables de entorno (`backend/.env`, no se sube a git)

| Variable | Descripción |
|----------|-------------|
| `JWT_SECRET` | Clave para firmar los tokens de login. Se genera sola la primera vez. |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Path al JSON de credenciales de la cuenta de servicio de Firebase (ver sección de recordatorios). Vacío = modo simulado. |
| `RECORDATORIO_MINUTOS_ANTES` | Con cuántos minutos de anticipación se manda el recordatorio de una cita, una entrevista o un evento con hora. Default `30`. |
| `FRONTEND_URL` | Origen permitido por CORS para llamar a la API. Default `http://localhost:4200` (donde corre el frontend Angular en desarrollo). |
| `IMAP_HOST` | Servidor IMAP para la sincronización de postulaciones por email (ver sección de postulaciones). Default `imap.gmail.com`. |
| `IMAP_USER` | Casilla de Gmail a leer. Vacío = sincronización desactivada. |
| `IMAP_APP_PASSWORD` | Contraseña de aplicación de esa casilla (no la contraseña normal de la cuenta). |
| `EMAIL_SYNC_DIAS_ATRAS` | Cuántos días hacia atrás revisa el cron de sincronización de postulaciones en cada corrida. Default `3`. |
| `TELEGRAM_BOT_TOKEN` | Token del bot de Telegram para los recordatorios de seguimiento (ver esa sección). Vacío = modo simulado. |
| `TELEGRAM_CHAT_ID` | Chat o canal de Telegram al que se mandan los recordatorios. |
| `SEGUIMIENTO_POSTULACIONES_DIAS` | Días sin novedades antes de mandar el recordatorio de seguimiento. Default `2`. |
| `ANTHROPIC_API_KEY` | Clave de la API de Claude (console.anthropic.com), usada para el chat con Annie (`POST /annie/chat` responde 503 si está vacío) y para calcular la compatibilidad con la oferta (`backend/compatibilidadOferta.js` — si está vacío, esa compatibilidad queda `null`). |
| `ELEVENLABS_API_KEY` | Clave de ElevenLabs (elevenlabs.io/app/settings/api-keys) para la voz de Annie. Vacío = `POST /annie/tts` responde 503 y el frontend cae a la voz gratis del navegador. |
| `ELEVENLABS_VOICE_ID` | ID de la voz a usar (`GET /v1/voices` o el botón "Copy voice ID" en My Voices). **Tiene que ser una voz `premade`** (las que vienen con la cuenta gratis) — las del Voice Library son de pago, devuelven 402 en plan free. |

### Base de datos

SQLite, archivo `backend/turnero.sqlite` (se crea solo al arrancar, no se
sube a git). El esquema (tablas `clientes`, `citas`, `usuarios`,
`postulaciones`, `postulaciones_emails_procesados`,
`postulaciones_emails_revision` y `eventos`) se define en `backend/db.js`
y se aplica automáticamente cada vez que arranca el server.

El perfil de la usuaria (CV/experiencia, usado para calcular compatibilidad
con las ofertas) **ya no vive en `backend/perfil.txt`** — pasó a
`usuarios.perfil_cv` (2026-09-01, ver "Perfil/CV y compatibilidad por
cuenta" más abajo), para que cualquier cuenta tenga su propio perfil, no
solo la dueña. El archivo `perfil.txt` fue el origen del CV de Ana,
migrado una sola vez a su fila de `usuarios` al hacer este cambio.

### Autenticación

Login simple para el dueño de la agenda con email + password (hasheado con
bcrypt) y token JWT (30 días de vigencia). Las rutas `/clientes` y `/citas`
requieren el header `Authorization: Bearer <token>`; `/auth` es pública
(salvo `/auth/perfil`, `/auth/email`, `/auth/password`, `/auth/foto-perfil`
y `/auth/fcm-token`, que sí lo requieren). Cambiar el email devuelve un
token nuevo porque el JWT lleva el email embebido — ver sección de
"Perfil y preferencias" más abajo.

### Multi-tenancy (cuentas públicas)

Hasta este punto la app tenía exactamente una cuenta real, y `postulaciones`/
`eventos`/`actividad_postulaciones`/`postulaciones_emails_revision` eran
datos globales — cualquiera que se registrara vería (y podría editar/borrar)
todo lo de todos. Pensando en publicar la app Android públicamente en Play
Store, esto pasó a ser un problema real, no solo teórico.

- **Migración** (`db.js`, mismo patrón idempotente `PRAGMA table_info` +
  `ALTER TABLE` que ya usa el archivo): las 4 tablas de arriba suman
  `usuario_id INTEGER`, con backfill automático (una sola vez, dentro del
  mismo guard que agrega la columna) asignando todas las filas viejas a la
  cuenta que ya existía. `usuarios` suma `es_owner INTEGER DEFAULT 0`,
  puesto en 1 solo para esa cuenta.
- **Rutas**: `postulaciones.js`, `eventos.js`, `mailsRevision.js`,
  `recordatoriosVoz.js` y los tool-use de `annie.js` (`agendar_entrevista`,
  `crear_evento`, el contexto de postulaciones que arma el prompt, el
  resumen de "mientras no estuviste") ahora filtran/graban todo por
  `req.usuario.id` — antes ni siquiera los `GET/PUT/DELETE /:id`
  verificaban dueño, cualquier cuenta logueada podía tocar el id de
  cualquier otra.
- **`clientes`/`citas`** (el turnero original, sin uso real hoy): en vez de
  migrarlos por completo, nuevo middleware `middleware/requireOwner.js`
  (403 si `usuarios.es_owner` no es 1) montado sobre esas dos rutas en
  `index.js` — cierra la fuga sin invertir en una migración completa de una
  función que no está en uso.
- **Cron jobs de un solo mailbox/Telegram, clavados a la cuenta dueña, NO
  multi-tenant** (nuevo helper `ownerUsuario.js`, `obtenerIdDueña()`):
  `emailSync.js` (un único IMAP), `recordatorios.js` (citas/clientes),
  `recordatoriosEventos.js`, `recordatoriosPostulaciones.js` y
  `resumenSemanal.js` (los 3 de Telegram, un único chat compartido) ahora
  filtran sus queries por el `usuario_id` de la dueña en vez de barrer toda
  la tabla, y el push de `emailSync.js`/`recordatorios.js` va solo al
  `fcm_token` de la dueña en vez de a **todos** los usuarios con
  notificaciones activas (bug real que hoy ya no importa porque hay una
  sola cuenta, pero rompía en cuanto hubiera una segunda).
- **`recordatoriosEntrevistas.js` sí quedó multi-tenant de verdad** (a
  diferencia de los anteriores): como `postulaciones` ya tiene `usuario_id`
  real para cualquier cuenta, cada recordatorio de entrevista por push se
  manda al `fcm_token` de quien es dueña de esa postulación puntual, no
  solo a la cuenta dueña del mailbox.
- **Verificado en vivo**: se registró una cuenta de prueba y se confirmó
  que ve Postulaciones/Agenda vacías, no puede leer/editar/borrar un id
  real de la cuenta dueña (404), y recibe 403 en `/clientes`/`/citas` — sin
  afectar los datos reales de la cuenta dueña. Cuenta de prueba borrada
  después de confirmar.

### Endpoints

| Método | Ruta               | Descripción                          |
|--------|--------------------|---------------------------------------|
| GET    | `/health`          | Chequeo de que el servidor está vivo |
| POST   | `/auth/register`   | Crear usuario dueño (`email`, `password`) |
| POST   | `/auth/login`      | Login, devuelve `{ token }`          |
| PUT    | `/auth/fcm-token`  | Guardar el token FCM del dispositivo del dueño, o borrarlo mandando `fcm_token: null` (requiere login) |
| GET    | `/auth/perfil`     | Datos de perfil y preferencias (`nombre`, `email`, `foto_perfil`, `idioma`, `tema`, `notificaciones_activas`) _(requiere login)_ |
| PUT    | `/auth/perfil`     | Editar `nombre`/`idioma`/`tema`/`notificaciones_activas` (solo los campos presentes en el body) _(requiere login)_ |
| PUT    | `/auth/email`      | Cambiar el email (`email`, `password_actual`). Devuelve `{ token }` nuevo _(requiere login)_ |
| PUT    | `/auth/password`   | Cambiar la contraseña (`password_actual`, `password_nueva`) _(requiere login)_ |
| POST   | `/auth/foto-perfil`| Subir la foto de perfil (`multipart/form-data`, campo `foto`). Devuelve `{ foto_perfil }` _(requiere login)_ |
| GET    | `/clientes`        | Listar clientes _(requiere login + ser la cuenta dueña, ver "Multi-tenancy" arriba)_ |
| GET    | `/clientes/:id`    | Obtener un cliente _(requiere login + dueña)_ |
| POST   | `/clientes`        | Crear cliente (`nombre` obligatorio, `telefono` opcional) _(requiere login + dueña)_ |
| PUT    | `/clientes/:id`    | Editar cliente _(requiere login + dueña)_    |
| DELETE | `/clientes/:id`    | Borrar cliente _(requiere login + dueña)_    |
| GET    | `/citas`           | Listar citas _(requiere login + dueña)_      |
| GET    | `/citas/:id`       | Obtener una cita _(requiere login + dueña)_  |
| POST   | `/citas`           | Crear cita (`cliente_id`, `inicio`, `fin` obligatorios; `estado` opcional, por defecto `confirmada`; `notas` opcional) _(requiere login + dueña)_ |
| PUT    | `/citas/:id`       | Editar cita _(requiere login + dueña)_       |
| DELETE | `/citas/:id`       | Borrar cita _(requiere login + dueña)_       |
| GET    | `/postulaciones`      | Listar postulaciones de trabajo, ordenadas por `fecha_postulacion DESC, creado_en DESC` _(requiere login)_ |
| GET    | `/postulaciones/stats`| Conteos por estado y por portal, para el panel de análisis _(requiere login)_ |
| GET    | `/postulaciones/:id`  | Obtener una postulación _(requiere login)_ |
| POST   | `/postulaciones`      | Crear postulación (`empresa`, `puesto`, `fecha_postulacion` obligatorios; `portal`, `descripcion`, `link`, `estado`, `fecha_entrevista`, `notas` opcionales) _(requiere login)_ |
| PUT    | `/postulaciones/:id`  | Editar postulación _(requiere login)_ |
| DELETE | `/postulaciones/:id`  | Borrar postulación _(requiere login)_ |
| POST   | `/postulaciones/recalcular-compatibilidad` | Recalcula `compatibilidad_oferta` de todas las postulaciones con `descripcion` (mismo botón de la UI) _(requiere login)_ |
| GET    | `/mails-revision`     | Listar mails sin identificar pendientes de revisión _(requiere login)_ |
| DELETE | `/mails-revision/:id` | Sacar un mail de la bandeja de revisión (al cargarlo como postulación o al descartarlo) _(requiere login)_ |
| GET    | `/eventos`            | Listar eventos/recordatorios de la Agenda _(requiere login)_ |
| POST   | `/eventos`            | Crear evento (`titulo`, `fecha` obligatorios; `hora`, `notas`, `tipo` opcionales — `tipo` default `personal`) _(requiere login)_ |
| PUT    | `/eventos/:id`        | Editar evento _(requiere login)_ |
| DELETE | `/eventos/:id`        | Borrar evento _(requiere login)_ |
| POST   | `/annie/chat`         | Chat con Annie (`mensaje`, `historial` opcional). Devuelve `{ respuesta, historial, acciones }`, o `429` si se agotó el límite diario _(requiere login, ver "Límite diario de Annie" más abajo)_ |
| POST   | `/annie/tts`          | Texto a voz de Annie vía ElevenLabs (`texto`). Devuelve el audio (`audio/mpeg`), o `429` si se agotó el límite diario _(requiere login)_ |

**Formato de fechas:** `inicio` y `fin` de una cita deben mandarse en UTC,
formato ISO 8601 sin zona horaria, ej: `2026-08-22T10:00:00`. Es lo que
compara el scheduler de recordatorios contra la hora actual.

### Perfil y preferencias de usuario

La pantalla de Configuración del frontend (botón de engranaje en la
tarjeta de usuario del sidebar) agrega a `usuarios` las columnas `nombre`,
`foto_perfil`, `idioma` (`'es'`/`'en'`, default `'es'`), `tema`
(`'claro'`/`'oscuro'`, default `'claro'`) y `notificaciones_activas`
(default activado) — mismo patrón de migración que el resto de las tablas
en `backend/db.js`.

**Foto de perfil:** `POST /auth/foto-perfil` recibe un `multipart/form-data`
(vía `multer`) y guarda el archivo en `backend/uploads/perfil/` (no se sube
a git — dato personal, igual criterio que `perfil.txt`), con nombre
`usuario-<id>-<timestamp>.<ext>`; al subir una foto nueva se borra la
anterior del mismo usuario. `backend/index.js` sirve esa carpeta como
estático en `/uploads`, así el frontend arma la URL completa con
`environment.apiUrl + foto_perfil`.

**Notificaciones:** el toggle de Configuración reemplaza al viejo botón
suelto "Activar recordatorios" del sidebar. Activarlo llama al mismo flujo
de siempre (`PushService.pedirPermisoYRegistrar()`, permiso del navegador +
registro del token FCM); desactivarlo manda `fcm_token: null` a
`PUT /auth/fcm-token` para que los crons de recordatorios (`recordatorios.js`,
`recordatoriosEntrevistas.js`) dejen de mandarle push a ese usuario.
`notificaciones_activas` es la preferencia que ve la UI (para poder mostrar
el estado del toggle sin depender de si el navegador todavía tiene el
permiso), separada del detalle de si hay o no un `fcm_token` guardado.

**Idioma de Annie:** `backend/routes/annie.js` le pasa el `idioma` guardado
del usuario a `systemPrompt()` — si es `'en'`, le pide a Annie que responda
en inglés en vez del español neutro de siempre. El resto de los avisos
automáticos (Telegram, resumen semanal, parseo de emails de Postulaciones)
siguen siempre en español: son avisos internos sobre correos que ya llegan
en español, no interfaz de usuario.

### Recordatorios automáticos

Un cron interno (`backend/recordatorios.js`, vía `node-cron`) corre cada
minuto y busca citas no canceladas, sin recordatorio enviado, cuyo `inicio`
caiga dentro de los próximos `RECORDATORIO_MINUTOS_ANTES` minutos. Por cada
una, le manda un push (Firebase Cloud Messaging) a todos los dueños que
tengan un `fcm_token` guardado (vía `PUT /auth/fcm-token`), y marca la cita
como notificada para no repetir el envío.

Mientras no haya un proyecto de Firebase configurado
(`FIREBASE_SERVICE_ACCOUNT_PATH` vacío en `.env`), el envío queda en modo
simulado: se loguea en consola en vez de mandar el push real, así se puede
probar toda la lógica de scheduling sin depender de Firebase. Para activar
el envío real:

1. Crear un proyecto en [Firebase console](https://console.firebase.google.com/).
2. Generar una clave de cuenta de servicio (Configuración del proyecto →
   Cuentas de servicio → Generar nueva clave privada) y guardar el JSON
   dentro de `backend/` con el nombre `firebase-service-account.json` (ese
   patrón ya está en `.gitignore`, no se sube a git).
3. Setear `FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json`
   en `backend/.env`.
4. Reiniciar el server.

**Nota sobre la versión de `firebase-admin`:** a partir de v14 el paquete
pasó a una API modular — `admin.credential.cert(...)` y `admin.messaging()`
ya no existen. Hay que usar `require('firebase-admin/app')` (`initializeApp`,
`cert`) y `require('firebase-admin/messaging')` (`getMessaging`). Es lo que
usa `backend/recordatorios.js` actualmente; si se actualiza el paquete en el
futuro y algo deja de andar, revisar el [changelog de
firebase-admin](https://github.com/firebase/firebase-admin-node/releases)
por si vuelve a cambiar la forma de inicializar.

**Troubleshooting — "el push no llega":**
- El backend puede reportar el envío como exitoso (Firebase lo acepta) sin
  que el navegador muestre nada. Antes de sospechar de Firebase, revisar:
- Si la pestaña de Agenda Inteligente está en primer plano (enfocada), el aviso lo
  maneja `onMessage` en `frontend/src/app/core/push.service.ts` (muestra un
  `new Notification(...)` manual). Si está en segundo plano, lo maneja
  `onBackgroundMessage` en `frontend/public/firebase-messaging-sw.js`.
- El navegador **cachea el service worker viejo** y no lo actualiza solo al
  cambiar el archivo. Si se edita `firebase-messaging-sw.js` (o se completa
  la config de Firebase por primera vez), hay que ir a DevTools →
  Application → Service Workers → "Unregister", cerrar y volver a abrir la
  pestaña, y volver a activar los recordatorios.
- Windows puede bloquear las notificaciones a nivel sistema aunque el
  código funcione bien: revisar Asistente de enfoque (Focus Assist, debe
  estar "Desactivado") y `Configuración → Sistema → Notificaciones →
  Google Chrome` (tiene que estar permitido ahí, es un switch aparte del
  permiso que pide el propio navegador).

### Postulaciones de trabajo

Módulo aparte del turnero de citas, pensado para llevar un orden de las
postulaciones laborales del dueño de la agenda y detectar en qué etapa se
pierden (cuántas fueron vistas, cuántas dieron entrevista, tasa de rechazo,
etc.).

Cada postulación tiene: `empresa`, `puesto`, `portal` (texto libre, ej.
LinkedIn/Bumeran/Computrabajo/email), `descripcion` (de qué trata el
puesto), `link`, `fecha_postulacion`, `estado` (`enviada` → `vista` →
`entrevista` → `rechazada`/`oferta`, default `enviada`),
`fecha_entrevista` (opcional, fecha y hora de la entrevista si la hay) y
`compatibilidad_oferta`/`compatibilidad_razon` (calculados con IA a partir
de `descripcion`, ver sección propia más abajo). `GET /postulaciones/stats`
devuelve el total y los conteos por estado y por portal que arma el panel
de análisis en el frontend.

**Edición inline, no arriba de la página:** al tocar "Editar" en una
postulación de la lista, el formulario aparece dentro de esa misma
tarjeta (reemplazando el detalle de solo lectura), no en un formulario
aparte al principio de la página — antes sí pasaba eso, y perdías de
vista con cuál estabas trabajando si la lista era larga. El formulario
vive una sola vez en el HTML (`<ng-template #formularioPostulacion>` en
`postulaciones.html`) y se reutiliza con `*ngTemplateOutlet` tanto arriba
(para "Nueva postulación") como dentro de la tarjeta (para editar una
existente), según si `editandoId()` es `null` o el id de esa postulación.

Las postulaciones con `fecha_entrevista` cargada aparecen también en la
pantalla de **Agenda** (mes y semana), diferenciadas visualmente de los
eventos sueltos — ver sección propia de Agenda más abajo.

**Carga manual** desde la pantalla de Postulaciones, más **detección
automática de nuevas postulaciones vía email** (`backend/emailSync.js`):
no hay integración con LinkedIn ni con los portales de empleo (scrapearlos
violaría sus términos de servicio y no es confiable), en cambio se lee la
casilla de correo por IMAP y se detectan los mails de confirmación de
postulación que ya llegan solos.

**Cómo funciona:** un cron (`node-cron`, corre cada 10 minutos) revisa los
mails de los últimos `EMAIL_SYNC_DIAS_ATRAS` días (default `3`) de la
casilla configurada (`IMAP_USER` / `IMAP_APP_PASSWORD` en `.env`). Para
traer historial viejo (ej. la primera vez que se activa, o después de
agregar un portal nuevo) se puede correr una sincronización puntual con
una ventana más amplia: `EMAIL_SYNC_DIAS_ATRAS=30 node -e
"require('dotenv').config(); require('net').setDefaultAutoSelectFamily(false);
require('./emailSync').sincronizarEmails()"` desde `backend/`. Cada mail
se compara contra las reglas de
`backend/emailParsers.js` (varias por portal, matcheando por remitente),
que son de dos tipos:

- **`nueva_postulacion`** (empresa + puesto): crea la postulación
  (`estado: enviada`) si no existía ya una con esa misma empresa+puesto.
- **`cambio_estado`** (puesto + estado, empresa opcional): busca la
  postulación existente y le actualiza el estado. Si el mail no menciona
  la empresa, se busca solo por puesto — si hay 0 o más de 1 coincidencia
  no se toca nada y se loguea una advertencia (para no actualizar la
  postulación equivocada). Los estados `rechazada`/`oferta` quedan
  "trabados": una vez ahí no se pisan con actualizaciones automáticas
  posteriores.

Cada mail procesado se guarda en la tabla `postulaciones_emails_procesados`
(por `Message-ID`) para no volver a procesarlo. Si un mail no trae parte de
texto plano (algunos portales mandan solo HTML), se convierte el HTML a
texto (`html-to-text`) antes de aplicar las reglas. Si `IMAP_USER`/
`IMAP_APP_PASSWORD` están vacíos, la sincronización queda desactivada (se
loguea un aviso una sola vez).

**Aviso por Telegram de lo que SÍ se reconoce:** además del aviso de "mail
no reconocido" (más abajo), cada postulación nueva detectada y cada cambio
de estado (`vista`, `entrevista`, `rechazada`, `oferta`) mandan su propio
aviso por Telegram (`avisarPorTelegram()` en `emailSync.js`). Antes esto
quedaba en silencio total del lado del servidor — el único lugar donde se
"anunciaba" era el frontend (Annie, por voz/notificación del navegador),
y solo mientras la pestaña estaba abierta y activa (compara cada 60
segundos contra el último estado que vio, `shell.ts`). Sin la app abierta
en ese momento puntual, no había forma de enterarse de nada. Si falla el
envío a Telegram, se loguea un error pero no interrumpe la sincronización.

**Portales soportados hoy:** Chiletrabajos (`chiletrabajos.cl`),
Computrabajo (`computrabajo.com`), LinkedIn (`linkedin.com`),
Trabajando.cl (`trabajando.com`) y dos ATS genéricos que cualquier empresa
puede usar para su propio proceso — **SmartRecruiters**
(`smartrecruiters.com`, la empresa sale del asunto: "Thank you for
applying to {empresa}") y **Pandape** (`pandape.com`, la empresa sale del
cuerpo, antes de "Proceso de selección para:"). A diferencia de los
portales de empleo, en estos dos el remitente varía según qué empresa lo
use (ej. "HR Capital" y "TicMoAI" respectivamente son las empresas, no el
ATS) — el `portal` guardado es el nombre del ATS, la `empresa` sale del
mail. Para sumar un portal nuevo, o un cambio de estado que todavía no
esté cubierto (ej. entrevista, o el "te descartaron" de Chiletrabajos),
hace falta un mail de ejemplo real (remitente + asunto + cuerpo) para
escribir la regla en `emailParsers.js`.

**Trabajando.cl es un caso especial:** su mail de confirmación no
menciona la empresa (solo el puesto y el link al aviso), y la página del
aviso es una SPA en React que no se puede scrapear sin un navegador
headless — se decidió no sumar esa complejidad por 4-5 avisos. Las
postulaciones de este portal se cargan con `empresa: "Trabajando.cl
(completar)"` como placeholder; hay que completar el nombre real a mano
desde la pantalla de Postulaciones. Como varias postulaciones de este
portal (o de cualquier empresa a la que se postuló más de una vez) pueden
compartir el mismo nombre, el feed de actividad de Annie (`actividadDe()`
en `shell.ts`) siempre muestra empresa **y** puesto — solo con la empresa
se verían como si fueran la misma postulación repetida.

**LinkedIn (`jobs-noreply@linkedin.com`) trae link al aviso** pero **no
se scrapea la descripción**: a diferencia de Chiletrabajos, LinkedIn
exige login para ver el aviso completo, así que `jobPageScraper.js` no
tiene regla para ese dominio.

**Cosas no obvias que aparecieron al probar con la casilla real:**

- **Computrabajo dice literalmente "la empresa"** en avisos con empleador
  anónimo/confidencial (`Tu CV ya está en manos de la empresa.`) — no es
  un fallo del parser, es el dato real; se normaliza a "Empresa
  confidencial" para que no parezca un error de extracción.
- **La plantilla de "postulación enviada" de Chiletrabajos no es
  consistente**: a veces el nombre de la empresa termina con un punto
  antes de "Estimado/a" (`Highdare SPA. Estimado/a`) y a veces no
  (`Vilzo Consultoría Estimado/a`) — el regex corta en el primer punto
  seguido de espacio **o** en la palabra "Estimado", lo que aparezca
  primero.
- **Computrabajo no menciona la empresa** en sus mails de cambio de
  estado, solo el puesto — por eso ese parser no devuelve `empresa` y se
  busca por puesto solamente.
- **El asunto de Computrabajo puede ser engañoso**: un mail titulado "tu
  candidatura avanza en el proceso de selección" puede en realidad ser un
  **descarte** — el estado real está codificado en el link "Ver mi
  postulación" (`utm_campaign=auto_cand_MatchDescartado` vs
  `...MatchVisto`, URL-encoded como `%3D` dentro del link de redirección),
  no en el texto visible del mail.
- **Mails en texto plano vienen con word-wrap**: el texto se corta con
  saltos de línea a mitad de oración, así que las reglas capturan a través
  de saltos de línea (`[\s\S]` en vez de `.`) y normalizan espacios
  después.
- **Chiletrabajos tiene un bug de codificación propio**: para algunos
  avisos, el título del puesto llega con caracteres corruptos (ej. "Full
  Stack â VI RegiÃ³n" en vez de "Full Stack – VI Región") ya en el HTML
  que manda el portal — no es algo que se pueda arreglar del lado del
  parser sin heurísticas frágiles, así que puede haber postulaciones con
  el puesto con caracteres raros ocasionalmente.
- **Computrabajo tiene una segunda plantilla de "vista" que no es la
  transaccional de arriba**: una encuesta de seguimiento ("¿La empresa X
  se comunicó contigo?", campaña `auto_cand_follow_company_contact_status`)
  que igual confirma que la empresa vio el CV, pero sin el link "Nuevo
  estado en..." que usa el otro parser. Sin una regla para esta plantilla
  caía en la red de contención (bandeja de revisión + Telegram) pero
  **nunca se convertía en un cambio de estado real** — la postulación se
  quedaba en "enviada" y Annie nunca lo anunciaba (ni voz, ni push, ni el
  resumen de "mientras no estuviste"), porque esos tres canales solo
  disparan desde `registrarActividad()`, que solo se llama dentro de
  `procesarCambioEstado()`. Se agregó una regla aparte en
  `emailParsers.js` para esta plantilla (extrae la empresa del asunto y el
  puesto del cuerpo, mapea siempre a `vista`); ojo con el word-wrap acá
  también: "vio tu CV" a veces cae partido por un salto de línea justo
  entre esas palabras, por eso el regex usa `\s+` en vez de espacios
  literales entre cada palabra del ancla. Las 2 postulaciones ya afectadas
  antes del fix (BCTecnología id 34, Clini id 36) se actualizaron a mano
  una sola vez reproduciendo el mismo flujo (actividad + push + Telegram)
  porque sus mails ya habían quedado marcados como procesados.
- **Los ATS genéricos (SmartRecruiters, Pandape) solo cubren el mail de
  confirmación de postulación** (`nueva_postulacion`): si la empresa
  después manda novedades desde ese mismo ATS ("la empresa le envió un
  mensaje", tests, cambios de estado), esos mails de seguimiento no
  matchean ningún parser todavía (harían falta ejemplos reales de esos
  formatos puntuales) y caen en la red de contención de abajo.

**Red de contención para remitentes desconocidos:** si un mail no viene de
ninguno de los portales/ATS de arriba, antes se
descartaba en silencio sin siquiera leerlo. Ahora, `emailSync.js` igual lee
el asunto y el cuerpo y los compara contra una lista de palabras clave de
RR.HH. en `emailParsers.js` (`pareceLaboral()` — "postulación",
"entrevista", "tu perfil", "hiring", etc., en español e inglés). Mismo
criterio para un mail que sí viene de un portal conocido pero cuyo formato
cambió y el parser no lo pudo extraer. Es una heurística por palabras
clave, no un parser — puede haber falsos negativos (un mail de RR.HH. que
no use ninguna de esas palabras) pero no falsos positivos ruidosos con el
resto del correo (facturas, newsletters, etc.). Esto lee el cuerpo
completo de **cualquier mail** de la casilla en la ventana de
`EMAIL_SYNC_DIAS_ATRAS` que no sea de un portal conocido — la
clasificación corre toda local (nada se manda a ningún servicio externo
para esto, ver `pareceLaboral()`).

Si matchea alguna palabra clave, el mail completo (remitente, asunto,
cuerpo) se guarda en la tabla `postulaciones_emails_revision` — la
**bandeja de revisión** que aparece arriba de las estadísticas en la
pantalla de Postulaciones — y además se manda un aviso por Telegram con un
extracto. Antes solo se avisaba por Telegram y había que ir a buscar el
mail original al correo para cargarlo a mano; ahora el contenido ya queda
en la app: desde la bandeja se puede **"Cargar como postulación"** (abre
el formulario de alta con el cuerpo del mail pegado en notas, para
completar empresa/puesto a mano) o **"Descartar"** si no corresponde. Al
guardar o descartar, la entrada se borra de la bandeja
(`DELETE /mails-revision/:id`, `GET /mails-revision` para listarla).

**Selección múltiple:** cada mail tiene un checkbox (más "Seleccionar
todos"), y con al menos uno tildado aparecen dos botones — "Agregar todos"
y "Descartar todos" — para actuar sobre varios de una vez, pedido
explícito de la usuaria para no tener que abrir mail por mail. No hay
endpoints bulk en el backend: `postulaciones.ts` orquesta las llamadas
individuales existentes con `forkJoin` (una `POST /postulaciones` +
`DELETE /mails-revision/:id` por mail para "agregar todos", una
`DELETE /mails-revision/:id` por mail para "descartar todos") — con el
volumen bajo de un uso personal no hace falta un endpoint bulk dedicado.
"Agregar todos" no puede pedir empresa/puesto a mano uno por uno como en
la carga individual, así que usa placeholders (`Sin identificar (dominio)`
para empresa, el asunto del mail o "Sin especificar" para puesto) — quedan
para completar después desde la edición inline de la tarjeta.

**Configurar la contraseña de aplicación de Gmail:**

1. Activar la verificación en 2 pasos en la cuenta de Google (si no está
   activada, Gmail no deja generar contraseñas de aplicación):
   [myaccount.google.com/security](https://myaccount.google.com/security).
2. Ahí mismo, buscar **"Contraseñas de aplicaciones"** (o ir directo a
   [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)).
3. Generar una nueva (nombre libre, ej. "Turnero"), copiar la clave de 16
   caracteres que muestra.
4. En `backend/.env`: `IMAP_USER=tu-email@gmail.com` y
   `IMAP_APP_PASSWORD=` esa clave (sin espacios).
5. Reiniciar el backend.

**Descripción completa del aviso (`backend/jobPageScraper.js`):** cuando el
mail de `nueva_postulacion` trae el link al aviso exacto, se entra a esa
página y se trae el texto de la descripción (con `cheerio`, un selector
por portal). Solo Chiletrabajos por ahora — es el único cuyo mail de
confirmación trae el link real; el de Computrabajo solo trae "ofertas
recomendadas" similares, ninguna es la real, así que no hay forma
confiable de traer la descripción para esas. Si el scraping falla (aviso
dado de baja, portal caído, cambio de diseño) no rompe la sincronización,
solo se loguea un aviso y la postulación queda sin descripción.

**Probabilidad de llamada (`backend/probabilidadLlamada.js`):** cada
postulación activa (`enviada` o `vista`) muestra en su tarjeta un % de
"probabilidad de llamada" (que la empresa la contacte para una
entrevista). **Importante: hoy es una heurística por señales conocidas, no
una tasa calculada con datos históricos reales** — en la base actual
todavía no hay ninguna postulación en estado `entrevista` u `oferta`, así
que no hay con qué calcular una conversión real por portal/empresa. Las
señales que sí usa:

- **Estado actual:** `vista` (la empresa ya abrió/miró el perfil) parte de
  una base más alta (55%) que `enviada` sin ninguna señal (25%).
- **Antigüedad:** cuanto más tiempo pasó desde `fecha_postulacion` sin
  novedades, más decae esa base (hasta un piso del 35% de su valor a los
  14 días) — la mayoría de las respuestas llegan en una ventana inicial,
  pero igual hay entrevistas tardías. Ventana corta a propósito: con una
  ventana más larga (probamos 45 días primero), postulaciones mandadas la
  misma semana terminaban con % casi idénticos entre sí — poco útil para
  comparar de un vistazo.
- **Compatibilidad con la oferta** (siguiente punto), cuando existe: ajusta
  la base hacia arriba o abajo. 50% de compatibilidad es neutro (no mueve
  nada); compatibilidad alta la sube hasta +50%, compatibilidad baja la
  baja hasta -50%. Si la postulación no tiene `descripcion` (la mayoría
  hoy, ver más abajo) no hay compatibilidad calculada y este factor no se
  aplica.

El resultado final queda acotado entre 3% y 90% (nunca se muestra 0% ni
100%, sería una falsa certeza). Las postulaciones ya resueltas
(`entrevista`, `rechazada`, `oferta`) no muestran probabilidad
(`probabilidad_llamada: null`). El día que haya casos reales de
`entrevista`/`oferta` en la base, tiene más sentido reemplazar esta
heurística por una tasa calculada de verdad (ej. % histórico de conversión
por portal) en vez de mantener estos números fijos.

**Compatibilidad con la oferta (`backend/compatibilidadOferta.js`):** mide
qué tan bien calza el perfil de la usuaria con lo que pide **esa oferta
puntual** — a diferencia de la probabilidad de llamada, que es una
predicción de un evento futuro, esto es una comparación de contenido
(perfil vs. texto de la oferta). Se muestra como badge propio
("compatibilidad con la oferta") en las postulaciones que tienen
`descripcion` cargada, con la razón corta al pasar el mouse y en el
detalle expandido de la tarjeta, **y además** alimenta como señal a la
probabilidad de llamada (punto anterior).

Se calcula con IA (Claude, mismo modelo que usa Annie —
`ANTHROPIC_API_KEY`): se le pasa el `perfil_cv` de la cuenta dueña de esa
postulación (ver "Perfil/CV y compatibilidad por cuenta" más abajo) más la
`descripcion` de la oferta, y
devuelve `{ compatibilidad: 0-100, razon: "una oración" }` vía tool use
(`HERRAMIENTA_COMPATIBILIDAD`) para que la respuesta sea siempre ese
formato. Si no hay `ANTHROPIC_API_KEY`, no hay `descripcion`, o la llamada
a la API falla, queda en `null` (`compatibilidad_oferta`,
`compatibilidad_razon`) — nunca rompe la creación/edición de la
postulación.

**Cuándo se calcula** (para no repetir la llamada a la API en cada
edición): al crear una postulación con `descripcion`, al editar una
postulación si la `descripcion` cambió, y automáticamente cuando
`emailSync.js` scrapea la descripción de un aviso (hoy solo Chiletrabajos,
ver más arriba). **No** se recalcula solo por listar/abrir las
postulaciones.

**`node recalcularCompatibilidad.js`** (desde `backend/`): recalcula
`compatibilidad_oferta`/`compatibilidad_razon` para todas las postulaciones
**de la cuenta dueña** que ya tienen `descripcion` cargada — útil después
de editar el CV, o para rellenar postulaciones viejas creadas antes de
este módulo. Es un script de consola, solo pensado para la dueña (usa
`ownerUsuario.js`); el botón **"Recalcular compatibilidad"** en la
pantalla de Postulaciones (`POST /postulaciones/recalcular-compatibilidad`)
hace lo mismo pero para la cuenta logueada, cualquiera sea.

### Perfil/CV y compatibilidad por cuenta (2026-09-01)

Pedido explícito de la usuaria: que la compatibilidad automática tenga
sentido para **cualquier cuenta**, no solo la suya — antes el perfil/CV
usado para compararlo con cada oferta era un único archivo global
(`backend/perfil.txt`), así que solo la cuenta dueña tenía compatibilidad
real.

- **`usuarios.perfil_cv TEXT`** (migración en `db.js`) reemplaza
  `perfil.txt`. `backend/perfil.js` pasó de `leerPerfil()` a
  `leerPerfil(usuarioId)`, leyendo esa columna. Todos los call-sites
  (`routes/postulaciones.js`, `emailSync.js`, `recalcularCompatibilidad.js`)
  ahora pasan el `usuario_id` correspondiente en vez de leer un único
  archivo.
- **`PUT /auth/perfil-cv`** (`{ perfil_cv: string }`) guarda el CV de la
  cuenta logueada; `GET /auth/perfil` lo devuelve junto al resto del
  perfil.
- **Frontend web y Android**: nueva tarjeta "Mi CV / Perfil" en
  Configuración, un `textarea` grande para pegar/editar el resumen de
  experiencia — mismo patrón que el resto de los campos de esa pantalla.
- El contenido de `perfil.txt` de Ana se migró una sola vez a su fila de
  `usuarios` (mismo texto, no se perdió nada). El archivo sigue existiendo
  en disco pero ya no lo lee ningún código.

### Computrabajo: sesión conectada para compatibilidad automática (2026-09-01, código completo pero bloqueado en la prueba en vivo)

Aun con `perfil_cv` por cuenta, la compatibilidad **solo se calcula sola
cuando hay `descripcion`** -- y de los portales que reconoce el sistema,
**Computrabajo es el único de verdad usado seguido por Ana y su mail de
confirmación no trae el link a la oferta real** (confirmado leyendo un
mail real: solo trae "ofertas recomendadas" similares, nunca la que se
postuló -- `backend/jobPageScraper.js` ya documentaba esto). Sin ese link,
no hay forma de traer la descripción sola, y hay que pegarla a mano para
tener compatibilidad.

Pedido explícito de la usuaria: conectar su cuenta real de Computrabajo
para traer ese link desde su panel de "mis postulaciones" — **entendiendo
y aceptando los riesgos** que se le plantearon (contraseña de un tercero
en el server, navegador automatizado, riesgo de que Computrabajo detecte
el patrón y bloquee/pida verificación en su cuenta real). Alcance
explícito: **solo su cuenta por ahora**, no multi-tenant.

**Giro importante durante la implementación:** la cuenta de Computrabajo
de Ana (como la mayoría de sus portales) es de login federado — "Continúa
con Google", sin contraseña propia en Computrabajo. Esto descarta
automatizar el login desde cero (necesitaría la contraseña real de
Google, mucho más sensible, y Google bloquea agresivamente logins
automatizados) — la usuaria decidió priorizar no tocar su cuenta de
Google.

- **`usuarios.computrabajo_email`/`computrabajo_password_enc`** (migración
  en `db.js`): para cuentas de portal con contraseña propia (no el caso de
  Ana, pero se deja construido para cuando se generalice a otros
  usuarios/portales). `PUT /auth/computrabajo` / `DELETE /auth/computrabajo`.
- **`backend/encriptado.js`** (nuevo): AES-256-GCM nativo de Node (sin
  dependencia nueva) para poder desencriptar la contraseña de verdad
  cuando el scraper la necesite — a diferencia de bcrypt (contraseñas de
  esta app, unidireccional). Clave en `.env`
  (`CREDENCIALES_ENCRYPTION_KEY`, 32 bytes en hex).
- **`usuarios.computrabajo_cookies_enc`** + **`PUT
  /auth/computrabajo-cookies`**: el mecanismo real que sí aplica a Ana —
  en vez de automatizar el login federado, la usuaria exporta las cookies
  de una sesión ya logueada en **su propio navegador** (extensión
  Cookie-Editor) y las pega en Configuración → Computrabajo. El sistema
  nunca ve ni pide la contraseña de Google.
- **`backend/computrabajoScraper.js`** (nuevo, Puppeteer): `verificarSesion(usuarioId)`
  carga esas cookies en una página headless y confirma si la sesión sigue
  viva navegando al panel del candidato (`aCookiePuppeteer()` traduce el
  formato de export de Cookie-Editor -- `expirationDate`, `sameSite` en
  minúscula -- al formato que espera `page.setCookie()`).
- **Intento de ventana visible para un login asistido, descartado**: la
  idea original era abrir una ventana real de Chromium para que la usuaria
  hiciera el login de Google ahí mismo (sin que el sistema viera la
  contraseña). No funcionó en este entorno: WSL no logra proyectar
  ventanas gráficas al escritorio de Windows pese a que Chromium arranca
  sin error puertas adentro (WSLg presente pero sin mostrar la ventana) —
  se abandonó esa vía en vez de invertir tiempo en un problema de
  infraestructura ajeno a la funcionalidad, y se pasó directo a la
  exportación manual de cookies de arriba.
- **Puppeteer instalado con fricción en este entorno**: la descarga de
  Chromium requirió `npx puppeteer browsers install chrome` a mano (el
  `npm install` no lo bajó solo) y una dependencia opcional (`yauzl`)
  porque el sistema no tiene `unzip` instalado.
- **Verificado en vivo**: `verificarSesion()` confirmó dos veces que la
  sesión exportada autentica de verdad (no redirige a
  `secure.computrabajo.com/Account`).
- **Mapeo de "mis postulaciones" (2026-09-02)**: la usuaria pegó el HTML
  real de esa página (copiado desde su propio navegador ya logueado, cero
  requests nuevos a Computrabajo para mapearla). Cada tarjeta trae el link
  real al aviso en el atributo `data-shortcut-see-offer` -- el dato que
  faltaba. Selector: `div.box[data-match]`, con `h1` (puesto), `p.fs16.fc_base.mt5`
  (empresa -- vacío cuando Computrabajo la oculta, "empleador
  confidencial") y `[data-shortcut-see-offer]` (link). Paginación via
  `nav.pag_numeric .b_next[data-path]`.
- **`backend/jobPageScraper.js`**: nuevo scraper para el portal
  `Computrabajo` (aviso público en `cl.computrabajo.com/ofertas-de-trabajo/...`,
  sin sesión -- distinto del panel privado de arriba). Selector
  `div[div-link="oferta"]`, uniendo `p.mbB` (descripción + palabras clave),
  el título "Requerimientos" y los `li` de `ul.disc.mbB`, con los `<br>`
  reemplazados por espacio antes de leer el texto (si no, el texto sale
  pegado tipo "tecnología.Nos encontramos"). Probado contra un aviso real
  ya guardado en la base -- el texto reconstruido coincide con la
  descripción que ya estaba pegada a mano para esa postulación.
- **`backend/computrabajoScraper.js` → `obtenerPostulaciones(usuarioId)`**:
  trae el listado completo paginando de a una página por vez, con
  `PAUSA_ENTRE_PAGINAS_MS` (2.5s) entre cada una en vez de pedirlas todas
  juntas. Si la primera página devuelve 0 tarjetas (sospechoso -- debería
  haber postulaciones), no lo trata como "no hay nada": guarda el HTML
  crudo en `backend/.computrabajo-debug/` (gitignored) y tira error, para
  poder diagnosticar un bloqueo sin gastar otro request en vivo
  averiguando qué pasó.
- **`backend/computrabajoSync.js`** (nuevo) → `sincronizar(usuarioId)`:
  cruza ese listado contra las postulaciones de Computrabajo ya cargadas
  por mail que todavía no tienen `link` (matching por `puesto` normalizado
  -- sin tildes, minúsculas, espacios colapsados; la empresa solo desempata
  cuando Computrabajo la muestra). Para cada match, trae la descripción
  real y recalcula compatibilidad, y deja una entrada en el feed de
  actividad (`actividad_postulaciones`, tipo `computrabajo`). Ruta `POST
  /postulaciones/sincronizar-computrabajo` (manual, botón "Traer links de
  Computrabajo" en Postulaciones -- web y Android nativa -- no cron: cada
  corrida son varios requests reales a Computrabajo).
- **Verificado en frío, sin red**: el parser de "mis postulaciones" y el
  matching se probaron contra el HTML pegado por la usuaria (10 tarjetas,
  6 matchearon bien contra postulaciones pendientes reales de la base) sin
  generarle ningún request nuevo a Computrabajo -- recién se hizo un
  request en vivo al final, para la prueba end-to-end.
- **Prueba en vivo (2026-09-02): bloqueada por Computrabajo otra vez**. El
  primer request del día -- un solo `page.goto()`, no una sesión de
  pruebas repetidas -- devolvió `403 Forbidden` (página genérica de
  bloqueo de servidor/WAF, no un challenge de Computrabajo). Que haya
  vuelto a pasar en el *primer* pedido de un día distinto, sin repetición
  de por medio, sugiere que el bloqueo de la sesión del 01-09 nunca se
  levantó del todo, o que el fingerprint de Puppeteer headless (no el
  ritmo de pedidos) es lo que está gatillando el bloqueo -- espaciar más
  los pedidos podría no alcanzar.
- **Prueba en vivo (2026-09-03): tercer 403 seguido**, otra vez en el
  primer pedido del día, dos días después del anterior. Con el patrón
  01-09 → 02-09 → 03-09 (siempre bloqueado, incluso espaciado por días) se
  descarta que sea un bloqueo temporal por ritmo de pedidos -- el
  fingerprint de Puppeteer headless es la explicación más probable.
  **Pausado**: seguir reintentando tal cual no va a cambiar el resultado.
- **`puppeteer-extra` + `puppeteer-extra-plugin-stealth`** (2026-09-03):
  agregado en `computrabajoScraper.js` (reemplaza el `require('puppeteer')`
  plano) para disimular las señales típicas de Chromium headless
  (`navigator.webdriver`, etc). No se probó todavía en vivo a propósito --
  reintentar de nuevo hoy mismo no sirve para diferenciar si el stealth
  ayudó o si el bloqueo simplemente seguía activo. Probarlo recién dentro
  de unos días, y si vuelve a dar 403 con esto puesto, ahí sí abandonar el
  fetch automático y volver a pegar la descripción a mano para
  Computrabajo.

### LinkedIn: descripción automática del aviso (2026-09-02)

A diferencia de Computrabajo, acá no hizo falta nada de sesión/cookies ni
riesgo para la cuenta -- **el mail de confirmación de LinkedIn ya trae el
link real al aviso** (`jobPageScraper.js` lo documentaba desde antes), y
el aviso público (`linkedin.com/jobs/view/{id}/`) **no exige login**:
LinkedIn lo sirve así a propósito para que Google lo indexe. Se había
asumido lo contrario ("LinkedIn exige login para ver el aviso completo")
y no era cierto -- probado con 4+ avisos reales de la cuenta.

- **El link que trae el mail no es el que hay que pedir directo**: viene
  con parámetros de tracking y un token de login de un solo uso
  (`otpToken`) que, pedido sin la sesión del navegador de la usuaria,
  redirige a una pantalla de login en vez de mostrar el aviso. La URL
  pública real es más simple: `https://www.linkedin.com/jobs/view/{id}/`,
  sin ninguno de esos parámetros -- confirmado que **sí** funciona sin
  sesión, extrayendo el ID del link del mail.
- **`backend/jobPageScraper.js`**: nueva entrada para `linkedin.com` en
  `SCRAPERS`, con un `urlParaFetch(url)` (nuevo, opcional por scraper)
  que reconstruye esa URL pública antes de pedirla -- `obtenerDescripcion()`
  ahora usa esa función si el scraper la define, en vez de pedir siempre
  la URL tal cual llegó. Selector: `.show-more-less-html__markup`, uniendo
  el texto de cada `p`/`li` (mismo motivo que Computrabajo: sin esto el
  texto sale pegado, ej. "Copec!Tu misión").
- **`POST /postulaciones/recalcular-compatibilidad`** (mismo botón que ya
  existía) y su equivalente por consola `recalcularCompatibilidad.js`
  ahora, antes de recalcular, intentan traerle la descripción a cualquier
  postulación con `link` pero sin `descripcion` todavía -- no es algo
  exclusivo de LinkedIn, sirve para cualquier portal con scraper en
  `jobPageScraper.js` que haya quedado sin descripción (ej. si falló el
  intento automático al llegar el mail). Se corrió una vez sobre datos
  reales: completó las 5 postulaciones de LinkedIn que estaban pendientes
  sin tocar nada de la cuenta de LinkedIn de la usuaria.
- **No hace falta un botón nuevo ni conectar cuenta**: como el link ya
  viene del mail y el aviso es público, esto queda automático para
  siempre desde `emailSync.js` (que ya llama `obtenerDescripcion()` al
  detectar una postulación nueva) -- el backfill de arriba es solo para
  las postulaciones viejas que quedaron sin descripción antes de este
  cambio.

### Agenda

Pantalla de calendario (`frontend/src/app/pages/agenda/`) con dos vistas,
mes y semana (toggle arriba a la derecha), que combinan dos fuentes:

- **Entrevistas**: las postulaciones con `fecha_entrevista` cargada (ver
  sección de Postulaciones arriba). Vienen automáticamente, no se cargan
  desde acá.
- **Eventos**: cualquier recordatorio/evento personal suelto (no solo de
  trabajo — cita médica, personal, lo que sea), cargado directo desde esta
  pantalla con el botón "Agregar evento" — `titulo` y `fecha` obligatorios,
  `hora` opcional (si no tiene hora se muestra como "todo el día"), `notas`
  opcional y `tipo` (`personal` default, `medica`, `profesional` o
  `social` — `TIPOS_EVENTO` en `frontend/src/app/core/eventos.service.ts`).
  Cada tipo tiene su color (reusa los mismos hex ya validados para los
  estados de Postulaciones en vez de una paleta nueva — `COLOR_TIPO_EVENTO`
  en `agenda.ts`), visible en el punto del día en la vista mes, el borde
  izquierdo de los chips en la vista semana, y el punto de cada fila en
  "Eventos de este día". Backend en `backend/routes/eventos.js`
  (`GET/POST/PUT/DELETE /eventos`), tabla `eventos` en `backend/db.js`.
  Siguen sin recurrencia — si hace falta más adelante, agregarla ahí en
  vez de complicar esto de entrada.

**Recordatorio de eventos (Telegram):** `backend/recordatoriosEventos.js`
(cron cada minuto) avisa por Telegram los eventos **con hora** que caen
dentro de los próximos `RECORDATORIO_MINUTOS_ANTES` minutos (mismo env var
que usan las citas), igual que ya se hace con las entrevistas y las
postulaciones. Los eventos "todo el día" (sin hora) no tienen un momento
puntual para avisar antes, así que no generan recordatorio. `fecha`/`hora`
se guardan tal cual las carga la usuaria (hora local, sin conversión a
UTC) — se asume que el server corre en la misma zona horaria que la
usuaria, mismo supuesto que ya usa el resto de la app (`systemPrompt()` en
`annie.js`). Si se edita la fecha/hora de un evento ya avisado, el
recordatorio se re-arma solo.

**Recordatorio por voz de Annie (extra, solo si la app está abierta):**
Telegram (eventos) y push (entrevistas) son el canal principal porque no
dependen de tener la pestaña abierta. Además de eso, `GET
/recordatorios-voz/pendientes` (`backend/routes/recordatoriosVoz.js`,
mismo criterio de ventana que los crons de arriba) es un endpoint que el
frontend consulta con el mismo polling de 60s que ya usaba para novedades
de postulaciones (`revisarRecordatoriosVoz()` en `shell.ts`) — si la app
está abierta justo cuando cae un recordatorio, Annie además lo dice en voz
alta (`anunciar()`, mismo mecanismo que usa para avisar cambios de estado).
Usa columnas propias (`recordatorio_voz_enviado` en `eventos`,
`recordatorio_voz_entrevista_enviado` en `postulaciones`), separadas de las
de Telegram/push — un canal no reemplaza al otro, los dos se disparan
igual.

En el encabezado de Agenda también hay un chip de **"Próximo evento"**
(`proximoEventoChip` en `agenda.ts`), al lado del de "Próxima entrevista",
con el mismo criterio: el evento más cercano que todavía no pasó.

**Layout tipo planner físico (`.planner-grid` en `agenda.css`):** rediseño
pedido explícitamente por la usuaria a partir de una foto de referencia
(un planner rosa de papel, `imagenes/Diseño I.png`) — una grilla de 2
columnas con 5 cuadros, todos **del mismo tamaño** (`.planner-box`,
`min-height: 24rem` compartido, contenido interno con `flex: 1` para
llenar parejo aunque tengan cantidades de contenido distintas) y en este
orden (pedido explícito, "notas de últimas"): **Calendario, Eventos del
mes, Objetivos del mes, Una afirmación, Notas**. Con 5 cuadros en una
grilla de 2 columnas el último (Notas) queda solo en su fila, del mismo
tamaño que el resto, sin ocupar las dos columnas.

1. **Calendario** (mes/semana, se mantiene el toggle): el mismo
   componente de siempre, pero **"mapa de colores"** — ya no muestra texto
   (título/hora) encima de cada día, solo puntos de color (vista mes,
   `.day-dot`, un color por tipo de evento presente + dorado si hay
   entrevista) o barras de color sin texto (vista semana, `.semana-barra`).
   El detalle textual se sacó de acá y ahora vive en el cuadro de al lado.
   Redimensionado bastante más chico que antes (`day-cell` de 3.7rem a
   2.5rem) para entrar en media columna.
2. **Eventos del mes**: reemplaza a las viejas tarjetas "Eventos de este
   día" y "Entrevistas de este día" (ya no existen) — una sola lista
   cronológica (`itemsDelMes` en `agenda.ts`) con TODO lo que tiene color
   en el calendario de **todo el mes visible** (no solo el día
   seleccionado), entrevistas y eventos mezclados, con el mismo color de
   borde que su punto/barra en el calendario. El botón "Agregar evento" y
   su formulario se movieron acá adentro.
3. **Objetivos del mes**: lista nueva de `CANTIDAD_OBJETIVOS` (5) líneas de
   texto libre, en `localStorage` con clave por mes (`agenda-objetivos-` +
   `YYYY-MM` de `mesVisible()`), mismo patrón que la nota — no hay backend
   para esto, es deliberadamente tan simple como la nota de texto.
4. **Una afirmación**: dos partes — un sticker de lettering al azar
   (`elegirSticker()` en `frontend/src/app/core/stickers.ts`) **y** un
   textarea editable donde la usuaria escribe su propia afirmación (pedido
   explícito: "que la persona pueda escribirla"), guardado en
   `localStorage` con la misma clave por mes que Objetivos
   (`agenda-afirmacion-YYYY-MM`).
5. **Notas** (última): sin cambios de fondo — sigue siendo una nota de
   texto libre **por día** (no por mes, se probó la otra opción y la
   usuaria prefirió mantener el comportamiento existente) en
   `localStorage`.

**"Recorte de stickers" en cada cuadro (pedido explícito):** los 5 cuadros
tienen un borde punteado tipo hoja de stickers (`outline` en vez de
`border`, para no pisar el borde propio de `.card` — dibuja la línea de
corte un poco por fuera), dos stickers de flores/concha sobresaliendo de
las esquinas opuestas como pegados encima (`.box-sticker.tl`/`.br`,
rotados, con `drop-shadow`) y un brillo dorado (`.box-sparkle`, mismo
ícono de estrella que tenía el calendario viejo, ahora en los 5 cuadros).
Los stickers de esquina rotan entre los 4 diseños de flores/concha
(`stickerFlor(indice)`) para que cada cuadro use una combinación distinta
y se vean varios a la vez, no siempre el mismo — pedido explícito ("usa
las flores también", "pon más flores").

**Efecto "sticker" en Notas y en la lista de eventos:** a diferencia del
patrón de fondo tenue (`patron-flores.png`, opacidad muy baja, ver más
arriba), acá los stickers de flores/concha
(`frontend/public/img/stickers/`: `margarita`, `hibisco_morado`,
`hibisco_rosa`, `shell2`) se muestran a **opacidad completa** — pedido
explícito de la usuaria, que dibujó los diseños pensando en que se usaran
así, no solo como textura difusa. En la lista de eventos, cada evento
(no las entrevistas) tiene un sticker como botón de "check": clickearlo
tacha el evento (efecto visual de planner, "marcar como hecho") — es
**solo visual, no se persiste** (se resetea al recargar la página); si
más adelante se pide que el estado "hecho" se guarde de verdad, hace
falta una columna nueva en `eventos`.

**Nota sobre el bug de fondo en los stickers "quitar fondo":** las 4
imágenes de flores/concha se habían procesado en la sesión anterior con
un algoritmo que dejaba un velo translúcido parejo en vez de transparencia
real (mismo bug que se encontró y corrigió en el lettering, ver
"Diseño: stickers hechos a mano por Ana" abajo) — invisible sobre fondo
blanco pero muy visible mostradas a opacidad completa sobre las tarjetas
de color de la app. Se reprocesaron con el algoritmo corregido antes de
usarlas acá (el canal RGB no se había tocado, así que no hizo falta volver
a las capturas originales).

**Notas/Objetivos/Afirmación namespaced por cuenta (2026-09-01):** estas
tres cosas viven solo en `localStorage` del navegador, nunca tocan el
backend (claves `agenda-nota-<fecha>`, `agenda-objetivos-<mes>`,
`agenda-afirmacion-<mes>`) -- pensando en publicar la app públicamente
(ver "Publicación en Google Play" más abajo), si dos cuentas distintas
comparten el mismo navegador/perfil, esas claves genéricas se pisarían
entre cuentas. Se evaluaron dos opciones: migrar esto a un endpoint de
backend por usuario (fix permanente, pero el backend sigue en la PC de
Ana por ahora -- ver esa misma sección -- así que hasta que haya hosting
real dejaría esta función inutilizable para cualquier cuenta pública fuera
de su wifi), o namespacear las claves de `localStorage` por id de cuenta
(arreglo inmediato, sigue andando para todo el mundo hoy mismo). Se eligió
la segunda, revisitando la migración a backend cuando exista el hosting.

- `agenda.ts`: nuevo `claveUsuario()` (id numérico del JWT vía
  `AuthService.usuario()`, no el email, para que no cambie si se edita el
  email después) sumado a las 3 claves.
- Migración de una sola vez (`migrarClaveVieja()`): si la clave nueva
  (con cuenta) todavía no existe pero hay algo guardado en la vieja (sin
  cuenta), se copia el valor y se borra la vieja -- así las notas/
  objetivos/afirmación reales de Ana no "desaparecen" el día que esto se
  despliegue.
- De paso, los signals compartidos (`PostulacionesService`,
  `EventosService`, `PerfilService`, `MailsRevisionService`, todos
  `providedIn: 'root'`) ahora se resetean en `Shell.salir()` -- antes,
  si dos cuentas se logueaban seguido en la misma pestaña sin recargar la
  página, la segunda podía ver por un instante (o, si el siguiente refresh
  fallaba en silencio, indefinidamente) los datos cacheados de la cuenta
  anterior.

### Recordatorios de seguimiento (Telegram)

Un cron (corre cada hora, `backend/recordatoriosPostulaciones.js`) busca
postulaciones en estado `enviada` cuya `fecha_postulacion` tenga 2 días o
más (configurable con `SEGUIMIENTO_POSTULACIONES_DIAS`) y manda un mensaje
de Telegram recordando hacer seguimiento. Cada postulación se recuerda una
sola vez (columna `recordatorio_seguimiento_enviado`) — si después le
llega un cambio de estado por email, no hace falta seguimiento y no se
manda nada más.

Usa la API oficial de bots de Telegram (HTTP simple, sin librerías ni
sesión que mantener — a diferencia de WhatsApp, que no tiene API oficial
gratuita y requeriría automatizar la cuenta personal vía WhatsApp Web, algo
que puede terminar en un baneo de la cuenta).

**Configurar el bot:**

1. En Telegram, hablar con **@BotFather** → `/newbot` → elegir nombre y
   username (tiene que terminar en "bot").
2. BotFather devuelve un token (`123456789:ABC...`) → guardarlo en
   `backend/.env` como `TELEGRAM_BOT_TOKEN`.
3. Mandarle un mensaje al bot (o agregarlo a un canal/grupo y postear ahí)
   para poder identificar el chat.
4. Conseguir el `chat_id`: `GET
   https://api.telegram.org/bot<TOKEN>/getUpdates` — devuelve el mensaje
   recién mandado con el `chat.id` adentro (para canales es un número
   negativo largo). Guardarlo en `backend/.env` como `TELEGRAM_CHAT_ID`.
5. Reiniciar el backend.

Si `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID` están vacíos, los recordatorios
quedan en modo simulado (se loguean en consola, no se mandan).

**Nota sobre IPv6 en WSL:** en este entorno las conexiones salientes
intentan IPv6 primero y no tienen ruta, así que `fetch()`/`https` hacia
hosts con soporte IPv6 (como la API de Telegram) fallaban con timeout. Se
soluciona con `net.setDefaultAutoSelectFamily(false)` al inicio de
`backend/index.js`, que fuerza IPv4 en todo el proceso. Si algún `fetch()`
nuevo empieza a fallar con `ETIMEDOUT`/`ENETUNREACH`, es probablemente lo
mismo.

### Resumen semanal (Telegram)

`backend/resumenSemanal.js` manda un mensaje de Telegram los **domingos a
las 9:00** (hora del server) con un vistazo general en vez de solo los
avisos sueltos de siempre: cuántas postulaciones nuevas hubo en los
últimos 7 días (con el detalle de cada una), el total acumulado por
estado, y qué entrevistas/eventos hay agendados para los próximos 7 días.
No depende de ninguna tabla de historial nueva — usa `creado_en` de
`postulaciones` para "nuevas esta semana" y el estado/fecha actuales para
el resto, así que no muestra, por ejemplo, cuántas *cambiaron* de estado
en la semana (eso requeriría loguear el historial de estados, que hoy no
existe). Se puede probar manualmente sin esperar al domingo:

```
node -e "require('dotenv').config(); require('net').setDefaultAutoSelectFamily(false); require('./resumenSemanal').enviarResumenSemanal()"
```

### Annie (asistente conversacional)

`backend/routes/annie.js` conecta con la API de Claude (`@anthropic-ai/sdk`,
modelo `claude-haiku-4-5` — ver `MODELO` en ese archivo) para que Annie
entienda pedidos en lenguaje natural del tipo "agendame una entrevista con
Google el jueves a las 10". Se probó primero con `claude-sonnet-5` pero se
cambió a Haiku por velocidad: medido en real, Sonnet tardaba 3.3-6.2s por
respuesta y Haiku 0.9-2.8s (~2-2.4x más rápido) para el mismo chat corto +
una sola herramienta — no hace falta el modelo más grande para esta tarea,
y se probó que Haiku sigue extrayendo bien fechas relativas ("el jueves
que viene") para `agendar_entrevista`. El backend
le pasa a Claude, como contexto del sistema, la lista de postulaciones
actuales (hasta 30, para que pueda reconocer empresas ya cargadas) — con
`estado`, `fecha_entrevista` y, cuando existen, `probabilidad_llamada` y
`compatibilidad_oferta` (ver secciones propias más arriba). El prompt le
aclara que son estimaciones, no certezas, para que si la usuaria pregunta
"¿cuáles son mis postulaciones más prometedoras?" Annie responda con esos
datos pero sin presentarlos como una garantía. Además tiene dos
herramientas:

- **`agendar_entrevista`** (`empresa`, `puesto` opcional, `fecha_entrevista`
  ISO 8601): si ya existe una postulación con esa empresa, le actualiza
  `fecha_entrevista` y pone `estado: 'entrevista'`; si no existe, crea una
  postulación nueva con esos datos. Solo para entrevistas de TRABAJO (con
  una empresa).
- **`crear_evento`** (`titulo`, `fecha` obligatorios; `hora`, `notas`,
  `tipo` opcionales): para cualquier cosa personal que no sea una
  entrevista — "agendame una cita con mi esposo", un control médico, un
  cumpleaños, un recordatorio suelto. Crea una fila en `eventos` (misma
  tabla que usa la pantalla de Agenda). El system prompt le aclara la
  diferencia explícitamente porque, con una sola herramienta, Annie
  interpretaba cualquier pedido de agenda como si fuera una entrevista de
  trabajo (llegaba a preguntar "¿cuál es la empresa?" para una cita
  personal) — el fix fue sumar la segunda herramienta y decirle cuándo usar
  cada una, no forzar la primera a cubrir los dos casos.

**Le pregunta el nombre a la usuaria (una sola vez):** en `Shell`
(`frontend/src/app/shell/shell.ts`), al arrancar la app Annie carga el
perfil (`PerfilService`, ver Configuración) y saluda distinto según si ya
hay un `nombre` guardado o no — pedido explícito de la usuaria. Sin
nombre, después de "¡Bienvenida a tu Agenda Inteligente!" agrega "¿Cómo
te gusta que te llame?" y pone `esperandoNombre` en `true`; el próximo
mensaje que la usuaria mande por el chat (`enviarAnnie()`) se intercepta
ahí mismo — no se manda al backend de Annie como una consulta normal,
sino que se guarda directo como nombre (`PUT /auth/perfil`) y Annie
confirma. Con nombre ya guardado, en cambio, saluda con "¿En qué puedo
ayudarte hoy, {nombre}?" de una. Este flujo conversacional es aparte del
campo "Nombre" que ya existe en Configuración (`perfil.service.ts`) — son
dos caminos al mismo dato (`usuarios.nombre`), no hace falta usar el chat
si ya se cargó a mano desde ahí.

**Día de la semana calculado, no inferido por el modelo:** al probar
`agendar_entrevista`/`crear_evento` con fechas relativas ("el lunes", "el
jueves que viene"), se detectó que Haiku a veces se equivoca calculando
qué día de la semana es una fecha dada (dijo "hoy es martes" siendo
miércoles) — un punto ciego típico de los LLM con aritmética de
calendario. El system prompt ahora le pasa el día de la semana ya
calculado (`diaSemanaLocal()` en `annie.js`, vía
`Date.toLocaleDateString('es-419', { weekday: 'long' })`) en vez de
dejar que lo infiera, para que no arrastre ese error a los cálculos de
fechas relativas.

**Español neutro, sin voseo:** el system prompt le pide explícitamente a
Annie que hable en español neutro, sin "vos" ni modismos de ningún país en
particular (`systemPrompt()` en `annie.js`). Todo el resto de la app sigue
el mismo criterio — textos de la UI sin voseo (ej. "Crea tu cuenta" en vez
de "Creá tu cuenta") y los locales de fecha/hora e idioma de voz en
`es-419` (el código estándar para "español latinoamericano neutro") en vez
de `es-CL`/`es-AR`.

El endpoint corre un loop manual (`while stop_reason === 'tool_use'`, sin el
tool runner beta del SDK) porque hay una sola herramienta y así se evita esa
dependencia beta. No hay persistencia de la conversación en la base — el
`historial` viaja del frontend al backend en cada request y se guarda en
memoria del componente (`Shell`) mientras dura la sesión del navegador; al
recargar la página se pierde el hilo (las postulaciones creadas/actualizadas,
en cambio, quedan guardadas).

En el frontend, `frontend/src/app/core/annie.service.ts` llama a
`POST /annie/chat`, y `frontend/src/app/shell/shell.ts` +
`shell.html`/`shell.css` arman la tarjeta de Annie en el sidebar: su avatar
(`frontend/public/img/annie.jpg`, la misma imagen del mockup de login), un
feed de actividad (`actividadReciente`, calculado a partir de las
postulaciones cargadas — mapeando `estado` a un texto tipo "Nueva
postulación detectada" / "Entrevista agendada" / "¡Oferta de X!" / etc.) y
el cuadro de chat.

**Estado compartido entre pantallas:** `PostulacionesService.postulaciones`
es un signal a nivel servicio (no uno por componente) — `listar()` lo
actualiza, y Shell, Agenda y Postulaciones leen todos de ahí. Así, cuando
Annie agenda algo desde el chat del sidebar mientras estás parada en
Agenda, el calendario se actualiza solo, sin recargar la página (antes cada
pantalla tenía su propia copia local y no se enteraban entre sí).

**Polling cada 60s (`Shell.ngOnInit`, `INTERVALO_ACTUALIZACION_MS` en
`shell.ts`):** el estado compartido de arriba resuelve que las pantallas se
enteren entre sí de cambios que pasan *en el navegador* (ej. Annie), pero
no de cambios que pasan del lado del servidor sin que la usuaria haga nada
— el cron de `emailSync.js` detecta postulaciones nuevas cada 10 minutos,
en segundo plano, sin avisarle al frontend. Sin este polling, una
postulación detectada por mail no aparecía hasta navegar a otra pantalla y
volver, o refrescar la página a mano. El `Shell` (que vive toda la sesión,
envolviendo el resto de la app) llama a `postulacionesService.listar()`
cada 60 segundos además de al cargar, así que cualquier pantalla que esté
mirando la usuaria en ese momento se actualiza sola.

**Annie anuncia lo nuevo (`detectarNovedades` en `shell.ts`):** cada vez
que el polling de arriba trae una lista nueva, se compara contra la
anterior (guardada en `ultimaListaConocida`) para detectar postulaciones
que no estaban antes o que cambiaron de `estado`. Por cada novedad, Annie
la dice en voz alta y, si el navegador ya tiene permiso de notificaciones
concedido (por el botón "Activar recordatorios"), también dispara una
notificación nativa del sistema — así se entera aunque no esté mirando la
pestaña. **No se agrega al chat**: el chat queda reservado para la
conversación directa con Annie (pedirle que agende algo, su respuesta) —
mezclar ahí los avisos automáticos de novedades lo hacía confuso. El
registro visual de las novedades sigue siendo la tarjeta de actividad
(`actividadReciente`), que ya se actualiza sola con el mismo polling. No
se compara contra todo el historial cada vez, solo se anuncia lo que
cambió desde el último chequeo. Cuando la novedad la genera la propia
Annie (le pediste agendar algo por el chat), no se vuelve a anunciar por
esta vía — ya te lo dijo en su respuesta directa, así que ese refresh
actualiza `ultimaListaConocida` sin pasar por `detectarNovedades`, para no
duplicar el aviso.

**Zona horaria:** el resto de la app guarda `fecha_entrevista` como hora
local "naive" (sin offset) — el formulario de Postulaciones hace
`new Date(local).toISOString()` en el navegador, que interpreta el string
como hora local del navegador. Annie sigue la misma convención: el prompt
le pasa la hora actual también en formato local (no UTC), le pide la fecha
de la entrevista tal cual la dice la usuaria (sin que ella haga conversión
de zona horaria) y el backend la convierte con el mismo mecanismo pero en
el reloj del server (`aFechaAlmacenable` en `annie.js`). Asume que el
server corre en la misma zona horaria que la usuaria (uso local, no un
deploy multi-región).

**Voz de Annie — ElevenLabs primero, navegador como fallback:**
`POST /annie/tts` (`backend/routes/annie.js`) manda el texto a la API de
ElevenLabs (`eleven_multilingual_v2`, que cubre español) con la voz de
`ELEVENLABS_VOICE_ID` y devuelve el audio (mp3) tal cual. El frontend
(`AnnieService.hablar()` + `Shell.reproducirAudio()`) lo reproduce con un
`<audio>`. Si `ELEVENLABS_API_KEY`/`ELEVENLABS_VOICE_ID` no están
configuradas, o la request falla por lo que sea, cae automáticamente a la
voz del navegador (`Shell.hablarConVozDelNavegador()`, Web Speech API,
`speechSynthesis`) — Annie nunca se queda muda, solo cambia la calidad de
la voz. Se puede silenciar con el botón de parlante en su tarjeta (para
las dos, corta tanto el audio de ElevenLabs como `speechSynthesis`), se
recuerda la preferencia en `localStorage`.

**Sobre elegir la voz en ElevenLabs — ojo con esto:** las voces del
**Voice Library** (las que se buscan/prueban en
elevenlabs.io/app/voice-library y se agregan a "My Voices") **no se
pueden usar por API en el plan gratis** — tira 402 `payment_required`
("Free users cannot use library voices via the API"), aunque en la web sí
suenen. Solo funcionan por API, gratis, las voces categoría **`premade`**
que ya vienen con la cuenta sin agregar nada (`GET /v1/voices` — Rachel,
Adam, Bella, etc.). Terminamos usando **"Jessica" (`cgSgspJ2msm6clMCkdW9`,
Playful/Bright/Warm)**, la premade más cercana a un tono "cool"/animado —
si en algún momento se quiere una voz específica del Voice Library, hay
que pasar al plan Starter de ElevenLabs (u otro pago) para desbloquear el
acceso por API.

**La voz sonaba como si se "comiera" el principio de la frase:** el
síntoma reportado era que solo se entendía la última palabra (ej.
"Inteligente" en vez de "¡Bienvenida a tu Agenda Inteligente!"), siempre,
en cualquier mensaje. Antes de la causa real se probaron y descartaron
**tres teorías incorrectas**, cada una con evidencia real (queda la posta
acá para no repetir el mismo camino si vuelve a aparecer algo parecido):

- **No era pérdida de datos en el camino:** el byte count de ElevenLabs →
  `/annie/tts` → el cliente coincide exacto en los tres saltos.
- **No era un bug de reproducción del `<audio>`:** se instrumentó
  `reproducirAudio()` con logs de todos los eventos (`loadedmetadata`,
  `timeupdate`, `ended`, etc.) y el audio se reproducía completo y
  correcto, `currentTime` avanzando parejo de 0 hasta el final.
- **No era que ElevenLabs generara el audio muy rápido/con silencios de
  origen:** se capturó el archivo mp3 exacto que le llegó al navegador
  (no una regeneración) y se decodificó a PCM (`mpg123-decoder`) para
  medir energía (RMS) por ventanas de 100ms — energía de voz continua
  desde el segundo 0 hasta el final, sin ningún hueco. El archivo en sí
  siempre estuvo completo y bien formado.

**Causa real: audífonos/parlante Bluetooth.** Un dispositivo Bluetooth
entra en bajo consumo cuando no hay audio sonando, y al arrancar un sonido
nuevo tarda 1-2 segundos en "despertar" del todo — eso se come el
principio de cualquier clip que empiece después de un silencio,
sin importar que el archivo esté perfecto (que es justo lo que se
confirmó en los tres puntos de arriba). No es algo que la app pueda
arreglar del todo porque pasa a nivel del enlace Bluetooth, pero hay un
mitigante conocido: `Shell.despertarSalidaDeAudio()` (`shell.ts`) dispara
un tono a 20Hz casi imperceptible por Web Audio API apenas se decide
hablar, y lo mantiene sonando (sin tiempo fijo) hasta que el audio real ya
arrancó de verdad (`reproducirAudio()`, con un margen chico de
superposición) — así nunca queda un hueco de silencio real en el medio que
deje al dispositivo volver a dormirse antes de que llegue la voz. La
primera versión paraba el tono a los 1.2s fijos, que no alcanzaba si
ElevenLabs tardaba más en generar el audio; la versión sin tiempo fijo fue
la que terminó de resolverlo.

De paso se subió `stability: 0.4 → 0.65` y se bajó `style: 0.6 → 0.35` en
`voice_settings` (`backend/routes/annie.js`) — esa combinación es la que
ElevenLabs marca como propensa a artefactos en textos cortos. No era la
causa de este bug puntual, pero de todas formas hace el audio más
consistente. También se dejó `speed: 0.9` (levemente más lento que el 1.0
normal): una vez resuelto lo del Bluetooth, quedó un detalle menor de que
la primera palabra de una frase sonaba "atropellada" (arranca más rápido
de lo que asienta después, algo común en TTS) — bajar un poco el ritmo
general lo suaviza.

Hay también un botón de micrófono junto al input del chat
(`SpeechRecognition`/`webkitSpeechRecognition`, nativo del navegador —
esto sí gratis siempre) para dictarle el mensaje a Annie en vez de
escribirlo; solo aparece si el navegador lo soporta (Chrome/Edge sí,
Firefox no).

Al abrir la app (`Shell.ngOnInit`), Annie saluda con "¡Bienvenida a tu
Agenda Inteligente!" (se lee en voz alta y queda como primer mensaje del
chat).

**Recordatorio de entrevistas (`backend/recordatoriosEntrevistas.js`):**
mismo mecanismo que los recordatorios de citas (cron cada minuto, mismo
`RECORDATORIO_MINUTOS_ANTES`, push por Firebase Cloud Messaging), pero
mirando `postulaciones.fecha_entrevista` en vez de `citas.inicio` -- y, a
diferencia de los demás cron de recordatorios (ver "Multi-tenancy" más
arriba), a cada postulación se le avisa solo al `fcm_token` de quien es
dueña de esa postulación puntual, no a todos los `fcm_token` guardados.
Usa la columna `recordatorio_entrevista_enviado` (se
resetea a `0` si se reprograma la entrevista, para que avise de nuevo). La
inicialización de Firebase se compartió a `backend/firebaseApp.js` (antes
vivía duplicada en `recordatorios.js`) porque el SDK de Firebase Admin
tira error si se llama `initializeApp()` más de una vez.

**Push para "nueva postulación"/"cambio de estado" detectados por mail, y
resumen de "mientras no estuviste" en el saludo de Annie (2026-09-01):**
pedido explícito de la usuaria tras notar que una postulación nueva
detectada por `emailSync.js` solo avisaba por Telegram, nunca por push ni
por voz.

- `emailSync.js` ahora también manda push (mismo mecanismo que
  `recordatoriosEntrevistas.js`: `getMessaging(app).send(...)`, solo al
  `fcm_token` de la cuenta dueña del mailbox -- ver "Multi-tenancy" más
  arriba) desde `procesarNuevaPostulacion` y `procesarCambioEstado`,
  además del Telegram que ya mandaba.
- Nueva tabla `actividad_postulaciones` (`postulacion_id`, `tipo`,
  `mensaje`, `creado_en`) donde esas mismas dos funciones dejan registro de
  lo que pasó. No se conectó al recordatorio por voz mientras la app está
  abierta (`routes/recordatoriosVoz.js`) porque ese caso ya lo cubre
  `detectarNovedades()` en `shell.ts` (compara la lista de postulaciones en
  cada sondeo) — conectar los dos hubiera duplicado el aviso. Esta tabla es
  solo para lo que pasó con la app **cerrada**, que `detectarNovedades()` no
  puede ver (arranca sin lista previa contra la cual comparar en cada sesión
  nueva).
- Nuevo endpoint `GET /annie/actividad-pendiente`: devuelve los mensajes de
  `actividad_postulaciones` posteriores a `usuarios.ultima_bienvenida`, y
  de paso actualiza esa marca a `datetime('now')` -- así el próximo saludo
  no repite lo ya contado. Si `ultima_bienvenida` todavía es `null`
  (primera vez que se llama) se trae *todo* el historial en vez de nada;
  un primer intento devolvía vacío en ese caso por error (`desde` quedaba
  `null` y el query ni se ejecutaba), corregido con un valor por defecto
  anterior a cualquier fecha real (`'0000-00-00'`).
- `shell.ts`: `saludar()` pide `annieService.actividadPendiente()` en
  paralelo al perfil y, si hay algo, lo suma al mensaje de bienvenida --
  `"¡Bienvenida a tu Agenda Inteligente! ¿En qué puedo ayudarte hoy,
  {{nombre}}? Mientras no estuviste, pasó esto: {{resumen}}."` (nueva clave
  `shell.annie.mientrasNoEstuviste`, es.json/en.json). Se probó insertando
  una fila de prueba a mano en `actividad_postulaciones` y confirmando que
  el saludo la leyera -- funcionó, la fila de prueba se borró después.
- Pendiente explícito (para más adelante, no parte de esta vuelta): la
  misma conexión a push para Android, que sigue frenada en que la usuaria
  agregue una app Android al proyecto Firebase `turnero-ec3cd` y pase
  `google-services.json` (ver sección "App Android" más abajo). El saludo
  de Annie en Android (`AnnieViewModel.saludar()`) tampoco tiene todavía el
  resumen de "mientras no estuviste" -- ver "Sin migrar todavía" en esa
  misma sección.

**Límite diario de mensajes (2026-09-01):** Annie usa la clave de Anthropic
y de ElevenLabs de la usuaria dueña -- pensando en publicar la app
públicamente (ver "Publicación en Google Play" más abajo), cualquier cuenta
nueva que hablara con Annie sin límite facturaría a su cuenta. Se eligió un
tope diario por cuenta en vez de restringir Annie solo a la cuenta dueña o
dejarla sin límite (las otras dos opciones evaluadas).

- Nueva tabla `annie_uso_diario` (`usuario_id`, `fecha`, `chat_usados`,
  `tts_usados`, clave primaria compuesta) y nuevo helper
  `backend/annieLimite.js` (`puedeChatear`, `puedeHablar`, `registrarChat`,
  `registrarTts`) — la fila del día se crea sola (`INSERT OR IGNORE`) la
  primera vez que se consulta.
- Topes configurables por `ANNIE_LIMITE_CHAT_DIARIO`/
  `ANNIE_LIMITE_TTS_DIARIO` (`.env`), 40/día cada uno si no se configuran.
- `POST /annie/chat` y `POST /annie/tts` chequean el cupo antes de llamar a
  Anthropic/ElevenLabs y devuelven `429` (`{ error, limite_alcanzado: true
  }`) si se agotó. El uso se registra recién después de una respuesta
  **exitosa** -- un 502 de la IA no le gasta cupo a la usuaria por algo que
  no fue su culpa.
- Frontend, a propósito asimétrico: `/annie/tts` no necesitó ningún cambio
  ni en web ni en Android -- ambos ya caían solos a la voz gratuita del
  sistema ante cualquier falla de TTS, así que un 429 ahí ya es invisible.
  `/annie/chat` sí necesitaba distinguir este caso del error genérico
  ("Annie no pudo responder"): nueva clave i18n
  `shell.annie.limiteAlcanzado` (es.json/en.json) usada en `shell.ts`
  cuando `err.status === 429`, y una rama equivalente en
  `AnnieViewModel.kt` (Android) para `HttpException` con código 429.
- Verificado de punta a punta sin gastar mensajes reales de Anthropic: se
  probaron los contadores de `annieLimite.js` directo contra una cuenta de
  prueba (sin pasar por la IA), y una sola vez sí contra el endpoint real
  forzando el cupo de una cuenta de prueba al límite para confirmar el
  `429` real -- cuenta y filas de prueba borradas después.

### Nota sobre hot-reload en WSL

Si el proyecto vive en `/mnt/c/...` (filesystem de Windows montado en WSL),
ni `node --watch` (backend) ni el watcher de `ng serve` (frontend) detectan
siempre los cambios guardados, porque ese mount no dispara los eventos de
inotify de forma confiable — se puede confirmar pidiendole al dev server
el archivo que esta sirviendo (`curl` al chunk servido) y comparando contra
el archivo en disco.

**Frontend, ya solucionado:** `frontend/angular.json` tiene
`"poll": 1000` en las opciones de `serve` — hace que Vite chequee los
archivos activamente cada segundo en vez de depender de los eventos del
sistema operativo. Con esto `ng serve` debería reflejar los cambios solo.

**Backend, todavía manual:** `node --watch` no tiene una opcion de polling
propia (a diferencia de Vite). Si un cambio de backend no se refleja,
cortar el proceso del todo (`Ctrl+C`, no alcanza con `Ctrl+Z` que solo lo
suspende y deja el puerto ocupado) y volver a correr `npm run dev` /
`npm start`. La solución de fondo para los dos casos es mover el proyecto
a un path nativo de Linux (ej. `~/proyectos/...`), donde inotify funciona
sin problemas.

## Frontend (`frontend/`)

Angular standalone (sin server-side rendering). Pantallas: login/registro
del dueño, clientes (alta/edición/borrado), agenda (vista día/semana,
alta/edición/cancelación/borrado de citas), postulaciones (alta/edición/
borrado, filtro por estado y panel con conteos/porcentajes por estado) y
configuración (perfil, notificaciones, idioma, tema — ver sección propia
más abajo).

### Cómo correrlo

```
cd frontend
npm install
npm start        # ng serve, http://localhost:4200
```

Necesita el backend corriendo en paralelo (`http://localhost:4000` por
default). Al primer uso hay que crear el usuario dueño desde la pantalla de
login ("No tengo cuenta todavía").

### Configuración (`frontend/src/environments/environment.ts`)

| Campo | Descripción |
|-------|-------------|
| `apiUrl` | URL del backend. Default `http://localhost:4000`. |
| `firebase` | Config del proyecto Firebase (Configuración del proyecto → General → Tus apps → agregar app Web). Mientras quede vacío, el toggle de notificaciones de la pantalla de Configuración se oculta. |
| `vapidKey` | Clave VAPID del proyecto (Configuración del proyecto → Cloud Messaging → Certificados push web). |

**Importante:** `public/firebase-messaging-sw.js` (el service worker que
recibe las notificaciones en segundo plano) necesita los mismos valores de
`firebase` duplicados a mano ahí adentro — un service worker no puede
importar `environment.ts`. Es el mismo proyecto de Firebase que ya se
configuró para el backend (`FIREBASE_SERVICE_ACCOUNT_PATH`), solo que acá
se usan las credenciales públicas de la app Web en vez de la cuenta de
servicio.

### Pantalla de Configuración (perfil, notificaciones, idioma, tema)

Botón de engranaje en la tarjeta de usuario del sidebar (`shell.html`),
lleva a `/configuracion` (`frontend/src/app/pages/configuracion/`). Junta
cuatro cosas independientes que antes no existían:

- **Perfil:** nombre, foto de perfil (input de archivo, sube a
  `POST /auth/foto-perfil`, se ve en el sidebar y en la propia pantalla) y
  cambio de email (pide la contraseña actual). Cambiar la contraseña vive
  en su propio formulario separado (`PUT /auth/password`).
- **Notificaciones:** un solo toggle on/off, ver detalle en la sección de
  backend ("Perfil y preferencias de usuario" más arriba) — reemplaza al
  botón "Activar recordatorios" que antes vivía suelto en el sidebar.
- **Idioma:** español/inglés, con traducción completa de la interfaz (no
  solo la preferencia guardada) — ver "Traducción (i18n)" más abajo.
- **Tema:** claro/oscuro, aplicado a toda la app — ver "Tema claro/oscuro"
  más abajo.

`frontend/src/app/core/perfil.service.ts` centraliza todo esto: un signal
`perfil` a nivel servicio (mismo patrón que `PostulacionesService`),
cargado con `GET /auth/perfil` al entrar a la app (`Shell.ngOnInit`).
Cuando `perfil.tema`/`perfil.idioma` cambian (al guardar en Configuración,
o al cargar el perfil al iniciar sesión), el servicio aplica el efecto
correspondiente él mismo (atributo `data-theme` en `<html>` / `TranslateService.use()`)
en vez de que cada pantalla tenga que acordarse de hacerlo.

### Traducción (i18n)

Español e inglés, con **traducción completa de la interfaz** (no solo la
fecha/hora) — se evaluó guardar nomás la preferencia sin traducir nada,
pero se optó por la traducción real. Se usa `@ngx-translate/core` +
`@ngx-translate/http-loader` (permite cambiar de idioma en caliente sin
recompilar, a diferencia de `@angular/localize`, que arma un build por
idioma) — provider en `app.config.ts`, archivos de traducción en
`frontend/public/i18n/es.json` y `en.json`, namespaced por pantalla
(`login.*`, `shell.*`, `agenda.*`, `postulaciones.*`, `clientes.*`,
`configuracion.*`, `comun.*` para lo compartido). En las plantillas, cada
string estático pasa por el pipe `| translate`; los mensajes armados en
código (`confirm()`, errores, las etiquetas de estado/tipo de evento, los
nombres de días/meses de Agenda) usan `translateService.instant('clave', { parametros })`.

Los `toLocaleDateString`/`toLocaleString` y el `lang` de
`SpeechRecognition`/`speechSynthesis` (voz de Annie, dictado por voz) usan
`PerfilService.localeDeIdioma()` (`es-419` / `en-US`) en vez de tener
`'es-419'` hardcodeado como antes. El idioma de las respuestas de **Annie**
también sigue la preferencia (ver `systemPrompt()` en `backend/routes/annie.js`,
sección de backend). Lo que **no** se tradujo, a propósito: los avisos de
Telegram, el resumen semanal y el parseo de emails de Postulaciones — son
procesos internos sobre correos que ya llegan en español, no interfaz.

### Tema claro/oscuro

Toggle en Configuración, guardado como preferencia de cuenta (columna
`tema` en `usuarios`, no algo local del navegador) y aplicado a **toda la
app**, no solo a la pantalla nueva. Mecanismo: `PerfilService` pone
`data-theme="dark"` (u omite el atributo para claro) en `document.documentElement`;
`frontend/src/styles.css` redefine ahí las variables de color ya
existentes (`--ink`, `--bg`, `--surface`, etc.), así que la mayoría de
`.card`/textos/fondos se resuelven solos por usar esas variables. Para los
efectos "glass" (`rgba(255,255,255,…)`, `backdrop-filter`) y paneles con
colores `oklch(...)` fijos que asumían fondo claro (sidebar, login,
calendario de Agenda, bandeja de revisión y buscador de Postulaciones), se
agregó un bloque `:host-context([data-theme='dark'])` en el CSS de cada
componente — mecanismo estándar de Angular para que un componente con view
encapsulation reaccione a un atributo puesto en un ancestro (`<html>`)
fuera de su propio árbol. Los colores de marca/estado intencionales (rosa,
morado, dorado, los pills de estado de Postulaciones) no cambian entre
temas — son chips pastel con texto oscuro, se leen bien sobre cualquier
fondo.

Para evitar el flash de tema claro al recargar la página (antes de que
`GET /auth/perfil` responda), `main.ts` aplica de entrada el valor
cacheado en `localStorage` (`agenda_tema`, misma idea que `agenda_idioma`
para el idioma) — mismo patrón que ya usaban otras preferencias del
proyecto (`annie_voz_activada` en `shell.ts`).

### Tipografía de títulos (`.display`)

Los títulos y el nombre de marca usan **Aclonica** (`@font-face` en
`styles.css`, peso único Regular — no tiene negrita, así que `.display` usa
`font-weight: 400`), con `Playfair Display` → `Georgia` → serif como
fallback si no está disponible. Archivo en
`frontend/public/fonts/Aclonica.ttf`, licencia Apache 2.0 (permisiva, sin
restricción de uso comercial ni de redistribución — por eso sí está
commiteado al repo, a diferencia de una fuente anterior que se probó y se
descartó por licencia de solo uso personal). Texto de la licencia en
`Aclonica-LICENSE.txt`, al lado del archivo de la fuente.

### Diseño: stickers hechos a mano por Ana

La app usa diseños dibujados por Ana en Procreate (capturas originales en
`imagenes/Diseño/`, fuera del repo) convertidos a PNG transparente:

- **Patrón de fondo** (`frontend/public/img/patron-flores.png`): un tile de
  900×900 con 4 motivos (margarita, dos hibiscos y una concha) a opacidad
  muy baja, aplicado como `background-image` + `background-repeat: repeat`
  en `.main` (`frontend/src/app/shell/shell.css`) — se repite detrás de
  todas las páginas. El tile en sí no tiene costuras (un motivo no queda
  cortado al repetirse), pero cuando el contenido de una página termina a
  mitad de un mosaico, la flor que cae justo ahí se corta de golpe contra
  el borde de la página (reportado por la usuaria con una captura real).
  `.main::after` agrega un degradé de 9rem hacia `var(--bg)` pegado al
  fondo de `.main` para disimular ese corte en vez de dejarlo en seco —
  como `.main` tiene `overflow-y: auto`, el `bottom:0` del degradé cae al
  final de todo el contenido scrolleable, no solo del viewport visible.
- **Stickers de flores/concha** (`frontend/public/img/stickers/`:
  `margarita`, `hibisco_morado`, `hibisco_rosa`, `shell2.png`), a opacidad
  **completa** (a diferencia del patrón de fondo) — el pool "genérico" que
  se usa en todos lados como decoración puntual, porque se reconocen bien
  como forma aunque sean chicos:
  - **Login**: se probó (2 al azar en las esquinas del panel morado) y se
    sacó por pedido explícito de la usuaria ("no quedó bien, sacalos") —
    `login.ts`/`.html`/`.css` ya no importan nada de `core/stickers.ts`,
    el panel morado quedó solo con los blobs decorativos originales.
  - **Sidebar** (`shell.ts`/`.html`/`.css`): 2 al azar por carga (antes 1
    sola — pedido explícito, "poné más cosas, no solo la almeja"),
    superpuestas en `.sidebar-spacer` (el hueco flexible entre el nav y la
    tarjeta de usuario) en distinto tamaño/posición/rotación, más 3
    brillitos (`.sidebar-sparkle`, el mismo ícono de estrella que ya usan
    los cuadros de Agenda) dorado/morado alrededor.
  - **Agenda** (`agenda.ts`/`.html`/`.css`): en los 5 cuadros del layout
    tipo planner (dos por cuadro, en las esquinas — ver sección Agenda) y
    como botón de "check" clickeable de cada evento en "Eventos del mes".

  Login y sidebar usaban antes el pool de lettering (frases) en vez de
  flores — se cambió porque una palabra como "Auténtica" recortada chica no
  se lee ni se reconoce como sticker a simple vista (pedido explícito de la
  usuaria: "no puedes literalmente hacer stickers con 'auténtica', no se
  distinguen"). El lettering se dejó únicamente donde el texto va grande y
  es el protagonista del cuadro (ver más abajo).
- **Lettering** (`frontend/public/img/lettering/`: `hello`, `aloha`,
  `beautiful`, `poderosa`, `autentica`, `eres-genial.png`): 6 frases
  sueltas, a opacidad casi completa. Ya no se usan como sticker decorativo
  chico (ver arriba) — el único lugar donde quedan es el cuadro "Una
  afirmación" de Agenda, grande y pensado para leerse, un diseño al azar
  por carga.

  `frontend/src/app/core/stickers.ts` centraliza los dos pools
  (`FLORES`/`LETTERING`) y los helpers para elegir al azar
  (`elegirFlor()`/`elegirSticker()`, más las variantes que eligen varios
  sin repetir), compartido entre login, sidebar y Agenda para no duplicar
  las listas en cada lugar que las usa.

**Procesamiento de las capturas** (recorte + quitar fondo) se hizo con un
script Python + Pillow ad-hoc, en un venv aislado fuera del repo (no se
agregó Python como dependencia del proyecto). El fondo del papel de
Procreate no es blanco puro (`~(255,254,234)` para el lettering, un blanco/
gris con ruido de compresión para las flores) — quitar el fondo comparando
cada pixel contra un umbral de distancia/saturación/brillo sin corregir
nada más deja un velo traslúcido parejo en toda la imagen (invisible sobre
blanco, pero muy visible como un rectángulo fantasma sobre fondos de color,
como el panel morado del login o las tarjetas de Agenda). Dos correcciones
necesarias sobre el algoritmo original:
1. La saturación tiene que ser relativa a la saturación del propio fondo
   (`sat - sat_bg * 1.4`) — si no, el papel crema del lettering (que ya
   tiene algo de saturación propia) queda mal clasificado.
2. Hace falta un piso (`piso = 0.09`) que fuerce alpha exactamente 0 por
   debajo de cierto puntaje — si no, el ruido de compresión JPEG en zonas
   de fondo "planas" dejaba un alpha bajo pero no-cero en todos lados
   igual, aunque la saturación ya estuviera bien corregida (encontrado
   recién al procesar las flores para usarlas a opacidad completa; el
   patrón de fondo no lo mostraba porque además se aplica a opacidad muy
   baja, el velo residual quedaba por debajo de 1/255).

El canal RGB nunca se toca en este proceso (solo se recalcula el alfa), así
que las 4 imágenes de flores/concha que ya estaban en el repo se
reprocesaron in-place con el algoritmo corregido sin necesidad de volver a
las capturas originales.

**Borde blanco tipo calcomanía ("die-cut"): probado y descartado.** Se
probaron tres vueltas de un efecto de borde grueso (blanco, después blanco
+ línea fina oscura) alrededor de los 10 stickers, dilatando la silueta del
alfa (con `scipy.ndimage`, venv con numpy/scipy). Ninguna convenció a la
usuaria ("no se ve prolijo", después "se ven terribles" incluso con
referencia visual de un sticker comprado) y pidió sacarlo del todo — los
stickers quedaron en su recorte transparente simple, sin borde, como antes
de probar esto. Si se vuelve a pedir un efecto de borde, la usuaria
mencionó que probablemente lo resuelva ella misma re-exportando desde
Procreate en vez de generarlo por script — no asumir que hay que retomar
este mismo camino.

### Responsive (mobile/tablet)

La app se construyó desktop-first y no tenía ninguna regla responsive
salvo el grid de Agenda. Pedido explícito de la usuaria: que funcione bien
en iPhone/iPad/tablet, "para todo". Cambios por pantalla:

- **Shell** (`frontend/src/app/shell/`): el sidebar fijo de 15.5rem no
  entra en un teléfono — por debajo de 860px se convierte en un **cajon
  deslizable** (off-canvas, `position: fixed` + `transform: translateX()`,
  clase `.abierto` controlada por `menuMovilAbierto` en `shell.ts`), oculto
  por default. Aparece una barra superior fija (`.mobile-topbar`) con el
  logo y un botón de hamburguesa; un backdrop oscuro atrás del cajón lo
  cierra al tocar afuera, y cada link de navegación llama a
  `cerrarMenuMovil()` al clickear (si no, quedaba abierto tapando la
  pantalla después de navegar). Arriba de 860px estas reglas no se activan,
  el sidebar queda exactamente igual que antes.
- **Login**: el layout de 2 columnas (formulario + panel morado, 50/50)
  aprieta demasiado la tarjeta en pantallas chicas — por debajo de 760px se
  apila en columna, con el panel morado como franja superior compacta (sin
  los chips flotantes, pensados para un panel ancho) y la tarjeta a ancho
  completo.
- **Postulaciones**: el formulario de 3 columnas y la tarjeta de stats (con
  divisor lateral) se apilan por debajo de 640px. La fila de cada
  postulación (`post-row`) no se tocó — alcanza con `flex-wrap: wrap` para
  que los pills de estado/compatibilidad/probabilidad pasen solos a la
  siguiente línea si no entran junto al nombre de la empresa, sin cambiar
  el HTML.
- **Agenda**: el grid de 2 columnas del layout tipo planner ya colapsaba a
  1 columna por debajo de 900px (de la tanda anterior) — se le bajó el
  `min-height` de los cuadros en ese modo (24rem a 17rem, si no cada
  cuadro ocupando todo el ancho es demasiado scroll en el teléfono) y el
  formulario de evento (2 columnas) se apila por debajo de 640px.

No se tocó `clientes` (pantalla oculta del nav, ver
[[project_marca_anadesing_annie]]) — su CSS es mínimo y no tiene grids
fijos que rompan.

**Sin poder probar en un dispositivo real ni en devtools de un navegador
real** — verificado con `tsc`/`ng build` y leyendo el CSS con cuidado, pero
falta la validación visual real en iPhone/iPad. Pedirle a la usuaria que
lo pruebe y avise qué ajustar.

## App Android (`android/`)

Esta web siempre fue intencionalmente una capa fina sobre la misma API
(`backend/`) que iba a usar la futura app Android — mismos endpoints,
mismo login, mismo formato de fechas. Empezada el 2026-08-30, pedido
explícito de la usuaria (además de dejar la web responsive).

**Kotlin + Jetpack Compose, no Java + XML** (el plan original de este
README decía "Java + Retrofit"): Retrofit se mantuvo, pero se cambió Java
por Kotlin y las vistas XML clásicas por Jetpack Compose — es el enfoque
que Google recomienda para proyectos nuevos hoy, bastante menos código
repetitivo, y Kotlin tiene soporte de primera clase (Java quedó como
legacy-compatible, no como default). Retrofit funciona igual de bien con
cualquiera de los dos. Si esto no es lo que se quería, es cuestión de
avisar — recién está el esqueleto, cambiar de estrategia ahora es barato.

**Entorno de desarrollo — dos caminos, a propósito:**
1. Este entorno (WSL, sin GUI) tiene el JDK 17 + Android SDK
   (cmdline-tools, platform-tools/`adb`, `platform-35`, `build-tools;35.0.0`)
   instalados **sin sudo** en `~/android-toolchain/` (no hay contraseña de
   sudo disponible acá) — variables de entorno (`JAVA_HOME`, `ANDROID_HOME`,
   `PATH`) agregadas a `~/.bashrc`. Desde acá se puede escribir código y
   compilar por línea de comandos (`./gradlew assembleDebug`), pero no hay
   emulador gráfico ni forma de ver la app corriendo.
2. La usuaria instala **Android Studio en Windows** y abre esta misma
   carpeta (`C:\xampp\htdocs\agenda\android\`, que es literalmente
   `android/` visto desde WSL — no hay que copiar ni sincronizar nada) para
   compilar con la GUI, usar el emulador, y probar en su teléfono real. Su
   Android Studio va a generar su propio `local.properties` (con la ruta
   Windows del SDK que instale) — no hay conflicto con el `local.properties`
   de WSL, cada entorno tiene el suyo, por eso está en `.gitignore`.

**Primer checkpoint (listo, `BUILD SUCCESSFUL`):** un `MainActivity.kt`
mínimo en Compose ("¡Hola! Agenda Inteligente para Android está en
marcha.") que solo confirma que toda la cadena de herramientas (JDK +
SDK + Gradle 8.10 + Kotlin 2.0.20 + Compose) compila de punta a punta y
genera un APK real (`app/build/outputs/apk/debug/app-debug.apk`,
verificado que existe y pesa ~10MB). A propósito no se metió ninguna
pantalla real todavía — el paso que sigue es Login conectado al backend
real (mismos endpoints `POST /auth/login` / `POST /auth/register` que ya
usa la web) vía Retrofit.

**Estructura:** módulo único `app/` (`namespace`/`applicationId`
`com.anadesing.agendainteligente`), `minSdk 26` / `compileSdk 35` /
`targetSdk 35`. Dependencias ya declaradas en `app/build.gradle.kts`
pensando en los próximos pasos (no todas se usan todavía en el
"Hola mundo"): Compose BOM, `navigation-compose` y
`lifecycle-viewmodel-compose` (para cuando haya más de una pantalla),
Retrofit + `converter-gson` + `logging-interceptor` (cliente HTTP contra
`backend/`), `datastore-preferences` (equivalente Android al
`localStorage` que usa la web para guardar el JWT).

**Segundo checkpoint (listo, `BUILD SUCCESSFUL`): Login/Registro + Agenda
(vista de mes, solo lectura), contra el backend real.** Pedido explícito de
la usuaria (2026-08-31): saltear el resto de Postulaciones/vista
semana/notas por ahora e ir directo a ver la Agenda andando en Android.
Como `/postulaciones` y `/eventos` exigen JWT (`requireAuth` en
`backend/index.js`), Login quedó como prerrequisito técnico, no como
elección de diseño — no hay forma de probar la Agenda real sin poder
autenticar primero.

- **Sin Hilt/Koin:** `AgendaApp.kt` (subclase de `Application`, registrada
  en el manifest) arma a mano un único `Retrofit`/`OkHttp` y los
  repositorios (`AuthRepository`, `AgendaRepository`), pasados a los
  `ViewModel` por factory — proyecto chico, no justifica una librería de
  inyección de dependencias.
- **`data/`**: `AuthApi`/`AgendaApi` (Retrofit, mismos endpoints que ya usa
  la web: `POST /auth/login`, `POST /auth/register`, `GET /postulaciones`,
  `GET /eventos`), `TokenStore` (DataStore Preferences + decodeToken() del
  JWT, equivalente exacto de `auth.service.ts`), `NetworkModule` (interceptor
  que agrega `Authorization: Bearer <token>` a cada request).
- **Login (`ui/login/`)**: un solo formulario que alterna login/registro,
  igual que `login.ts` — mensajes de error los manda el propio backend
  (`err.error` tal cual). Sin la mitad ilustrada (avatar de Annie, chips
  flotantes) del login web: es CSS/imágenes específicas de esa pantalla, no
  esencial para probar que la autenticación funciona.
- **Agenda (`ui/agenda/`), alcance de esta vuelta — elegido por la usuaria
  entre varias opciones de tamaño:** calendario mensual (grilla de 6×7,
  semana arrancando el lunes, igual que `inicioDeSemana()` en `agenda.ts`),
  un punto de color por entrevista (dorado) y por tipo de evento presente
  ese día (mismos 4 tonos de marca que `COLOR_TIPO_EVENTO`). Tocar un día
  muestra debajo la lista de entrevistas/eventos de esa fecha. **Todavía
  sin**: vista semana con timeline por hora, notas del día/objetivos del
  mes/afirmación (guardados en `localStorage` en la web), alta/edición/
  borrado de eventos, y `/citas`. `GET /postulaciones` y `GET /eventos` se
  piden una sola vez al entrar (como hace `ngOnInit` en la web) y se
  recalculan en el dispositivo al cambiar de mes, sin volver a pedirle nada
  al backend.
- **Tema de marca (`ui/theme/Tema.kt`)**: los colores de `styles.css`
  (`--accent-purple`, `--accent-pink`, `--gold`, `--coral-deep`, etc. —
  los `oklch(...)` convertidos a sRGB) armando un `ColorScheme` de
  Material3 más una paleta aparte (`ColoresAgenda`) para los puntos de
  tipo de evento, que no tienen un slot propio en `ColorScheme`.
- **Red — dos casos distintos según cómo pruebes:** `NetworkModule.kt`
  apunta a `http://10.0.2.2:4000/` (el alias fijo que usa el emulador de
  Android Studio para llegar al `localhost` de la PC que lo corre — no
  hace falta tocar nada para probar ahí, alcanza con tener el backend
  corriendo con `npm run dev` en Windows). Para probar en un **celular
  real** conectado a la misma red Wi-Fi que la PC, hay que cambiar esa
  constante por la IP LAN de la PC (`ipconfig` en Windows → "Dirección
  IPv4", algo tipo `192.168.x.x`) y puede hacer falta permitir el puerto
  4000 en el Firewall de Windows. El backend ya escucha en todas las
  interfaces (`app.listen(PORT)` sin host fijo), así que no necesita
  cambios ahí.
- **HTTP en desarrollo:** Android bloquea tráfico sin cifrar por defecto
  desde API 28, y el backend todavía no tiene HTTPS — se agregó
  `android:usesCleartextTraffic="true"` en el manifest para poder probar
  ahora. Repasar/sacar esto el día que haya un backend real en producción
  con HTTPS.

**Tercer checkpoint (listo, `BUILD SUCCESSFUL`): la app ya se ve como una
app — ícono, splash screen y navegación entre secciones.** Pedido explícito
de la usuaria (2026-08-31): antes de seguir sumando pantallas, que deje de
sentirse "una pantalla suelta" y se vea como algo instalable de verdad.

- **Ícono adaptativo (`res/mipmap-anydpi-v26/ic_launcher*.xml`)**: generado
  a partir de `frontend/public/img/logo.png` (el monograma "A" de
  Anadesing) — recortado y centrado al 62% del canvas de 432px, dentro de
  la "safe zone" de 108dp que exige el formato adaptativo, sobre un fondo
  sólido con el mismo `bg` claro que usa la web. Un solo foreground en
  `drawable-xxxhdpi/ic_launcher_foreground.png` (sin variantes por
  densidad ni PNGs legacy por debajo de eso: `minSdk 26` ya garantiza
  soporte de íconos adaptativos en todo dispositivo que puede correr esta
  app). El manifest ahora declara `android:icon`/`android:roundIcon` —
  antes no tenía ninguno de los dos y por eso se veía el ícono genérico de
  Android.
- **Splash screen nativo (`androidx.core:core-splashscreen`)**: reusa el
  mismo foreground y el mismo color de fondo del ícono. Tema
  `Theme.AgendaInteligente.Starting` (`values/themes.xml`) puesto en la
  activity vía manifest, que devuelve el control al tema real
  (`Theme.AgendaInteligente`, el que ya maneja Compose en `Tema.kt`) apenas
  se dibuja el primer frame — no se tocó el theming real de Compose, solo
  el instante de arranque en frío.
- **Navegación inferior (`MainActivity.kt`: `Pestana` + `PrincipalScreen`)**:
  el `NavHost` ya no navega directo a "agenda" sino a un destino
  "principal" que envuelve un `Scaffold` con `NavigationBar` de 3
  pestañas — Agenda (funcional), Postulaciones y Configuración. Estas
  últimas dos muestran una pantalla "Próximamente"
  (`ui/common/PantallaProximamente.kt`, reutilizada por ambas) hasta que se
  migren de verdad. Se eligieron esas 3 pestañas y no Clientes porque
  `Clientes` ni siquiera está enlazada en el nav de la web actual
  (`shell.html` solo linkea a `/agenda` y `/postulaciones`, más
  `/configuracion` como botón aparte) — es una ruta huérfana, no forma
  parte de la navegación real que se está migrando.
- Verificado con `./gradlew assembleDebug` → `BUILD SUCCESSFUL`. Mismo
  límite de siempre en este entorno (WSL sin GUI): no se pudo ver el
  ícono/splash/nav corriendo en pantalla — falta que la usuaria lo
  confirme en Android Studio o en el celular real.
- **Pendiente real de la migración** (las pestañas de arriba son solo la
  cáscara de navegación, todavía no hay código Android para esto):
  Postulaciones (probabilidad de llamada, compatibilidad con IA, feed de
  mails), Configuración (perfil), Annie (asistente de voz + feed de
  actividad en vivo) y push notifications (equivalente Android de
  `push.service.ts`, sería Firebase Cloud Messaging).

**Cuarto checkpoint (listo, `BUILD SUCCESSFUL`): Postulaciones completa,
paridad total con la web.** Pedido explícito de la usuaria (2026-08-31):
a diferencia de Agenda, acá se pidió todo de una en vez de arrancar por una
versión de solo lectura.

- **`data/PostulacionesModels.kt` / `PostulacionesApi.kt` /
  `PostulacionesRepository.kt`**: mismos endpoints que ya usa la web
  (`GET/POST/PUT/DELETE /postulaciones`, `GET /postulaciones/stats`,
  `POST /postulaciones/recalcular-compatibilidad`, `GET/DELETE
  /mails-revision`). `probabilidad_llamada` y `compatibilidad_oferta` ya
  vienen calculados por el backend (`probabilidadLlamada.js`,
  `compatibilidadOferta.js`) — no hay heurística ni IA que portar a
  Kotlin, la app solo pinta los campos.
- **`ui/postulaciones/PostulacionesViewModel.kt`**: mismo estado y lógica
  que `postulaciones.ts` (lista filtrable por estado/búsqueda, stats,
  bandeja de mails con selección múltiple, alta/edición/borrado,
  recalcular compatibilidad). Los `confirm()` nativos del navegador se
  reemplazaron por un `Confirmacion(mensaje, accion)` genérico que la
  pantalla muestra como `AlertDialog`.
- **`ui/postulaciones/PostulacionesScreen.kt`**: mismo layout que
  `postulaciones.html` (form de 9 campos, tarjeta de bandeja de mails,
  tarjeta de stats con barras por estado, buscador, chips de filtro,
  lista con tarjetas expandibles). Sin i18n (como el resto de la app
  Android): todo el texto está hardcodeado en español, igual que
  `AgendaScreen.kt`/`LoginScreen.kt`. Los `<input type="date">` /
  `type="datetime-local">` de la web se resolvieron con `DatePickerDialog`
  y `TimePicker` de Material3 (`ExperimentalMaterial3Api`).
- **Sin dependencias nuevas**: `DatePicker`, `TimePicker`,
  `ExposedDropdownMenuBox`, `FilterChip` y `Checkbox` ya vienen con
  `androidx.compose.material3:material3` (BOM 2024.09.00 → material3
  1.3.0) que el proyecto ya tenía.
- Verificado con `./gradlew assembleDebug` → `BUILD SUCCESSFUL`. Mismo
  límite de siempre: falta probarla a mano contra el backend real (login
  + datos reales) en Android Studio o el celular.

**Quinto checkpoint (listo, `BUILD SUCCESSFUL`): pasada de diseño (tipografía
Aclonica, tarjetas y botones de marca) + Annie con chat y voz.** Pedido
explícito de la usuaria (2026-08-31): la app ya andaba pero se veía
"Material genérico" en vez de calcar la web, y faltaba Annie por completo.

- **Diseño de marca (`ui/common/BotonDegradado.kt`, `ui/common/TarjetaAnadesing.kt`,
  `ui/theme/Tema.kt`)**: se llevó a Android la fuente decorativa `Aclonica`
  (la misma que usa la clase `.display` en styles.css, licencia Apache 2.0,
  bundleada en `res/font/aclonica.ttf`) para todos los títulos de pantalla,
  y dos componentes reusables que calcan la web: botón en píldora con
  degradé morado→rosa (`.btn-add`/`.btn-recalcular`/`.btn-bulk-*`) y tarjeta
  con esquinas de 20px y sombra tenida de morado (`.card`). Se aplicaron en
  Login, Agenda y Postulaciones. `LoginScreen.kt` se refactorizó para usar
  `BotonDegradado` en vez de repetir el mismo `Brush` a mano.
- **Annie (`ui/annie/`, `data/Annie*.kt`)**: chat de texto contra
  `/annie/chat` -- el backend ya tiene las herramientas reales
  (`agendar_entrevista`, `crear_evento`, ver `backend/routes/annie.js`), así
  que Android no reimplementa ninguna lógica de agenda, solo la pantalla de
  conversación. El historial de Claude (`role` + `content`, donde `content`
  puede ser texto simple o bloques de tool_use/tool_result) se modela como
  `JsonElement` opaco -- igual que el `unknown` de `AnnieMensaje` en
  annie.service.ts, no hace falta tipar el schema completo de Anthropic.
  Pantalla completa con el mismo degradé morado→rosa que `.annie-card` en
  shell.css (en la web es un widget de barra lateral, acá es su propia
  pestaña del bottom nav).
- **Voz**: la respuesta de Annie se manda a `/annie/tts` (ElevenLabs, ya
  configurado en el backend) y se reproduce con `MediaPlayer`; si falla,
  cae a `android.speech.tts.TextToSpeech` (voz del sistema) para que Annie
  nunca se quede muda, mismo espíritu que el fallback a
  `speechSynthesis` del navegador en shell.ts. El dictado por voz usa el
  intent estándar `RecognizerIntent.ACTION_RECOGNIZE_SPEECH` (delega en la
  app de reconocimiento de Google) en vez de `SpeechRecognizer` a mano --
  mismo resultado, bastante menos código, y no necesita permiso
  `RECORD_AUDIO` propio porque el micrófono lo usa esa otra app.
- **Sin migrar todavía** (deliberado, no es parte de "chat + voz"): el feed
  de actividad reciente de Annie (chips de "¡Oferta de X!", etc.) y los
  recordatorios push por Firebase Cloud Messaging -- este último necesita
  que la usuaria agregue una app Android al proyecto Firebase
  `turnero-ec3cd` y pase `google-services.json` antes de que se pueda hacer
  nada del lado Android (ver conversación). Los recordatorios por Telegram
  (seguimiento de postulaciones, eventos, resumen semanal) ya le llegan a
  la usuaria sin ningún cambio, corren enteramente en el backend.
- **Corrección de paso: Agenda/Postulaciones ahora recargan al volver a
  mostrarse** (`LaunchedEffect(Unit) { viewModel.cargar() }` en sus Screen,
  ya no `init { cargar() }` en el ViewModel) -- necesario para que lo que
  Annie agenda desde el chat aparezca al cambiar de pestaña sin tener que
  cerrar y reabrir la app.

**Sexto checkpoint (listo, `BUILD SUCCESSFUL`): saludo personalizado de
Annie, notas/objetivos/afirmación en Agenda, y español neutro en Annie.**
Pedido explícito de la usuaria (2026-08-31).

- **Saludo de Annie (`AnnieViewModel.saludar()`)**: dispara al entrar a
  "principal" (o sea, al abrir la app ya logueada, o justo despues de
  loguearse) y no recien al tocar la pestaña de Annie -- el ViewModel se
  crea en `PrincipalScreen`, no dentro del `when` de la pestaña, mismo
  criterio que usa shell.ts al ser un widget global del Shell en la web.
  Annie pide el nombre una sola vez (`GET /auth/perfil`) y saluda
  `"¡Bienvenida a tu Agenda Inteligente! ¿En qué puedo ayudarte hoy,
  {nombre}?"` -- igual que `saludar()` en shell.ts. Si todavía no hay
  nombre guardado, pregunta `"¿Cómo te gusta que te llame?"` y el próximo
  mensaje que mande la usuaria se guarda como nombre (`PUT /auth/perfil`)
  en vez de mandarse al chat normal -- mismo mecanismo que
  `esperandoNombre` en shell.ts. No se migró el resto de Configuración
  para esto, solo se agregaron `GET`/`PUT /auth/perfil` a `AuthApi.kt`
  (`PerfilDto` con un solo campo, `nombre` -- el backend acepta actualizar
  ese campo solo sin tocar el resto del perfil).
- **Notas del día, objetivos del mes y afirmación (`data/AgendaLocalStore.kt`)**:
  en la web viven solo en `localStorage` (`NOTA_PREFIJO`/`OBJETIVOS_PREFIJO`/
  `AFIRMACION_PREFIJO` en agenda.ts), nunca tocan el backend -- en Android
  el equivalente es DataStore Preferences (mismo mecanismo que ya usa
  `TokenStore` para el JWT, pero en un archivo separado, `agenda_local`),
  con una clave por fecha/mes. Se agregaron como tres tarjetas nuevas
  debajo del panel del día seleccionado en `AgendaScreen.kt`, con el mismo
  estilo (`TarjetaAnadesing`, título en Aclonica) que ya se usa en
  Postulaciones.
- **Español neutro en Annie**: se encontraron y corrigieron dos textos con
  voseo que se habían colado en `AnnieViewModel.kt`/`AnnieScreen.kt`
  ("Pedime"/"preguntame" en el saludo viejo, ya reemplazado por el de
  arriba; "Hablale a Annie…" → "Háblale a Annie…" en el prompt del
  dictado), y el locale de voz pasó de `"es"` a `"es-419"` en
  `RecognizerIntent.EXTRA_LANGUAGE` y en `TextToSpeech.setLanguage()` --
  ver [[feedback_espanol_neutro]], que ya pedía `es-419` específicamente
  para los tags de idioma de voz. El resto de los textos de la app ya
  estaban en español neutro (revisado con una búsqueda completa de
  patrones de voseo en todo `android/app/src/main/java`).
- Verificado con `./gradlew assembleDebug` → `BUILD SUCCESSFUL`. Mismo
  límite de siempre: falta probarlo a mano (el saludo, guardar el nombre,
  y que notas/objetivos/afirmación persistan de verdad entre aperturas de
  la app).

**Séptimo checkpoint (listo, `BUILD SUCCESSFUL`): la pestaña de Annie se
abre sola al terminar el saludo, y los stickers/lettering de Ana aparecen
en Agenda.** Pedido explícito de la usuaria (2026-08-31): dos ajustes sobre
el checkpoint anterior.

- **Annie abre su pestaña sola (`MainActivity.kt`)**: `saludar()` pasó de
  disparar su propio `viewModelScope.launch` a ser `suspend fun`, para que
  `PrincipalScreen` pueda esperarla y recién ahí poner
  `pestana = Pestana.ANNIE`. Antes el saludo quedaba listo pero había que
  tocar la pestaña a mano para verlo -- en la web Annie es un widget
  siempre visible en la barra lateral, esto es lo más parecido con un
  bottom nav de una pestaña a la vez.
- **Stickers y lettering de Ana en Agenda (`ui/common/Stickers.kt`,
  `ui/common/TarjetaAnadesing.kt`)**: se habían migrado los paneles de
  Notas/Objetivos/Afirmación sin sus stickers -- ahora `TarjetaConStickers`
  (misma tarjeta de siempre, más dos stickers de flor rotados en las
  esquinas, igual que `.box-sticker.tl`/`.box-sticker.br` en agenda.css)
  envuelve los tres, con los mismos índices que `stickerFlor()` en
  agenda.ts (Notas 4/6, Objetivos 2/4, Afirmación 3/5), y el panel de
  Afirmación suma el lettering grande (elegido al azar entre los 6, como
  `elegirSticker()`). Son los mismos PNG dibujados a mano por Ana en
  Procreate que ya usa la web (`frontend/public/img/stickers/`,
  `frontend/public/img/lettering/`), copiados a `res/drawable/` con
  nombres válidos para Android (sin guiones: `eres-genial.png` →
  `lettering_eres_genial.png`). No se tocaron los blobs de gradiente de
  Login/Shell ni los stickers de la barra lateral (`stickersSidebar` en
  shell.ts) -- esos son decoración de una barra lateral que no existe en
  Android (acá el bottom nav ya cumple ese rol), no "imágenes diseñadas"
  en el sentido que se pidió corregir.
- Verificado con `./gradlew assembleDebug` → `BUILD SUCCESSFUL`. Mismo
  límite de siempre: falta confirmar a mano que los stickers se vean bien
  posicionados en pantalla real (los cálculos de esquina son a ojo,
  trasladados de rem a dp).

**Octavo checkpoint (listo, `BUILD SUCCESSFUL`): Annie en el login, y el
calendario de Agenda con el mismo lenguaje visual que la web (pildora de
mes, celdas con borde/fondo lavanda, "hoy" como burbuja en degrade).**
Pedido explícito de la usuaria (2026-08-31): "que salga Annie de una vez"
en el login, y que el calendario se vea "más girly".

- **Annie en el login (`ui/login/LoginScreen.kt`)**: se agregó el panel
  `AnnieHero` (foto de Annie circular, "Hola, soy Annie" en Aclonica, y su
  tagline) con el mismo fondo degradé morado→rosa que `.login-brand-side`
  en login.css. En la web ese panel va al lado del formulario en pantallas
  anchas, pero la propia web lo apila arriba en mobile (`order:-1` en el
  media query de 760px) y esconde los chips flotantes por falta de
  espacio -- Android, al ser siempre angosto, imita directo esa versión
  mobile: panel arriba, formulario abajo, sin los chips.
- **Calendario con el estilo de agenda.css, no Material genérico**
  (`AgendaScreen.kt`): el calendario completo (header + grilla) ahora vive
  adentro de un `TarjetaConStickers` (stickers índice 0/2, igual que
  `stickerFlor(0)`/`stickerFlor(2)` en el `.calendar-card` de agenda.html);
  el mes ("Agosto 2026") pasó de texto plano a una píldora blanca sobre
  degradé morado→rosa (`PildoraMes`, igual que `.calendar-month`); y cada
  celda de día (`DiaCelda`) tiene ahora fondo lavanda suave + borde morado
  fino siempre (antes no tenían fondo ni borde en absoluto), "hoy" resalta
  solo el número con una burbuja circular en degradé (antes tenía toda la
  celda teñida), y "seleccionado" pasa a blanco con borde morado más
  marcado (antes era un relleno morado sólido con número blanco). Los días
  fuera del mes visible ahora atenúan la celda completa (`alpha`), no solo
  el número.
- Verificado con `./gradlew assembleDebug` → `BUILD SUCCESSFUL`. Mismo
  límite de siempre: falta confirmar a mano que las celdas/píldora/hero se
  vean bien en pantalla real, sobre todo que el círculo de "hoy" no se vea
  apretado dentro de la celda en teléfonos chicos.

**Noveno checkpoint (listo, `BUILD SUCCESSFUL`): Notas y Afirmaciones pasan
de un cuadro de texto libre a una lista de entradas sueltas, agregables y
borrables.** Pedido explícito de la usuaria (2026-08-31) -- a diferencia
del resto de la migración, esto es una mejora deliberada sobre la web, no
una copia: en agenda.ts ambas son un solo `<textarea>` que autoguarda en
`localStorage`; acá la usuaria pidió poder cargar varias notas/afirmaciones
sueltas (una por Enter) y borrar cualquiera de las cargadas.

- **`data/AgendaLocalStore.kt`**: `leerNota`/`guardarNota` y
  `leerAfirmacion`/`guardarAfirmacion` (un string) se reemplazaron por
  `leerNotas`/`agregarNota`/`eliminarNota` y
  `leerAfirmaciones`/`agregarAfirmacion`/`eliminarAfirmacion` (listas,
  mismo mecanismo JSON-en-DataStore que ya usaba `objetivos`). Las claves
  de DataStore cambiaron de singular a plural (`notas_{fecha}`,
  `afirmaciones_{mes}`) porque el formato guardado es distinto (antes un
  string plano, ahora un JSON array) -- lo que hubiera quedado escrito
  durante las pruebas de los checkpoints anteriores no es compatible y se
  pierde, aceptable en esta etapa (todavía no hay usuarias reales con
  datos que cuidar).
- **`AgendaViewModel.kt`/`AgendaScreen.kt`**: nuevo composable compartido
  `ListaConAgregar` (una lista de textos con una "×" para borrar cada uno,
  más un campo con tecla Enter o botón "➤" para agregar) -- se usa tanto en
  el panel de Notas como en el de Afirmaciones (antes "Una afirmación",
  ahora "Afirmaciones" en plural, porque ya no es una sola). Objetivos del
  mes no cambió: ya eran 5 líneas separadas de por sí, no un cuadro libre.
- Verificado con `./gradlew assembleDebug` → `BUILD SUCCESSFUL`. Mismo
  límite de siempre: falta probar a mano que agregar/borrar notas y
  afirmaciones funcione bien y persista entre aperturas de la app.

**Décimo checkpoint (listo, `BUILD SUCCESSFUL`): ícono nuevo y firma de Ana
en el login.** La usuaria dejó `Untitled design.png` en su carpeta de
Descargas de Windows (un solo archivo con el logo nuevo y su firma
manuscrita, ambos sobre fondo transparente) pidiendo reemplazar el ícono
de la app por ese logo y sumar su firma "como en el web".

- Ese único PNG se separó en dos por bandas de contenido (fila con alpha
  > 0): el logo ocupa y≈215–1070, la firma y≈1119–1676. Cada parte se
  recortó a su bounding box real con un margen de 15px.
- **Ícono**: el logo recortado reemplazó a
  `drawable-xxxhdpi/ic_launcher_foreground.png`, con el mismo proceso de
  siempre (centrado al 62% del canvas de 432px, dentro de la safe zone
  adaptativa) -- no cambia nada de la estructura del ícono, solo la fuente.
  El `logo.png` de la web (`frontend/public/img/logo.png`) no se tocó, no
  era parte del pedido.
- **Firma en el login**: nuevo composable `FirmaCredit` en
  `LoginScreen.kt` -- "UN PRODUCTO DE ANADESING" en versalitas chicas más
  la firma (`res/drawable/firma.png`, recortada de ese mismo PNG y
  reescalada a 700px de ancho), debajo del switch login/registro. Mismo
  lugar y mismo texto que `.firma-credit` en login.css, pero la imagen
  nueva ya viene con transparencia real (a diferencia de `firma.jpg` en la
  web, que es una foto con fondo blanco y necesita
  `mix-blend-mode: multiply` para disimularlo) -- por eso acá no hizo
  falta ningún blend mode ni recorte con `overflow:hidden` como en
  `.firma-crop`, se puede mostrar directo.
- Verificado con `./gradlew assembleDebug` → `BUILD SUCCESSFUL`. Mismo
  límite de siempre: falta confirmar a mano que el ícono nuevo se vea bien
  en el launcher y que la firma quede bien recortada/alineada en el login
  real.

**Ajuste chico: la pestaña de Annie en el bottom nav usa su foto, no un
emoji de robot.** `MainActivity.kt` -- el ícono de esa pestaña era el
emoji "🤖", pedido explícito de la usuaria fue que sea Annie misma. Ahora
esa pestaña muestra `R.drawable.annie` (la misma foto que ya se usa en su
chat y en el login) recortada en círculo de 24dp; las otras tres pestañas
siguen con su emoji sin cambios.

**Ícono real de la app + cerrar el teclado al tocar afuera.** La usuaria
había dejado `agenda/imagenes/icono moviljpeg.jpeg` en el repo (una
carpeta que no estaba explorada todavía) pidiendo que ese fuera el ícono
real -- el que se había puesto antes (el logo "A" recortado de `Untitled
design.png`) no era lo que pedía.

- **Ícono (`mipmap-anydpi-v26/ic_launcher*.xml`)**: a diferencia del logo
  anterior (un monograma transparente que necesitaba fondo + safe zone),
  `icono moviljpeg.jpeg` ya es una ilustración cuadrada completa con su
  propio fondo degradé -- no tiene sentido tratarla como "foreground" con
  padding. Se usa directo como `<background>` del ícono adaptativo
  (`drawable-xxxhdpi/ic_launcher_foto.png`, reescalada a 432px) y el
  `<foreground>` pasa a `@android:color/transparent` (nada dibujado
  encima). `ic_launcher_foreground.png` (el monograma "A") no se borró --
  lo sigue usando la splash screen (`Theme.AgendaInteligente.Starting` en
  themes.xml), que no era parte de este pedido.
- **Cerrar teclado al tocar afuera (`AgendaScreen.kt`)**: Notas, Objetivos
  y Afirmaciones ya autoguardaban en cada letra escrita (se revisó
  `AgendaViewModel.onObjetivoChange`, que sí llama a
  `local.guardarObjetivo` igual que los otros dos campos) -- lo que
  faltaba era una señal visible de "esto ya quedó". Un
  `Modifier.pointerInput(Unit) { detectTapGestures(...) }` en la Column
  principal limpia el foco y oculta el teclado al tocar en cualquier lugar
  vacío de la pantalla.
- Verificado con `./gradlew assembleDebug` → `BUILD SUCCESSFUL`. Mismo
  límite de siempre: falta confirmar a mano que el ícono nuevo se vea
  bien en el launcher (recordar que MIUI puede tardar en refrescarlo) y
  que tocar afuera de los campos realmente cierre el teclado sin romper
  el tap en botones/celdas del calendario.

**Corrección: el "tocar afuera cierra el teclado" del paso anterior rompía
el botón de borrar de Notas/Afirmaciones.** La usuaria probó y no podía
borrar las entradas que había cargado -- el sospechoso más directo era el
`Modifier.pointerInput(Unit) { detectTapGestures(...) }` que se había
agregado en la Column principal de `AgendaScreen.kt`: un detector de tap
"crudo" en el contenedor raíz puede competir con el `clickable` interno de
botones chicos anidados (el IconButton de "×" tiene 28dp), un problema
conocido de Compose. Se sacó ese modifier por completo.

- En su lugar, cada campo de texto maneja su propio cierre de teclado:
  `PanelObjetivos` ahora tiene `keyboardOptions`/`keyboardActions` con
  `ImeAction.Done` (el Enter del teclado limpia el foco y oculta el
  teclado), que es el pedido explícito de la usuaria ("los objetivos no me
  pusiste el enter"). El campo de agregar en `ListaConAgregar`
  (Notas/Afirmaciones) ya tenía `onDone` desde el checkpoint anterior,
  pero llamaba a `onAgregar()` sin agregar el foco/teclado -- se queda así
  a propósito (Enter ahí agrega el ítem, que es más útil que solo cerrar
  el teclado).
- Ya no hay forma de cerrar el teclado tocando en un espacio vacío de la
  pantalla -- solo con el Enter/Done de cada campo. Es una regresión
  aceptada a cambio de no romper botones; si hace falta ese gesto más
  adelante, hay que buscar una implementación que no interfiera con
  clickables anidados (por ejemplo, detectando el tap solo en el fondo de
  la pantalla, no en un contenedor que envuelve todo el contenido).
- Verificado con `./gradlew assembleDebug` → `BUILD SUCCESSFUL`. Mismo
  límite de siempre: falta confirmar a mano que borrar notas/afirmaciones
  funcione de nuevo y que el Enter en Objetivos cierre el teclado.

**Borrar eventos de la Agenda -- lo que en realidad pedía "no puedo borrar
las citas".** Malentendido de mi parte: el mensaje anterior de la usuaria
("no puedo borrar lascitas manualmente") no era sobre Notas/Afirmaciones
(eso ya andaba bien) sino sobre los eventos que se ven en el panel del día
seleccionado -- Agenda era de solo lectura para eventos/entrevistas desde
el segundo checkpoint (deliberado en ese momento), y en la web sí se
pueden borrar (`borrarEvento()` en agenda.ts).

- **`data/AgendaApi.kt`/`AgendaRepository.kt`**: se agregó
  `DELETE eventos/{id}`, mismo endpoint que ya usa la web.
- **`AgendaViewModel.kt`**: nuevo `confirmarBorrarEvento(evento)` con el
  mismo mecanismo `Confirmacion(mensaje, accion)` que ya usaba
  Postulaciones -- esa clase se movió a `ui/common/Confirmacion.kt` para
  compartirla entre las dos pantallas en vez de duplicarla.
- **`AgendaScreen.kt`**: `FilaItem` suma un botón "×" opcional
  (`onBorrar: (() -> Unit)?`). Solo los eventos personales lo tienen; las
  entrevistas quedan sin borrar desde acá a propósito -- son parte de una
  postulación, se editan/borran desde la pestaña Postulaciones, no tiene
  sentido duplicar esa acción acá.
- Verificado con `./gradlew assembleDebug` → `BUILD SUCCESSFUL`. Mismo
  límite de siempre: falta probar a mano que borrar un evento real
  funcione y que la Agenda se actualice sin recargar la app.

**Ícono definitivo.** La usuaria dejó `agenda/imagenes/Icono Definitivoa.jpeg`
(otra ilustración cuadrada completa, estilo agenda/planner rosa) pidiendo
reemplazar el ícono por ese.

- Primer intento: reescalada directo a 432px sin más, pisando
  `drawable-xxxhdpi/ic_launcher_foto.png`. La usuaria probó y la máscara
  del ícono adaptativo (el sistema recorta a círculo/cuadrado redondeado
  según el launcher) le cortaba partes del dibujo, incluido el texto
  "Agenda" -- la imagen original ocupa el cuadrado de punta a punta, sin
  margen, así que cualquier máscara que no sea exactamente cuadrada le
  come contenido.
- Corregido con el mismo criterio de "safe zone" que ya se usaba para el
  ícono con el monograma "A" (62% del canvas, centrado, con relleno del
  color casi blanco de fondo de la propia ilustración) -- así la máscara,
  sea cual sea su forma, recorta solo el margen en blanco y nunca el
  dibujo real. Mismo archivo `ic_launcher_foto.png`, no hizo falta tocar
  los XML del ícono adaptativo.
- Verificado con `./gradlew assembleDebug` → `BUILD SUCCESSFUL` y
  revisando el PNG generado a ojo antes de instalar.

**Pop up del día en vez de panel plano, estilo timeline con stickers.**
Pedido explícito de la usuaria: no le gustó el "×" pelado para borrar un
evento, y pidió que tocar un día del calendario abra un pop up con sus
eventos "como vista por hora", bien girly, usando sus stickers.

- **`DialogoDia` (`AgendaScreen.kt`)**: tocar una celda del calendario
  (`DiaCelda.onClick`) ahora abre un `Dialog` en vez de solo actualizar el
  panel de abajo -- `PanelDiaSeleccionado` se eliminó por completo, el pop
  up lo reemplaza. Header en degradé morado→rosa con el día en Aclonica,
  botón "✕" para cerrar, dos stickers de flor rotados en las esquinas
  (mismo criterio que `TarjetaConStickers`, pero armado a mano porque un
  `Dialog` no es una `Card` común). Si no hay nada agendado, muestra el
  mismo mensaje de antes pero centrado dentro del pop up.
- **Vista "por hora" simplificada**: en vez de una grilla con las 16 horas
  del día (la mayoría vacías), los ítems (entrevistas + eventos) se
  ordenan cronológicamente con "todo el día" primero -- mismo criterio de
  orden que ya usaba la web (`sortedBy { it.hora ?: '' }`), solo que ahora
  con la hora bien destacada a la izquierda de cada fila (`FilaTimeline`)
  en vez de un texto gris chico. Se evaluó una grilla de horas fija
  (7 a 22, como `HORA_INICIO_SEMANA`/`HORA_FIN_SEMANA` en agenda.ts) pero
  se descartó: la mayoría de los días tienen 1-3 ítems, una grilla de 16
  franjas mayormente vacías se ve más pobre que una lista prolija
  ordenada por hora.
- **Borrar ya no es un "×" pelado**: `FilaTimeline` tiene un botón
  circular con fondo coral tenue y el ícono 🗑 en vez de texto plano --
  sigue siendo exclusivo de eventos personales, no de entrevistas.
- Verificado con `./gradlew assembleDebug` → `BUILD SUCCESSFUL`. Mismo
  límite de siempre: falta confirmar a mano que el pop up se vea bien
  (tamaño, scroll si hay muchos ítems, que los stickers no se corten
  contra los bordes de la pantalla) y que borrar un evento desde ahí
  actualice el pop up sin cerrarlo.

**Ícono, tercera vuelta.** `agenda/imagenes/WhatsApp Image 2026-08-31 at
5.44.48 PM.jpeg` (otro diseño cuadrado de agenda/planner, estilo 3D
rosa/morado con corazones) reemplaza al anterior -- mismo tratamiento de
safe zone (62%, centrado), pero esta vez el color de relleno se tomó de
la esquina real de la imagen (negro, no blanco) para que combine con el
margen que ya trae el diseño en vez de dejar un borde blanco que no pega.
Mismo archivo `ic_launcher_foto.png`, sin tocar los XML.

**Corrección: esa imagen no era para el ícono de la app.** Malentendido de
mi parte -- `Icono Definitivoa.jpeg` es y sigue siendo el ícono de la app
(el del launcher, se revirtió `ic_launcher_foto.png` a esa imagen). La
`WhatsApp Image...5.44.48 PM.jpeg` era para la pestaña "Agenda" del bottom
nav, mismo tratamiento que ya tenía la pestaña de Annie (su foto en vez de
un emoji): se agregó `res/drawable/tab_agenda.png` (96px) y
`MainActivity.kt` ahora la usa para `Pestana.AGENDA` en vez del emoji
"🗓", recortada en círculo de 24dp igual que la de Annie. Verificado con
`./gradlew assembleDebug` → `BUILD SUCCESSFUL`.

**Corrección: el recorte circular le comía el ícono de Agenda.** A
diferencia de la foto de Annie (un retrato, un círculo le queda bien), el
ícono de Agenda es un diseño cuadrado de punta a punta -- lapicera a la
izquierda, sello de tilde en la esquina -- y `ContentScale.Crop` +
`CircleShape` le cortaba justo esos detalles, quedando irreconocible de
chico. Cambiado a `ContentScale.Fit` + `RoundedCornerShape(7.dp)` a 26dp:
se ve el diseño completo, sin recortar nada. La pestaña de Annie no se
tocó, el círculo le sigue quedando bien.

**Push real en Android (Firebase Cloud Messaging).** La usuaria agregó una
app Android al proyecto Firebase `turnero-ec3cd` (el mismo que ya usa la
web) desde la consola y pasó el `google-services.json` resultante -- antes
esto era el bloqueo explícito para no poder avanzar del lado Android, ver
checkpoints anteriores.

- `google-services.json` va en `android/app/` (no en un submódulo
  distinto, es donde el plugin de Gradle lo espera). Se agregó el plugin
  `com.google.gms.google-services` (root `build.gradle.kts` lo declara,
  `app/build.gradle.kts` lo aplica) más `firebase-bom` +
  `firebase-messaging`.
- **`data/AgendaFirebaseMessagingService.kt`**: recibe los push que ya
  manda el backend (`recordatoriosEntrevistas.js`, y ahora también
  `emailSync.js`) y los muestra como notificación real del sistema (canal
  `agenda_push`, toca la notificación abre la app). Registrado en
  `AndroidManifest.xml` con el intent-filter
  `com.google.firebase.MESSAGING_EVENT`.
- **Registro del token (`data/FcmTokenProvider.kt`,
  `AuthApi.kt`/`AuthRepository.kt`)**: mismo endpoint que ya usa la web
  (`PUT /auth/fcm-token`, ver `push.service.ts`). `obtenerTokenFcm()`
  envuelve la API con `Task` de Firebase en una funcion `suspend` a mano
  (con `suspendCancellableCoroutine`) para no sumar la dependencia de
  `kotlinx-coroutines-play-services` solo por esto.
- **`MainActivity.kt`**: al entrar a "principal" (mismo momento que el
  saludo de Annie) pide el permiso `POST_NOTIFICATIONS` (Android 13+
  solamente, versiones previas no lo piden) y manda el token actual al
  backend -- se re-registra en cada apertura de la app ya logueada, no
  solo la primera vez, para no quedar con un token viejo si Firebase lo
  rota.
- Verificado con `./gradlew assembleDebug` → `BUILD SUCCESSFUL` (con
  `processDebugGoogleServices` corriendo, confirma que el
  `google-services.json` se procesó bien). Mismo límite de siempre: falta
  probar a mano que llegue una notificación real al celular (por ejemplo
  disparando `recordatoriosEntrevistas.js` o una postulación nueva por
  mail) y que tocarla abra la app.
- **Probado en vivo (2026-09-01):** se mandó un push de prueba a mano
  (script chico con `getMessaging(app).send(...)` contra el `fcm_token`
  real ya guardado) y llegó a la bandeja de notificaciones de Android
  aunque la app estuviera cerrada -- funciona de punta a punta.

**"Mientras no estuviste" portado a la Annie de Android.** Mismo endpoint
que ya usa la web (`GET /annie/actividad-pendiente`, ver más arriba) --
`AnnieViewModel.saludar()` ahora también lo pide y lo suma al saludo:
`"¡Bienvenida a tu Agenda Inteligente! ¿En qué puedo ayudarte hoy,
{nombre}? Mientras no estuviste, pasó esto: {resumen}."`. Se agregó
`AnnieApi.actividadPendiente()` / `AnnieRepository.actividadPendiente()` /
`ActividadPendienteResponse` siguiendo el mismo patrón que el resto de los
endpoints de Annie. Verificado con `./gradlew assembleDebug` →
`BUILD SUCCESSFUL`. Falta probar a mano que el resumen aparezca de verdad
cuando haya actividad pendiente real.

**Configuración -- último placeholder del bottom nav, ahora con paridad
completa con la web.** Pedido explícito de la usuaria: perfil (nombre,
email, foto), contraseña, notificaciones, idioma y apariencia, todo junto.

- **`data/AuthModels.kt`/`AuthApi.kt`/`AuthRepository.kt`**: `PerfilDto`
  pasó de tener solo `nombre` (lo único que usaba el saludo de Annie) a
  los mismos campos que devuelve `GET /auth/perfil`
  (email/foto_perfil/idioma/tema/notificaciones_activas). `NombreUpdate`
  se reemplazó por `PerfilUpdate` (todos los campos opcionales -- Gson por
  defecto omite los que quedan en `null`, así que solo se manda lo que se
  quiere cambiar, igual que `DatosPerfil` en perfil.service.ts). Nuevos
  endpoints: `PUT /auth/email` (devuelve un token nuevo porque el JWT
  lleva el email embebido, se reemplaza el guardado igual que `setToken()`
  en auth.service.ts), `PUT /auth/password`, y
  `POST /auth/foto-perfil` como `@Multipart`.
- **Foto de perfil**: selector nativo de imágenes
  (`ActivityResultContracts.PickVisualMedia`, sin pedir permiso de
  almacenamiento) → se leen los bytes con `ContentResolver` → se suben
  como `MultipartBody.Part`. Para mostrarla no se sumó Coil (una sola
  imagen, no vale la pena la dependencia): `FotoPerfil` en
  `ConfiguracionScreen.kt` arma la URL completa a mano
  (`NetworkModule.BASE_URL`, ahora no-privado, + la ruta relativa que
  devuelve el backend) y decodifica el bitmap con
  `BitmapFactory.decodeStream()` en un hilo de IO.
- **Notificaciones**: el toggle activa/desactiva de verdad -- registra o
  borra (`null`) el token FCM contra el mismo endpoint que ya usa el push,
  y guarda `notificaciones_activas` en el perfil. Esto obligó a ajustar
  `MainActivity.kt`: el registro automático de token al abrir la app ahora
  primero chequea `notificaciones_activas` (si es `0` no re-registra) --
  si no, el auto-registro de cada apertura pisaba la desactivación manual
  en el siguiente `LaunchedEffect`.
- **Idioma y apariencia**: se agregaron como toggles (`FilterChip`) que
  solo actualizan el backend -- Android no tiene i18n ni lee el tema del
  perfil todavía (usa el modo claro/oscuro del sistema, ver `Tema.kt`), así
  que hoy no cambian nada visible en la app. Se dejó un texto chico
  aclarando esto en cada tarjeta para que no parezca roto.
- Verificado con `./gradlew assembleDebug` → `BUILD SUCCESSFUL`. Mismo
  límite de siempre: falta probar a mano cada acción (subir foto, cambiar
  email/contraseña, activar/desactivar notificaciones) contra el backend
  real.

**Foto de perfil visible en la Agenda, no solo en Configuración.** La
usuaria probó Configuración y notó que la foto solo se veía ahí --
"en la pantalla principal no se aprecia el perfil".

- **`ui/common/AvatarPerfil.kt`** (nuevo): se extrajo el `FotoPerfil`
  privado que vivía solo dentro de `ConfiguracionScreen.kt` a un
  composable compartido (`AvatarPerfil(ruta, inicial, tamano)`), para
  poder usarlo también en el encabezado de Agenda. `ConfiguracionScreen.kt`
  ahora lo importa en vez de tener su propia copia.
- **`ui/agenda/AgendaViewModel.kt`**: recibe `AuthRepository` como tercer
  parámetro del constructor; `cargar()` ahora también pide
  `GET /auth/perfil` y guarda `nombreUsuaria`/`fotoPerfilUrl`, igual que ya
  hacía el saludo de Annie -- así si se cambia la foto en Configuración y
  se vuelve a la pestaña Agenda, se ve la nueva sin reabrir la app.
- **`ui/agenda/AgendaScreen.kt`**: el encabezado (antes solo el título
  "Agenda" + "Cerrar sesión") ahora muestra `AvatarPerfil` de 36dp al lado
  del título.
- **`MainActivity.kt`**: se actualizó el `AgendaViewModel.factory(...)`
  para pasar `authRepository`, que ya estaba disponible en `PrincipalScreen`.
- Verificado con `./gradlew assembleDebug` → `BUILD SUCCESSFUL`. Falta
  probar a mano que la foto (o la inicial, si todavía no subió ninguna) se
  vea en la pestaña Agenda.

## Publicación en Google Play

Pedido explícito de la usuaria: dejar la app Android lista para publicarse
**públicamente** (cualquiera la puede instalar), no solo para uso propio.
Esto trajo tres decisiones de fondo, resueltas antes de tocar código (ver
también "Multi-tenancy" y "Límite diario de Annie" más arriba, que son
parte del mismo trabajo):

1. **Alcance: pública.** Motivó la migración de multi-tenancy de arriba —
   sin `usuario_id` en postulaciones/eventos, cualquier cuenta nueva vería
   los datos reales de Ana.
2. **Backend: sigue en la PC de Ana por ahora.** El hosting real en
   internet queda para más adelante, justo antes de enviar la app a
   revisión de verdad — este trabajo deja el *código* listo (firma,
   multi-tenancy, límite de Annie, assets) sin todavía levantar un servidor
   público. Es el único pendiente real para publicar de verdad, ver el
   checklist al final de esta sección.
3. **Costo de Annie: límite diario por cuenta**, no restringirla solo a la
   cuenta dueña ni dejarla sin límite — ver "Límite diario de Annie" en la
   sección de Annie más arriba.

### Firma de release y configuración de build

`android/app/build.gradle.kts` no tenía ningún `signingConfigs` ni
`proguard-rules.pro` — `assembleRelease`/`bundleRelease` producían un
artefacto sin firmar, y `isMinifyEnabled` estaba en `false` (nunca hizo
falta ProGuard hasta ahora).

- **Keystore**: vive fuera del repo (`android/key.properties`, gitignored,
  con `storeFile`/`storePassword`/`keyAlias`/`keyPassword`). El
  `build.gradle.kts` lo carga de forma condicional — si el archivo no
  existe (ej. en una máquina de desarrollo sin el keystore) el build de
  debug sigue andando igual, solo `assembleRelease`/`bundleRelease` de
  verdad lo necesitan. **Generar el keystore es un paso para hacer en vivo
  con Ana**, no algo para decidir en su nombre: perder esas contraseñas
  significa no poder volver a actualizar la app bajo la misma identidad en
  Play. Guardarlas en un gestor de contraseñas, nunca en un archivo junto
  al keystore.
- **`buildTypes.release`**: `isMinifyEnabled = true` +
  `isShrinkResources = true` (antes en `false`), con
  `proguard-rules.pro` nuevo (reglas keep para Retrofit, Gson y Firebase
  Messaging — sin esto, R8 puede renombrar/eliminar justo lo que esas
  librerías necesitan por reflexión y romper el parseo de respuestas del
  backend recién en release, no en debug).
- **`API_BASE_URL` vía `BuildConfig`** (`buildFeatures.buildConfig = true`,
  `buildConfigField` por build type) en vez de la constante hardcodeada
  que tenía antes `NetworkModule.kt` — debug y release apuntan hoy a la
  misma IP LAN (no hay hosting real todavía), pero el día que lo haya,
  cambiar la URL de release es una sola línea de Gradle, sin tocar Kotlin.
- **Logging de OkHttp gateado a debug**: `HttpLoggingInterceptor` corría
  siempre, incluso en release, filtrando metadata de cada request
  (incluido que hay un header `Authorization`) al logcat — ahora usa
  `BuildConfig.DEBUG` para decidir `BASIC` vs `NONE`.
- **`versionCode`/`versionName`**: subieron de `1`/`"0.1"` (placeholders)
  a `2`/`"1.0.0"` para el primer candidato publicable. Convención de acá
  en adelante: `versionCode` +1 en cada subida a Play, para siempre, nunca
  se reutiliza; `versionName` es un semver humano que se sube por release
  con cambios de verdad.
- **`google-services.json` sin gitignorar**: nunca se había commiteado
  (quedaba como archivo sin trackear), pero nada impedía que un `git add
  -A` futuro lo subiera a un repo que podría hacerse público — contiene el
  project id y una API key reales de Firebase. Se agregó al `.gitignore`
  junto con `key.properties`.
- **Verificado en el celular real, no solo con `BUILD SUCCESSFUL`**: se
  compiló `bundleRelease`/`assembleRelease` con R8 activado, se firmó el
  APK con el keystore de debug **solo para esta prueba puntual** (nunca
  para publicar de verdad) y se instaló — Annie saludó por nombre
  correctamente (ejercita Retrofit + deserialización Gson bajo R8, el
  riesgo real de activar la minificación por primera vez) sin ningún
  crash en logcat.

### Assets de la ficha de Play Store

Nueva carpeta `play-store-assets/` (gitignored, mismo criterio que
`imagenes/`), generada con Pillow (Python) por no haber `ImageMagick`
instalado en el entorno:

- **`icon-512.png`**: mismo archivo que ya se usa como ícono de la app
  (`ic_launcher_foto.png`, ya tratado con relleno en un checkpoint
  anterior a partir de `imagenes/Icono Definitivoa.jpeg`) reescalado a
  512×512 PNG plano — mismo diseño en la ficha de Play que en el
  launcher, no un recorte distinto.
- **`feature-graphic-1024x500.png`**: no existía ningún asset en esa
  proporción, así que se compuso desde cero — gradiente diagonal con los
  colores reales de marca (`ui/theme/Tema.kt`: `accentPurple`/
  `accentPurpleDeep`/`accentPink`/`accentPinkDeep`), un par de los
  stickers de flores ya usados en la app como textura de esquina, el
  ícono de la app en una tarjeta blanca redondeada, y el nombre + firma
  "UN PRODUCTO DE ANADESING" en Aclonica. Es un **placeholder
  presentable, no arte final** — Ana puede reemplazarlo después (Procreate/
  Canva) sin tocar ningún código, es solo un archivo que se sube a Play
  Console.

### Todavía necesita a un humano antes de publicar

- **El hosting real del backend: RESUELTO (2026-09-03)**, ver "Suscripción
  paga" más abajo, Fase 0 — `https://agendainteligente.dev`. De paso se
  actualizó lo que quedaba pendiente acá: `API_BASE_URL` del build
  `release` en `android/app/build.gradle.kts` ahora apunta a ese dominio
  (antes la IP de LAN de la PC de Ana), y `android:usesCleartextTraffic`
  salió del manifest principal -- se movió a un overlay
  `android/app/src/debug/AndroidManifest.xml` que solo aplica al build
  `debug` (que sigue usando la IP de LAN para probar local). Verificado
  de verdad, no solo "compila": se generaron `processReleaseMainManifest`/
  `processDebugMainManifest` y `generateReleaseBuildConfig`, y se confirmó
  en los archivos generados que release apunta al dominio real sin
  cleartext y debug sigue con la IP de LAN y cleartext permitido.

- **Keystore de release: generado (2026-09-03)**. `android/agenda-release.jks`
  (gitignored, agregado a `.gitignore` junto con `android/key.properties`
  que faltaba cubrir), alias `agenda-inteligente`, RSA 2048, válido 30
  años (hasta 2056-09-02). Contraseña única para store y key (keytool
  moderno usa PKCS12, que no soporta contraseñas distintas para cada una
  -- quedó documentado acá para no repetir el intento). Contraseña
  entregada a la usuaria para guardar en su gestor de contraseñas, no
  vive en ningún otro lado. **Verificado de verdad**: se corrió
  `assembleRelease` completo (con R8/minify) y se confirmó con
  `apksigner verify --print-certs` que el APK resultante está firmado
  con este keystore (huella SHA-256 `6614...2bc3` coincide con la del
  keystore) -- no alcanza con "compiló bien", firma de verdad.

Quedan pendientes (ninguno se resolvió en este trabajo):

- **Cuenta de desarrollador de Google Play** (pago único de USD 25).
- **Requisito de testing cerrado para cuentas nuevas de Play Console**:
  actualmente Google pide ~12 testers que opten explícitamente y 14 días
  continuos de testing antes de habilitar producción — conviene verificar
  la cifra exacta al momento de publicar, Google la ha cambiado antes.
- **Política de privacidad**: hace falta redactarla (qué se recolecta:
  email, hash de contraseña, foto de perfil, contenido de postulaciones/
  eventos, token FCM, texto que se manda a Anthropic/ElevenLabs vía Annie)
  y alojarla en algún lado con URL pública — esto **no** depende del
  hosting del backend, se puede resolver ya (ej. GitHub Pages).
- **Formulario de seguridad de datos de Play Console**: tiene que declarar
  con honestidad que hoy el tráfico va sin cifrar (HTTP plano en LAN) hasta
  que haya hosting real, y que no existe todavía un flujo de borrado de
  cuenta desde la app (Play generalmente lo espera).
- **Cuestionario de clasificación de contenido.**

### Fase 3 — Modal de pago del frontend (2026-09-03)

`suscripcion.service.ts` + `shared/paywall/` (modal), calcados del molde
que ya planteaba el plan (`.login-card` + backdrop de `.sidebar-backdrop`
sin la restricción a mobile). El interceptor lo prende ante cualquier 402
con `suscripcion_requerida`. **Diferencia con el plan original**: el modal
se puede cerrar ("Ahora no") -- con el cambio de "Postulaciones siempre
paga" (ver más abajo) ya no tiene sentido un bloqueo total de toda la app,
solo se interrumpe cuando de verdad se pidió algo de Postulaciones.

El polling de fondo de Postulaciones en `Shell` (corre en cualquier
pantalla) se marca `silencioso` (nuevo `HttpContext` `SILENCIAR_PAYWALL`)
para no disparar el modal solo por tener la app abierta sin haber entrado
a Postulaciones -- si no, cualquier cuenta en prueba vería el paywall
aparecer solo cada 60s (el intervalo de ese polling).

Pestaña "Suscripción" nueva en Configuración. `GET /suscripcion` suma
`postulaciones_permitido` (calculado en el backend con
`tienePagoActivo()`) para que el frontend no compare fechas contra su
propio reloj -- evita el clásico bug de desfasar con la hora del servidor.

**Verificado**: build de producción sin errores de TypeScript, desplegado
a la VM, `GET /suscripcion` devuelve `postulaciones_permitido` correcto
para la cuenta de prueba real. **No verificado**: el flujo completo en un
navegador real (abrir el modal, tocar "Suscribirme ahora", ver el checkout)
-- no hay forma de manejar un navegador desde este entorno: falta que
alguien lo prueba a mano.

### Ajustes post-lanzamiento (2026-09-03)

- **Cupo diario de Annie bajado de 40 a 20** (`ANNIE_LIMITE_CHAT_DIARIO`/
  `ANNIE_LIMITE_TTS_DIARIO` en `.env`, sin tocar código).
- **La cuenta dueña ya no tiene límite de Annie** (`annieLimite.js`,
  `esOwner()`) -- hasta ahora el cupo aplicaba por igual a todas las
  cuentas, incluida la de Ana.

### Correo por cuenta (2026-09-03, código completo, pendiente de probar con un mail real)

Hasta ahora `emailSync.js` corría contra **una sola casilla fija** (`IMAP_*`
en `.env`, siempre la cuenta dueña) -- para cualquier otra cuenta pública,
la detección automática de postulaciones por mail simplemente no corría.
Pedido explícito de la usuaria al darse cuenta de esto: generalizar a
cualquier cuenta, con el mismo criterio que ya usa Computrabajo (contraseña
de aplicación encriptada, no la contraseña real -- se evaluó OAuth con
Gmail/Outlook primero, pero se descartó por la verificación de scopes
restringidos de Google, que puede tardar semanas y no depende de nosotras).

- **`usuarios.imap_email`/`imap_host`/`imap_password_enc`** (migración en
  `db.js`, mismo patrón que `computrabajo_password_enc`).
- **`PUT /auth/imap`** / **`DELETE /auth/imap`**: la usuaria carga su email
  + contraseña de aplicación. El host IMAP se auto-detecta por el dominio
  del email para los proveedores más comunes (Gmail, Outlook/Hotmail,
  Yahoo, iCloud) -- si no lo reconoce, pide que lo escriba a mano.
- **`emailSync.js` reescrito**: la lógica de sincronizar un buzón se separó
  en `sincronizarMailbox(cfg, usuarioId)`, reusada tanto para la casilla
  fija de la dueña (sin tocar, para no arriesgar lo que ya funciona en
  producción) como en un loop nuevo sobre todas las cuentas que conectaron
  su propio correo. Cada cuenta se sincroniza en su propio try/catch -- una
  contraseña vencida o un servidor caído en una cuenta no frena la
  sincronización del resto.
- Nueva sección "Correo" en Configuración (calcada de Computrabajo), con
  aviso explícito de que es una contraseña de aplicación, no la real.
- **Probado en frío**: se conectó una cuenta de prueba con contraseña
  inválida a propósito y se corrió `sincronizarEmails()` completo -- la
  casilla real de la dueña sincronizó normal, la cuenta falsa falló su
  conexión IMAP y quedó registrado el error sin interrumpir nada más.
  **Falta probar con una casilla real de otra cuenta** para confirmar que
  detecta postulaciones de verdad, no solo que no rompe nada.
- **Bug serio encontrado y arreglado en la prueba en vivo**: al fallar la
  conexión IMAP de una cuenta real (contraseña inválida), unos segundos
  después de que el error ya se había capturado bien, ImapFlow emitía un
  segundo evento `'error'` tardío del socket -- sin nadie escuchándolo,
  Node lo trata como no manejado y **tira abajo el proceso completo del
  backend**, no solo esa cuenta. `systemd` lo reinicia solo, pero esto
  significaba que un solo problema de red en una cuenta cualquiera podía
  voltear el backend para todas las usuarias cada 10 minutos. Arreglado
  con `client.on('error', ...)` en `sincronizarMailbox()`. También se
  agregaron timeouts más cortos a la conexión IMAP (antes el default de
  ImapFlow dejaba colgado un intento hasta 90s/5min sin límite propio).
  Ambos arreglos ya verificados en vivo: se repitió la prueba con la misma
  cuenta y el proceso ya no se cae, el error queda solo logueado.
- **Pendiente para Ana**: la cuenta de prueba (`anahrnandz96@gmail.com`)
  sigue dando "Command failed" al autenticar -- lo más probable es que se
  haya cargado la contraseña real de Google en vez de una contraseña de
  aplicación generada para esto.

## Suscripción paga (SaaS, en curso desde 2026-09-02)

Pedido de la usuaria: convertir la app en un producto real -- cualquiera se
registra, prueba gratis 14 días, y después paga **$10.000 CLP/mes** para
seguir usándola (web y Android, sin nivel gratis limitado: al vencer la
prueba, bloqueo total hasta pagar). Pago web con MercadoPago (suscripción
recurrente), pago Android con Google Play Billing *dentro* de la app
(decisión explícita de la usuaria, aceptando la comisión de Google a cambio
de no depender de un solo canal). Un solo estado de suscripción por cuenta,
reconocido desde cualquiera de los dos medios de pago.

Plan completo (fases, decisiones de diseño con motivo, qué es código vs qué
tiene que resolver la usuaria) en
`/home/ana/.claude/plans/sharded-shimmying-cerf.md` -- éste es el resumen
de qué se hizo realmente, actualizado a medida que avanza cada fase.

### Fase 0 — Hosting real (COMPLETA)

Antes esto vivía solo en la PC de Ana (IP de LAN, ver "Publicación en
Google Play" arriba) -- eso se resolvió acá:

- **Proyecto GCP**: se reusó `turnero-ec3cd` (el mismo que ya usaba
  Firebase para push) en vez de crear uno nuevo, con la cuenta personal de
  la usuaria (`anahrnandz96@gmail.com`) -- **importante**: la cuenta activa
  de `gcloud` en este entorno estaba en la cuenta del trabajo de la usuaria
  al arrancar esta fase; se cambió explícitamente antes de crear nada, para
  no mezclar el proyecto personal con la cuenta laboral.
- **VM**: `agenda-backend`, Compute Engine, Ubuntu 24.04 LTS, `e2-small`,
  zona `southamerica-west1-a` (Santiago -- mejor latencia para usuarios en
  Chile que el nivel gratuito de GCP, que no existe en una región
  chilena). IP externa **estática** `34.176.30.239` (reservada aparte, no
  efímera). Firewall: solo `80`/`443` abiertos al mundo; SSH únicamente por
  túnel IAP de GCP (`gcloud compute ssh ... --tunnel-through-iap`), puerto
  22 nunca expuesto directo.
- **Dominio**: `agendainteligente.cl` no se pudo (los `.cl` son dominios de
  país, Google/Cloud Domains no los maneja -- hay que sacarlos directo en
  NIC Chile con RUT/ClaveÚnica, eso queda para la usuaria si lo quiere más
  adelante). `agendainteligente.app` se buscó disponible pero se lo ganó
  otra persona en el rato entre la búsqueda y el registro (dato curioso:
  los dominios pueden dejar de estar disponibles muy rápido). Se registró
  **`agendainteligente.dev`** en su lugar (12 USD/año, vía `gcloud domains
  registrations register`, con Cloud DNS como backend de DNS) -- `.dev` (
  igual que `.app`) fuerza HTTPS siempre por HSTS preload, así que no hay
  forma de que el sitio quede sirviendo HTTP plano por error. Zona Cloud
  DNS `agendainteligente-dev` con un registro A apuntando a la IP estática.
- **Software en la VM**: Node 24.x LTS (NodeSource), `git clone` del repo
  en `/opt/agenda`. `better-sqlite3` y Puppeteer necesitaron aprobar sus
  install scripts a mano (`npm install-scripts approve ...` -- gate nuevo
  de npm que bloquea scripts de instalación por default) y Puppeteer
  además necesitó un paquete de librerías del sistema que Ubuntu server no
  trae por default (`libnss3`, `libnspr4`, `libatk-bridge2.0-0t64`, etc. --
  sin esto Chromium no arranca, error `libnspr4.so: cannot open shared
  object file`). Verificado en vivo: Chromium headless efectivamente
  levanta y navega en la VM (necesario para el scraper de Computrabajo).
- **`systemd`**: unidad `agenda-backend.service` (`ExecStart=node
  index.js`, `Restart=on-failure`, `EnvironmentFile=/opt/agenda/backend/.env`),
  arranca solo en cada boot.
- **Caddy**: reverse proxy a `localhost:4000`, HTTPS automático (Let's
  Encrypt) apenas el DNS del dominio resolvió -- el primer intento falló
  porque el DNS todavía no había propagado en ese momento exacto (Caddy
  cayó a un certificado de *staging*, no confiable, hasta el reintento
  siguiente con DNS ya resuelto). `Caddyfile` en `/etc/caddy/Caddyfile` en
  la VM (no versionado en el repo).
- **Backups**: snapshot diario automático del disco de la VM (política de
  GCP, 14 días de retención) -- story de backup razonable para una base
  SQLite de este tamaño.
- **Secretos y datos reales**: `.env`, `firebase-service-account.json`,
  `turnero.sqlite` y `uploads/` de la usuaria se copiaron a la VM por
  `scp` (nunca por git, siguen gitignored) y quedaron con permisos `600`.
  De acá en más la copia de la VM es la real.
- **Verificado en vivo**: `https://agendainteligente.dev/health` responde
  desde internet, con certificado HTTPS válido, y `/auth/login` devuelve
  el error esperado ante credenciales inválidas -- toda la app tal como
  estaba antes de esta tarea sigue funcionando igual, ahora en un servidor
  real.

Redeploy en cada fase siguiente: `git pull && npm ci && sudo systemctl
restart agenda-backend` en la VM (backend); build + copia de `dist/` para
el frontend (todavía no desplegado, ver fase 3 del plan).

**Frontend desplegado (2026-09-03)**, antes de terminar la fase 3 completa
(todavía falta el modal de pago) -- pedido explícito de la usuaria para
que su familia pueda probar la app ya. `https://app.agendainteligente.dev`
(subdominio nuevo, DNS agregado vía `gcloud dns record-sets create`; el
dominio raíz sigue siendo el backend, sin tocar, para no romper el
`back_url` de MercadoPago ni nada que ya apuntara ahí). Caddy sirve los
archivos estáticos desde `/opt/agenda-frontend` en la VM (`root` +
`try_files {path} /index.html` + `file_server`, bloque nuevo agregado al
`Caddyfile` a mano, no versionado). `FRONTEND_URL` del backend ahora
incluye ese origen para CORS. Redeploy del frontend de acá en más: `ng
build` local, `gcloud compute scp --recurse dist/frontend/browser/*
agenda-backend:/opt/agenda-frontend/`.

`environment.prod.ts` + `fileReplacements` en `angular.json`
(`configurations.production`) para que el build de producción apunte a
`https://agendainteligente.dev` en vez de `localhost:4000` -- no existía
ninguno de los dos antes de esto. De paso se subió el presupuesto
`anyComponentStyle` (4kB/8kB estaba desactualizado, varios componentes ya
lo superaban y nunca se había notado por no haber corrido un build de
producción hasta ahora).

**Verificado en vivo**: HTTPS con certificado real de Let's Encrypt
emitido al toque (el DNS ya estaba propagado, a diferencia del primer
intento de la fase 0), rutas de Angular con fallback a `index.html`
(`/postulaciones` devuelve 200), y CORS del backend aceptando el origen
nuevo (`OPTIONS /auth/login` con `Origin:
https://app.agendainteligente.dev` responde `access-control-allow-origin`
correcto).

### Fase 1 — Base de datos, prueba/suscripción, bloqueo (backend listo, sin desplegar ni commitear todavía)

- **`backend/db.js`**: nuevas columnas en `usuarios` (mismo patrón
  idempotente `PRAGMA table_info` + `ALTER TABLE` que ya usa el archivo) --
  `fecha_fin_prueba`, `suscripcion_vence`, `suscripcion_fuente`,
  `mercadopago_preapproval_id`, `google_play_purchase_token`. Backfill a
  14 días desde hoy para cuentas que ya existían (si no, quedarían
  bloqueadas de golpe el día del deploy). Tabla nueva `suscripcion_eventos`
  (log de auditoría de webhooks, mismo espíritu que
  `actividad_postulaciones`).
- **`backend/suscripcion.js`** (nuevo, mismo molde que `annieLimite.js`):
  `estadoDe(usuarioId)` calcula "permitido" comparando `datetime('now')`
  de SQLite contra las dos fechas -- la cuenta dueña (`es_owner`) nunca se
  bloquea. `TRIAL_DIAS` (14) y `PRECIO_CLP` (10000) configurables por
  variable de entorno.
- **`backend/middleware/requireSuscripcionActiva.js`** (nuevo, calcado de
  `requireOwner.js`): 402 + `{ suscripcion_requerida: true }` si la cuenta
  no tiene prueba ni suscripción vigente.
- **`backend/routes/suscripcion.js`** (nuevo): `GET /suscripcion` devuelve
  el estado completo -- sin el gate de arriba a propósito, tiene que seguir
  accesible mientras la cuenta está bloqueada (para poder pagar).
- **`backend/index.js`**: `requireSuscripcionActiva` montado en
  `/postulaciones`, `/eventos`, `/annie`, `/recordatorios-voz` (no en
  `/mails-revision`, fuera del alcance de esta fase). De paso,
  `FRONTEND_URL` ahora acepta una lista separada por comas para CORS (antes
  un solo origen).
- **`backend/routes/auth.js`**: `POST /register` ahora setea
  `fecha_fin_prueba` a `TRIAL_DIAS` días desde el alta.
- **Probado en frío** (sin levantar el server, por pedido de la usuaria):
  los 4 escenarios -- cuenta dueña, prueba vigente, prueba vencida sin
  pagar (bloqueada), prueba vencida pero con `suscripcion_vence` futuro
  (permitida de nuevo) -- dan el resultado esperado, probado directo contra
  `estadoDe()`.
- **Pendiente en esta fase**: probar con el server real corriendo
  (`npm run dev`, no lo corrió el asistente a propósito), desplegar a la
  VM, y commitear -- quedó cortado ahí por necesidad de reiniciar la
  consola.

### Fase 2 — MercadoPago (backend escrito, bloqueado por la cuenta de MercadoPago)

Código listo (`backend/mercadopagoApp.js`, `backend/routes/suscripcion.js` --
`POST /mercadopago/checkout` --, `backend/routes/webhooks.js`), sin
commitear todavía. El endpoint de checkout funciona -- crea el
`PreApproval` y devuelve `init_point` -- pero **no se pudo completar un
pago de prueba real**, ni con tarjetas/usuarios de prueba oficiales de
MercadoPago ni con un monto chico real ($1.000 CLP):

- Con comprador de prueba oficial (`Cuentas de prueba` del panel) +
  cobrador real: la creación del `PreApproval` funciona, pero al cargar la
  tarjeta de prueba en el checkout hospedado da "No puedes pagar con esta
  tarjeta" apenas se escribe el número, antes de completar el resto del
  formulario.
- Con cualquier `payer_email` real (el de Ana, el interno de la app) +
  cobrador real: `PreApproval.create` rechaza directo con `"Both payer and
  collector must be real or test users"`.
- Crear usuarios de prueba por API (`POST /users/test`) con el token de
  producción: `"the caller.id must be a productive user"`.
- Listar usuarios de prueba (`GET /users/test`): bloqueado por política de
  MercadoPago (`PA_UNAUTHORIZED_RESULT_FROM_POLICIES`).
- La cuenta vendedora real tiene `seller_experience: "NEWBIE"` (cuenta
  nueva, sin historial de ventas) -- hipótesis más probable: MercadoPago
  restringe Preapproval (suscripciones/débito recurrente) para cuentas
  nuevas hasta algún paso de verificación adicional que no queda expuesto
  por la API.
- Dato aparte encontrado en el camino: la pestaña "Credenciales de prueba"
  del panel (logueada como la cuenta real) no da un token de sandbox
  aislado -- da el access token de **otra cuenta MercadoPago real y
  personal** de Ana (`anaalegarciaher@gmail.com`), no una cuenta ficticia.

**Pendiente**: Ana tiene que consultarlo directo con soporte de
MercadoPago (tienen visibilidad de su cuenta que la API no expone) --
pregunta concreta: si la cuenta vendedora necesita algún paso de
verificación para poder usar Preapproval. Hasta que eso se resuelva, el
código no se puede probar de punta a punta con un pago real.

Se probó también con "Recibir pagos" activado (estaba apagado en el
perfil de Negocio) -- no cambió el resultado, sigue el mismo error de
tarjeta. Descarta esa hipótesis puntual, pero no cambia la recomendación
de arriba.

### Siguiente (fases 3-5 del plan, sin arrancar)

Frontend web (modal de pago + pestaña de Configuración), Google Play
Billing en Android (cliente + verificación server-side vía Google Play
Developer API + notificaciones en tiempo real vía Pub/Sub). Detalle
completo de cada una en el archivo de plan mencionado arriba.
