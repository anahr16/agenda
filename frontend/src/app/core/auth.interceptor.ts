import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { SuscripcionService } from './suscripcion.service';
import { SILENCIAR_PAYWALL } from './paywall';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const suscripcion = inject(SuscripcionService);
  const token = auth.getToken();

  const request = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(request).pipe(
    catchError((error) => {
      if (error.status === 401) {
        auth.logout();
        router.navigateByUrl('/login');
      }
      if (error.status === 402 && error.error?.suscripcion_requerida && !request.context.get(SILENCIAR_PAYWALL)) {
        suscripcion.mostrarPaywall.set(true);
      }
      return throwError(() => error);
    })
  );
};
