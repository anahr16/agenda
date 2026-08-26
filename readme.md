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
- [x] Annie: asistente conversacional en el sidebar (Claude API) — feed de
      actividad real de postulaciones y chat para agendar/mover entrevistas
      por lenguaje natural, con recordatorio push antes de cada entrevista
      (igual que las citas) — ver sección propia más abajo
- [ ] App Android (Java + Retrofit) — migración futura de la web

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
| `RECORDATORIO_MINUTOS_ANTES` | Con cuántos minutos de anticipación se manda el recordatorio de una cita. Default `30`. |
| `FRONTEND_URL` | Origen permitido por CORS para llamar a la API. Default `http://localhost:4200` (donde corre el frontend Angular en desarrollo). |
| `IMAP_HOST` | Servidor IMAP para la sincronización de postulaciones por email (ver sección de postulaciones). Default `imap.gmail.com`. |
| `IMAP_USER` | Casilla de Gmail a leer. Vacío = sincronización desactivada. |
| `IMAP_APP_PASSWORD` | Contraseña de aplicación de esa casilla (no la contraseña normal de la cuenta). |
| `EMAIL_SYNC_DIAS_ATRAS` | Cuántos días hacia atrás revisa el cron de sincronización de postulaciones en cada corrida. Default `3`. |
| `TELEGRAM_BOT_TOKEN` | Token del bot de Telegram para los recordatorios de seguimiento (ver esa sección). Vacío = modo simulado. |
| `TELEGRAM_CHAT_ID` | Chat o canal de Telegram al que se mandan los recordatorios. |
| `SEGUIMIENTO_POSTULACIONES_DIAS` | Días sin novedades antes de mandar el recordatorio de seguimiento. Default `2`. |
| `ANTHROPIC_API_KEY` | Clave de la API de Claude (console.anthropic.com) para el chat con Annie. Vacío = `POST /annie/chat` responde 503. |
| `ELEVENLABS_API_KEY` | Clave de ElevenLabs (elevenlabs.io/app/settings/api-keys) para la voz de Annie. Vacío = `POST /annie/tts` responde 503 y el frontend cae a la voz gratis del navegador. |
| `ELEVENLABS_VOICE_ID` | ID de la voz a usar (`GET /v1/voices` o el botón "Copy voice ID" en My Voices). **Tiene que ser una voz `premade`** (las que vienen con la cuenta gratis) — las del Voice Library son de pago, devuelven 402 en plan free. |

### Base de datos

SQLite, archivo `backend/turnero.sqlite` (se crea solo al arrancar, no se
sube a git). El esquema (tablas `clientes`, `citas`, `usuarios`,
`postulaciones` y `postulaciones_emails_procesados`) se define en
`backend/db.js` y se aplica automáticamente cada vez que arranca el
server.

### Autenticación

Login simple para el dueño de la agenda con email + password (hasheado con
bcrypt) y token JWT (30 días de vigencia). Las rutas `/clientes` y `/citas`
requieren el header `Authorization: Bearer <token>`; `/auth` es pública.

### Endpoints

