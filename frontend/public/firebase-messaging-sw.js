importScripts('https://www.gstatic.com/firebasejs/12.18.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.18.0/firebase-messaging-compat.js');

// Mismos valores que src/environments/environment.ts (firebase). Un service
// worker no puede importar ese archivo, asi que se duplican aca a mano.
firebase.initializeApp({
  apiKey: '',
  authDomain: '',
  projectId: '',
  messagingSenderId: '',
  appId: '',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || 'Turnero', {
    body: body || '',
  });
});
