import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';
import { forkJoin, switchMap } from 'rxjs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  ESTADOS_POSTULACION,
  EstadoPostulacion,
  Postulacion,
  PostulacionesService,
  PostulacionesStats,
} from '../../core/postulaciones.service';
import { MailRevision, MailsRevisionService } from '../../core/mails-revision.service';
import { PerfilService } from '../../core/perfil.service';

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
  imports: [FormsModule, NgTemplateOutlet, TranslatePipe],
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
  seleccionadosRevision = signal<Set<number>>(new Set());
  procesandoBulk = signal(false);
  /** Si la postulación en el formulario viene de la bandeja de revisión, su id (para descartarla al guardar). */
  private revisionOrigenId: number | null = null;

  recalculando = signal(false);
  mensajeRecalculo = signal<string | null>(null);

  sincronizandoComputrabajo = signal(false);
  mensajeSincronizacionComputrabajo = signal<string | null>(null);

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
    this.translate.currentLang();
    const s = this.stats();
    if (!s) return [];
    const total = s.total;
    return ESTADOS_POSTULACION.map((estado) => {
      const n = s.porEstado.find((e) => e.estado === estado)?.n ?? 0;
      const pct = total ? Math.round((n / total) * 100) : 0;
      return { estado, etiqueta: this.etiqueta(estado), n, pct, color: ESTADO_COLOR[estado] };
    });
  });

  filtros = computed(() => {
    this.translate.currentLang();
    const activo = this.filtroEstado();
    return ['' as const, ...ESTADOS_POSTULACION].map((e) => ({
      valor: e,
      etiqueta: e ? this.etiqueta(e) : this.translate.instant('comun.todas'),
      activo: activo === e,
      color: e ? ESTADO_COLOR[e] : '#8b4fd6',
    }));
  });

  constructor(
    private postulacionesService: PostulacionesService,
    private mailsRevisionService: MailsRevisionService,
    private perfilService: PerfilService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  get mailsRevision() {
    return this.mailsRevisionService.mails;
  }

  etiqueta(estado: string): string {
    return this.translate.instant('postulaciones.estado.' + estado) ?? estado;
  }

  inicial(empresa: string): string {
    return empresa.charAt(0).toUpperCase();
  }

  formatoEntrevista(iso: string | null): string {
    if (!iso) return '-';
    return parseUtc(iso).toLocaleString(this.perfilService.localeDeIdioma(), {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatoFecha(fecha: string): string {
    const d = new Date(`${fecha}T00:00:00`);
    return d.toLocaleDateString(this.perfilService.localeDeIdioma(), { day: '2-digit', month: 'short' });
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

  todosSeleccionadosRevision = computed(() => {
    const mails = this.mailsRevision();
    return mails.length > 0 && mails.every((m) => this.seleccionadosRevision().has(m.id));
  });

  estaSeleccionado(id: number): boolean {
    return this.seleccionadosRevision().has(id);
  }

  toggleSeleccionRevision(id: number): void {
    const actuales = new Set(this.seleccionadosRevision());
    if (actuales.has(id)) actuales.delete(id);
    else actuales.add(id);
    this.seleccionadosRevision.set(actuales);
  }

  toggleSeleccionarTodosRevision(): void {
    this.seleccionadosRevision.set(
      this.todosSeleccionadosRevision() ? new Set() : new Set(this.mailsRevision().map((m) => m.id))
    );
  }

  /** Datos de postulacion en base a un mail que no matcheo ningun portal -- empresa/puesto quedan
   *  como placeholder porque no hay forma de adivinarlos, se completan a mano despues. */
  private datosDesdeMail(mail: MailRevision) {
    const dominio = mail.remitente?.split('@')[1] || '';
    const remitenteDesconocido = this.translate.instant('postulaciones.remitenteDesconocido');
    const sinAsunto = this.translate.instant('postulaciones.sinAsunto');
    return {
      empresa: dominio ? `Sin identificar (${dominio})` : 'Sin identificar',
      puesto: mail.asunto || 'Sin especificar',
      portal: dominio || undefined,
      fecha_postulacion: mail.fecha_recibido ? mail.fecha_recibido.slice(0, 10) : toFechaInput(new Date()),
      estado: 'enviada' as EstadoPostulacion,
      notas: this.translate.instant('postulaciones.notasMailOriginal', {
        remitente: mail.remitente || remitenteDesconocido,
        asunto: mail.asunto || sinAsunto,
        cuerpo: mail.cuerpo,
      }),
    };
  }

  cargarSeleccionadosComoPostulaciones(): void {
    const ids = this.seleccionadosRevision();
    const mails = this.mailsRevision().filter((m) => ids.has(m.id));
    if (mails.length === 0 || this.procesandoBulk()) return;
    if (!confirm(this.translate.instant('postulaciones.confirmCargarSeleccionados', { cantidad: mails.length }))) {
      return;
    }
    this.procesandoBulk.set(true);
    const llamadas = mails.map((m) =>
      this.postulacionesService.crear(this.datosDesdeMail(m)).pipe(switchMap(() => this.mailsRevisionService.descartar(m.id)))
    );
    forkJoin(llamadas).subscribe({
      next: () => {
        this.procesandoBulk.set(false);
        this.seleccionadosRevision.set(new Set());
        this.cargar();
      },
      error: () => {
        this.procesandoBulk.set(false);
        this.cargar();
      },
    });
  }

  descartarSeleccionados(): void {
    const ids = [...this.seleccionadosRevision()];
    if (ids.length === 0 || this.procesandoBulk()) return;
    if (!confirm(this.translate.instant('postulaciones.confirmDescartarSeleccionados', { cantidad: ids.length }))) return;
    this.procesandoBulk.set(true);
    forkJoin(ids.map((id) => this.mailsRevisionService.descartar(id))).subscribe({
      next: () => {
        this.procesandoBulk.set(false);
        this.seleccionadosRevision.set(new Set());
        this.cargar();
      },
      error: () => {
        this.procesandoBulk.set(false);
        this.cargar();
      },
    });
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
    const remitenteDesconocido = this.translate.instant('postulaciones.remitenteDesconocido');
    const sinAsunto = this.translate.instant('postulaciones.sinAsunto');
    this.notas = this.translate.instant('postulaciones.notasMailOriginal', {
      remitente: mail.remitente || remitenteDesconocido,
      asunto: mail.asunto || sinAsunto,
      cuerpo: mail.cuerpo,
    });
    this.mostrarFormulario.set(true);
  }

  descartarRevision(mail: MailRevision): void {
    if (!confirm(this.translate.instant('postulaciones.confirmDescartarRevision'))) return;
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
      error: (err) => this.error.set(err.error?.error || this.translate.instant('postulaciones.errorGuardar')),
    });
  }

  borrar(postulacion: Postulacion): void {
    if (!confirm(this.translate.instant('postulaciones.confirmBorrar', { empresa: postulacion.empresa }))) return;
    this.postulacionesService.borrar(postulacion.id).subscribe(() => this.cargar());
  }

  recalcularCompatibilidad(): void {
    this.recalculando.set(true);
    this.mensajeRecalculo.set(null);
    this.postulacionesService.recalcularCompatibilidad().subscribe({
      next: (res) => {
        this.recalculando.set(false);
        this.mensajeRecalculo.set(this.translate.instant('postulaciones.recalculoListo', { cantidad: res.actualizadas }));
        this.cargar();
      },
      error: (err) => {
        this.recalculando.set(false);
        this.mensajeRecalculo.set(err.error?.error || this.translate.instant('postulaciones.errorRecalcular'));
      },
    });
  }

  sincronizarComputrabajo(): void {
    this.sincronizandoComputrabajo.set(true);
    this.mensajeSincronizacionComputrabajo.set(null);
    this.postulacionesService.sincronizarComputrabajo().subscribe({
      next: (res) => {
        this.sincronizandoComputrabajo.set(false);
        this.mensajeSincronizacionComputrabajo.set(
          this.translate.instant('postulaciones.sincronizacionComputrabajoLista', {
            actualizadas: res.actualizadas,
            sinMatch: res.sinMatch,
          })
        );
        this.cargar();
      },
      error: (err) => {
        this.sincronizandoComputrabajo.set(false);
        this.mensajeSincronizacionComputrabajo.set(
          err.error?.error || this.translate.instant('postulaciones.errorSincronizacionComputrabajo')
        );
      },
    });
  }
}
