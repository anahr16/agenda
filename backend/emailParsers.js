// Reglas para detectar mails de portales de empleo y extraer datos de la
// postulacion. Cada parser se prueba por remitente (regex); de los que
// matchean el remitente, se usa el primero cuyo `extraer` devuelva datos.
//
// `tipo: 'nueva_postulacion'` -> extraer() devuelve { empresa, puesto }
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

const PARSERS = [
  {
    portal: 'Chiletrabajos',
    tipo: 'nueva_postulacion',
    remitente: /@chiletrabajos\.cl$/i,
    extraer(asunto, texto) {
      const empresa = (texto.match(/Postulaci[oó]n Enviada a ([\s\S]+?)\.(?=\s|$)/i) || [])[1];
      const puesto = (texto.match(/Tu Postulaci[oó]n a ([\s\S]+?) fue enviada correctamente/i) || [])[1];
      if (!empresa || !puesto) return null;
      return { empresa: limpiar(empresa), puesto: limpiar(puesto) };
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
    portal: 'Computrabajo',
    tipo: 'nueva_postulacion',
    remitente: /@computrabajo\.com$/i,
    extraer(asunto, texto) {
      const puesto = (asunto.match(/Seguimiento de tu postulaci[oó]n para el puesto ([\s\S]+)/i) || [])[1];
      const empresa = (texto.match(/Tu CV ya est[aá] en manos de ([\s\S]+?)\.(?=\s|$)/i) || [])[1];
      if (!empresa || !puesto) return null;
      return { empresa: limpiar(empresa), puesto: limpiar(puesto) };
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
];

module.exports = PARSERS;
