import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PushService {
  constructor(private http: HttpClient) {}

  firebaseConfigurado(): boolean {
    return Boolean(environment.firebase.apiKey && environment.vapidKey);
  }

  async pedirPermisoYRegistrar(): Promise<{ ok: boolean; motivo?: string }> {
    if (!this.firebaseConfigurado()) {
      return { ok: false, motivo: 'Firebase no esta configurado todavia (ver environment.ts).' };
    }
    if (!(await isSupported())) {
      return { ok: false, motivo: 'Este navegador no soporta notificaciones push.' };
    }

    const permiso = await Notification.requestPermission();
    if (permiso !== 'granted') {
      return { ok: false, motivo: 'Permiso de notificaciones denegado.' };
    }

    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const app = initializeApp(environment.firebase);
    const messaging = getMessaging(app);

    onMessage(messaging, (payload) => {
      const { title, body } = payload.notification || {};
      new Notification(title || 'Agenda Inteligente', { body: body || '' });
    });

    const token = await getToken(messaging, {
      vapidKey: environment.vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (!token) {
      return { ok: false, motivo: 'No se pudo obtener el token de notificaciones.' };
    }

    await firstValueFrom(this.http.put(`${environment.apiUrl}/auth/fcm-token`, { fcm_token: token }));

    return { ok: true };
  }
}
