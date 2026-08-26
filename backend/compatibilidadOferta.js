// Compatibilidad entre el perfil de la usuaria (perfil.js) y la descripcion
// de una oferta puntual, calculada con IA (mismo modelo que usa Annie).
// Es un score aparte de la "probabilidad de llamada" de probabilidadLlamada.js:
// ese mide chance de que te contacten (estado + antiguedad), este mide que
// tan bien calza tu perfil con lo que pide ESA oferta en particular.

const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic();

const HERRAMIENTA_COMPATIBILIDAD = {
  name: 'compatibilidad',
  description: 'Registra el porcentaje de compatibilidad entre el perfil de la candidata y la oferta de trabajo.',
  input_schema: {
    type: 'object',
    properties: {
      compatibilidad: { type: 'integer', description: 'Porcentaje de 0 a 100 de que tan compatible es el perfil con esta oferta especifica.' },
      razon: { type: 'string', description: 'Una oracion breve explicando el numero (fortalezas y brechas principales).' },
    },
    required: ['compatibilidad', 'razon'],
  },
};

async function calcularCompatibilidad(perfil, descripcionOferta) {
  if (!process.env.ANTHROPIC_API_KEY || !perfil || !descripcionOferta) return null;

  const respuesta = await client.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 300,
    tools: [HERRAMIENTA_COMPATIBILIDAD],
    tool_choice: { type: 'tool', name: 'compatibilidad' },
    messages: [
      {
        role: 'user',
        content: `Perfil de la candidata:\n${perfil}\n\nOferta de trabajo a evaluar:\n${descripcionOferta}\n\nEvalua que tan compatible es el perfil de la candidata con esta oferta especifica (no con ofertas en general).`,
      },
    ],
  });

  const uso = respuesta.content.find((b) => b.type === 'tool_use');
  if (!uso) return null;
  return { compatibilidad: uso.input.compatibilidad, razon: uso.input.razon };
}

module.exports = { calcularCompatibilidad };
