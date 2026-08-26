import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface MailRevision {
  id: number;
  remitente: string | null;
  asunto: string | null;
  cuerpo: string;
  fecha_recibido: string | null;
  creado_en: string;
}

@Injectable({ providedIn: 'root' })
export class MailsRevisionService {
  private readonly base = `${environment.apiUrl}/mails-revision`;

  /** Estado compartido: la pantalla de Postulaciones lee de acá. */
  readonly mails = signal<MailRevision[]>([]);

  constructor(private http: HttpClient) {}

  listar() {
    return this.http.get<MailRevision[]>(this.base).pipe(tap((lista) => this.mails.set(lista)));
  }

  descartar(id: number) {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
