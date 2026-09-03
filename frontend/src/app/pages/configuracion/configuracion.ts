import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../core/auth.service';
import { Idioma, PerfilService, Tema } from '../../core/perfil.service';
import { PushService } from '../../core/push.service';
import { SuscripcionService } from '../../core/suscripcion.service';
import { environment } from '../../../environments/environment';

export type SeccionConfig =
  | 'perfil'
  | 'contrasena'
  | 'notificaciones'
  | 'cv'
  | 'correo'
  | 'computrabajo'
  | 'suscripcion'
  | 'idioma'
  | 'apariencia';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  templateUrl: './configuracion.html',
  styleUrl: './configuracion.css',
})
export class Configuracion {
  readonly perfil;
  readonly pushDisponible;
  readonly estadoSuscripcion;
  readonly creandoCheckout;
  readonly errorCheckout;

  seccionActiva = signal<SeccionConfig>('perfil');

  nombre: string;
  email: string;
  passwordActualEmail = '';
  passwordActual = '';
  passwordNueva = '';
  perfilCv: string;
  computrabajoEmail = '';
  computrabajoPassword = '';
  computrabajoCookies = '';
  imapEmail = '';
  imapPassword = '';
  imapHost = '';

  guardandoNombre = signal(false);
  mensajeNombre = signal<string | null>(null);
  guardandoEmail = signal(false);
  mensajeEmail = signal<string | null>(null);
  guardandoPassword = signal(false);
  mensajePassword = signal<string | null>(null);
  subiendoFoto = signal(false);
  mensajeFoto = signal<string | null>(null);
  cambiandoNotificaciones = signal(false);
  mensajeNotificaciones = signal<string | null>(null);
  guardandoPerfilCv = signal(false);
  mensajePerfilCv = signal<string | null>(null);
  conectandoComputrabajo = signal(false);
  mensajeComputrabajo = signal<string | null>(null);
  guardandoCookiesComputrabajo = signal(false);
  mensajeCookiesComputrabajo = signal<string | null>(null);
  conectandoImap = signal(false);
  mensajeImap = signal<string | null>(null);

  constructor(
    private auth: AuthService,
    private perfilService: PerfilService,
    private push: PushService,
    private suscripcionService: SuscripcionService,
    private translate: TranslateService
  ) {
    this.perfil = this.perfilService.perfil;
    this.pushDisponible = this.push.firebaseConfigurado();
    this.estadoSuscripcion = this.suscripcionService.estado;
    this.creandoCheckout = this.suscripcionService.creandoCheckout;
    this.errorCheckout = this.suscripcionService.errorCheckout;
    this.nombre = this.perfil()?.nombre ?? '';
    this.email = this.perfil()?.email ?? '';
    this.perfilCv = this.perfil()?.perfil_cv ?? '';
  }

  /** El estado general ya lo carga Shell al arrancar la sesion -- esto solo cubre el caso de entrar directo a esta pestaña antes de que termine. */
  cargarSuscripcionSiHaceFalta(): void {
    if (!this.estadoSuscripcion()) this.suscripcionService.cargar().subscribe({ error: () => {} });
  }

  suscribirse(): void {
    this.suscripcionService.crearCheckoutMercadoPago();
  }

  formatoFecha(iso: string): string {
    return new Date(iso).toLocaleDateString(this.perfilService.localeDeIdioma(), { day: 'numeric', month: 'long', year: 'numeric' });
  }

  precioFormateado(precioClp: number): string {
    return precioClp.toLocaleString('es-CL');
  }

  fotoPerfil(): string | null {
    const path = this.perfil()?.foto_perfil;
    return path ? `${environment.apiUrl}${path}` : null;
  }

  guardarNombre(): void {
    this.guardandoNombre.set(true);
    this.mensajeNombre.set(null);
    this.perfilService.actualizarPerfil({ nombre: this.nombre }).subscribe({
      next: () => {
        this.guardandoNombre.set(false);
        this.mensajeNombre.set(this.translate.instant('configuracion.perfil.exito'));
      },
      error: (err) => {
        this.guardandoNombre.set(false);
        this.mensajeNombre.set(err.error?.error || this.translate.instant('configuracion.perfil.errorNombre'));
      },
    });
  }

  cambiarEmail(): void {
    this.guardandoEmail.set(true);
    this.mensajeEmail.set(null);
    this.perfilService.cambiarEmail(this.email, this.passwordActualEmail).subscribe({
      next: ({ token }) => {
        this.auth.setToken(token);
        this.passwordActualEmail = '';
        this.guardandoEmail.set(false);
        this.mensajeEmail.set(this.translate.instant('configuracion.perfil.exito'));
      },
      error: (err) => {
        this.guardandoEmail.set(false);
        this.mensajeEmail.set(err.error?.error || this.translate.instant('configuracion.perfil.errorEmail'));
      },
    });
  }

  cambiarPassword(): void {
    this.guardandoPassword.set(true);
    this.mensajePassword.set(null);
    this.perfilService.cambiarPassword(this.passwordActual, this.passwordNueva).subscribe({
      next: () => {
        this.passwordActual = '';
        this.passwordNueva = '';
        this.guardandoPassword.set(false);
        this.mensajePassword.set(this.translate.instant('configuracion.contrasena.exito'));
      },
      error: (err) => {
        this.guardandoPassword.set(false);
        this.mensajePassword.set(err.error?.error || this.translate.instant('configuracion.contrasena.error'));
      },
    });
  }

  subirFoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo) return;
    this.subiendoFoto.set(true);
    this.mensajeFoto.set(null);
    this.perfilService.subirFoto(archivo).subscribe({
      next: () => {
        this.subiendoFoto.set(false);
        input.value = '';
      },
      error: (err) => {
        this.subiendoFoto.set(false);
        this.mensajeFoto.set(err.error?.error || this.translate.instant('configuracion.perfil.errorFoto'));
      },
    });
  }

  async toggleNotificaciones(): Promise<void> {
    this.cambiandoNotificaciones.set(true);
    this.mensajeNotificaciones.set(null);
    const activar = !this.perfil()?.notificaciones_activas;

    if (activar) {
      const resultado = await this.push.pedirPermisoYRegistrar();
      if (!resultado.ok) {
        this.cambiandoNotificaciones.set(false);
        this.mensajeNotificaciones.set(resultado.motivo ?? this.translate.instant('notificaciones.noSePudoActivar'));
        return;
      }
    } else {
      await this.push.desactivar();
    }

    this.perfilService.actualizarPerfil({ notificaciones_activas: activar }).subscribe({
      next: () => {
        this.cambiandoNotificaciones.set(false);
        this.mensajeNotificaciones.set(
          this.translate.instant(activar ? 'notificaciones.activadas' : 'notificaciones.desactivadas')
        );
      },
      error: () => {
        this.cambiandoNotificaciones.set(false);
      },
    });
  }

  cambiarIdioma(idioma: Idioma): void {
    this.perfilService.actualizarPerfil({ idioma }).subscribe();
  }

  cambiarTema(tema: Tema): void {
    this.perfilService.actualizarPerfil({ tema }).subscribe();
  }

  guardarPerfilCv(): void {
    this.guardandoPerfilCv.set(true);
    this.mensajePerfilCv.set(null);
    this.perfilService.actualizarPerfilCv(this.perfilCv).subscribe({
      next: () => {
        this.guardandoPerfilCv.set(false);
        this.mensajePerfilCv.set(this.translate.instant('configuracion.perfilCv.exito'));
      },
      error: (err) => {
        this.guardandoPerfilCv.set(false);
        this.mensajePerfilCv.set(err.error?.error || this.translate.instant('configuracion.perfilCv.error'));
      },
    });
  }

  conectarComputrabajo(): void {
    this.conectandoComputrabajo.set(true);
    this.mensajeComputrabajo.set(null);
    this.perfilService.conectarComputrabajo(this.computrabajoEmail, this.computrabajoPassword).subscribe({
      next: () => {
        this.computrabajoPassword = '';
        this.conectandoComputrabajo.set(false);
        this.mensajeComputrabajo.set(this.translate.instant('configuracion.computrabajo.conectado'));
      },
      error: (err) => {
        this.conectandoComputrabajo.set(false);
        this.mensajeComputrabajo.set(err.error?.error || this.translate.instant('configuracion.computrabajo.error'));
      },
    });
  }

  desconectarComputrabajo(): void {
    this.conectandoComputrabajo.set(true);
    this.mensajeComputrabajo.set(null);
    this.perfilService.desconectarComputrabajo().subscribe({
      next: () => {
        this.computrabajoEmail = '';
        this.conectandoComputrabajo.set(false);
        this.mensajeComputrabajo.set(this.translate.instant('configuracion.computrabajo.desconectado'));
      },
      error: () => {
        this.conectandoComputrabajo.set(false);
      },
    });
  }

  conectarImap(): void {
    this.conectandoImap.set(true);
    this.mensajeImap.set(null);
    this.perfilService.conectarImap(this.imapEmail, this.imapPassword, this.imapHost || undefined).subscribe({
      next: () => {
        this.imapPassword = '';
        this.conectandoImap.set(false);
        this.mensajeImap.set(this.translate.instant('configuracion.correo.conectado'));
      },
      error: (err) => {
        this.conectandoImap.set(false);
        this.mensajeImap.set(err.error?.error || this.translate.instant('configuracion.correo.error'));
      },
    });
  }

  desconectarImap(): void {
    this.conectandoImap.set(true);
    this.mensajeImap.set(null);
    this.perfilService.desconectarImap().subscribe({
      next: () => {
        this.imapEmail = '';
        this.conectandoImap.set(false);
        this.mensajeImap.set(this.translate.instant('configuracion.correo.desconectado'));
      },
      error: () => {
        this.conectandoImap.set(false);
      },
    });
  }

  guardarCookiesComputrabajo(): void {
    this.guardandoCookiesComputrabajo.set(true);
    this.mensajeCookiesComputrabajo.set(null);
    this.perfilService.guardarCookiesComputrabajo(this.computrabajoCookies).subscribe({
      next: () => {
        this.computrabajoCookies = '';
        this.guardandoCookiesComputrabajo.set(false);
        this.mensajeCookiesComputrabajo.set(this.translate.instant('configuracion.computrabajo.sesionGuardada'));
      },
      error: (err) => {
        this.guardandoCookiesComputrabajo.set(false);
        this.mensajeCookiesComputrabajo.set(err.error?.error || this.translate.instant('configuracion.computrabajo.errorSesion'));
      },
    });
  }
}
