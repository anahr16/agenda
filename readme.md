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
con las ofertas) vive aparte, en `backend/perfil.txt` — texto plano, no en
SQLite y no se sube a git (tiene datos personales). Ver sección de
compatibilidad más abajo.

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
| POST   | `/postulaciones/recalcular-compatibilidad` | Recalcula `compatibilidad_oferta` de todas las postulaciones con `descripcion` (mismo botón de la UI) _(requiere login)_ |
| GET    | `/mails-revision`     | Listar mails sin identificar pendientes de revisión _(requiere login)_ |
| DELETE | `/mails-revision/:id` | Sacar un mail de la bandeja de revisión (al cargarlo como postulación o al descartarlo) _(requiere login)_ |
| GET    | `/eventos`            | Listar eventos/recordatorios de la Agenda _(requiere login)_ |
| POST   | `/eventos`            | Crear evento (`titulo`, `fecha` obligatorios; `hora`, `notas`, `tipo` opcionales — `tipo` default `personal`) _(requiere login)_ |
| PUT    | `/eventos/:id`        | Editar evento _(requiere login)_ |
| DELETE | `/eventos/:id`        | Borrar evento _(requiere login)_ |
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
`ANTHROPIC_API_KEY`): se le pasa el contenido de `backend/perfil.txt` (el
perfil/CV de la usuaria, texto plano) más la `descripcion` de la oferta, y
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

**`backend/perfil.txt`:** el perfil/CV en texto plano contra el que se
compara cada oferta — no vive en la base de datos para poder editarlo a
mano directamente (por ejemplo si el CV cambia) sin tener que re-exportar
un PDF ni escribir un script. No se sube a git (`backend/.gitignore`)
porque tiene datos personales (nombre, mail, teléfono). Después de editar
este archivo, o para rellenar postulaciones viejas creadas antes de este
módulo, correr desde `backend/`:

```
node recalcularCompatibilidad.js
```

Recalcula `compatibilidad_oferta`/`compatibilidad_razon` para todas las
postulaciones que ya tienen `descripcion` cargada. Lo mismo está
disponible como botón **"Recalcular compatibilidad"** en la pantalla de
Postulaciones (`POST /postulaciones/recalcular-compatibilidad`), para no
tener que abrir una terminal.

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

En el encabezado de Agenda también hay un chip de **"Próximo evento"**
(`proximoEventoChip` en `agenda.ts`), al lado del de "Próxima entrevista",
con el mismo criterio: el evento más cercano que todavía no pasó.

**Vista mes**: grilla de 42 celdas (como antes), cada día muestra un chip
de texto si tiene entrevista(s) y un puntito morado si tiene evento(s)
(leyenda arriba del calendario). Al hacer click en un día se selecciona
(se resalta) y se cargan sus notas/eventos/entrevistas abajo.

**Vista semana**: un timeline con las horas de 7 a 22 en el eje vertical
(`HORA_INICIO_SEMANA`/`HORA_FIN_SEMANA` en `agenda.ts`) y los 7 días de la
semana como columnas. Los eventos con hora y las entrevistas se posicionan
verticalmente según su horario (`posicionVertical()`, en base a
`alturaHoraRem = 3` — si dos caen a la misma hora se superponen
visualmente, no hay lógica de repartirlos en columnas, es un caso raro
para un uso personal). Los eventos sin hora aparecen en una franja "todo
el día" arriba de la columna, antes del timeline. La semana se calcula
siempre a partir del día seleccionado (`fechaSeleccionada`), así que
cambiar de vista mes ↔ semana mantiene el mismo día como referencia.

Debajo del calendario, la tarjeta **"Eventos de este día"** lista los
eventos del día seleccionado con acciones de editar/borrar, y el
formulario de carga (mismo botón "Agregar evento") viene precargado con
esa fecha. Las notas de texto libre por día siguen guardándose en
`localStorage` del navegador (no en la base), sin cambios respecto a
antes.

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
