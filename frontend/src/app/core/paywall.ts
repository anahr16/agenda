import { HttpContextToken } from '@angular/common/http';

/**
 * Pedidos marcados con esto no disparan el modal de paywall global del
 * interceptor -- para llamadas de fondo (ej. el polling de Postulaciones
 * en Shell, que corre en cualquier pantalla) que no deberian interrumpir a
 * alguien que ni esta mirando Postulaciones.
 */
export const SILENCIAR_PAYWALL = new HttpContextToken<boolean>(() => false);
