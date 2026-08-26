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

async function main() {
  const perfil = leerPerfil();
  if (!perfil) {
    console.error('No se encontro backend/perfil.txt (o esta vacio) -- nada con que comparar.');
    process.exit(1);
  }

  const postulaciones = db
    .prepare("SELECT id, empresa, puesto, descripcion FROM postulaciones WHERE descripcion IS NOT NULL AND trim(descripcion) != ''")
    .all();

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

main().then(() => process.exit(0));
