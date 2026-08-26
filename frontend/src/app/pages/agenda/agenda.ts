import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Postulacion, PostulacionesService } from '../../core/postulaciones.service';
import { DatosEvento, Evento, EventosService, TIPOS_EVENTO, TipoEvento } from '../../core/eventos.service';

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const NOTA_PREFIJO = 'agenda-nota-';
const HORA_INICIO_SEMANA = 7;
const HORA_FIN_SEMANA = 22;

const ETIQUETA_TIPO_EVENTO: Record<TipoEvento, string> = {
  personal: 'Personal',
  medica: 'Médica',
  profesional: 'Profesional',
  social: 'Social',
};

// Los 4 tonos de marca de Anadesing (mismos que ya usan login/sidebar,
// definidos como variables en styles.css) en vez de colores de estado
// "corporativos" (azul/verde) -- pedido explicito: tonos girly de marca.
const COLOR_TIPO_EVENTO: Record<TipoEvento, string> = {
  personal: 'var(--accent-purple)',
  medica: 'var(--coral-deep)',
  profesional: 'var(--accent-purple-deep)',
  social: 'var(--accent-pink-deep)',
};

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

function inicioDeSemana(date: Date): Date {
  const d = new Date(date);
  const diaSemana = (d.getDay() + 6) % 7; // lunes = 0
  d.setDate(d.getDate() - diaSemana);
  return d;
}

interface CeldaCalendario {
  fecha: Date;
  fechaKey: string;
  numero: number;
  otroMes: boolean;
  hoy: boolean;
  entrevistas: Postulacion[];
  eventos: Evento[];
  eventosConHora: Evento[];
  eventosSinHora: Evento[];
  chipTexto: string;
  chipTextoEvento: string;
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
  readonly horasSemana = Array.from({ length: HORA_FIN_SEMANA - HORA_INICIO_SEMANA + 1 }, (_, i) => HORA_INICIO_SEMANA + i);
  readonly alturaHoraRem = 2.2;
  readonly alturaTotalRem = this.horasSemana.length * this.alturaHoraRem;
  readonly tiposEvento = TIPOS_EVENTO;

  vista = signal<'mes' | 'semana'>('mes');
  mesVisible = signal<Date>(inicioDeMes(new Date()));
  fechaSeleccionada = signal<string>(toFechaInput(new Date()));
  nota = signal<string>('');

  mostrarFormularioEvento = signal(false);
  editandoEventoId = signal<number | null>(null);
  errorEvento = signal<string | null>(null);
  eventoTitulo = '';
  eventoFecha = toFechaInput(new Date());
  eventoHora = '';
  eventoNotas = '';
  eventoTipo: TipoEvento = 'personal';

  tituloMes = computed(() => `${MESES[this.mesVisible().getMonth()]} ${this.mesVisible().getFullYear()}`);

  tituloSemana = computed(() => {
    const inicio = inicioDeSemana(new Date(`${this.fechaSeleccionada()}T00:00:00`));
    const fin = new Date(inicio);
    fin.setDate(inicio.getDate() + 6);
    const mismoMes = inicio.getMonth() === fin.getMonth();
    const mesInicio = MESES[inicio.getMonth()];
    const mesFin = MESES[fin.getMonth()];
    return mismoMes
      ? `${inicio.getDate()} – ${fin.getDate()} de ${mesInicio} ${fin.getFullYear()}`
      : `${inicio.getDate()} de ${mesInicio} – ${fin.getDate()} de ${mesFin} ${fin.getFullYear()}`;
  });

  private agrupar<T>(items: T[], fechaDe: (item: T) => string | null): Map<string, T[]> {
    const mapa = new Map<string, T[]>();
    for (const item of items) {
      const key = fechaDe(item);
      if (!key) continue;
      const lista = mapa.get(key) ?? [];
      lista.push(item);
      mapa.set(key, lista);
    }
    return mapa;
  }

