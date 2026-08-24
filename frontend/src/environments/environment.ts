export const environment = {
  apiUrl: 'http://localhost:4000',
  // Completar con los datos del proyecto de Firebase (Configuracion del
  // proyecto -> General -> Tus apps -> agregar app Web) para habilitar los
  // recordatorios push en el navegador. Mientras queden vacios, el
  // PushService no intenta registrar notificaciones.
  firebase: {
    apiKey: 'AIzaSyA2ju9HaWita7LPDYXmiQ5mzj3UtB6QrnE',
    authDomain: 'turnero-ec3cd.firebaseapp.com',
    projectId: 'turnero-ec3cd',
    messagingSenderId: '1085663863809',
    appId: '1:1085663863809:web:1cfcdf87f345e698ad0c00',
  },
  // Configuracion del proyecto -> Cloud Messaging -> Certificados push web
  vapidKey: 'BEe4wW568m9cvoCA0tCi_NQJ9jxsC3yUshcKqyhN7PxMrnQKLnswMYzLBW_LkulHMa3DC_DiZCbLVrfqf-VQ74c',
};
