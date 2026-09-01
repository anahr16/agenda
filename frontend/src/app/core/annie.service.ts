import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface AnnieMensaje {
  role: 'user' | 'assistant';
  content: unknown;
}

export interface AnnieRespuesta {
  respuesta: string;
  historial: AnnieMensaje[];
  acciones: unknown[];
}

@Injectable({ providedIn: 'root' })
export class AnnieService {
  private readonly base = `${environment.apiUrl}/annie`;

  constructor(private http: HttpClient) {}

  chat(mensaje: string, historial: AnnieMensaje[]) {
    return this.http.post<AnnieRespuesta>(`${this.base}/chat`, { mensaje, historial });
  }

  hablar(texto: string) {
    return this.http.post(`${this.base}/tts`, { texto }, { responseType: 'blob' });
  }

  /** "Mientras no estuviste" del saludo -- ver actividad_postulaciones en el backend. */
  actividadPendiente() {
    return this.http.get<{ actividad: string[] }>(`${this.base}/actividad-pendiente`);
  }
}
