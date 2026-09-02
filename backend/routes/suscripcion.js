const express = require('express');
const { estadoDe, PRECIO_CLP, TRIAL_DIAS } = require('../suscripcion');

const router = express.Router();

router.get('/', (req, res) => {
  const estado = estadoDe(req.usuario.id);
  if (!estado) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json({
    permitido: !!estado.permitido,
    fecha_fin_prueba: estado.fecha_fin_prueba,
    suscripcion_vence: estado.suscripcion_vence,
    suscripcion_fuente: estado.suscripcion_fuente,
    precio_clp: PRECIO_CLP,
    trial_dias: TRIAL_DIAS,
  });
});

module.exports = router;
