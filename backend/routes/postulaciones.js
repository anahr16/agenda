const express = require('express');
const db = require('../db');
const { calcularProbabilidad } = require('../probabilidadLlamada');
const { calcularCompatibilidad } = require('../compatibilidadOferta');
const { leerPerfil } = require('../perfil');
const { sincronizar: sincronizarComputrabajo } = require('../computrabajoSync');

const router = express.Router();

function conProbabilidad(postulacion) {
  return { ...postulacion, probabilidad_llamada: calcularProbabilidad(postulacion) };
}

// Compatibilidad con IA entre el perfil de la cuenta (usuarios.perfil_cv) y
// la descripcion de la oferta -- solo se llama a la API cuando hay
// descripcion, y solo si cambio (ver PUT) para no repetir el calculo en
// cada edicion.
async function compatibilidadPara(descripcion, usuarioId) {
  if (!descripcion) return { compatibilidad_oferta: null, compatibilidad_razon: null };
  try {
    const compat = await calcularCompatibilidad(leerPerfil(usuarioId), descripcion);
    return { compatibilidad_oferta: compat?.compatibilidad ?? null, compatibilidad_razon: compat?.razon ?? null };
  } catch (err) {
    console.warn('[postulaciones] No se pudo calcular compatibilidad con la oferta:', err.message);
    return { compatibilidad_oferta: null, compatibilidad_razon: null };
  }
}

router.get('/', (req, res) => {
  const postulaciones = db
    .prepare('SELECT * FROM postulaciones WHERE usuario_id = ? ORDER BY fecha_postulacion DESC, creado_en DESC')
    .all(req.usuario.id);
  res.json(postulaciones.map(conProbabilidad));
});

// Recalcula compatibilidad_oferta/compatibilidad_razon para todas las
// postulaciones con descripcion cargada -- lo mismo que hace
// recalcularCompatibilidad.js por consola, pero como boton en la app (util
// despues de editar perfil.txt, o para las que quedaron sin calcular).
router.post('/recalcular-compatibilidad', async (req, res) => {
  const perfil = leerPerfil(req.usuario.id);
  if (!perfil) {
    return res.status(400).json({ error: 'Todavía no cargaste tu CV/perfil en Configuración.' });
  }
  const postulaciones = db
    .prepare(
      "SELECT id, descripcion FROM postulaciones WHERE usuario_id = ? AND descripcion IS NOT NULL AND trim(descripcion) != ''"
    )
    .all(req.usuario.id);
  for (const p of postulaciones) {
    const { compatibilidad_oferta, compatibilidad_razon } = await compatibilidadPara(p.descripcion, req.usuario.id);
    db.prepare('UPDATE postulaciones SET compatibilidad_oferta = ?, compatibilidad_razon = ? WHERE id = ?').run(
      compatibilidad_oferta,
      compatibilidad_razon,
      p.id
    );
  }
  res.json({ actualizadas: postulaciones.length });
});

// Trae los links reales de "mis postulaciones" de Computrabajo y les rellena
// descripcion + compatibilidad a las que ya estan cargadas por mail pero
// sin link -- ver computrabajoSync.js y la seccion "Computrabajo" de
// readme.md. Manual (boton), no cron: cada corrida son varios requests
// paginados a Computrabajo y ya hubo un 403 por probarlo seguido.
router.post('/sincronizar-computrabajo', async (req, res) => {
  try {
    const { actualizadas, sinMatch } = await sincronizarComputrabajo(req.usuario.id);
    res.json({ actualizadas: actualizadas.length, sinMatch: sinMatch.length });
  } catch (err) {
    console.error('[postulaciones] Error sincronizando con Computrabajo:', err.message);
    res.status(400).json({ error: err.message });
  }
});

router.get('/stats', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) AS n FROM postulaciones WHERE usuario_id = ?').get(req.usuario.id).n;
  const porEstado = db
    .prepare('SELECT estado, COUNT(*) AS n FROM postulaciones WHERE usuario_id = ? GROUP BY estado')
    .all(req.usuario.id);
  const porPortal = db
    .prepare(
      "SELECT COALESCE(portal, 'Sin especificar') AS portal, COUNT(*) AS n FROM postulaciones WHERE usuario_id = ? GROUP BY portal"
    )
    .all(req.usuario.id);
  res.json({ total, porEstado, porPortal });
});

