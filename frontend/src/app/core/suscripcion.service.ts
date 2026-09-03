import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface EstadoSuscripcion {
  permitido: boolean;
  /** Distinto de "permitido": Postulaciones exige suscripcion paga, no alcanza con la prueba gratis. */
  postulaciones_permitido: boolean;
  fecha_fin_prueba: string | null;
  suscripcion_vence: string | null;
  suscripcion_fuente: string | null;
  precio_clp: number;
  trial_dias: number;
}

@Injectable({ providedIn: 'root' })
export class SuscripcionService {
  private readonly base = `${environment.apiUrl}/suscripcion`;

  readonly estado = signal<EstadoSuscripcion | null>(null);
  /** Prendido por el interceptor ante un 402 -- ver auth.interceptor.ts. */
  readonly mostrarPaywall = signal(false);
  readonly creandoCheckout = signal(false);
  readonly errorCheckout = signal<string | null>(null);

  constructor(private http: HttpClient) {}

  /** Se llama al cerrar sesion, mismo motivo que el resto de los servicios. */
  reset(): void {
    this.estado.set(null);
    this.mostrarPaywall.set(false);
    this.errorCheckout.set(null);
  }

  cargar() {
    return this.http.get<EstadoSuscripcion>(this.base).pipe(tap((estado) => this.estado.set(estado)));
  }

  /** Redirige al checkout hospedado de MercadoPago -- no hay nada que mostrar despues, la pagina se va. */
  crearCheckoutMercadoPago(): void {
    this.creandoCheckout.set(true);
    this.errorCheckout.set(null);
    this.http.post<{ init_point: string }>(`${this.base}/mercadopago/checkout`, {}).subscribe({
      next: ({ init_point }) => {
        window.location.href = init_point;
      },
      error: (err) => {
        this.creandoCheckout.set(false);
        this.errorCheckout.set(err.error?.error || null);
      },
    });
  }
}
