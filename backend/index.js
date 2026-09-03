require('dotenv').config();
// En este entorno (WSL) las conexiones salientes intentan IPv6 primero, que
// no funciona, y recien despues caen a IPv4 -- a veces con timeout en vez de
// fallback. Esto rompe fetch()/https hacia hosts con soporte IPv6 (ej. la
// API de Telegram). Desactiva el "Happy Eyeballs" dual-stack para forzar
// IPv4 en todo el proceso.
require('net').setDefaultAutoSelectFamily(false);
const path = require('path');
const express = require('express');
const cors = require('cors');
const authRouter = require('./routes/auth');
const clientesRouter = require('./routes/clientes');
const citasRouter = require('./routes/citas');
const postulacionesRouter = require('./routes/postulaciones');
const mailsRevisionRouter = require('./routes/mailsRevision');
const eventosRouter = require('./routes/eventos');
const annieRouter = require('./routes/annie');
const recordatoriosVozRouter = require('./routes/recordatoriosVoz');
const suscripcionRouter = require('./routes/suscripcion');
const webhooksRouter = require('./routes/webhooks');
const requireAuth = require('./middleware/auth');
const requireOwner = require('./middleware/requireOwner');
const requireSuscripcionActiva = require('./middleware/requireSuscripcionActiva');
const requireSuscripcionPaga = require('./middleware/requireSuscripcionPaga');
const iniciarRecordatorios = require('./recordatorios');
const iniciarSincronizacionEmails = require('./emailSync');
const iniciarRecordatoriosPostulaciones = require('./recordatoriosPostulaciones');
const iniciarRecordatoriosEntrevistas = require('./recordatoriosEntrevistas');
const iniciarRecordatoriosEventos = require('./recordatoriosEventos');
const iniciarResumenSemanal = require('./resumenSemanal');

const app = express();
const PORT = process.env.PORT || 4000;
// Lista separada por comas -- hoy suele ser un unico origen, pero permite
// sumar uno de dev aparte del de produccion sin tener que tocar codigo.
const origenesPermitidos = (process.env.FRONTEND_URL || 'http://localhost:4200').split(',').map((o) => o.trim());

app.use(cors({ origin: origenesPermitidos }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Publica y sin auth a proposito -- URL exigida por Play Console y por ley,
// tiene que poder abrirse sin loguearse. Ver seccion "Publicacion en Google
// Play" de readme.md.
app.get('/privacidad', (req, res) => {
  res.sendFile(path.join(__dirname, 'legal', 'privacidad.html'));
});

app.use('/auth', authRouter);
// clientes/citas son del turnero original, antes de Postulaciones/Agenda --
// nunca se migraron a multi-tenancy real (no tienen usuario_id), asi que se
// dejan visibles solo para la cuenta dueña en vez de exponer datos viejos de
// Ana a cualquier cuenta publica nueva.
app.use('/clientes', requireAuth, requireOwner, clientesRouter);
app.use('/citas', requireAuth, requireOwner, citasRouter);
// /suscripcion sin requireSuscripcionActiva a proposito -- tiene que seguir
// accesible mientras la cuenta esta bloqueada, para poder ver/pagar.
app.use('/suscripcion', requireAuth, suscripcionRouter);
// Sin requireAuth: MercadoPago no manda JWT, la firma se verifica adentro.
app.use('/webhooks', webhooksRouter);
// Postulaciones es el "plus" pago -- afuera de la prueba gratis a
// proposito, no alcanza con estar en trial (ver requireSuscripcionPaga).
// mails-revision es la bandeja de esa misma pagina, mismo gate.
app.use('/postulaciones', requireAuth, requireSuscripcionPaga, postulacionesRouter);
app.use('/mails-revision', requireAuth, requireSuscripcionPaga, mailsRevisionRouter);
app.use('/eventos', requireAuth, requireSuscripcionActiva, eventosRouter);
app.use('/annie', requireAuth, requireSuscripcionActiva, annieRouter);
app.use('/recordatorios-voz', requireAuth, requireSuscripcionActiva, recordatoriosVozRouter);

// Host explicito (0.0.0.0, todas las interfaces) -- sin esto, en algunas
// maquinas Node termina escuchando solo en el loopback IPv6 (::1), y la app
// Android (u otro dispositivo en la misma red) nunca llega al backend aunque
// el Firewall este bien configurado.
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Agenda Inteligente backend escuchando en http://localhost:${PORT}`);
  iniciarRecordatorios();
  iniciarSincronizacionEmails();
  iniciarRecordatoriosPostulaciones();
  iniciarRecordatoriosEntrevistas();
  iniciarRecordatoriosEventos();
  iniciarResumenSemanal();
});