router.get('/:id', (req, res) => {
  const postulacion = db
    .prepare('SELECT * FROM postulaciones WHERE id = ? AND usuario_id = ?')
    .get(req.params.id, req.usuario.id);
  if (!postulacion) {
    return res.status(404).json({ error: 'Postulacion no encontrada' });
  }
  res.json(conProbabilidad(postulacion));
});

router.post('/', async (req, res) => {
  const { empresa, puesto, portal, descripcion, link, fecha_postulacion, estado, fecha_entrevista, notas } = req.body || {};
  if (!empresa || !puesto || !fecha_postulacion) {
    return res.status(400).json({ error: 'empresa, puesto y fecha_postulacion son obligatorios' });
  }
  const { compatibilidad_oferta, compatibilidad_razon } = await compatibilidadPara(descripcion || null, req.usuario.id);
  const resultado = db
    .prepare(
      `INSERT INTO postulaciones (empresa, puesto, portal, descripcion, link, fecha_postulacion, estado, fecha_entrevista, notas, compatibilidad_oferta, compatibilidad_razon, usuario_id)
       VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, 'enviada'), ?, ?, ?, ?, ?)`
    )
    .run(
      empresa,
      puesto,
      portal || null,
      descripcion || null,
      link || null,
      fecha_postulacion,
      estado || null,
      fecha_entrevista || null,
      notas || null,
      compatibilidad_oferta,
      compatibilidad_razon,
      req.usuario.id
    );
  const nuevaPostulacion = db.prepare('SELECT * FROM postulaciones WHERE id = ?').get(resultado.lastInsertRowid);
  res.status(201).json(conProbabilidad(nuevaPostulacion));
});

router.put('/:id', async (req, res) => {
  const postulacion = db
    .prepare('SELECT * FROM postulaciones WHERE id = ? AND usuario_id = ?')
    .get(req.params.id, req.usuario.id);
  if (!postulacion) {
    return res.status(404).json({ error: 'Postulacion no encontrada' });
  }
  const { empresa, puesto, portal, descripcion, link, fecha_postulacion, estado, fecha_entrevista, notas } = req.body || {};
  if (!empresa || !puesto || !fecha_postulacion) {
    return res.status(400).json({ error: 'empresa, puesto y fecha_postulacion son obligatorios' });
  }
  const recordatorioEntrevista =
    fecha_entrevista !== postulacion.fecha_entrevista ? 0 : postulacion.recordatorio_entrevista_enviado;
  const descripcionCambio = (descripcion || null) !== postulacion.descripcion;
  const { compatibilidad_oferta, compatibilidad_razon } = descripcionCambio
    ? await compatibilidadPara(descripcion || null, req.usuario.id)
    : { compatibilidad_oferta: postulacion.compatibilidad_oferta, compatibilidad_razon: postulacion.compatibilidad_razon };
  db
    .prepare(
      `UPDATE postulaciones
       SET empresa = ?, puesto = ?, portal = ?, descripcion = ?, link = ?, fecha_postulacion = ?, estado = COALESCE(?, estado), fecha_entrevista = ?, notas = ?, recordatorio_entrevista_enviado = ?, compatibilidad_oferta = ?, compatibilidad_razon = ?
       WHERE id = ? AND usuario_id = ?`
    )
    .run(
      empresa,
      puesto,
      portal || null,
      descripcion || null,
      link || null,
      fecha_postulacion,
      estado || null,
      fecha_entrevista || null,
      notas || null,
      recordatorioEntrevista,
      compatibilidad_oferta,
      compatibilidad_razon,
      req.params.id,
      req.usuario.id
    );
  const actualizada = db.prepare('SELECT * FROM postulaciones WHERE id = ?').get(req.params.id);
  res.json(conProbabilidad(actualizada));
});

router.delete('/:id', (req, res) => {
  const postulacion = db
    .prepare('SELECT * FROM postulaciones WHERE id = ? AND usuario_id = ?')
    .get(req.params.id, req.usuario.id);
  if (!postulacion) {
    return res.status(404).json({ error: 'Postulacion no encontrada' });
  }
  db.prepare('DELETE FROM postulaciones WHERE id = ? AND usuario_id = ?').run(req.params.id, req.usuario.id);
  res.status(204).send();
});

module.exports = router;
