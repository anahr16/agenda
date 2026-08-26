const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');

let firebaseApp = null;
let avisoMostrado = false;

function getFirebaseApp() {
  if (firebaseApp) return firebaseApp;
  const rutaCredenciales = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!rutaCredenciales) return null;
  try {
    const serviceAccount = require(path.resolve(rutaCredenciales));
    firebaseApp = initializeApp({ credential: cert(serviceAccount) });
    return firebaseApp;
  } catch (err) {
    console.error('[firebase] No se pudo inicializar Firebase:', err.message);
    return null;
  }
}

function avisoFirebaseNoConfigurado(origen) {
  if (!avisoMostrado) {
    console.warn(
      `[${origen}] FIREBASE_SERVICE_ACCOUNT_PATH no configurado: los recordatorios se loguean pero no se envian push reales.`
    );
    avisoMostrado = true;
  }
}

module.exports = { getFirebaseApp, avisoFirebaseNoConfigurado };
