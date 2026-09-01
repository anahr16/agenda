// Reglas para detectar mails de portales de empleo y extraer datos de la
// postulacion. Cada parser se prueba por remitente (regex); de los que
// matchean el remitente, se usa el primero cuyo `extraer` devuelva datos.
//
// `tipo: 'nueva_postulacion'` -> extraer() devuelve { empresa, puesto, link? }
//   (link es opcional: si el mail trae el link al aviso exacto, se usa
//   despues en jobPageScraper.js para traer la descripcion completa)
// `tipo: 'cambio_estado'`     -> extraer() devuelve { puesto, estado, empresa? }
//   (empresa es opcional: si el mail no la menciona, en emailSync.js se
//   busca la postulacion existente solo por puesto)
//
// Los mails en texto plano suelen venir con saltos de linea automaticos en
// mitad de una oracion (word-wrap), por eso los regex usan [\s\S] en vez de
// "." para poder capturar texto que cruza un salto de linea, y despues se
// pasa por limpiar() para normalizar los espacios/saltos.
//
// Para agregar un portal o un cambio de estado nuevo: pasar un ejemplo real
// del mail (remitente, asunto, cuerpo) y sumar una entrada acá.

const ESTADO_POR_CAMPANIA_COMPUTRABAJO = {
  MatchVisto: 'vista',
  MatchDescartado: 'rechazada',
};

function limpiar(valor) {
  return valor ? valor.replace(/\s+/g, ' ').trim() : valor;
}

// Computrabajo dice literalmente "la empresa" cuando el aviso es anonimo
// (empleador no revelado) -- se deja mas claro que no es un dato faltante.
function limpiarEmpresa(valor) {
  const limpio = limpiar(valor);
  return limpio && limpio.toLowerCase() === 'la empresa' ? 'Empresa confidencial' : limpio;
}

