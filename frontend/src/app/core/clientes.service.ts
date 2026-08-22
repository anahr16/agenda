import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface Cliente {
  id: number;
  nombre: string;
  telefono: string | null;
  creado_en: string;
}

@Injectable({ providedIn: 'root' })
export class ClientesService {
  private readonly base = `${environment.apiUrl}/clientes`;

  constructor(private http: HttpClient) {}

  listar() {
    return this.http.get<Cliente[]>(this.base);
  }

  crear(datos: { nombre: string; telefono?: string }) {
    return this.http.post<Cliente>(this.base, datos);
  }

  editar(id: number, datos: { nombre: string; telefono?: string }) {
    return this.http.put<Cliente>(`${this.base}/${id}`, datos);
  }

  borrar(id: number) {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
