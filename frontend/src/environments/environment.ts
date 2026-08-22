export const environment = {
  apiUrl: 'http://localhost:4000',
  // Completar con los datos del proyecto de Firebase (Configuracion del
  // proyecto -> General -> Tus apps -> agregar app Web) para habilitar los
  // recordatorios push en el navegador. Mientras queden vacios, el
  // PushService no intenta registrar notificaciones.
  firebase: {
    apiKey: '',
    authDomain: '',
    projectId: '',
    messagingSenderId: '',
    appId: '',
  },
  // Configuracion del proyecto -> Cloud Messaging -> Certificados push web
  vapidKey: '',
};
