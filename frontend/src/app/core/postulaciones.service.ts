import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { SILENCIAR_PAYWALL } from './paywall';

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
  fecha_entrevista: string | null;
  notas: string | null;
  creado_en: string;
  /** Estimacion heuristica (0-100); null si el estado ya no es enviada/vista. Ver backend/probabilidadLlamada.js. */
  probabilidad_llamada: number | null;
  /** Compatibilidad del perfil con esta oferta puntual (0-100, calculado con IA); null si no hay descripcion o no se pudo calcular. */
  compatibilidad_oferta: number | null;
  compatibilidad_razon: string | null;
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
  fecha_entrevista?: string;
  notas?: string;
}

@Injectable({ providedIn: 'root' })
export class PostulacionesService {
  private readonly base = `${environment.apiUrl}/postulaciones`;

  /** Estado compartido: todas las pantallas leen de acá para verse siempre sincronizadas. */
  readonly postulaciones = signal<Postulacion[]>([]);

  constructor(private http: HttpClient) {}

  /** Se llama al cerrar sesion -- sin esto, si otra cuenta se loguea en la misma pestaña, veria por un instante los datos cacheados de la cuenta anterior. */
  reset(): void {
    this.postulaciones.set([]);
  }

  /**
   * `silencioso`: para el polling de fondo de Shell (corre en cualquier
   * pantalla) -- Postulaciones es una funcion paga, y sin esto alguien sin
   * suscripcion veria el modal de paywall aparecer solo con tener la app
   * abierta, sin haber entrado a Postulaciones.
   */
  listar(opciones?: { silencioso?: boolean }) {
    const context = opciones?.silencioso ? new HttpContext().set(SILENCIAR_PAYWALL, true) : undefined;
    return this.http.get<Postulacion[]>(this.base, { context }).pipe(tap((lista) => this.postulaciones.set(lista)));
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

  recalcularCompatibilidad() {
    return this.http.post<{ actualizadas: number; descripcionesTraidas: number }>(
      `${this.base}/recalcular-compatibilidad`,
      {}
    );
  }

  sincronizarComputrabajo() {
    return this.http.post<{ actualizadas: number; sinMatch: number }>(`${this.base}/sincronizar-computrabajo`, {});
  }
}
