import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Postulacion, PostulacionesService } from '../../core/postulaciones.service';
import { DatosEvento, Evento, EventosService, TIPOS_EVENTO, TipoEvento } from '../../core/eventos.service';
import { PerfilService } from '../../core/perfil.service';
import { AuthService } from '../../core/auth.service';
import { elegirSticker, FLORES } from '../../core/stickers';

const NOTA_PREFIJO = 'agenda-nota-';
const OBJETIVOS_PREFIJO = 'agenda-objetivos-';
const AFIRMACION_PREFIJO = 'agenda-afirmacion-';
const CANTIDAD_OBJETIVOS = 5;
const HORA_INICIO_SEMANA = 7;
const HORA_FIN_SEMANA = 22;

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
  tiposEventoPresentes: TipoEvento[];
  clase: string;
}

interface ItemMes {
  key: string;
  color: string;
  fechaLabel: string;
  horaLabel: string;
  titulo: string;
  detalle: string | null;
  orden: string;
  evento: Evento | null;
  esEntrevista: boolean;
}

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [FormsModule, RouterLink, TranslatePipe],
  templateUrl: './agenda.html',
  styleUrl: './agenda.css',
})
export class Agenda implements OnInit {
  readonly horasSemana = Array.from({ length: HORA_FIN_SEMANA - HORA_INICIO_SEMANA + 1 }, (_, i) => HORA_INICIO_SEMANA + i);
  readonly alturaHoraRem = 2.2;
  readonly alturaTotalRem = this.horasSemana.length * this.alturaHoraRem;
  readonly tiposEvento = TIPOS_EVENTO;
  readonly stickerAfirmacion = elegirSticker();

  vista = signal<'mes' | 'semana'>('mes');
  mesVisible = signal<Date>(inicioDeMes(new Date()));
  fechaSeleccionada = signal<string>(toFechaInput(new Date()));
  nota = signal<string>('');
  objetivos = signal<string[]>(Array(CANTIDAD_OBJETIVOS).fill(''));
  afirmacion = signal<string>('');
  /** Ids "tipo-id" marcados como hechos en la lista de eventos del mes -- solo visual, no se persiste. */
  marcados = signal<Set<string>>(new Set());

  mostrarFormularioEvento = signal(false);
  editandoEventoId = signal<number | null>(null);
  errorEvento = signal<string | null>(null);
  eventoTitulo = '';
  eventoFecha = toFechaInput(new Date());
  eventoHora = '';
  eventoNotas = '';
  eventoTipo: TipoEvento = 'personal';

  tituloMes = computed(() => {
    this.translate.currentLang();
    return `${this.meses()[this.mesVisible().getMonth()]} ${this.mesVisible().getFullYear()}`;
  });

  tituloSemana = computed(() => {
    this.translate.currentLang();
    const inicio = inicioDeSemana(new Date(`${this.fechaSeleccionada()}T00:00:00`));
    const fin = new Date(inicio);
    fin.setDate(inicio.getDate() + 6);
    const mismoMes = inicio.getMonth() === fin.getMonth();
    const meses = this.meses();
    const mesInicio = meses[inicio.getMonth()];
    const mesFin = meses[fin.getMonth()];
    return mismoMes
      ? `${inicio.getDate()} – ${fin.getDate()} ${mesInicio} ${fin.getFullYear()}`
      : `${inicio.getDate()} ${mesInicio} – ${fin.getDate()} ${mesFin} ${fin.getFullYear()}`;
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
    // Solo tipos distintos, para el "mapa de colores": un punto por tipo
    // presente ese dia, no uno por evento (varios eventos del mismo tipo no
    // agregan puntos de mas).
    const tiposEventoPresentes = [...new Set(eventos.map((e) => e.tipo))];
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
      tiposEventoPresentes,
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
    this.translate.currentLang();
    const fecha = new Date(`${this.fechaSeleccionada()}T00:00:00`);
    const etiquetaDia = `${this.dias()[(fecha.getDay() + 6) % 7]} ${fecha.getDate()} ${this.meses()[fecha.getMonth()]}`;
    const celda = this.celdaEnVista();
    if (!celda) return etiquetaDia;
    if (celda.entrevistas.length === 1) {
      const entrevistaCon = this.translate.instant('agenda.unaEntrevistaCon', { empresa: celda.entrevistas[0].empresa });
      return `${etiquetaDia} · ${entrevistaCon}`;
    }
    if (celda.entrevistas.length > 1) {
      const varias = this.translate.instant('agenda.variasEntrevistas', { cantidad: celda.entrevistas.length });
      return `${etiquetaDia} · ${varias}`;
    }
    return etiquetaDia;
  });

  /** La celda del dia seleccionado, la busca en la vista activa (mes o semana pueden no coincidir en rango). */
  celdaEnVista = computed<CeldaCalendario | undefined>(() => {
    const lista = this.vista() === 'semana' ? this.celdasSemana() : this.celdas();
    return lista.find((c) => c.fechaKey === this.fechaSeleccionada());
  });

