import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

interface EventoPendiente {
  id: number;
  titulo: string;
  hora: string | null;
  notas: string | null;
}

interface EntrevistaPendiente {
  id: number;
  empresa: string;
  puesto: string;
  fecha_entrevista: string;
}

export interface RecordatoriosPendientes {
  eventos: EventoPendiente[];
  entrevistas: EntrevistaPendiente[];
}

@Injectable({ providedIn: 'root' })
export class RecordatoriosVozService {
  private readonly base = `${environment.apiUrl}/recordatorios-voz`;

  constructor(private http: HttpClient) {}

  pendientes() {
    return this.http.get<RecordatoriosPendientes>(`${this.base}/pendientes`);
  }
}