const PARSERS = [
  {
    portal: 'Chiletrabajos',
    tipo: 'nueva_postulacion',
    remitente: /@chiletrabajos\.cl$/i,
    extraer(asunto, texto) {
      const empresa = (texto.match(/Postulaci[oó]n Enviada a ([\s\S]+?)(?:\.(?=\s|$)|\s+Estimado)/i) || [])[1];
      const puesto = (texto.match(/Tu Postulaci[oó]n a ([\s\S]+?) fue enviada correctamente/i) || [])[1];
      const link = (texto.match(/https?:\/\/www\.chiletrabajos\.cl\/trabajo\/\d+/i) || [])[0];
      if (!empresa || !puesto) return null;
      return { empresa: limpiar(empresa), puesto: limpiar(puesto), link };
    },
  },
  {
    portal: 'Chiletrabajos',
    tipo: 'cambio_estado',
    remitente: /@chiletrabajos\.cl$/i,
    extraer(asunto, texto) {
      const empresa = (asunto.match(/te informamos que (.+?) ha visto tu Perfil/i) || [])[1];
      const puesto = (texto.match(/tu postulaci[oó]n realizada para ([\s\S]+?)\s*(?:\.\s|\n\[)/i) || [])[1];
      if (!empresa || !puesto) return null;
      return { empresa: limpiar(empresa), puesto: limpiar(puesto), estado: 'vista' };
    },
  },
  {
    portal: 'LinkedIn',
    tipo: 'nueva_postulacion',
    remitente: /@linkedin\.com$/i,
    extraer(asunto, texto) {
      // Cuerpo: "Se ha enviado tu solicitud a {empresa}.\n\n{puesto}\n{empresa}\n..."
      const match = texto.match(/Se ha enviado tu solicitud a ([\s\S]+?)\.\n\n([\s\S]+?)\n/i);
      if (!match) return null;
      const link = (texto.match(/Ver anuncio de empleo:\s*(\S+)/i) || [])[1];
      return { empresa: limpiar(match[1]), puesto: limpiar(match[2]), link };
    },
  },
  {
    portal: 'Trabajando.cl',
    tipo: 'nueva_postulacion',
    remitente: /@trabajando\.com$/i,
    extraer(asunto, texto) {
      // El mail no menciona la empresa (solo puesto + link), y la pagina
      // del aviso es una SPA que no se puede scrapear sin navegador
      // headless -- se usa un placeholder para que igual quede cargada.
      const match = texto.match(/Postulaste correctamente a la oferta de empleo:\s*\n\n([\s\S]+?)\s*\(\s*(https?:\/\/\S+)\s*\)/i);
      if (!match) return null;
      return { empresa: 'Trabajando.cl (completar)', puesto: limpiar(match[1]), link: match[2] };
    },
  },
  {
    portal: 'Computrabajo',
    tipo: 'nueva_postulacion',
    remitente: /@computrabajo\.com$/i,
    extraer(asunto, texto) {
      const puesto = (asunto.match(/Seguimiento de tu postulaci[oó]n para el puesto ([\s\S]+)/i) || [])[1];
      const empresa = (texto.match(/Tu CV ya est[aá] en manos de ([\s\S]+?)\.(?=\s|$)/i) || [])[1];
      if (!empresa || !puesto) return null;
      return { empresa: limpiarEmpresa(empresa), puesto: limpiar(puesto) };
    },
  },
  {
    portal: 'Computrabajo',
    tipo: 'cambio_estado',
    remitente: /@computrabajo\.com$/i,
    extraer(asunto, texto) {
      // Computrabajo no menciona la empresa en estos mails, solo el puesto.
      // El estado real viene codificado en el link "Ver mi postulacion"
      // (utm_campaign, URL-encoded como %3D dentro del link de redireccion),
      // no en el asunto/cuerpo visible -- el asunto puede sonar positivo
      // ("tu candidatura avanza...") aunque en realidad sea un descarte.
      const puesto = (texto.match(/Nuevo estado en ([\s\S]+?)\s*\n\s*\n/i) || [])[1];
      const campania = (texto.match(/utm_campaign(?:=|%3D)auto_cand_(\w+)/i) || [])[1];
      const estado = campania && ESTADO_POR_CAMPANIA_COMPUTRABAJO[campania];
      if (!puesto || !estado) return null;
      return { puesto: limpiar(puesto), estado };
    },
  },
  {
    // Variante mas nueva del cambio de estado de Computrabajo: en vez del
    // mail transaccional "Nuevo estado en..." con codigo de campania, manda
    // una encuesta de seguimiento ("¿La empresa X se comunico contigo?")
    // que igual confirma que la empresa vio el CV -- mismo significado que
    // MatchVisto arriba, pero sin ese formato (campania
    // auto_cand_follow_company_contact_status, sin "Nuevo estado en").
    portal: 'Computrabajo',
    tipo: 'cambio_estado',
    remitente: /@computrabajo\.com$/i,
    extraer(asunto, texto) {
      const empresa = (asunto.match(/¿La empresa (.+?) se comunic/i) || [])[1];
      // "vio tu CV" a veces cae partido por el word-wrap del mail (salto de
      // linea en vez de espacio), por eso \s+ entre cada palabra del ancla.
      const puesto = (texto.match(/vio\s+tu\s+CV\s+para\s+el\s+puesto\s+de\s+([\s\S]+?)\.\s*Queremos/i) || [])[1];
      if (!empresa || !puesto) return null;
      return { empresa: limpiarEmpresa(empresa), puesto: limpiar(puesto), estado: 'vista' };
    },
  },
  {
    // ATS generico (no es un portal de empleo, es el software que usa cada
    // empresa para gestionar SU propio proceso -- por eso el remitente
    // cambia segun quien lo use, ej. "HR Capital"). El asunto trae el
    // nombre de la empresa directo.
    portal: 'SmartRecruiters',
    tipo: 'nueva_postulacion',
    remitente: /@smartrecruiters\.com$/i,
    extraer(asunto, texto) {
      const empresa = (asunto.match(/Thank you for applying to (.+)$/i) || [])[1];
      const puesto = (texto.match(/for the position of ([\s\S]+?)\.(?=\s|$)/i) || [])[1];
      if (!empresa || !puesto) return null;
      return { empresa: limpiar(empresa), puesto: limpiar(puesto) };
    },
  },
  {
    // Mismo caso que SmartRecruiters: ATS generico (Pandape) que cualquier
    // empresa puede usar para su propio proceso -- el remitente varia
    // (ej. "TicMoAI"), la empresa sale del cuerpo, no del asunto.
    portal: 'Pandape',
    tipo: 'nueva_postulacion',
    remitente: /@pandape\.com$/i,
    extraer(asunto, texto) {
      const match = texto.match(/([^\n]+?)\s*\n\s*Proceso de selecci[oó]n para:\s*\n\s*([\s\S]+?)\s*(?:\n\s*\n|La empresa|$)/i);
      if (!match) return null;
      return { empresa: limpiar(match[1]), puesto: limpiar(match[2]) };
    },
  },
];

// Red de contencion para empresas que escriben directo desde su propio ATS
// (ej. TicMoAI) en vez de a traves de uno de los portales de arriba: esos
// mails no matchean ningun remitente conocido, asi que nunca se agregaria
// una regla especifica para cada empresa nueva. En cambio, si el mail
// *parece* de un proceso de postulacion (por estas palabras clave), se
// avisa por Telegram en vez de descartarlo en silencio -- ver emailSync.js.
const PALABRAS_CLAVE_LABORAL = [
  'postulaci',
  'candidatura',
  'entrevista',
  'proceso de selecci',
  'vacante',
  'oportunidad laboral',
  'recursos humanos',
  'talent acquisition',
  'reclutamiento',
  'tu perfil',
  'hoja de vida',
  'curriculum',
  'cv adjunto',
  'hiring',
  'recruiter',
  'job application',
  'your application',
  'your profile',
  'we will review',
];

function pareceLaboral(asunto, texto) {
  const contenido = `${asunto} ${texto}`.toLowerCase();
  return PALABRAS_CLAVE_LABORAL.some((palabra) => contenido.includes(palabra));
}

module.exports = PARSERS;
module.exports.pareceLaboral = pareceLaboral;