  /** Todo lo que aparece con color en el calendario del mes visible, unificado en una sola lista cronologica ("Eventos del mes"). */
  itemsDelMes = computed<ItemMes[]>(() => {
    this.translate.currentLang();
    const mes = this.mesVisible();
    const anio = mes.getFullYear();
    const numeroMes = mes.getMonth();
    const dias = this.dias();
    const todoElDia = this.translate.instant('agenda.todoElDia');
    const etiquetaFecha = (fecha: Date) => `${dias[(fecha.getDay() + 6) % 7]} ${fecha.getDate()}`;

    const entrevistas: ItemMes[] = this.postulacionesService.postulaciones()
      .filter((p) => p.fecha_entrevista)
      .map((p) => ({ p, fecha: parseUtc(p.fecha_entrevista!) }))
      .filter(({ fecha }) => fecha.getFullYear() === anio && fecha.getMonth() === numeroMes)
      .map(({ p, fecha }) => ({
        key: `entrevista-${p.id}`,
        color: 'var(--gold-deep)',
        fechaLabel: etiquetaFecha(fecha),
        horaLabel: this.hora(p.fecha_entrevista!),
        titulo: `${p.empresa} — ${p.puesto}`,
        detalle: null,
        orden: p.fecha_entrevista!,
        evento: null,
        esEntrevista: true,
      }));

    const eventos: ItemMes[] = this.eventosService.eventos()
      .map((e) => ({ e, fecha: new Date(`${e.fecha}T00:00:00`) }))
      .filter(({ fecha }) => fecha.getFullYear() === anio && fecha.getMonth() === numeroMes)
      .map(({ e, fecha }) => ({
        key: `evento-${e.id}`,
        color: this.colorTipo(e.tipo),
        fechaLabel: etiquetaFecha(fecha),
        horaLabel: e.hora || todoElDia,
        titulo: e.titulo,
        detalle: e.notas,
        orden: `${e.fecha}T${e.hora ?? '00:00'}`,
        evento: e,
        esEntrevista: false,
      }));

    return [...entrevistas, ...eventos].sort((a, b) => a.orden.localeCompare(b.orden));
  });

  proximaEntrevistaChip = computed(() => {
    this.translate.currentLang();
    const ahora = new Date();
    const proxima = this.postulacionesService.postulaciones()
      .filter((p) => p.fecha_entrevista && parseUtc(p.fecha_entrevista) >= ahora)
      .sort((a, b) => a.fecha_entrevista!.localeCompare(b.fecha_entrevista!))[0];
    if (!proxima) return null;
    const fecha = parseUtc(proxima.fecha_entrevista!);
    const esHoy = toFechaInput(fecha) === toFechaInput(ahora);
    const hora = fecha.toLocaleTimeString(this.perfilService.localeDeIdioma(), { hour: '2-digit', minute: '2-digit' });
    const hoy = this.translate.instant('agenda.hoy');
    return {
      empresa: proxima.empresa,
      cuando: esHoy ? `${hoy} · ${hora}` : `${this.dias()[(fecha.getDay() + 6) % 7]} ${fecha.getDate()} · ${hora}`,
    };
  });

  proximoEventoChip = computed(() => {
    this.translate.currentLang();
    const ahora = new Date();
    const ahoraKey = toFechaInput(ahora);
    const ahoraHora = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
    const proximo = this.eventosService.eventos()
      .filter((e) => e.fecha > ahoraKey || (e.fecha === ahoraKey && (!e.hora || e.hora >= ahoraHora)))
      .sort((a, b) => `${a.fecha}T${a.hora ?? '00:00'}`.localeCompare(`${b.fecha}T${b.hora ?? '00:00'}`))[0];
    if (!proximo) return null;
    const fecha = new Date(`${proximo.fecha}T00:00:00`);
    const esHoy = proximo.fecha === ahoraKey;
    const cuandoDia = esHoy ? this.translate.instant('agenda.hoy') : `${this.dias()[(fecha.getDay() + 6) % 7]} ${fecha.getDate()}`;
    return {
      titulo: proximo.titulo,
      cuando: proximo.hora ? `${cuandoDia} · ${proximo.hora}` : cuandoDia,
    };
  });

  constructor(
    private postulacionesService: PostulacionesService,
    private eventosService: EventosService,
    private perfilService: PerfilService,
    private auth: AuthService,
    private translate: TranslateService
  ) {}

  dias(): string[] {
    return this.translate.instant('agenda.dias');
  }

  private meses(): string[] {
    return this.translate.instant('agenda.meses');
  }

  ngOnInit(): void {
    this.postulacionesService.listar().subscribe({ error: () => {} });
    this.cargarEventos();
    this.cargarNota();
    this.cargarObjetivos();
    this.cargarAfirmacion();
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
    this.cargarObjetivos();
    this.cargarAfirmacion();
  }

  cambiarSemana(delta: number): void {
    const actual = new Date(`${this.fechaSeleccionada()}T00:00:00`);
    actual.setDate(actual.getDate() + delta * 7);
    this.fechaSeleccionada.set(toFechaInput(actual));
    this.mesVisible.set(inicioDeMes(actual));
    this.cargarNota();
    this.cargarObjetivos();
    this.cargarAfirmacion();
  }

