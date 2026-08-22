import { Component, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { PushService } from '../core/push.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './shell.html',
  styleUrl: './shell.css',
})
export class Shell {
  mensajePush = signal<string | null>(null);

  constructor(private auth: AuthService, private push: PushService, private router: Router) {}

  get email(): string {
    return this.auth.usuario()?.email ?? '';
  }

  get pushDisponible(): boolean {
    return this.push.firebaseConfigurado();
  }

  async activarRecordatorios(): Promise<void> {
    const resultado = await this.push.pedirPermisoYRegistrar();
    this.mensajePush.set(resultado.ok ? 'Notificaciones activadas.' : resultado.motivo ?? 'No se pudo activar.');
  }

  salir(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
