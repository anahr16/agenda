import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export const ESTADOS_POSTULACION = ['enviada', 'vista', 'entrevista', 'rechazada', 'oferta'] as const;
export type EstadoPostulacion = (typeof ESTADOS_POSTULACION)[number];

export interface Postulacion {
  id: number;
  empresa: string;
  puesto: string;
  portal: string | null;
  descripcion: string | null;
  link: string | null;
  fecha_postulacion: string;
  estado: EstadoPostulacion;
  notas: string | null;
  creado_en: string;
}

export interface PostulacionesStats {
  total: number;
  porEstado: { estado: string; n: number }[];
  porPortal: { portal: string; n: number }[];
}

export interface DatosPostulacion {
  empresa: string;
  puesto: string;
  portal?: string;
  descripcion?: string;
  link?: string;
  fecha_postulacion: string;
  estado?: EstadoPostulacion;
  notas?: string;
}

@Injectable({ providedIn: 'root' })
export class PostulacionesService {
  private readonly base = `${environment.apiUrl}/postulaciones`;

  constructor(private http: HttpClient) {}

  listar() {
    return this.http.get<Postulacion[]>(this.base);
  }

  crear(datos: DatosPostulacion) {
    return this.http.post<Postulacion>(this.base, datos);
  }

  editar(id: number, datos: DatosPostulacion) {
    return this.http.put<Postulacion>(`${this.base}/${id}`, datos);
  }

  borrar(id: number) {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  stats() {
    return this.http.get<PostulacionesStats>(`${this.base}/stats`);
  }
}
