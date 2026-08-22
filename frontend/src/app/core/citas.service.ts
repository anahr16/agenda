import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface Cita {
  id: number;
  cliente_id: number;
  inicio: string;
  fin: string;
  estado: string;
  notas: string | null;
  recordatorio_enviado: number;
  creado_en: string;
}

export interface CitaInput {
  cliente_id: number;
  inicio: string;
  fin: string;
  estado?: string;
  notas?: string;
}

@Injectable({ providedIn: 'root' })
export class CitasService {
  private readonly base = `${environment.apiUrl}/citas`;

  constructor(private http: HttpClient) {}

  listar() {
    return this.http.get<Cita[]>(this.base);
  }

  crear(datos: CitaInput) {
    return this.http.post<Cita>(this.base, datos);
  }

  editar(id: number, datos: CitaInput) {
    return this.http.put<Cita>(`${this.base}/${id}`, datos);
  }

  borrar(id: number) {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
