# Turnero

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
- [x] Módulo de postulaciones de trabajo (CRUD + panel de estadísticas),
      carga manual por ahora — ver sección propia más abajo
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

### Base de datos

SQLite, archivo `backend/turnero.sqlite` (se crea solo al arrancar, no se
sube a git). El esquema (tablas `clientes`, `citas` y `usuarios`) se define
en `backend/db.js` y se aplica automáticamente cada vez que arranca el
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
| GET    | `/postulaciones`      | Listar postulaciones de trabajo _(requiere login)_ |
| GET    | `/postulaciones/stats`| Conteos por estado y por portal, para el panel de análisis _(requiere login)_ |
| GET    | `/postulaciones/:id`  | Obtener una postulación _(requiere login)_ |
| POST   | `/postulaciones`      | Crear postulación (`empresa`, `puesto`, `fecha_postulacion` obligatorios; `portal`, `descripcion`, `link`, `estado`, `notas` opcionales) _(requiere login)_ |
| PUT    | `/postulaciones/:id`  | Editar postulación _(requiere login)_ |
| DELETE | `/postulaciones/:id`  | Borrar postulación _(requiere login)_ |

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
- Si la pestaña de Turnero está en primer plano (enfocada), el aviso lo
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
puesto), `link`, `fecha_postulacion` y `estado` (`enviada` → `vista` →
`entrevista` → `rechazada`/`oferta`, default `enviada`). `GET
/postulaciones/stats` devuelve el total y los conteos por estado y por
portal que arma el panel de análisis en el frontend.

**Por ahora la carga es 100% manual** — no hay integración con LinkedIn ni
con los portales de empleo (scrapearlos violaría sus términos de servicio y
no es confiable). La idea a futuro es detectar automáticamente los cambios
de estado leyendo las notificaciones que ya llegan por email (Gmail
API/IMAP), en vez de scrapear los sitios; queda pendiente definir con qué
proveedor de correo y cómo dar acceso.

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

### Sobre la migración futura a Android

Esta web es intencionalmente una capa fina sobre la misma API
(`backend/`) que va a usar la futura app Android — mismos endpoints, mismo
login, mismo formato de fechas. Migrar más adelante implica reimplementar
estas mismas pantallas en Java + Retrofit; el backend no debería necesitar
cambios.
