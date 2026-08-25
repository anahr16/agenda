import { Component, OnInit, computed, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { PushService } from '../core/push.service';
import { PostulacionesService, Postulacion } from '../core/postulaciones.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './shell.html',
  styleUrl: './shell.css',
})
export class Shell implements OnInit {
  mensajePush = signal<string | null>(null);
  private postulaciones = signal<Postulacion[]>([]);

  proximasEntrevistas = computed(() => {
    const ahora = new Date();
    return this.postulaciones()
      .filter((p) => p.fecha_entrevista && new Date(p.fecha_entrevista) >= ahora)
      .sort((a, b) => new Date(a.fecha_entrevista!).getTime() - new Date(b.fecha_entrevista!).getTime())
      .slice(0, 3)
      .map((p) => ({
        id: p.id,
        empresa: p.empresa,
        cuando: this.formatoFecha(p.fecha_entrevista!),
      }));
  });

  constructor(
    private auth: AuthService,
    private push: PushService,
    private router: Router,
    private postulacionesService: PostulacionesService
  ) {}

  ngOnInit(): void {
    this.postulacionesService.listar().subscribe({
      next: (lista) => this.postulaciones.set(lista),
      error: () => {},
    });
  }

  get email(): string {
    return this.auth.usuario()?.email ?? '';
  }

  get inicial(): string {
    return this.email.charAt(0).toUpperCase() || 'A';
  }

  get pushDisponible(): boolean {
    return this.push.firebaseConfigurado();
  }

  private formatoFecha(iso: string): string {
    const fecha = new Date(iso);
    return fecha.toLocaleString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
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
