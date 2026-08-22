import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Cliente, ClientesService } from '../../core/clientes.service';

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './clientes.html',
  styleUrl: './clientes.css',
})
export class Clientes implements OnInit {
  clientes = signal<Cliente[]>([]);
  editandoId = signal<number | null>(null);
  nombre = '';
  telefono = '';
  error = signal<string | null>(null);

  constructor(private clientesService: ClientesService) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.clientesService.listar().subscribe((clientes) => this.clientes.set(clientes));
  }

  editar(cliente: Cliente): void {
    this.editandoId.set(cliente.id);
    this.nombre = cliente.nombre;
    this.telefono = cliente.telefono ?? '';
  }

  cancelarEdicion(): void {
    this.editandoId.set(null);
    this.nombre = '';
    this.telefono = '';
  }

  guardar(): void {
    this.error.set(null);
    const datos = { nombre: this.nombre, telefono: this.telefono || undefined };
    const id = this.editandoId();
    const accion = id ? this.clientesService.editar(id, datos) : this.clientesService.crear(datos);

    accion.subscribe({
      next: () => {
        this.cancelarEdicion();
        this.cargar();
      },
      error: (err) => this.error.set(err.error?.error || 'No se pudo guardar el cliente.'),
    });
  }

  borrar(cliente: Cliente): void {
    if (!confirm(`¿Borrar a ${cliente.nombre}?`)) return;
    this.clientesService.borrar(cliente.id).subscribe(() => this.cargar());
  }
}
