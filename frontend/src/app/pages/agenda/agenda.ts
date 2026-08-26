import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Postulacion, PostulacionesService } from '../../core/postulaciones.service';

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const NOTA_PREFIJO = 'agenda-nota-';

function toFechaInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseUtc(iso: string): Date {
  return new Date(iso.endsWith('Z') ? iso : `${iso}Z`);
}

function inicioDeMes(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

interface CeldaCalendario {
  fecha: Date;
  fechaKey: string;
  numero: number;
  otroMes: boolean;
  hoy: boolean;
  entrevistas: Postulacion[];
  chipTexto: string;
  clase: string;
}

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './agenda.html',
  styleUrl: './agenda.css',
})
export class Agenda implements OnInit {
  mesVisible = signal<Date>(inicioDeMes(new Date()));
  fechaSeleccionada = signal<string>(toFechaInput(new Date()));
  nota = signal<string>('');

  tituloMes = computed(() => `${MESES[this.mesVisible().getMonth()]} ${this.mesVisible().getFullYear()}`);

  celdas = computed<CeldaCalendario[]>(() => {
    const mes = this.mesVisible();
    const primerDia = new Date(mes.getFullYear(), mes.getMonth(), 1);
    const diaSemanaPrimero = (primerDia.getDay() + 6) % 7; // lunes = 0
    const inicioGrilla = new Date(primerDia);
    inicioGrilla.setDate(primerDia.getDate() - diaSemanaPrimero);

    const entrevistasPorFecha = new Map<string, Postulacion[]>();
    for (const p of this.postulacionesService.postulaciones()) {
      if (!p.fecha_entrevista) continue;
      const key = toFechaInput(parseUtc(p.fecha_entrevista));
      const lista = entrevistasPorFecha.get(key) ?? [];
      lista.push(p);
      entrevistasPorFecha.set(key, lista);
    }

    const hoyKey = toFechaInput(new Date());
    const seleccionActual = this.fechaSeleccionada();
    return Array.from({ length: 42 }, (_, i) => {
      const fecha = new Date(inicioGrilla);
      fecha.setDate(inicioGrilla.getDate() + i);
      const fechaKey = toFechaInput(fecha);
      const otroMes = fecha.getMonth() !== mes.getMonth();
      const esHoy = fechaKey === hoyKey;
      const entrevistas = (entrevistasPorFecha.get(fechaKey) ?? []).sort((a, b) =>
        a.fecha_entrevista!.localeCompare(b.fecha_entrevista!)
      );
      const chipTexto =
        entrevistas.length === 0
          ? ''
          : entrevistas.length === 1
          ? `${this.hora(entrevistas[0].fecha_entrevista!)} ${entrevistas[0].empresa}`
          : `${this.hora(entrevistas[0].fecha_entrevista!)} ${entrevistas[0].empresa} +${entrevistas.length - 1}`;
      const clase = [
        otroMes ? 'otro-mes' : '',
        esHoy ? 'hoy' : '',
        entrevistas.length > 0 ? 'con-entrevista' : '',
        fechaKey === seleccionActual ? 'selected' : '',
      ]
        .filter(Boolean)
        .join(' ');
      return { fecha, fechaKey, numero: fecha.getDate(), otroMes, hoy: esHoy, entrevistas, chipTexto, clase };
    });
  });

  celdaSeleccionada = computed<CeldaCalendario | undefined>(() =>
    this.celdas().find((c) => c.fechaKey === this.fechaSeleccionada())
  );

  seleccionLabel = computed(() => {
    const celda = this.celdaSeleccionada();
    if (!celda) return '';
    const etiquetaDia = `${DIAS_SEMANA[(celda.fecha.getDay() + 6) % 7]} ${celda.numero} de ${MESES[celda.fecha.getMonth()]}`;
    if (celda.entrevistas.length === 1) {
      return `${etiquetaDia} · entrevista con ${celda.entrevistas[0].empresa}`;
    }
    if (celda.entrevistas.length > 1) {
      return `${etiquetaDia} · ${celda.entrevistas.length} entrevistas`;
    }
    return etiquetaDia;
  });

  proximaEntrevistaChip = computed(() => {
    const ahora = new Date();
    const proxima = this.postulacionesService.postulaciones()
      .filter((p) => p.fecha_entrevista && parseUtc(p.fecha_entrevista) >= ahora)
      .sort((a, b) => a.fecha_entrevista!.localeCompare(b.fecha_entrevista!))[0];
    if (!proxima) return null;
    const fecha = parseUtc(proxima.fecha_entrevista!);
    const esHoy = toFechaInput(fecha) === toFechaInput(ahora);
    const hora = fecha.toLocaleTimeString('es-419', { hour: '2-digit', minute: '2-digit' });
    return {
      empresa: proxima.empresa,
      cuando: esHoy ? `Hoy · ${hora}` : `${DIAS_SEMANA[(fecha.getDay() + 6) % 7]} ${fecha.getDate()} · ${hora}`,
    };
  });

  constructor(private postulacionesService: PostulacionesService) {}

  ngOnInit(): void {
    this.postulacionesService.listar().subscribe({ error: () => {} });
    this.cargarNota();
  }

  seleccionarCelda(fechaKey: string): void {
    this.fechaSeleccionada.set(fechaKey);
    this.cargarNota();
  }

  cambiarMes(delta: number): void {
    const actual = this.mesVisible();
    this.mesVisible.set(new Date(actual.getFullYear(), actual.getMonth() + delta, 1));
  }

  onNotaChange(valor: string): void {
    this.nota.set(valor);
    localStorage.setItem(NOTA_PREFIJO + this.fechaSeleccionada(), valor);
  }

  hora(iso: string): string {
    return parseUtc(iso).toLocaleTimeString('es-419', { hour: '2-digit', minute: '2-digit' });
  }

  private cargarNota(): void {
    this.nota.set(localStorage.getItem(NOTA_PREFIJO + this.fechaSeleccionada()) ?? '');
  }
}
