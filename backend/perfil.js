// Perfil de la usuaria (resumen de CV/experiencia) usado para calcular la
// compatibilidad con las ofertas -- ver compatibilidadOferta.js. Antes era
// un unico perfil.txt global (una sola cuenta real); ahora es por cuenta,
// guardado en usuarios.perfil_cv -- asi la compatibilidad tiene sentido
// para cualquier cuenta que use la app, no solo la dueña.
const db = require('./db');

function leerPerfil(usuarioId) {
  const usuario = db.prepare('SELECT perfil_cv FROM usuarios WHERE id = ?').get(usuarioId);
  return usuario?.perfil_cv?.trim() || null;
}

module.exports = { leerPerfil };
