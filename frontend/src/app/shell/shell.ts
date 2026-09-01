import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../core/auth.service';
import { PostulacionesService, Postulacion } from '../core/postulaciones.service';
import { EventosService } from '../core/eventos.service';
import { AnnieMensaje, AnnieService } from '../core/annie.service';
import { RecordatoriosVozService } from '../core/recordatorios-voz.service';
import { PerfilService } from '../core/perfil.service';
import { MailsRevisionService } from '../core/mails-revision.service';
import { elegirFloresUnicas } from '../core/stickers';
import { environment } from '../../environments/environment';

interface ActividadAnnie {
  id: number;
  tipo: 'nueva' | 'entrevista' | 'oferta' | 'rechazada' | 'vista';
  texto: string;
}

interface MensajeChat {
  autor: 'usuaria' | 'annie';
  texto: string;
}

// Web Speech API: no tiene tipos oficiales en el DOM lib de TS, y el
// constructor va prefijado en Chrome/Edge (webkitSpeechRecognition).
interface ReconocimientoVoz {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((evento: { results: { [i: number]: { [i: number]: { transcript: string } } } }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
}

const VOZ_KEY = 'annie_voz_activada';
// El backend detecta postulaciones nuevas por email en un cron aparte (cada
// 10 minutos), sin avisarle al frontend -- sin este polling, un cambio del
// lado del servidor no aparece hasta que se navega a otra pantalla o se
// refresca la pagina a mano.
const INTERVALO_ACTUALIZACION_MS = 60000;

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, FormsModule, TranslatePipe],
  templateUrl: './shell.html',
  styleUrl: './shell.css',
})
export class Shell implements OnInit, OnDestroy {
  private intervaloActualizacion: ReturnType<typeof setInterval> | null = null;

  annieInput = '';
  annieMensajes = signal<MensajeChat[]>([]);
  annieEscribiendo = signal(false);
  annieError = signal<string | null>(null);
  private annieHistorial: AnnieMensaje[] = [];

  vozActivada = signal(localStorage.getItem(VOZ_KEY) !== '0');
  escuchando = signal(false);
  readonly reconocimientoDisponible = !!this.constructorReconocimiento();
  private ultimaListaConocida: Postulacion[] | null = null;
  private audioActual: HTMLAudioElement | null = null;
  readonly stickersSidebar = elegirFloresUnicas(2);
  /** Si Annie acaba de pedir el nombre, el proximo mensaje que mande la usuaria se guarda como nombre en vez de mandarse al chat normal. */
  esperandoNombre = signal(false);
  /** Sidebar como cajon deslizable en mobile/tablet (ver shell.css) -- en desktop no se usa, el sidebar queda siempre visible. */
  menuMovilAbierto = signal(false);

  proximasEntrevistas = computed(() => {
    const ahora = new Date();
    return this.postulacionesService.postulaciones()
      .filter((p) => p.fecha_entrevista && new Date(p.fecha_entrevista) >= ahora)
      .sort((a, b) => new Date(a.fecha_entrevista!).getTime() - new Date(b.fecha_entrevista!).getTime())
      .slice(0, 3)
      .map((p) => ({
        id: p.id,
        empresa: p.empresa,
        cuando: this.formatoFecha(p.fecha_entrevista!),
      }));
  });

  actividadReciente = computed<ActividadAnnie[]>(() => {
    return [...this.postulacionesService.postulaciones()]
      .sort((a, b) => b.creado_en.localeCompare(a.creado_en))
      .slice(0, 4)
      .map((p) => this.actividadDe(p));
  });

  constructor(
    private auth: AuthService,
    private router: Router,
    private postulacionesService: PostulacionesService,
    private eventosService: EventosService,
    private annieService: AnnieService,
    private recordatoriosVozService: RecordatoriosVozService,
    private perfilService: PerfilService,
    private mailsRevisionService: MailsRevisionService,
    private translate: TranslateService
  ) {
    // Dispara la carga asincronica de voces del navegador lo antes posible
    // (getVoices() suele devolver [] hasta el primer llamado).
    window.speechSynthesis?.getVoices();
  }

