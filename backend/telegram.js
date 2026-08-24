// Envia recordatorios por Telegram usando la API oficial de bots (HTTP,
// sin dependencias ni sesion que mantener). Ver readme.md para como crear
// el bot con @BotFather y conseguir el TELEGRAM_CHAT_ID.

async function enviarTelegram(mensaje) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.log('[telegram] (simulado, TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID no configurados):', mensaje);
    return;
  }

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

module.exports = { enviarTelegram };
