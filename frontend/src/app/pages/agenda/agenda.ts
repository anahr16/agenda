import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Cliente, ClientesService } from '../../core/clientes.service';
import { Cita, CitasService } from '../../core/citas.service';
import { Postulacion, PostulacionesService } from '../../core/postulaciones.service';

function toFechaInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseUtc(iso: string): Date {
  return new Date(iso.endsWith('Z') ? iso : `${iso}Z`);
}

function toUtcIso(date: Date): string {
  return date.toISOString().slice(0, 19);
}

function localInputToUtcIso(fecha: string, hora: string): string {
  return toUtcIso(new Date(`${fecha}T${hora}:00`));
}

function inicioDeSemana(date: Date): Date {
  const copia = new Date(date);
  const diaSemana = (copia.getDay() + 6) % 7; // lunes = 0
  copia.setDate(copia.getDate() - diaSemana);
  return copia;
}

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './agenda.html',
  styleUrl: './agenda.css',
})
export class Agenda implements OnInit {
  citas = signal<Cita[]>([]);
  clientes = signal<Cliente[]>([]);
  postulaciones = signal<Postulacion[]>([]);
  vista = signal<'dia' | 'semana'>('dia');
  fechaSeleccionada = signal<string>(toFechaInput(new Date()));
  editandoId = signal<number | null>(null);
  error = signal<string | null>(null);

  clienteId = '';
  fecha = toFechaInput(new Date());
  horaInicio = '09:00';
  horaFin = '09:30';
  notas = '';

  citasDelDia = computed(() =>
    this.citas()
      .filter((cita) => toFechaInput(parseUtc(cita.inicio)) === this.fechaSeleccionada())
      .sort((a, b) => a.inicio.localeCompare(b.inicio))
  );

  entrevistasDelDia = computed(() =>
    this.postulaciones()
      .filter((p) => p.fecha_entrevista && toFechaInput(parseUtc(p.fecha_entrevista)) === this.fechaSeleccionada())
      .sort((a, b) => a.fecha_entrevista!.localeCompare(b.fecha_entrevista!))
  );

  diasDeLaSemana = computed(() => {
    const inicio = inicioDeSemana(new Date(`${this.fechaSeleccionada()}T00:00:00`));
    return Array.from({ length: 7 }, (_, i) => {
      const dia = new Date(inicio);
      dia.setDate(inicio.getDate() + i);
      const fechaStr = toFechaInput(dia);
      return {
        fecha: fechaStr,
        etiqueta: dia.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: '2-digit' }),
        citas: this.citas()
          .filter((cita) => toFechaInput(parseUtc(cita.inicio)) === fechaStr)
          .sort((a, b) => a.inicio.localeCompare(b.inicio)),
        entrevistas: this.postulaciones()
          .filter((p) => p.fecha_entrevista && toFechaInput(parseUtc(p.fecha_entrevista)) === fechaStr)
          .sort((a, b) => a.fecha_entrevista!.localeCompare(b.fecha_entrevista!)),
      };
    });
  });

  constructor(
    private citasService: CitasService,
    private clientesService: ClientesService,
    private postulacionesService: PostulacionesService
  ) {}

  ngOnInit(): void {
    this.cargarClientes();
    this.cargarCitas();
    this.cargarPostulaciones();
  }

  cargarClientes(): void {
    this.clientesService.listar().subscribe((clientes) => this.clientes.set(clientes));
  }

  cargarCitas(): void {
    this.citasService.listar().subscribe((citas) => this.citas.set(citas));
  }

  cargarPostulaciones(): void {
    this.postulacionesService.listar().subscribe((postulaciones) => this.postulaciones.set(postulaciones));
  }

  nombreCliente(clienteId: number): string {
    return this.clientes().find((c) => c.id === clienteId)?.nombre ?? `Cliente #${clienteId}`;
  }

  hora(iso: string): string {
    return parseUtc(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  }

  irADia(fecha: string): void {
    this.fechaSeleccionada.set(fecha);
    this.vista.set('dia');
  }

  cambiarDia(delta: number): void {
    const actual = new Date(`${this.fechaSeleccionada()}T00:00:00`);
    actual.setDate(actual.getDate() + delta);
    this.fechaSeleccionada.set(toFechaInput(actual));
  }

  editar(cita: Cita): void {
    this.editandoId.set(cita.id);
    this.clienteId = String(cita.cliente_id);
    const inicio = parseUtc(cita.inicio);
    const fin = parseUtc(cita.fin);
    this.fecha = toFechaInput(inicio);
    this.horaInicio = inicio.toTimeString().slice(0, 5);
    this.horaFin = fin.toTimeString().slice(0, 5);
    this.notas = cita.notas ?? '';
  }

  cancelarEdicion(): void {
    this.editandoId.set(null);
    this.clienteId = '';
    this.notas = '';
    this.horaInicio = '09:00';
    this.horaFin = '09:30';
    this.fecha = this.fechaSeleccionada();
  }

  guardar(): void {
    this.error.set(null);
    if (!this.clienteId) {
      this.error.set('Elegi un cliente.');
      return;
    }
    const datos = {
      cliente_id: Number(this.clienteId),
      inicio: localInputToUtcIso(this.fecha, this.horaInicio),
      fin: localInputToUtcIso(this.fecha, this.horaFin),
      notas: this.notas || undefined,
    };
    const id = this.editandoId();
    const accion = id ? this.citasService.editar(id, datos) : this.citasService.crear(datos);

    accion.subscribe({
      next: () => {
        this.cancelarEdicion();
        this.cargarCitas();
      },
      error: (err) => this.error.set(err.error?.error || 'No se pudo guardar la cita.'),
    });
  }

  cancelarCita(cita: Cita): void {
    if (!confirm('¿Cancelar esta cita?')) return;
    this.citasService
      .editar(cita.id, {
        cliente_id: cita.cliente_id,
        inicio: cita.inicio,
        fin: cita.fin,
        estado: 'cancelada',
        notas: cita.notas ?? undefined,
      })
      .subscribe(() => this.cargarCitas());
  }

  borrar(cita: Cita): void {
    if (!confirm('¿Borrar esta cita?')) return;
    this.citasService.borrar(cita.id).subscribe(() => this.cargarCitas());
  }
}
