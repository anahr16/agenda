// Cliente de MercadoPago, mismo molde que firebaseApp.js: inicializacion
// perezosa, null (con aviso una sola vez) si todavia no hay credenciales.
const { MercadoPagoConfig } = require('mercadopago');

let cliente = null;
let avisoMostrado = false;

function getClienteMercadoPago() {
  if (cliente) return cliente;
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) return null;
  cliente = new MercadoPagoConfig({ accessToken });
  return cliente;
}

function avisoMercadoPagoNoConfigurado(origen) {
  if (!avisoMostrado) {
    console.warn(
      `[${origen}] MERCADOPAGO_ACCESS_TOKEN no configurado: el pago con MercadoPago no esta disponible todavia.`
    );
    avisoMostrado = true;
  }
}

module.exports = { getClienteMercadoPago, avisoMercadoPagoNoConfigurado };
