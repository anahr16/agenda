import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';
import {
  ESTADOS_POSTULACION,
  EstadoPostulacion,
  Postulacion,
  PostulacionesService,
  PostulacionesStats,
} from '../../core/postulaciones.service';
import { MailRevision, MailsRevisionService } from '../../core/mails-revision.service';

const ETIQUETAS_ESTADO: Record<EstadoPostulacion, string> = {
  enviada: 'Enviada',
  vista: 'Vista',
  entrevista: 'Entrevista',
  rechazada: 'Rechazada',
  oferta: 'Oferta',
};

// Colores validados (dataviz: lightness/chroma/CVD/contraste ok en este orden de adyacencia).
const ESTADO_COLOR: Record<EstadoPostulacion, string> = {
  enviada: '#2a78d6',
  vista: '#4a3aa7',
  entrevista: '#eda100',
  rechazada: '#d03b3b',
  oferta: '#1baf7a',
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

function utcIsoToDatetimeLocalInput(iso: string): string {
  const date = parseUtc(iso);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${h}:${min}`;
}

function datetimeLocalInputToUtcIso(local: string): string {
  return new Date(local).toISOString().slice(0, 19);
}

@Component({
  selector: 'app-postulaciones',
  standalone: true,
  imports: [FormsModule, NgTemplateOutlet],
  templateUrl: './postulaciones.html',
  styleUrl: './postulaciones.css',
})
export class Postulaciones implements OnInit {
  readonly estados = ESTADOS_POSTULACION;

  stats = signal<PostulacionesStats | null>(null);
  editandoId = signal<number | null>(null);
  expandidoId = signal<number | null>(null);
  mostrarFormulario = signal(false);
  filtroEstado = signal<string>('');
  busqueda = signal<string>('');
  error = signal<string | null>(null);

  expandidoRevisionId = signal<number | null>(null);
  /** Si la postulación en el formulario viene de la bandeja de revisión, su id (para descartarla al guardar). */
  private revisionOrigenId: number | null = null;

  recalculando = signal(false);
  mensajeRecalculo = signal<string | null>(null);

  empresa = '';
  puesto = '';
  portal = '';
  descripcion = '';
  link = '';
  fecha_postulacion = toFechaInput(new Date());
  estado: EstadoPostulacion = 'enviada';
  fecha_entrevista = '';
  notas = '';

  postulacionesFiltradas = computed(() => {
    const filtro = this.filtroEstado();
    const texto = this.busqueda().toLowerCase().trim();
    let lista = this.postulacionesService.postulaciones();
    if (filtro) lista = lista.filter((p) => p.estado === filtro);
    if (texto) {
      lista = lista.filter(
        (p) => p.empresa.toLowerCase().includes(texto) || p.puesto.toLowerCase().includes(texto)
      );
    }
    return lista;
  });

  barras = computed(() => {
    const s = this.stats();
    if (!s) return [];
    const total = s.total;
    return ESTADOS_POSTULACION.map((estado) => {
      const n = s.porEstado.find((e) => e.estado === estado)?.n ?? 0;
      const pct = total ? Math.round((n / total) * 100) : 0;
      return { estado, etiqueta: ETIQUETAS_ESTADO[estado], n, pct, color: ESTADO_COLOR[estado] };
    });
  });

  filtros = computed(() => {
    const activo = this.filtroEstado();
    return ['' as const, ...ESTADOS_POSTULACION].map((e) => ({
      valor: e,
      etiqueta: e ? ETIQUETAS_ESTADO[e] : 'Todas',
      activo: activo === e,
      color: e ? ESTADO_COLOR[e] : '#8b4fd6',
    }));
  });

  constructor(
    private postulacionesService: PostulacionesService,
    private mailsRevisionService: MailsRevisionService
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  get mailsRevision() {
    return this.mailsRevisionService.mails;
  }

  etiqueta(estado: string): string {
    return ETIQUETAS_ESTADO[estado as EstadoPostulacion] ?? estado;
  }

  inicial(empresa: string): string {
    return empresa.charAt(0).toUpperCase();
  }

  formatoEntrevista(iso: string | null): string {
    if (!iso) return '-';
    return parseUtc(iso).toLocaleString('es-419', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  formatoFecha(fecha: string): string {
    const d = new Date(`${fecha}T00:00:00`);
    return d.toLocaleDateString('es-419', { day: '2-digit', month: 'short' });
  }

  cargar(): void {
    this.postulacionesService.listar().subscribe({ error: () => {} });
    this.postulacionesService.stats().subscribe((stats) => this.stats.set(stats));
    this.mailsRevisionService.listar().subscribe({ error: () => {} });
  }

  toggleExpandido(id: number): void {
    this.expandidoId.set(this.expandidoId() === id ? null : id);
  }

  toggleExpandidoRevision(id: number): void {
    this.expandidoRevisionId.set(this.expandidoRevisionId() === id ? null : id);
  }

  abrirNueva(): void {
    if (this.editandoId()) this.cancelarEdicion();
    this.mostrarFormulario.set(true);
  }

  /** Prellena el formulario de "nueva postulación" con el contenido de un mail de la bandeja de revisión. */
  cargarDesdeRevision(mail: MailRevision): void {
    if (this.editandoId()) this.cancelarEdicion();
    this.revisionOrigenId = mail.id;
    this.empresa = '';
    this.puesto = '';
    this.portal = mail.remitente?.split('@')[1] || '';
    this.descripcion = '';
    this.link = '';
    this.fecha_postulacion = mail.fecha_recibido ? mail.fecha_recibido.slice(0, 10) : toFechaInput(new Date());
    this.estado = 'enviada';
    this.fecha_entrevista = '';
    this.notas = `Mail original (${mail.remitente || 'remitente desconocido'} · "${mail.asunto || 'sin asunto'}"):\n${mail.cuerpo}`;
    this.mostrarFormulario.set(true);
  }

  descartarRevision(mail: MailRevision): void {
    if (!confirm('¿Descartar este mail de la bandeja de revisión? No se va a crear ninguna postulación.')) return;
    this.mailsRevisionService.descartar(mail.id).subscribe(() => this.cargar());
  }

  editar(postulacion: Postulacion): void {
    this.editandoId.set(postulacion.id);
    this.expandidoId.set(postulacion.id);
    this.empresa = postulacion.empresa;
    this.puesto = postulacion.puesto;
    this.portal = postulacion.portal ?? '';
    this.descripcion = postulacion.descripcion ?? '';
    this.link = postulacion.link ?? '';
    this.fecha_postulacion = postulacion.fecha_postulacion;
    this.estado = postulacion.estado;
    this.fecha_entrevista = postulacion.fecha_entrevista ? utcIsoToDatetimeLocalInput(postulacion.fecha_entrevista) : '';
    this.notas = postulacion.notas ?? '';
    this.mostrarFormulario.set(true);
  }

  cancelarEdicion(): void {
    this.editandoId.set(null);
    this.revisionOrigenId = null;
    this.mostrarFormulario.set(false);
    this.empresa = '';
    this.puesto = '';
    this.portal = '';
    this.descripcion = '';
    this.link = '';
    this.fecha_postulacion = toFechaInput(new Date());
    this.estado = 'enviada';
    this.fecha_entrevista = '';
    this.notas = '';
  }

  guardar(): void {
    this.error.set(null);
    const datos = {
      empresa: this.empresa,
      puesto: this.puesto,
      portal: this.portal || undefined,
      descripcion: this.descripcion || undefined,
      link: this.link || undefined,
      fecha_postulacion: this.fecha_postulacion,
      estado: this.estado,
      fecha_entrevista: this.fecha_entrevista ? datetimeLocalInputToUtcIso(this.fecha_entrevista) : undefined,
      notas: this.notas || undefined,
    };
    const id = this.editandoId();
    const revisionAId = this.revisionOrigenId;
    const accion = id ? this.postulacionesService.editar(id, datos) : this.postulacionesService.crear(datos);

    accion.subscribe({
      next: () => {
        this.cancelarEdicion();
        if (revisionAId) this.mailsRevisionService.descartar(revisionAId).subscribe();
        this.cargar();
      },
      error: (err) => this.error.set(err.error?.error || 'No se pudo guardar la postulacion.'),
    });
  }

  borrar(postulacion: Postulacion): void {
    if (!confirm(`¿Borrar la postulacion a ${postulacion.empresa}?`)) return;
    this.postulacionesService.borrar(postulacion.id).subscribe(() => this.cargar());
  }

  recalcularCompatibilidad(): void {
    this.recalculando.set(true);
    this.mensajeRecalculo.set(null);
    this.postulacionesService.recalcularCompatibilidad().subscribe({
      next: (res) => {
        this.recalculando.set(false);
        this.mensajeRecalculo.set(`Listo, se recalcularon ${res.actualizadas} postulacion(es).`);
        this.cargar();
      },
      error: (err) => {
        this.recalculando.set(false);
        this.mensajeRecalculo.set(err.error?.error || 'No se pudo recalcular la compatibilidad.');
      },
    });
  }
}
