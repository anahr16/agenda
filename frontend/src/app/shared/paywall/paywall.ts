import { Component, computed } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { SuscripcionService } from '../../core/suscripcion.service';

/**
 * Modal de pago -- lo prende el interceptor (auth.interceptor.ts) ante
 * cualquier 402 con suscripcion_requerida, que hoy solo devuelven
 * Postulaciones/mails-revision (ver requireSuscripcionPaga en el backend).
 * A diferencia del bloqueo total original del plan, esto SI se puede
 * cerrar: Agenda/Annie siguen libres durante la prueba, asi que no tiene
 * sentido tapar toda la app por algo que paso al pedir Postulaciones.
 */
@Component({
  selector: 'app-paywall',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './paywall.html',
  styleUrl: './paywall.css',
})
export class Paywall {
  readonly precioFormateado = computed(() => (this.suscripcion.estado()?.precio_clp ?? 10000).toLocaleString('es-CL'));

  constructor(readonly suscripcion: SuscripcionService) {}

  cerrar(): void {
    this.suscripcion.mostrarPaywall.set(false);
  }

  suscribirse(): void {
    this.suscripcion.crearCheckoutMercadoPago();
  }
}
