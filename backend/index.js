require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRouter = require('./routes/auth');
const clientesRouter = require('./routes/clientes');
const citasRouter = require('./routes/citas');
const requireAuth = require('./middleware/auth');
const iniciarRecordatorios = require('./recordatorios');

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

app.listen(PORT, () => {
  console.log(`Turnero backend escuchando en http://localhost:${PORT}`);
  iniciarRecordatorios();
});
