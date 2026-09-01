import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

const TOKEN_KEY = 'turnero_token';

interface TokenPayload {
  id: number;
  email: string;
  exp: number;
}

function decodeToken(token: string): TokenPayload | null {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly usuario = signal<TokenPayload | null>(this.leerUsuarioGuardado());

  constructor(private http: HttpClient) {}

  private leerUsuarioGuardado(): TokenPayload | null {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    const payload = decodeToken(token);
    if (!payload || payload.exp * 1000 < Date.now()) {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
    return payload;
  }

  login(email: string, password: string): Observable<{ token: string }> {
    return this.http.post<{ token: string }>(`${environment.apiUrl}/auth/login`, { email, password }).pipe(
      tap(({ token }) => {
        localStorage.setItem(TOKEN_KEY, token);
        this.usuario.set(decodeToken(token));
      })
    );
  }

  registrar(email: string, password: string): Observable<unknown> {
    return this.http.post(`${environment.apiUrl}/auth/register`, { email, password });
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.usuario.set(null);
  }

  /** Reemplaza el token guardado sin pasar por /auth/login -- usado al cambiar el email, que devuelve un token nuevo porque el viejo tiene el email anterior embebido. */
  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
    this.usuario.set(decodeToken(token));
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  estaLogueado(): boolean {
    return this.usuario() !== null;
  }
}
