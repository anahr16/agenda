require('dotenv').config();
// En este entorno (WSL) las conexiones salientes intentan IPv6 primero, que
// no funciona, y recien despues caen a IPv4 -- a veces con timeout en vez de
// fallback. Esto rompe fetch()/https hacia hosts con soporte IPv6 (ej. la
// API de Telegram). Desactiva el "Happy Eyeballs" dual-stack para forzar
// IPv4 en todo el proceso.
require('net').setDefaultAutoSelectFamily(false);
const express = require('express');
const cors = require('cors');
const authRouter = require('./routes/auth');
const clientesRouter = require('./routes/clientes');
const citasRouter = require('./routes/citas');
const postulacionesRouter = require('./routes/postulaciones');
const mailsRevisionRouter = require('./routes/mailsRevision');
const eventosRouter = require('./routes/eventos');
const annieRouter = require('./routes/annie');
const requireAuth = require('./middleware/auth');
const iniciarRecordatorios = require('./recordatorios');
const iniciarSincronizacionEmails = require('./emailSync');
const iniciarRecordatoriosPostulaciones = require('./recordatoriosPostulaciones');
const iniciarRecordatoriosEntrevistas = require('./recordatoriosEntrevistas');
const iniciarRecordatoriosEventos = require('./recordatoriosEventos');
const iniciarResumenSemanal = require('./resumenSemanal');

const app = express();
const PORT = process.env.PORT || 4000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4200';

app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRouter);
app.use('/clientes', requireAuth, clientesRouter);
app.use('/citas', requireAuth, citasRouter);
app.use('/postulaciones', requireAuth, postulacionesRouter);
app.use('/mails-revision', requireAuth, mailsRevisionRouter);
app.use('/eventos', requireAuth, eventosRouter);
app.use('/annie', requireAuth, annieRouter);

app.listen(PORT, () => {
  console.log(`Agenda Inteligente backend escuchando en http://localhost:${PORT}`);
  iniciarRecordatorios();
  iniciarSincronizacionEmails();
  iniciarRecordatoriosPostulaciones();
  iniciarRecordatoriosEntrevistas();
  iniciarRecordatoriosEventos();
  iniciarResumenSemanal();
});