  ngOnInit(): void {
    // saludar() necesita saber si ya hay un nombre guardado para decidir
    // si preguntarlo o no -- tiene que esperar a que el perfil termine de
    // cargar, no puede dispararse en paralelo.
    this.perfilService.cargar().subscribe({
      next: () => this.saludar(),
      error: () => this.saludar(),
    });
    this.actualizarPostulaciones();
    this.revisarRecordatoriosVoz();
    this.intervaloActualizacion = setInterval(() => {
      this.actualizarPostulaciones();
      this.revisarRecordatoriosVoz();
    }, INTERVALO_ACTUALIZACION_MS);
  }

  ngOnDestroy(): void {
    if (this.intervaloActualizacion) clearInterval(this.intervaloActualizacion);
  }

  private saludar(): void {
    const saludo = this.translate.instant('shell.annie.saludo');
    const nombre = this.perfilService.perfil()?.nombre;
    // Si todavia no hay nombre guardado (usuaria nueva, o que nunca lo
    // cargo en Configuracion) Annie lo pide en vez de preguntar "en que te
    // ayudo" -- el proximo mensaje que mande se intercepta en enviarAnnie()
    // y se guarda como nombre en vez de mandarse al chat normal.
    const segundaParte = nombre
      ? this.translate.instant('shell.annie.preguntaAyuda', { nombre })
      : this.translate.instant('shell.annie.pedirNombre');
    if (!nombre) this.esperandoNombre.set(true);

    // "Mientras no estuviste": lo que paso en Postulaciones con la app cerrada
    // (detectarNovedades() solo ve cambios durante una sesion abierta, esto
    // cubre el resto). Se pide aparte del perfil para no atrasar el saludo si
    // este pedido tarda o falla.
    this.annieService.actividadPendiente().subscribe({
      next: ({ actividad }) => this.terminarSaludo(saludo, segundaParte, actividad),
      error: () => this.terminarSaludo(saludo, segundaParte, []),
    });
  }

  private terminarSaludo(saludo: string, segundaParte: string, actividad: string[]): void {
    const resumen = actividad.length
      ? ` ${this.translate.instant('shell.annie.mientrasNoEstuviste', { resumen: actividad.join('. ') })}`
      : '';
    const mensaje = `${saludo} ${segundaParte}${resumen}`;
    // Chrome a veces ignora el primer speechSynthesis.speak() si se dispara
    // apenas carga la pagina (antes de que el motor de voz este listo).
    // Un pequeño delay evita ese caso.
    this.annieMensajes.update((lista) => [...lista, { autor: 'annie', texto: mensaje }]);
    setTimeout(() => this.hablar(mensaje), 300);
  }

  private guardarNombre(nombre: string): void {
    this.esperandoNombre.set(false);
    this.annieEscribiendo.set(true);
    this.perfilService.actualizarPerfil({ nombre }).subscribe({
      next: () => {
        this.annieEscribiendo.set(false);
        const respuesta = this.translate.instant('shell.annie.nombreGuardado', { nombre });
        this.annieMensajes.update((lista) => [...lista, { autor: 'annie', texto: respuesta }]);
        this.hablar(respuesta);
      },
      error: () => {
        this.annieEscribiendo.set(false);
        this.annieError.set(this.translate.instant('shell.annie.errorRespuesta'));
      },
    });
  }

  private actualizarPostulaciones(): void {
    this.postulacionesService.listar().subscribe({
      next: (lista) => {
        if (this.ultimaListaConocida) {
          this.detectarNovedades(this.ultimaListaConocida, lista);
        }
        this.ultimaListaConocida = lista;
      },
      error: () => {},
    });
  }

  // Compara contra el ultimo estado conocido para que Annie anuncie (chat +
  // voz + notificacion del navegador) solo lo que cambio de verdad desde el
  // ultimo polling -- no todo el historial cada vez.
  private detectarNovedades(anterior: Postulacion[], actual: Postulacion[]): void {
    const anteriorPorId = new Map(anterior.map((p) => [p.id, p]));
    for (const p of actual) {
      const previa = anteriorPorId.get(p.id);
      if (!previa) {
        this.anunciar(this.translate.instant('shell.mensaje.nueva', { empresa: p.empresa, puesto: p.puesto }));
      } else if (previa.estado !== p.estado) {
        this.anunciar(this.mensajeCambioEstado(p));
      }
    }
  }

