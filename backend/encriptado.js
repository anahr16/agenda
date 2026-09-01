// Encriptado simetrico (AES-256-GCM, nativo de Node, sin dependencia nueva)
// para datos que hace falta poder recuperar en texto plano despues -- a
// diferencia de bcrypt (contraseñas de esta app, unidireccional), esto es
// para la contraseña de Computrabajo, que el scraper necesita usar de
// verdad para loguearse (ver computrabajoScraper.js).
//
// CREDENCIALES_ENCRYPTION_KEY (.env) tiene que ser 32 bytes en hex (64
// caracteres) -- generarla una vez con:
//   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
const crypto = require('crypto');

function clave() {
  const hex = process.env.CREDENCIALES_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error('CREDENCIALES_ENCRYPTION_KEY falta o no tiene 32 bytes en hex (64 caracteres) en .env');
  }
  return Buffer.from(hex, 'hex');
}

// Formato guardado: "iv:tag:ciphertext", todo en hex, separado por ":".
function encriptar(texto) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', clave(), iv);
  const ciphertext = Buffer.concat([cipher.update(texto, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${ciphertext.toString('hex')}`;
}

function desencriptar(valor) {
  const [ivHex, tagHex, ciphertextHex] = valor.split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', clave(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextHex, 'hex')), decipher.final()]).toString('utf8');
}

module.exports = { encriptar, desencriptar };
