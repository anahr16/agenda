# Turnero

Agenda de citas con recordatorios automáticos para profesionales que cobran
por su tiempo (consultores, terapeutas, tatuadores, manicuristas,
fotógrafos, etc.).

## Stack

- **Backend:** Node.js + Express + SQLite
- **App:** Android nativa en Java, conectada al backend vía Retrofit
- **Notificaciones:** push antes de cada cita, vía Firebase Cloud Messaging

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
- [x] Recordatorios automáticos (cron + Firebase Cloud Messaging) — falta configurar
      un proyecto real de Firebase; por ahora corren en modo simulado/logueado
- [ ] App Android (Java + Retrofit)

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

### Nota sobre `npm run dev` en WSL

Si el proyecto vive en `/mnt/c/...` (filesystem de Windows montado en WSL),
`node --watch` no detecta los cambios guardados porque ese mount no dispara
los eventos de inotify. En ese caso hay que reiniciar el server a mano
después de cada cambio (`Ctrl+C` y `npm run dev` de nuevo), o mover el
proyecto a un path nativo de Linux (ej. `~/proyectos/...`).