| Método | Ruta               | Descripción                          |
|--------|--------------------|---------------------------------------|
| GET    | `/health`          | Chequeo de que el servidor está vivo |
| POST   | `/auth/register`   | Crear usuario dueño (`email`, `password`) |
| POST   | `/auth/login`      | Login, devuelve `{ token }`          |
| PUT    | `/auth/fcm-token`  | Guardar el token FCM del dispositivo del dueño (requiere login) |
| GET    | `/clientes`        | Listar clientes _(requiere login)_   |
| GET    | `/clientes/:id`    | Obtener un cliente _(requiere login)_ |
| POST   | `/clientes`        | Crear cliente (`nombre` obligatorio, `telefono` opcional) _(requiere login)_ |
| PUT    | `/clientes/:id`    | Editar cliente _(requiere login)_    |
| DELETE | `/clientes/:id`    | Borrar cliente _(requiere login)_    |
| GET    | `/citas`           | Listar citas _(requiere login)_      |
| GET    | `/citas/:id`       | Obtener una cita _(requiere login)_  |
| POST   | `/citas`           | Crear cita (`cliente_id`, `inicio`, `fin` obligatorios; `estado` opcional, por defecto `confirmada`; `notas` opcional) _(requiere login)_ |
| PUT    | `/citas/:id`       | Editar cita _(requiere login)_       |
| DELETE | `/citas/:id`       | Borrar cita _(requiere login)_       |
| GET    | `/postulaciones`      | Listar postulaciones de trabajo, ordenadas por `fecha_postulacion DESC, creado_en DESC` _(requiere login)_ |
| GET    | `/postulaciones/stats`| Conteos por estado y por portal, para el panel de análisis _(requiere login)_ |
| GET    | `/postulaciones/:id`  | Obtener una postulación _(requiere login)_ |
| POST   | `/postulaciones`      | Crear postulación (`empresa`, `puesto`, `fecha_postulacion` obligatorios; `portal`, `descripcion`, `link`, `estado`, `fecha_entrevista`, `notas` opcionales) _(requiere login)_ |
| PUT    | `/postulaciones/:id`  | Editar postulación _(requiere login)_ |
| DELETE | `/postulaciones/:id`  | Borrar postulación _(requiere login)_ |
| POST   | `/annie/chat`         | Chat con Annie (`mensaje`, `historial` opcional). Devuelve `{ respuesta, historial, acciones }` _(requiere login)_ |
| POST   | `/annie/tts`          | Texto a voz de Annie vía ElevenLabs (`texto`). Devuelve el audio (`audio/mpeg`) _(requiere login)_ |

**Formato de fechas:** `inicio` y `fin` de una cita deben mandarse en UTC,
formato ISO 8601 sin zona horaria, ej: `2026-08-22T10:00:00`. Es lo que
compara el scheduler de recordatorios contra la hora actual.

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
`entrevista` → `rechazada`/`oferta`, default `enviada`) y
`fecha_entrevista` (opcional, fecha y hora de la entrevista si la hay).
`GET /postulaciones/stats` devuelve el total y los conteos por estado y
por portal que arma el panel de análisis en el frontend.

Las postulaciones con `fecha_entrevista` cargada aparecen también en la
pantalla de **Agenda** (día y semana), junto con las citas normales pero
diferenciadas visualmente, para tener las entrevistas de trabajo en el
mismo calendario.

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

