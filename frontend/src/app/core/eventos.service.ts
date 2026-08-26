import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../../environments/environment';

export const TIPOS_EVENTO = ['personal', 'medica', 'profesional', 'social'] as const;
export type TipoEvento = (typeof TIPOS_EVENTO)[number];

export interface Evento {
  id: number;
  titulo: string;
  fecha: string;
  hora: string | null;
  notas: string | null;
  tipo: TipoEvento;
  creado_en: string;
}

export interface DatosEvento {
  titulo: string;
  fecha: string;
  hora?: string;
  notas?: string;
  tipo?: TipoEvento;
}

@Injectable({ providedIn: 'root' })
export class EventosService {
  private readonly base = `${environment.apiUrl}/eventos`;

  /** Estado compartido: todas las pantallas leen de acá para verse siempre sincronizadas. */
  readonly eventos = signal<Evento[]>([]);

  constructor(private http: HttpClient) {}

  listar() {
    return this.http.get<Evento[]>(this.base).pipe(tap((lista) => this.eventos.set(lista)));
  }

  crear(datos: DatosEvento) {
    return this.http.post<Evento>(this.base, datos);
  }

  editar(id: number, datos: DatosEvento) {
    return this.http.put<Evento>(`${this.base}/${id}`, datos);
  }

  borrar(id: number) {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
