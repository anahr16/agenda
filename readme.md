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
- [ ] Recordatorios automáticos (cron + Firebase Cloud Messaging)
- [ ] Login del dueño de la agenda
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

### Base de datos

SQLite, archivo `backend/turnero.sqlite` (se crea solo al arrancar, no se
sube a git). El esquema (tablas `clientes` y `citas`) se define en
`backend/db.js` y se aplica automáticamente cada vez que arranca el server.

### Endpoints

| Método | Ruta            | Descripción                          |
|--------|-----------------|---------------------------------------|
| GET    | `/health`       | Chequeo de que el servidor está vivo |
| GET    | `/clientes`     | Listar clientes                      |
| GET    | `/clientes/:id` | Obtener un cliente                   |
| POST   | `/clientes`     | Crear cliente (`nombre` obligatorio, `telefono` opcional) |
| PUT    | `/clientes/:id` | Editar cliente                       |
| DELETE | `/clientes/:id` | Borrar cliente                       |
| GET    | `/citas`        | Listar citas                         |
| GET    | `/citas/:id`    | Obtener una cita                     |
| POST   | `/citas`        | Crear cita (`cliente_id`, `inicio`, `fin` obligatorios; `estado` opcional, por defecto `confirmada`; `notas` opcional) |
| PUT    | `/citas/:id`    | Editar cita                          |
| DELETE | `/citas/:id`    | Borrar cita                          |

### Nota sobre `npm run dev` en WSL

Si el proyecto vive en `/mnt/c/...` (filesystem de Windows montado en WSL),
`node --watch` no detecta los cambios guardados porque ese mount no dispara
los eventos de inotify. En ese caso hay que reiniciar el server a mano
después de cada cambio (`Ctrl+C` y `npm run dev` de nuevo), o mover el
proyecto a un path nativo de Linux (ej. `~/proyectos/...`).
