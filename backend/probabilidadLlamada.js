// Estimacion heuristica de la probabilidad de que una postulacion activa
// (enviada/vista) termine en una entrevista ("llamada"). Es una heuristica
// por senales conocidas -- no una tasa calculada con conversiones
// historicas reales -- porque hoy no hay ninguna postulacion en estado
// 'entrevista' u 'oferta' en la base para calcular una conversion real. El
// dia que haya casos asi, tiene mas sentido calcular la tasa real por
// portal/empresa a partir de la base en vez de esta heuristica fija.
//
// Senales usadas:
// - Estado actual: 'vista' (la empresa ya abrio/miro el perfil) parte de
//   una base mas alta que 'enviada' (sin ninguna senal de que la vieron).
// - Antiguedad: cuanto mas tiempo paso desde la postulacion sin novedades,
//   mas decae la probabilidad (la mayoria de las respuestas llegan dentro
//   de una ventana inicial) -- con un piso, porque igual hay entrevistas
//   tardias. Ventana corta (14 dias) a proposito: con una ventana larga,
//   postulaciones mandadas la misma semana terminaban con % practicamente
//   iguales entre si (poco util para comparar de un vistazo).
// - Compatibilidad con la oferta (compatibilidadOferta.js), cuando existe:
//   sube o baja la base segun que tan bien calza el perfil con ESA oferta
//   puntual. 50% de compatibilidad es neutro (no mueve nada); mas alto
//   sube hasta +50%, mas bajo baja hasta -50%. Si no hay compatibilidad
//   calculada (la mayoria de los casos hoy, ver readme.md) no se aplica
//   ningun ajuste.

const BASE_POR_ESTADO = { enviada: 0.25, vista: 0.55 };
const VENTANA_DIAS = 14;
const DECAIMIENTO_MINIMO = 0.35;
const PROBABILIDAD_MINIMA = 3;
const PROBABILIDAD_MAXIMA = 90;

function diasDesde(fecha) {
  const ms = Date.now() - new Date(`${fecha}T00:00:00`).getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

function calcularProbabilidad(postulacion) {
  const base = BASE_POR_ESTADO[postulacion.estado];
  if (base === undefined) return null;

  const factorTiempo = Math.max(DECAIMIENTO_MINIMO, 1 - diasDesde(postulacion.fecha_postulacion) / VENTANA_DIAS);
  const factorCompatibilidad =
    postulacion.compatibilidad_oferta === null || postulacion.compatibilidad_oferta === undefined
      ? 1
      : 0.5 + postulacion.compatibilidad_oferta / 100;

  const valor = Math.round(base * factorTiempo * factorCompatibilidad * 100);
  return Math.min(PROBABILIDAD_MAXIMA, Math.max(PROBABILIDAD_MINIMA, valor));
}

module.exports = { calcularProbabilidad };