  // Recordatorios por voz de Annie: extra sobre Telegram/push (que son el
  // canal principal, porque no dependen de tener la pestana abierta). Si la
  // app esta abierta justo cuando se dispara un recordatorio, Annie ademas
  // lo dice en voz alta -- ver recordatoriosVoz.js en el backend.
  private revisarRecordatoriosVoz(): void {
    this.recordatoriosVozService.pendientes().subscribe({
      next: ({ eventos, entrevistas }) => {
        for (const e of eventos) {
          const base = this.translate.instant('shell.recordatorio.evento', { titulo: e.titulo, hora: e.hora });
          this.anunciar(`${base}${e.notas ? ` — ${e.notas}` : ''}.`);
        }
        for (const p of entrevistas) {
          this.anunciar(
            this.translate.instant('shell.recordatorio.entrevista', {
              empresa: p.empresa,
              puesto: p.puesto,
              hora: this.formatoFecha(p.fecha_entrevista),
            })
          );
        }
      },
      error: () => {},
    });
  }

  private mensajeCambioEstado(p: Postulacion): string {
    const params = { empresa: p.empresa, puesto: p.puesto, estado: p.estado };
    switch (p.estado) {
      case 'oferta':
        return this.translate.instant('shell.mensaje.oferta', params);
      case 'entrevista':
        return this.translate.instant('shell.mensaje.entrevista', params);
      case 'rechazada':
        return this.translate.instant('shell.mensaje.rechazada', params);
      case 'vista':
        return this.translate.instant('shell.mensaje.vista', params);
      default:
        return this.translate.instant('shell.mensaje.default', params);
    }
  }

