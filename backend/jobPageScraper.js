// Trae la descripcion completa de un aviso a partir de un link real al
// aviso -- para Chiletrabajos y LinkedIn viene solo en el mail de
// confirmacion; para Computrabajo lo trae computrabajoSync.js aparte (el
// mail de ese portal no incluye el link real, ver readme.md).
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
  {
    // El aviso publico de LinkedIn (linkedin.com/jobs/view/{id}/) no exige
    // login -- lo sirven asi para que Google lo indexe. El link que trae el
    // mail de confirmacion es distinto: va con parametros de tracking/un
    // token de login de un solo uso que redirige a una pantalla de login en
    // vez del aviso (probado con avisos reales, 2026-09-02) -- por eso hace
    // falta reconstruir la URL publica a partir del ID antes de pedirla.
    portal: 'LinkedIn',
    urlPattern: /linkedin\.com\/(comm\/)?jobs\/view\/\d+/i,
    urlParaFetch(url) {
      const id = (url.match(/jobs\/view\/(\d+)/) || [])[1];
      return id ? `https://www.linkedin.com/jobs/view/${id}/` : url;
    },
    async extraerDescripcion(html) {
      const $ = cheerio.load(html);
      const contenedor = $('.show-more-less-html__markup').first();
      if (!contenedor.length) return null;
      contenedor.find('br').replaceWith(' ');
      const partes = [];
      contenedor.find('p, li').each((_, el) => partes.push($(el).text()));
      const texto = partes.join(' ').replace(/\s+/g, ' ').trim();
      return texto || null;
    },
  },
];

async function obtenerDescripcion(url) {
  const scraper = SCRAPERS.find((s) => s.urlPattern.test(url));
  if (!scraper) return null;

  const urlFinal = scraper.urlParaFetch ? scraper.urlParaFetch(url) : url;
  const respuesta = await fetch(urlFinal, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TurneroBot/1.0)' },
    signal: AbortSignal.timeout(10000),
  });
  if (!respuesta.ok) return null;

  const html = await respuesta.text();
  return scraper.extraerDescripcion(html);
}

module.exports = { obtenerDescripcion };
