import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { environment } from '../../environments/environment';

export type Idioma = 'es' | 'en';
export type Tema = 'claro' | 'oscuro';

export interface Perfil {
  id: number;
  nombre: string | null;
  email: string;
  foto_perfil: string | null;
  idioma: Idioma;
  tema: Tema;
  notificaciones_activas: 0 | 1;
  perfil_cv: string | null;
  computrabajo_email: string | null;
  computrabajo_conectado: 0 | 1;
  computrabajo_sesion_conectada: 0 | 1;
}

export interface DatosPerfil {
  nombre?: string;
  idioma?: Idioma;
  tema?: Tema;
  notificaciones_activas?: boolean;
}

const TEMA_KEY = 'agenda_tema';
const IDIOMA_KEY = 'agenda_idioma';

/** Aplica el tema guardado apenas arranca la app, antes de tener el perfil del backend -- evita el flash de tema claro al recargar. */
export function aplicarTemaCacheado(): void {
  const tema = localStorage.getItem(TEMA_KEY);
  if (tema === 'oscuro') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
}

@Injectable({ providedIn: 'root' })
export class PerfilService {
  private readonly base = `${environment.apiUrl}/auth`;

  readonly perfil = signal<Perfil | null>(null);

  constructor(private http: HttpClient, private translate: TranslateService) {}

  /** Se llama al cerrar sesion -- sin esto, si otra cuenta se loguea en la misma pestaña, veria por un instante el perfil cacheado de la cuenta anterior. */
  reset(): void {
    this.perfil.set(null);
  }

  cargar() {
    return this.http.get<Perfil>(`${this.base}/perfil`).pipe(
      tap((perfil) => {
        this.perfil.set(perfil);
        this.aplicarTema(perfil.tema);
        this.aplicarIdioma(perfil.idioma);
      })
    );
  }

  actualizarPerfil(datos: DatosPerfil) {
    return this.http.put<Perfil>(`${this.base}/perfil`, datos).pipe(
      tap((perfil) => {
        this.perfil.set(perfil);
        this.aplicarTema(perfil.tema);
        this.aplicarIdioma(perfil.idioma);
      })
    );
  }

  cambiarEmail(email: string, passwordActual: string) {
    return this.http.put<{ token: string }>(`${this.base}/email`, { email, password_actual: passwordActual });
  }

  cambiarPassword(passwordActual: string, passwordNueva: string) {
    return this.http.put<{ ok: true }>(`${this.base}/password`, {
      password_actual: passwordActual,
      password_nueva: passwordNueva,
    });
  }

  subirFoto(archivo: File) {
    const formData = new FormData();
    formData.append('foto', archivo);
    return this.http.post<{ foto_perfil: string }>(`${this.base}/foto-perfil`, formData).pipe(
      tap(({ foto_perfil }) => {
        const actual = this.perfil();
        if (actual) this.perfil.set({ ...actual, foto_perfil });
      })
    );
  }

  actualizarPerfilCv(perfilCv: string) {
    return this.http.put<{ perfil_cv: string }>(`${this.base}/perfil-cv`, { perfil_cv: perfilCv }).pipe(
      tap(({ perfil_cv }) => {
        const actual = this.perfil();
        if (actual) this.perfil.set({ ...actual, perfil_cv });
      })
    );
  }

  conectarComputrabajo(email: string, password: string) {
    return this.http.put<{ ok: true }>(`${this.base}/computrabajo`, { email, password }).pipe(
      tap(() => {
        const actual = this.perfil();
        if (actual) this.perfil.set({ ...actual, computrabajo_email: email, computrabajo_conectado: 1 });
      })
    );
  }

  desconectarComputrabajo() {
    return this.http.delete<{ ok: true }>(`${this.base}/computrabajo`).pipe(
      tap(() => {
        const actual = this.perfil();
        if (actual) {
          this.perfil.set({ ...actual, computrabajo_email: null, computrabajo_conectado: 0, computrabajo_sesion_conectada: 0 });
        }
      })
    );
  }

  guardarCookiesComputrabajo(cookies: string) {
    return this.http.put<{ ok: true }>(`${this.base}/computrabajo-cookies`, { cookies }).pipe(
      tap(() => {
        const actual = this.perfil();
        if (actual) this.perfil.set({ ...actual, computrabajo_sesion_conectada: 1 });
      })
    );
  }

  /** Locale para toLocaleDateString/toLocaleString y para el lang de voz, segun el idioma elegido. */
  localeDeIdioma(): string {
    return this.perfil()?.idioma === 'en' ? 'en-US' : 'es-419';
  }

  private aplicarTema(tema: Tema): void {
    document.documentElement.setAttribute('data-theme', tema === 'oscuro' ? 'dark' : 'light');
    localStorage.setItem(TEMA_KEY, tema);
  }

  private aplicarIdioma(idioma: Idioma): void {
    this.translate.use(idioma);
    localStorage.setItem(IDIOMA_KEY, idioma);
  }
}