  // Las novedades (postulacion nueva / cambio de estado) se avisan por voz +
  // notificacion del navegador, pero NO se meten en el chat -- el chat queda
  // solo para la conversacion directa con Annie (pedirle que agende algo, su
  // respuesta). El registro visual de las novedades ya lo da la tarjeta de
  // actividad (`actividadReciente`), que se actualiza sola.
  private anunciar(texto: string): void {
    this.hablar(texto);
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('Annie · Agenda Inteligente', { body: texto });
      } catch {
        // Algunos navegadores no permiten `new Notification()` fuera de
        // ciertos contextos; no es critico, la tarjeta de actividad ya
        // muestra la novedad igual.
      }
    }
  }

  get email(): string {
    return this.auth.usuario()?.email ?? '';
  }

  get inicial(): string {
    return this.nombreMostrado().charAt(0).toUpperCase() || 'A';
  }

  nombreMostrado(): string {
    return this.perfilService.perfil()?.nombre || this.email;
  }

  fotoPerfil(): string | null {
    const path = this.perfilService.perfil()?.foto_perfil;
    return path ? `${environment.apiUrl}${path}` : null;
  }

  private actividadDe(p: Postulacion): ActividadAnnie {
    // Se agrega el puesto ademas de la empresa porque varias postulaciones
    // pueden compartir el mismo nombre de empresa (o el mismo placeholder,
    // como "Trabajando.cl (completar)" cuando el mail no trae el nombre
    // real) -- sin el puesto se ven como si fueran la misma, duplicada.
    const params = { empresa: p.empresa, puesto: p.puesto };
    switch (p.estado) {
      case 'oferta':
        return { id: p.id, tipo: 'oferta', texto: this.translate.instant('shell.actividad.oferta', params) };
      case 'entrevista':
        return { id: p.id, tipo: 'entrevista', texto: this.translate.instant('shell.actividad.entrevista', params) };
      case 'rechazada':
        return { id: p.id, tipo: 'rechazada', texto: this.translate.instant('shell.actividad.rechazada', params) };
      case 'vista':
        return { id: p.id, tipo: 'vista', texto: this.translate.instant('shell.actividad.vista', params) };
      default:
        return { id: p.id, tipo: 'nueva', texto: this.translate.instant('shell.actividad.nueva', params) };
    }
  }

  private formatoFecha(iso: string): string {
    const fecha = new Date(iso);
    return fecha.toLocaleString(this.perfilService.localeDeIdioma(), {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  enviarAnnie(): void {
    const mensaje = this.annieInput.trim();
    if (!mensaje || this.annieEscribiendo()) return;

    this.annieMensajes.update((lista) => [...lista, { autor: 'usuaria', texto: mensaje }]);
    this.annieInput = '';

    if (this.esperandoNombre()) {
      this.guardarNombre(mensaje);
      return;
    }

    this.annieEscribiendo.set(true);
    this.annieError.set(null);

    this.annieService.chat(mensaje, this.annieHistorial).subscribe({
      next: (res) => {
        this.annieHistorial = res.historial;
        this.annieMensajes.update((lista) => [...lista, { autor: 'annie', texto: res.respuesta }]);
        this.hablar(res.respuesta);
        if (res.acciones.length > 0) {
          // Refresca sin pasar por detectarNovedades: lo que Annie acaba de
          // hacer ya se lo esta contando en su respuesta de arriba, no hace
          // falta que el próximo polling lo anuncie de nuevo.
          this.postulacionesService.listar().subscribe({
            next: (lista) => (this.ultimaListaConocida = lista),
            error: () => {},
          });
          // Annie tambien puede crear eventos personales (crear_evento) --
          // se refresca igual para que la Agenda lo vea sin recargar.
          this.eventosService.listar().subscribe({ error: () => {} });
        }
        this.annieEscribiendo.set(false);
      },
      error: (err) => {
        const clave = err?.status === 429 ? 'shell.annie.limiteAlcanzado' : 'shell.annie.errorRespuesta';
        this.annieError.set(this.translate.instant(clave));
        this.annieEscribiendo.set(false);
      },
    });
  }

  toggleVoz(): void {
    const nuevo = !this.vozActivada();
    this.vozActivada.set(nuevo);
    localStorage.setItem(VOZ_KEY, nuevo ? '1' : '0');
    if (!nuevo) {
      window.speechSynthesis?.cancel();
      this.detenerAudio();
    }
  }

  escucharPorVoz(): void {
    const Constructor = this.constructorReconocimiento();
    if (!Constructor || this.escuchando()) return;

    const reconocimiento: ReconocimientoVoz = new Constructor();
    reconocimiento.lang = this.perfilService.localeDeIdioma();
    reconocimiento.interimResults = false;
    reconocimiento.maxAlternatives = 1;
    reconocimiento.onresult = (evento) => {
      this.annieInput = evento.results[0][0].transcript;
    };
    reconocimiento.onerror = () => this.escuchando.set(false);
    reconocimiento.onend = () => this.escuchando.set(false);

    this.escuchando.set(true);
    reconocimiento.start();
  }

  private hablar(texto: string): void {
    if (!this.vozActivada()) return;
    this.despertarSalidaDeAudio();
    // Voz "linda" de ElevenLabs primero; si todavia no esta configurada (o
    // falla la request) cae a la voz gratis del navegador, asi Annie nunca
    // se queda muda.
    this.annieService.hablar(texto).subscribe({
      next: (audioBlob) => this.reproducirAudio(audioBlob),
      error: () => {
        this.detenerDespertador();
        this.hablarConVozDelNavegador(texto);
      },
    });
  }

  private audioContextDespertador: AudioContext | null = null;
  private osciladorDespertador: OscillatorNode | null = null;

  // Auriculares/parlantes Bluetooth entran en bajo consumo sin audio y
  // tardan 1-2s en "despertar" del todo cuando arranca un sonido nuevo --
  // eso se come el principio de la voz de Annie aunque el archivo este
  // completo (confirmado analizando el audio real que llega al navegador,
  // byte a byte: no hay ningun silencio de origen). Se dispara un tono a
  // 20Hz (practicamente imperceptible, casi infrasonico) apenas se decide
  // hablar, y NO se corta con un tiempo fijo -- se mantiene sonando hasta
  // que el audio real arranca de verdad (`reproducirAudio`/fallback del
  // navegador), para que no quede ningun hueco de silencio real en el medio
  // que deje al dispositivo volver a dormirse antes de que llegue la voz.
  private despertarSalidaDeAudio(): void {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      const contexto = new Ctx();
      const oscilador = contexto.createOscillator();
      const ganancia = contexto.createGain();
      oscilador.frequency.value = 20;
      ganancia.gain.value = 0.05;
      oscilador.connect(ganancia).connect(contexto.destination);
      oscilador.start();
      this.audioContextDespertador = contexto;
      this.osciladorDespertador = oscilador;
      // Red de seguridad por si nunca se llama a reproducirAudio ni al
      // fallback (no deberia pasar, pero que no quede sonando para siempre).
      setTimeout(() => this.detenerDespertador(), 8000);
    } catch {
      // Si el navegador no soporta Web Audio, Annie sigue hablando igual,
      // solo sin este "despertador" previo.
    }
  }

  private detenerDespertador(): void {
    if (this.osciladorDespertador) {
      try {
        this.osciladorDespertador.stop();
      } catch {
        // Ya pudo haber sido detenido antes (ej. por la red de seguridad).
      }
      this.osciladorDespertador = null;
    }
    if (this.audioContextDespertador) {
      this.audioContextDespertador.close();
      this.audioContextDespertador = null;
    }
  }

  private reproducirAudio(blob: Blob): void {
    this.detenerAudio();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    this.audioActual = audio;
    audio.addEventListener('ended', () => URL.revokeObjectURL(url));
    audio
      .play()
      // El despertador se corta recien cuando el audio real YA esta
      // sonando (con un margen chico de superposicion), nunca antes.
      .then(() => setTimeout(() => this.detenerDespertador(), 200))
      .catch(() => {
        this.detenerDespertador();
        URL.revokeObjectURL(url);
      });
  }

  private detenerAudio(): void {
    if (this.audioActual) {
      this.audioActual.pause();
      this.audioActual = null;
    }
  }

  private hablarConVozDelNavegador(texto: string): void {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(texto);
    utterance.lang = this.perfilService.localeDeIdioma();
    // "Voz tipo Barbie": el navegador no tiene una voz asi, asi que se
    // aproxima subiendo el tono y la velocidad para que suene mas aguda y
    // animada, sobre la voz en espanol mas "femenina" que haya disponible.
    utterance.pitch = 1.6;
    utterance.rate = 1.05;
    const voz = this.vozPreferida();
    if (voz) utterance.voice = voz;
    window.speechSynthesis.speak(utterance);
  }

  private vozPreferida(): SpeechSynthesisVoice | null {
    const prefijo = this.perfilService.localeDeIdioma().slice(0, 2);
    const voces = window.speechSynthesis?.getVoices() ?? [];
    const vocesIdioma = voces.filter((v) => v.lang.toLowerCase().startsWith(prefijo));
    if (vocesIdioma.length === 0) return null;
    const femenina = vocesIdioma.find((v) =>
      /female|woman|mujer|femenin|paulina|mónica|monica|sabina|elvira|helena|samantha|zira/i.test(v.name)
    );
    return femenina ?? vocesIdioma[0];
  }

  private constructorReconocimiento(): (new () => ReconocimientoVoz) | null {
    const global = window as unknown as Record<string, unknown>;
    return (global['SpeechRecognition'] || global['webkitSpeechRecognition'] || null) as
      | (new () => ReconocimientoVoz)
      | null;
  }

  salir(): void {
    // Los signals de estos servicios son singletons de toda la app -- sin
    // resetearlos, si otra cuenta se loguea en la misma pestaña veria por un
    // instante (o, si el refresh siguiente falla, indefinidamente) los datos
    // cacheados de esta sesion.
    this.postulacionesService.reset();
    this.eventosService.reset();
    this.perfilService.reset();
    this.mailsRevisionService.reset();
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }

  toggleMenuMovil(): void {
    this.menuMovilAbierto.update((v) => !v);
  }

  cerrarMenuMovil(): void {
    this.menuMovilAbierto.set(false);
  }
}
