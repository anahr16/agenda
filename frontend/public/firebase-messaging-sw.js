importScripts('https://www.gstatic.com/firebasejs/12.18.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.18.0/firebase-messaging-compat.js');

// Mismos valores que src/environments/environment.ts (firebase). Un service
// worker no puede importar ese archivo, asi que se duplican aca a mano.
firebase.initializeApp({
  apiKey: 'AIzaSyA2ju9HaWita7LPDYXmiQ5mzj3UtB6QrnE',
  authDomain: 'turnero-ec3cd.firebaseapp.com',
  projectId: 'turnero-ec3cd',
  messagingSenderId: '1085663863809',
  appId: '1:1085663863809:web:1cfcdf87f345e698ad0c00',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || 'Agenda Inteligente', {
    body: body || '',
  });
});
