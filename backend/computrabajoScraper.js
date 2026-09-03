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
// puppeteer-extra + plugin stealth (no el puppeteer plano) -- Computrabajo
// bloqueo con 403 tres dias seguidos (01/02/03-09), incluso en el primer
// pedido del dia y bien espaciado, lo que apunta al fingerprint de
// Chromium headless (navigator.webdriver, etc) y no al ritmo de pedidos.
// Ver readme.md, seccion Computrabajo.
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const db = require('./db');
const { desencriptar } = require('./encriptado');

// Carpeta para volcar el HTML crudo cuando el listado da 0 items en la
// primera pagina -- caso sospechoso (deberia haber postulaciones) que puede
// ser un bloqueo/challenge anti-bot en vez de una lista vacia real. No se
// versiona (ver .gitignore); sirve para diagnosticar sin tener que repetir
// el request contra Computrabajo.
const CARPETA_DEBUG = path.join(__dirname, '.computrabajo-debug');

const URL_DASHBOARD = 'https://candidato.cl.computrabajo.com/acceso/';
const URL_MIS_POSTULACIONES = 'https://candidato.cl.computrabajo.com/candidate/match/';
const BASE_CANDIDATO = 'https://candidato.cl.computrabajo.com';

// Pausa entre paginas del listado -- Computrabajo reacciono con 403 a una
// sesion de pruebas con varios requests seguidos (ver readme.md), asi que
// esto pagina de a una, esperando entre cada una en vez de pedirlas todas
// de una.
const PAUSA_ENTRE_PAGINAS_MS = 2500;

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

// Parsea una pagina del listado de "mis postulaciones" -- cada tarjeta trae
// el link real al aviso en data-shortcut-see-offer (el unico lugar donde
// aparece; el mail de confirmacion no lo trae, ver readme.md).
function extraerPostulacionesDeHtml(html) {
  const $ = cheerio.load(html);
  const items = [];
  $('div.box[data-match]').each((_, el) => {
    const $el = $(el);
    const puesto = $el.find('h1').first().text().trim();
    // El nombre de la empresa es el texto suelto de este <p>, junto a un
    // <span> con el rating que hay que descartar (clone + quitar hijos).
    const empresa = $el.find('p.fs16.fc_base.mt5').first().clone().children().remove().end().text().trim();
    const linkAviso = $el.find('[data-shortcut-see-offer]').first().attr('data-shortcut-see-offer') || null;
    if (puesto && linkAviso) items.push({ puesto, empresa, linkAviso });
  });
  const siguiente = $('nav.pag_numeric .b_next').attr('data-path') || null;
  return { items, siguiente };
}

// Trae el listado completo de "mis postulaciones" (puesto + empresa + link
// real al aviso), paginando de a una pagina por vez con pausa entre cada
// una -- ver computrabajoSync.js para el cruce contra las postulaciones ya
// cargadas por mail.
async function obtenerPostulaciones(usuarioId, { maxPaginas = 5 } = {}) {
  const cookiesGuardadas = obtenerCookiesGuardadas(usuarioId);
  if (!cookiesGuardadas) throw new Error('Todavía no conectaste tu cuenta de Computrabajo.');

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    const page = await browser.newPage();
    await page.setCookie(...cookiesGuardadas.map(aCookiePuppeteer));

    const todas = [];
    let url = URL_MIS_POSTULACIONES;
    for (let i = 0; i < maxPaginas && url; i++) {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      if (page.url().includes('secure.computrabajo.com/Account')) {
        throw new Error('La sesión guardada ya venció -- volvé a exportar las cookies.');
      }
      const html = await page.content();
      const { items, siguiente } = extraerPostulacionesDeHtml(html);

      if (i === 0 && items.length === 0) {
        // La primera pagina no deberia dar 0 -- si la cuenta tiene
        // postulaciones cargadas por mail es porque existen en Computrabajo.
        // Guarda el HTML crudo para poder ver que devolvio de verdad (pagina
        // de bloqueo/challenge, mobile, vacia real, etc) sin gastar otro
        // request en vivo para averiguarlo.
        fs.mkdirSync(CARPETA_DEBUG, { recursive: true });
        const archivoDebug = path.join(CARPETA_DEBUG, `pagina-1-${Date.now()}.html`);
        fs.writeFileSync(archivoDebug, html, 'utf8');
        throw new Error(
          `El listado de "mis postulaciones" no devolvió ninguna tarjeta -- posible bloqueo temporal de Computrabajo. URL final: ${page.url()}, título: "${await page.title()}". HTML guardado en ${archivoDebug} para revisar.`
        );
      }

      todas.push(...items);
      url = siguiente ? new URL(siguiente, BASE_CANDIDATO).toString() : null;
      if (url) await new Promise((resolve) => setTimeout(resolve, PAUSA_ENTRE_PAGINAS_MS));
    }
    return todas;
  } finally {
    await browser.close();
  }
}

module.exports = {
  verificarSesion,
  obtenerPostulaciones,
  aCookiePuppeteer,
  obtenerCookiesGuardadas,
  URL_DASHBOARD,
};
