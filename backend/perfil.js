// Perfil de la usuaria (resumen de CV/experiencia) usado para calcular la
// compatibilidad con las ofertas -- ver compatibilidadOferta.js. Vive como
// texto plano en perfil.txt (no en el repo, ver .gitignore, porque tiene
// datos personales) para poder editarlo a mano si el CV cambia, sin volver
// a exportarlo de PDF.

const fs = require('fs');
const path = require('path');

const RUTA = path.join(__dirname, 'perfil.txt');

function leerPerfil() {
  try {
    const contenido = fs.readFileSync(RUTA, 'utf8').trim();
    return contenido || null;
  } catch {
    return null;
  }
}

module.exports = { leerPerfil };
