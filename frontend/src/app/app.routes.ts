import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { Shell } from './shell/shell';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login/login').then((m) => m.Login) },
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    children: [
      { path: 'agenda', loadComponent: () => import('./pages/agenda/agenda').then((m) => m.Agenda) },
      { path: 'clientes', loadComponent: () => import('./pages/clientes/clientes').then((m) => m.Clientes) },
      {
        path: 'postulaciones',
        loadComponent: () => import('./pages/postulaciones/postulaciones').then((m) => m.Postulaciones),
      },
      {
        path: 'configuracion',
        loadComponent: () => import('./pages/configuracion/configuracion').then((m) => m.Configuracion),
      },
      { path: '', redirectTo: 'agenda', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: '' },
];
