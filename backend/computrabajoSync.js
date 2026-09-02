// Cruza el listado real de "mis postulaciones" de Computrabajo (con los
// links a los avisos, ver computrabajoScraper.js) contra las postulaciones
// de ese portal que ya estan cargadas por mail pero sin link -- les trae la
// descripcion real y recalcula compatibilidad. Ver seccion "Computrabajo"
// de readme.md para el contexto completo (por que hace falta esto, riesgos
// aceptados, etc).
const db = require('./db');
const { obtenerPostulaciones } = require('./computrabajoScraper');
const { obtenerDescripcion } = require('./jobPageScraper');
const { calcularCompatibilidad } = require('./compatibilidadOferta');
const { leerPerfil } = require('./perfil');

const RANGO_DIACRITICOS = new RegExp('[\\u0300-\\u036f]', 'g');

function normalizar(texto) {
  return (texto || '')
    .normalize('NFD')
    .replace(RANGO_DIACRITICOS, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// Matchea por puesto exacto (normalizado); la empresa solo desempata si
// Computrabajo la muestra (a veces la oculta -- "empleador confidencial",
// ver readme.md). Cada postulacion scrapeada se usa una sola vez.
function buscarIndiceMatch(postulacion, scrapeadas, usadas) {
  const puestoObjetivo = normalizar(postulacion.puesto);
  const empresaObjetivo = normalizar(postulacion.empresa);
  return scrapeadas.findIndex((s, i) => {
    if (usadas.has(i)) return false;
    if (normalizar(s.puesto) !== puestoObjetivo) return false;
    const empresaScrapeada = normalizar(s.empresa);
    return !empresaScrapeada || empresaScrapeada === empresaObjetivo;
  });
}

function registrarActividad(postulacionId, mensaje, usuarioId) {
  db.prepare('INSERT INTO actividad_postulaciones (postulacion_id, tipo, mensaje, usuario_id) VALUES (?, ?, ?, ?)').run(
    postulacionId,
    'computrabajo',
    mensaje,
    usuarioId
  );
}

async function sincronizar(usuarioId) {
  const scrapeadas = await obtenerPostulaciones(usuarioId);
  const pendientes = db
    .prepare("SELECT id, empresa, puesto FROM postulaciones WHERE usuario_id = ? AND portal = 'Computrabajo' AND link IS NULL")
    .all(usuarioId);

  const perfil = leerPerfil(usuarioId);
  const usadas = new Set();
  const actualizadas = [];
  const sinMatch = [];

  for (const postulacion of pendientes) {
    const indice = buscarIndiceMatch(postulacion, scrapeadas, usadas);
    if (indice === -1) {
      sinMatch.push(postulacion.puesto);
      continue;
    }
    usadas.add(indice);
    const { linkAviso } = scrapeadas[indice];

    let descripcion = null;
    try {
      descripcion = await obtenerDescripcion(linkAviso);
    } catch (err) {
      console.warn(`[computrabajo-sync] No se pudo traer la descripcion de ${linkAviso}:`, err.message);
    }

    let compatibilidad = null;
    let razon = null;
    if (descripcion && perfil) {
      try {
        const compat = await calcularCompatibilidad(perfil, descripcion);
        compatibilidad = compat?.compatibilidad ?? null;
        razon = compat?.razon ?? null;
      } catch (err) {
        console.warn('[computrabajo-sync] No se pudo calcular compatibilidad:', err.message);
      }
    }

    db.prepare('UPDATE postulaciones SET link = ?, descripcion = COALESCE(?, descripcion), compatibilidad_oferta = ?, compatibilidad_razon = ? WHERE id = ?').run(
      linkAviso,
      descripcion,
      compatibilidad,
      razon,
      postulacion.id
    );
    registrarActividad(postulacion.id, `Se trajo el aviso real de Computrabajo para ${postulacion.puesto}.`, usuarioId);
    actualizadas.push(postulacion.puesto);
  }

  return { actualizadas, sinMatch };
}

module.exports = { sincronizar };