  private construirCelda(
    fecha: Date,
    mesReferencia: Date,
    entrevistasPorFecha: Map<string, Postulacion[]>,
    eventosPorFecha: Map<string, Evento[]>
  ): CeldaCalendario {
    const fechaKey = toFechaInput(fecha);
    const otroMes = fecha.getMonth() !== mesReferencia.getMonth();
    const esHoy = fechaKey === toFechaInput(new Date());
    const entrevistas = (entrevistasPorFecha.get(fechaKey) ?? []).sort((a, b) =>
      a.fecha_entrevista!.localeCompare(b.fecha_entrevista!)
    );
    const eventos = (eventosPorFecha.get(fechaKey) ?? []).sort((a, b) => (a.hora ?? '').localeCompare(b.hora ?? ''));
    const eventosConHora = eventos.filter((e) => e.hora);
    const eventosSinHora = eventos.filter((e) => !e.hora);
    const chipTexto =
      entrevistas.length === 0
        ? ''
        : entrevistas.length === 1
        ? `${this.hora(entrevistas[0].fecha_entrevista!)} ${entrevistas[0].empresa}`
        : `${this.hora(entrevistas[0].fecha_entrevista!)} ${entrevistas[0].empresa} +${entrevistas.length - 1}`;
    const chipTextoEvento =
      eventos.length === 0
        ? ''
        : eventos.length === 1
        ? eventos[0].titulo
        : `${eventos[0].titulo} +${eventos.length - 1}`;
    const clase = [
      otroMes ? 'otro-mes' : '',
      esHoy ? 'hoy' : '',
      entrevistas.length > 0 ? 'con-entrevista' : '',
      eventos.length > 0 ? 'con-evento' : '',
      fechaKey === this.fechaSeleccionada() ? 'selected' : '',
    ]
      .filter(Boolean)
      .join(' ');
    return {
      fecha,
      fechaKey,
      numero: fecha.getDate(),
      otroMes,
      hoy: esHoy,
      entrevistas,
      eventos,
      eventosConHora,
      eventosSinHora,
      chipTexto,
      chipTextoEvento,
      clase,
    };
  }

  celdas = computed<CeldaCalendario[]>(() => {
    const mes = this.mesVisible();
    const primerDia = new Date(mes.getFullYear(), mes.getMonth(), 1);
    const inicioGrilla = inicioDeSemana(primerDia);

    const entrevistasPorFecha = this.agrupar(this.postulacionesService.postulaciones(), (p) =>
      p.fecha_entrevista ? toFechaInput(parseUtc(p.fecha_entrevista)) : null
    );
    const eventosPorFecha = this.agrupar(this.eventosService.eventos(), (e) => e.fecha);

    return Array.from({ length: 42 }, (_, i) => {
      const fecha = new Date(inicioGrilla);
      fecha.setDate(inicioGrilla.getDate() + i);
      return this.construirCelda(fecha, mes, entrevistasPorFecha, eventosPorFecha);
    });
  });

  celdasSemana = computed<CeldaCalendario[]>(() => {
    const inicio = inicioDeSemana(new Date(`${this.fechaSeleccionada()}T00:00:00`));
    const entrevistasPorFecha = this.agrupar(this.postulacionesService.postulaciones(), (p) =>
      p.fecha_entrevista ? toFechaInput(parseUtc(p.fecha_entrevista)) : null
    );
    const eventosPorFecha = this.agrupar(this.eventosService.eventos(), (e) => e.fecha);

    return Array.from({ length: 7 }, (_, i) => {
      const fecha = new Date(inicio);
      fecha.setDate(inicio.getDate() + i);
      return this.construirCelda(fecha, inicio, entrevistasPorFecha, eventosPorFecha);
    });
  });

  seleccionLabel = computed(() => {
    const fecha = new Date(`${this.fechaSeleccionada()}T00:00:00`);
    const etiquetaDia = `${DIAS_SEMANA[(fecha.getDay() + 6) % 7]} ${fecha.getDate()} de ${MESES[fecha.getMonth()]}`;
    const celda = this.celdaEnVista();
    if (!celda) return etiquetaDia;
    if (celda.entrevistas.length === 1) {
      return `${etiquetaDia} · entrevista con ${celda.entrevistas[0].empresa}`;
    }
    if (celda.entrevistas.length > 1) {
      return `${etiquetaDia} · ${celda.entrevistas.length} entrevistas`;
    }
    return etiquetaDia;
  });

