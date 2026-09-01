// Trae el link real de las postulaciones de Computrabajo desde el panel
// "mis postulaciones" de la cuenta -- el mail de confirmacion de
// Computrabajo NO trae ese link (confirmado con un mail real, ver
// readme.md), asi que es la unica forma de tener la descripcion real para
// calcular compatibilidad automatica en ese portal.
//
// Reusa una sesion ya logueada (cookies exportadas por la usuaria desde su
// propio navegador, ver PUT /auth/computrabajo-cookies) en vez de
// automatizar el login -- la cuenta de Computrabajo de Ana es federada
// (Google), y automatizar un login de Google es mucho mas sensible/riesgoso
// que reusar una sesion que ella ya generó a mano.
const puppeteer = require('puppeteer');
const db = require('./db');
const { desencriptar } = require('./encriptado');

const URL_DASHBOARD = 'https://candidato.cl.computrabajo.com/acceso/';

// Cookie-Editor exporta "expirationDate" (segundos unix) y sameSite en
// minuscula ("lax"/"strict"/"no_restriction") -- Puppeteer espera "expires"
// y sameSite capitalizado ("Lax"/"Strict"/"None").
function aCookiePuppeteer(cookieExportada) {
  const mapaSameSite = { lax: 'Lax', strict: 'Strict', no_restriction: 'None' };
  return {
    name: cookieExportada.name,
    value: cookieExportada.value,
    domain: cookieExportada.domain,
    path: cookieExportada.path || '/',
    expires: cookieExportada.expirationDate,
    httpOnly: !!cookieExportada.httpOnly,
    secure: !!cookieExportada.secure,
    sameSite: mapaSameSite[cookieExportada.sameSite] || undefined,
  };
}

function obtenerCookiesGuardadas(usuarioId) {
  const usuario = db.prepare('SELECT computrabajo_cookies_enc FROM usuarios WHERE id = ?').get(usuarioId);
  if (!usuario?.computrabajo_cookies_enc) return null;
  return JSON.parse(desencriptar(usuario.computrabajo_cookies_enc));
}

// Confirma si la sesion sigue viva: navega al panel de acceso, y si las
// cookies siguen validas Computrabajo redirige derecho al dashboard del
// candidato en vez de mostrar el login. Devuelve la URL final para que
// quien llama pueda distinguir "sesion viva" de "pide loguearse de nuevo".
async function verificarSesion(usuarioId) {
  const cookiesGuardadas = obtenerCookiesGuardadas(usuarioId);
  if (!cookiesGuardadas) return { conectado: false, motivo: 'Todavía no conectaste tu cuenta de Computrabajo.' };

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    const page = await browser.newPage();
    await page.setCookie(...cookiesGuardadas.map(aCookiePuppeteer));
    await page.goto(URL_DASHBOARD, { waitUntil: 'networkidle2', timeout: 30000 });
    const urlFinal = page.url();
    const sesionViva = !urlFinal.includes('secure.computrabajo.com/Account');
    return { conectado: sesionViva, urlFinal, motivo: sesionViva ? null : 'La sesión guardada ya venció -- volvé a exportar las cookies.' };
  } finally {
    await browser.close();
  }
}

module.exports = { verificarSesion, aCookiePuppeteer, obtenerCookiesGuardadas, URL_DASHBOARD };