**Portales soportados hoy:** Chiletrabajos (`chiletrabajos.cl`),
Computrabajo (`computrabajo.com`), LinkedIn (`linkedin.com`) y
Trabajando.cl (`trabajando.com`). Para sumar un portal nuevo, o un cambio
de estado que todavía no esté cubierto (ej. entrevista, o el "te
descartaron" de Chiletrabajos), hace falta un mail de ejemplo real
(remitente + asunto + cuerpo) para escribir la regla en `emailParsers.js`.

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
- **Los ATS propios de cada empresa (ej. pandape.com, TicMoAI) no están
  cubiertos por un parser propio**: cuando una empresa gestiona el proceso
  en su propio sistema (mensajes, tests, revisión de antecedentes) esos
  mails no matchean ningún parser porque no vienen de un portal de empleo,
  vienen de la herramienta interna de esa empresa. La postulación se crea
  igual desde el mail de confirmación del portal original, pero el estado
  no se actualiza solo a partir de ahí. Para no perderse estos casos hay
  una red de contención — ver más abajo.

**Red de contención para remitentes desconocidos:** si un mail no viene de
ninguno de los 4 portales de arriba (ej. el ATS propio de una empresa como
TicMoAI, avisando "revisaremos tu perfil más adelante"), antes se
descartaba en silencio sin siquiera leerlo. Ahora, `emailSync.js` igual lee
el asunto y el cuerpo y los compara contra una lista de palabras clave de
RR.HH. en `emailParsers.js` (`pareceLaboral()` — "postulación",
"entrevista", "tu perfil", "hiring", etc., en español e inglés); si
matchea alguna, manda un aviso por Telegram con el remitente, el asunto y
un extracto, para revisarlo a mano y cargarlo en Postulaciones si
corresponde. Mismo criterio para un mail que sí viene de un portal
conocido pero cuyo formato cambió y el parser no lo pudo extraer. Es una
heurística por palabras clave, no un parser — puede haber falsos negativos
(un mail de RR.HH. que no use ninguna de esas palabras) pero no falsos
positivos ruidosos con el resto del correo (facturas, newsletters, etc.).
Esto lee el cuerpo completo de **cualquier mail** de la casilla en la
ventana de `EMAIL_SYNC_DIAS_ATRAS` que no sea de un portal conocido —
la clasificación corre toda local (nada se manda a ningún servicio
externo para esto, ver `pareceLaboral()`), solo se usa para decidir si
avisar por Telegram o no.

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

### Annie (asistente conversacional)

`backend/routes/annie.js` conecta con la API de Claude (`@anthropic-ai/sdk`,
modelo `claude-sonnet-5`) para que Annie entienda pedidos en lenguaje natural
del tipo "agendame una entrevista con Google el jueves a las 10". El backend
le pasa a Claude, como contexto del sistema, la lista de postulaciones
actuales (hasta 30, para que pueda reconocer empresas ya cargadas) y una
única herramienta:

- **`agendar_entrevista`** (`empresa`, `puesto` opcional, `fecha_entrevista`
  ISO 8601): si ya existe una postulación con esa empresa, le actualiza
  `fecha_entrevista` y pone `estado: 'entrevista'`; si no existe, crea una
  postulación nueva con esos datos.

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
`RECORDATORIO_MINUTOS_ANTES`, push por Firebase Cloud Messaging a todos los
`fcm_token` guardados), pero mirando `postulaciones.fecha_entrevista` en vez
de `citas.inicio`. Usa la columna `recordatorio_entrevista_enviado` (se
resetea a `0` si se reprograma la entrevista, para que avise de nuevo). La
inicialización de Firebase se compartió a `backend/firebaseApp.js` (antes
vivía duplicada en `recordatorios.js`) porque el SDK de Firebase Admin
tira error si se llama `initializeApp()` más de una vez.

### Nota sobre hot-reload en WSL

Si el proyecto vive en `/mnt/c/...` (filesystem de Windows montado en WSL),
ni `node --watch` (backend) ni el watcher de `ng serve` (frontend) detectan
siempre los cambios guardados, porque ese mount no dispara los eventos de
inotify de forma confiable. Si un cambio no se refleja, cortar el proceso
del todo (`Ctrl+C`, no alcanza con `Ctrl+Z` que solo lo suspende y deja el
puerto ocupado) y volver a correr `npm run dev` / `npm start`. La solución
de fondo es mover el proyecto a un path nativo de Linux (ej.
`~/proyectos/...`).

## Frontend (`frontend/`)

Angular standalone (sin server-side rendering). Pantallas: login/registro
del dueño, clientes (alta/edición/borrado), agenda (vista día/semana,
alta/edición/cancelación/borrado de citas, botón para activar los
recordatorios push del navegador) y postulaciones (alta/edición/borrado,
filtro por estado y panel con conteos/porcentajes por estado).

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
| `firebase` | Config del proyecto Firebase (Configuración del proyecto → General → Tus apps → agregar app Web). Mientras quede vacío, el botón de recordatorios se oculta. |
| `vapidKey` | Clave VAPID del proyecto (Configuración del proyecto → Cloud Messaging → Certificados push web). |

**Importante:** `public/firebase-messaging-sw.js` (el service worker que
recibe las notificaciones en segundo plano) necesita los mismos valores de
`firebase` duplicados a mano ahí adentro — un service worker no puede
importar `environment.ts`. Es el mismo proyecto de Firebase que ya se
configuró para el backend (`FIREBASE_SERVICE_ACCOUNT_PATH`), solo que acá
se usan las credenciales públicas de la app Web en vez de la cuenta de
servicio.

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

### Sobre la migración futura a Android

Esta web es intencionalmente una capa fina sobre la misma API
(`backend/`) que va a usar la futura app Android — mismos endpoints, mismo
login, mismo formato de fechas. Migrar más adelante implica reimplementar
estas mismas pantallas en Java + Retrofit; el backend no debería necesitar
cambios.
