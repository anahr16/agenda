// Envia recordatorios por Telegram usando la API oficial de bots (HTTP,
// sin dependencias ni sesion que mantener). Ver readme.md para como crear
// el bot con @BotFather y conseguir el TELEGRAM_CHAT_ID.

// Telegram limita a mas o menos 1 mensaje/segundo por chat -- sin esto, un
// arranque con varios avisos juntos (ej. email-sync procesando varios dias
// de mail atrasado de una sola vez) los manda todos en paralelo y Telegram
// devuelve 429 para casi todos, perdiendolos (visto en vivo, 2026-09-03).
// Encolar los envios uno detras de otro con un intervalo minimo evita
// pasarse del limite en vez de solo reintentar despues de fallar.
const INTERVALO_MINIMO_MS = 1200;
let colaTelegram = Promise.resolve();

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function enviarAhora(token, chatId, mensaje) {
  const respuesta = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: mensaje }),
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.text();
    throw new Error(`Telegram respondio ${respuesta.status}: ${detalle}`);
  }
}

function enviarTelegram(mensaje) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.log('[telegram] (simulado, TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID no configurados):', mensaje);
    return Promise.resolve();
  }

  // Este envio se encola detras de los anteriores; la cola en si nunca
  // rechaza (si no, un fallo cortaria la fila para todos los avisos
  // siguientes) -- pero lo que se devuelve a quien llama SI refleja el
  // resultado real de ESTE envio, para no romper el try/catch de quien
  // llama a enviarTelegram().
  const tarea = colaTelegram.then(() => enviarAhora(token, chatId, mensaje));
  colaTelegram = tarea.catch(() => {}).then(() => esperar(INTERVALO_MINIMO_MS));
  return tarea;
}

module.exports = { enviarTelegram };
