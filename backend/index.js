const express = require('express');
const clientesRouter = require('./routes/clientes');
const citasRouter = require('./routes/citas');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/clientes', clientesRouter);
app.use('/citas', citasRouter);

app.listen(PORT, () => {
  console.log(`Turnero backend escuchando en http://localhost:${PORT}`);
});
