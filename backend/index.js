require('dotenv').config();
const express = require('express');
const authRouter = require('./routes/auth');
const clientesRouter = require('./routes/clientes');
const citasRouter = require('./routes/citas');
const requireAuth = require('./middleware/auth');
const iniciarRecordatorios = require('./recordatorios');

const app = express();
const PORT = process.env.PORT || 4000;

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
