// Recalcula compatibilidad_oferta/compatibilidad_razon para todas las
// postulaciones que tienen descripcion cargada. Correr despues de editar
// perfil.txt, o para rellenar postulaciones viejas creadas antes de este
// modulo (ver readme.md).
//
// Uso (desde backend/): node recalcularCompatibilidad.js

require('dotenv').config();
const db = require('./db');
const { leerPerfil } = require('./perfil');
const { calcularCompatibilidad } = require('./compatibilidadOferta');
const { obtenerIdDueña } = require('./ownerUsuario');

async function main() {
  const usuarioId = obtenerIdDueña();
  if (!usuarioId) {
    console.error('Ninguna cuenta marcada como es_owner.');
    process.exit(1);
  }
  const perfil = leerPerfil(usuarioId);
  if (!perfil) {
    console.error('No hay perfil_cv cargado para la cuenta dueña (ver Configuracion) -- nada con que comparar.');
    process.exit(1);
  }

  const postulaciones = db
    .prepare(
      "SELECT id, empresa, puesto, descripcion FROM postulaciones WHERE usuario_id = ? AND descripcion IS NOT NULL AND trim(descripcion) != ''"
    )
    .all(usuarioId);

  console.log(`Recalculando compatibilidad para ${postulaciones.length} postulacion(es)...`);
  for (const p of postulaciones) {
    try {
      const compat = await calcularCompatibilidad(perfil, p.descripcion);
      db.prepare('UPDATE postulaciones SET compatibilidad_oferta = ?, compatibilidad_razon = ? WHERE id = ?').run(
        compat?.compatibilidad ?? null,
        compat?.razon ?? null,
        p.id
      );
      console.log(`- ${p.empresa} (${p.puesto}): ${compat?.compatibilidad ?? 'sin resultado'}%`);
    } catch (err) {
      console.error(`- ${p.empresa} (${p.puesto}): error - ${err.message}`);
    }
  }
}

// Guard para que un require() accidental (ej. un chequeo de sintaxis) no
// dispare llamadas reales a la API de Anthropic -- este script solo debe
// correr como "node recalcularCompatibilidad.js" desde la terminal.
if (require.main === module) {
  main().then(() => process.exit(0));
}