  /** Antes las claves de Notas/Objetivos/Afirmacion no distinguian cuenta -- si dos cuentas comparten navegador, se pisaban los datos. Se namespacea por id de usuario (no email, para que no cambie si se edita el email despues). */
  private claveUsuario(): string {
    return String(this.auth.usuario()?.id ?? 'anon');
  }

  /** Migracion de una sola vez: si la clave nueva (con usuario) todavia no existe pero hay algo en la vieja (sin usuario), se copia y se borra la vieja -- para que las notas/objetivos/afirmaciones que ya existian no "desaparezcan" con este cambio. */
  private migrarClaveVieja(claveNueva: string, claveVieja: string): void {
    if (localStorage.getItem(claveNueva) !== null) return;
    const valorViejo = localStorage.getItem(claveVieja);
    if (valorViejo === null) return;
    localStorage.setItem(claveNueva, valorViejo);
    localStorage.removeItem(claveVieja);
  }

  private claveNota(): string {
    const claveVieja = NOTA_PREFIJO + this.fechaSeleccionada();
    const claveNueva = `${NOTA_PREFIJO}${this.claveUsuario()}-${this.fechaSeleccionada()}`;
    this.migrarClaveVieja(claveNueva, claveVieja);
    return claveNueva;
  }

  onNotaChange(valor: string): void {
    this.nota.set(valor);
    localStorage.setItem(this.claveNota(), valor);
  }

  private claveMesObjetivos(): string {
    const mes = this.mesVisible();
    const sufijo = `${mes.getFullYear()}-${String(mes.getMonth() + 1).padStart(2, '0')}`;
    const claveVieja = OBJETIVOS_PREFIJO + sufijo;
    const claveNueva = `${OBJETIVOS_PREFIJO}${this.claveUsuario()}-${sufijo}`;
    this.migrarClaveVieja(claveNueva, claveVieja);
    return claveNueva;
  }

  private cargarObjetivos(): void {
    const guardado = localStorage.getItem(this.claveMesObjetivos());
    this.objetivos.set(guardado ? JSON.parse(guardado) : Array(CANTIDAD_OBJETIVOS).fill(''));
  }

  onObjetivoChange(indice: number, valor: string): void {
    const actuales = [...this.objetivos()];
    actuales[indice] = valor;
    this.objetivos.set(actuales);
    localStorage.setItem(this.claveMesObjetivos(), JSON.stringify(actuales));
  }

  private claveMesAfirmacion(): string {
    const mes = this.mesVisible();
    const sufijo = `${mes.getFullYear()}-${String(mes.getMonth() + 1).padStart(2, '0')}`;
    const claveVieja = AFIRMACION_PREFIJO + sufijo;
    const claveNueva = `${AFIRMACION_PREFIJO}${this.claveUsuario()}-${sufijo}`;
    this.migrarClaveVieja(claveNueva, claveVieja);
    return claveNueva;
  }

  private cargarAfirmacion(): void {
    this.afirmacion.set(localStorage.getItem(this.claveMesAfirmacion()) ?? '');
  }

  onAfirmacionChange(valor: string): void {
    this.afirmacion.set(valor);
    localStorage.setItem(this.claveMesAfirmacion(), valor);
  }

  stickerFlor(indice: number): string {
    return FLORES[indice % FLORES.length];
  }

  estaMarcado(key: string): boolean {
    return this.marcados().has(key);
  }

  toggleMarcado(key: string): void {
    const actuales = new Set(this.marcados());
    if (actuales.has(key)) {
      actuales.delete(key);
    } else {
      actuales.add(key);
    }
    this.marcados.set(actuales);
  }

  hora(iso: string): string {
    return parseUtc(iso).toLocaleTimeString(this.perfilService.localeDeIdioma(), { hour: '2-digit', minute: '2-digit' });
  }

  nombreDia(fecha: Date): string {
    return this.dias()[(fecha.getDay() + 6) % 7];
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
      error: (err) => this.errorEvento.set(err.error?.error || this.translate.instant('agenda.errorGuardarEvento')),
    });
  }

  etiquetaTipo(tipo: TipoEvento): string {
    return this.translate.instant('agenda.tipoEvento.' + tipo) ?? tipo;
  }

  colorTipo(tipo: TipoEvento): string {
    return COLOR_TIPO_EVENTO[tipo] ?? COLOR_TIPO_EVENTO['personal'];
  }

  borrarEvento(evento: Evento): void {
    if (!confirm(this.translate.instant('agenda.confirmBorrarEvento', { titulo: evento.titulo }))) return;
    this.eventosService.borrar(evento.id).subscribe(() => this.cargarEventos());
  }

  private cargarEventos(): void {
    this.eventosService.listar().subscribe({ error: () => {} });
  }

  private cargarNota(): void {
    this.nota.set(localStorage.getItem(this.claveNota()) ?? '');
  }
}
