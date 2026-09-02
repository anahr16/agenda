// Trae la descripcion completa de un aviso a partir del link que vino en
// el mail de confirmacion de postulacion. Solo hay regla para Chiletrabajos
// por ahora: es el unico portal cuyo mail de confirmacion trae el link al
// aviso exacto al que se postulo (el de Computrabajo solo trae "ofertas
// recomendadas" similares, ninguna es la real, asi que no hay como
// identificarla sin adivinar).
//
// Para sumar un portal nuevo hace falta el HTML real de una pagina de aviso
// de ese portal, para ver el selector correcto de la descripcion.

const cheerio = require('cheerio');

const SCRAPERS = [
  {
    portal: 'Chiletrabajos',
    urlPattern: /chiletrabajos\.cl/i,
    async extraerDescripcion(html) {
      const $ = cheerio.load(html);
      const texto = $('p.mb-0').first().text();
      return texto ? texto.replace(/\s+/g, ' ').trim() : null;
    },
  },
  {
    // Solo el aviso publico (cl.computrabajo.com) -- no confundir con el
    // panel de "mis postulaciones" (candidato.cl.computrabajo.com), que
    // requiere sesion y lo maneja computrabajoScraper.js aparte.
    portal: 'Computrabajo',
    urlPattern: /^https:\/\/cl\.computrabajo\.com\//i,
    async extraerDescripcion(html) {
      const $ = cheerio.load(html);
      const contenedor = $('div[div-link="oferta"]');
      if (!contenedor.length) return null;
      contenedor.find('br').replaceWith(' ');
      const partes = [];
      contenedor.find('p.mbB, p.fwB.fs18.mtB.mb10, ul.disc.mbB li').each((_, el) => {
        partes.push($(el).text());
      });
      const texto = partes.join(' ').replace(/\s+/g, ' ').trim();
      return texto || null;
    },
  },
];

async function obtenerDescripcion(url) {
  const scraper = SCRAPERS.find((s) => s.urlPattern.test(url));
  if (!scraper) return null;

  const respuesta = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TurneroBot/1.0)' },
    signal: AbortSignal.timeout(10000),
  });
  if (!respuesta.ok) return null;

  const html = await respuesta.text();
  return scraper.extraerDescripcion(html);
}

module.exports = { obtenerDescripcion };