  /** La celda del dia seleccionado, la busca en la vista activa (mes o semana pueden no coincidir en rango). */
  celdaEnVista = computed<CeldaCalendario | undefined>(() => {
    const lista = this.vista() === 'semana' ? this.celdasSemana() : this.celdas();
    return lista.find((c) => c.fechaKey === this.fechaSeleccionada());
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

  proximoEventoChip = computed(() => {
    const ahora = new Date();
    const ahoraKey = toFechaInput(ahora);
    const ahoraHora = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
    const proximo = this.eventosService.eventos()
      .filter((e) => e.fecha > ahoraKey || (e.fecha === ahoraKey && (!e.hora || e.hora >= ahoraHora)))
      .sort((a, b) => `${a.fecha}T${a.hora ?? '00:00'}`.localeCompare(`${b.fecha}T${b.hora ?? '00:00'}`))[0];
    if (!proximo) return null;
    const fecha = new Date(`${proximo.fecha}T00:00:00`);
    const esHoy = proximo.fecha === ahoraKey;
    const cuandoDia = esHoy ? 'Hoy' : `${DIAS_SEMANA[(fecha.getDay() + 6) % 7]} ${fecha.getDate()}`;
    return {
      titulo: proximo.titulo,
      cuando: proximo.hora ? `${cuandoDia} · ${proximo.hora}` : cuandoDia,
    };
  });

  constructor(
    private postulacionesService: PostulacionesService,
    private eventosService: EventosService
  ) {}

  ngOnInit(): void {
    this.postulacionesService.listar().subscribe({ error: () => {} });
    this.cargarEventos();
    this.cargarNota();
  }

  cambiarVista(vista: 'mes' | 'semana'): void {
    this.vista.set(vista);
  }

  seleccionarCelda(fechaKey: string): void {
    this.fechaSeleccionada.set(fechaKey);
    this.cargarNota();
  }

  cambiarMes(delta: number): void {
    const actual = this.mesVisible();
    this.mesVisible.set(new Date(actual.getFullYear(), actual.getMonth() + delta, 1));
  }

  cambiarSemana(delta: number): void {
    const actual = new Date(`${this.fechaSeleccionada()}T00:00:00`);
    actual.setDate(actual.getDate() + delta * 7);
    this.fechaSeleccionada.set(toFechaInput(actual));
    this.mesVisible.set(inicioDeMes(actual));
    this.cargarNota();
  }

  onNotaChange(valor: string): void {
    this.nota.set(valor);
    localStorage.setItem(NOTA_PREFIJO + this.fechaSeleccionada(), valor);
  }

  hora(iso: string): string {
    return parseUtc(iso).toLocaleTimeString('es-419', { hour: '2-digit', minute: '2-digit' });
  }

  nombreDia(fecha: Date): string {
    return DIAS_SEMANA[(fecha.getDay() + 6) % 7];
  }

  /** Offset vertical en rem dentro de la columna del dia (vista semana), segun la hora decimal (14.5 = 14:30). */
  posicionVertical(horaDecimal: number): number {
    const acotada = Math.min(Math.max(horaDecimal, HORA_INICIO_SEMANA), HORA_FIN_SEMANA);
    return (acotada - HORA_INICIO_SEMANA) * this.alturaHoraRem;
  }

  horaDecimalEntrevista(p: Postulacion): number {
    const fecha = parseUtc(p.fecha_entrevista!);
    return fecha.getHours() + fecha.getMinutes() / 60;
  }

  horaDecimalEvento(e: Evento): number {
    if (!e.hora) return HORA_INICIO_SEMANA;
    const [h, m] = e.hora.split(':').map(Number);
    return h + (m || 0) / 60;
  }

  abrirNuevoEvento(): void {
    this.editandoEventoId.set(null);
    this.eventoTitulo = '';
    this.eventoFecha = this.fechaSeleccionada();
    this.eventoHora = '';
    this.eventoNotas = '';
    this.eventoTipo = 'personal';
    this.errorEvento.set(null);
    this.mostrarFormularioEvento.set(true);
  }

  editarEvento(evento: Evento): void {
    this.editandoEventoId.set(evento.id);
    this.eventoTitulo = evento.titulo;
    this.eventoFecha = evento.fecha;
    this.eventoHora = evento.hora ?? '';
    this.eventoNotas = evento.notas ?? '';
    this.eventoTipo = evento.tipo ?? 'personal';
    this.errorEvento.set(null);
    this.mostrarFormularioEvento.set(true);
  }

  cancelarFormularioEvento(): void {
    this.mostrarFormularioEvento.set(false);
    this.editandoEventoId.set(null);
  }

  guardarEvento(): void {
    this.errorEvento.set(null);
    const datos: DatosEvento = {
      titulo: this.eventoTitulo,
      fecha: this.eventoFecha,
      hora: this.eventoHora || undefined,
      notas: this.eventoNotas || undefined,
      tipo: this.eventoTipo,
    };
    const id = this.editandoEventoId();
    const accion = id ? this.eventosService.editar(id, datos) : this.eventosService.crear(datos);
    accion.subscribe({
      next: () => {
        this.cancelarFormularioEvento();
        this.cargarEventos();
      },
      error: (err) => this.errorEvento.set(err.error?.error || 'No se pudo guardar el evento.'),
    });
  }

  etiquetaTipo(tipo: TipoEvento): string {
    return ETIQUETA_TIPO_EVENTO[tipo] ?? tipo;
  }

  colorTipo(tipo: TipoEvento): string {
    return COLOR_TIPO_EVENTO[tipo] ?? COLOR_TIPO_EVENTO['personal'];
  }

  borrarEvento(evento: Evento): void {
    if (!confirm(`¿Borrar "${evento.titulo}"?`)) return;
    this.eventosService.borrar(evento.id).subscribe(() => this.cargarEventos());
  }

  private cargarEventos(): void {
    this.eventosService.listar().subscribe({ error: () => {} });
  }

  private cargarNota(): void {
    this.nota.set(localStorage.getItem(NOTA_PREFIJO + this.fechaSeleccionada()) ?? '');
  }
}
