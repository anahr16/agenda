import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { PushService } from '../core/push.service';
import { PostulacionesService, Postulacion } from '../core/postulaciones.service';
import { EventosService } from '../core/eventos.service';
import { AnnieMensaje, AnnieService } from '../core/annie.service';

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
  imports: [RouterLink, RouterLinkActive, RouterOutlet, FormsModule],
  templateUrl: './shell.html',
  styleUrl: './shell.css',
})
export class Shell implements OnInit, OnDestroy {
  mensajePush = signal<string | null>(null);
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
    private push: PushService,
    private router: Router,
    private postulacionesService: PostulacionesService,
    private eventosService: EventosService,
    private annieService: AnnieService
  ) {
    // Dispara la carga asincronica de voces del navegador lo antes posible
    // (getVoices() suele devolver [] hasta el primer llamado).
    window.speechSynthesis?.getVoices();
  }

  ngOnInit(): void {
    this.actualizarPostulaciones();
    this.saludar();
    this.intervaloActualizacion = setInterval(() => this.actualizarPostulaciones(), INTERVALO_ACTUALIZACION_MS);
  }

  ngOnDestroy(): void {
    if (this.intervaloActualizacion) clearInterval(this.intervaloActualizacion);
  }

  private saludar(): void {
    const saludo = '¡Bienvenida a tu Agenda Inteligente!';
    // Chrome a veces ignora el primer speechSynthesis.speak() si se dispara
    // apenas carga la pagina (antes de que el motor de voz este listo).
    // Un pequeño delay evita ese caso.
    this.annieMensajes.update((lista) => [...lista, { autor: 'annie', texto: saludo }]);
    setTimeout(() => this.hablar(saludo), 300);
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
        this.anunciar(`Nueva postulación detectada: ${p.empresa} (${p.puesto}).`);
      } else if (previa.estado !== p.estado) {
        this.anunciar(this.mensajeCambioEstado(p));
      }
    }
  }

  private mensajeCambioEstado(p: Postulacion): string {
    switch (p.estado) {
      case 'oferta':
        return `¡Tienes una oferta de ${p.empresa} (${p.puesto})!`;
      case 'entrevista':
        return `Te agendaron una entrevista con ${p.empresa} (${p.puesto}).`;
      case 'rechazada':
        return `${p.empresa} (${p.puesto}) respondió que no vas a avanzar esta vez.`;
      case 'vista':
        return `${p.empresa} (${p.puesto}) vio tu postulación.`;
      default:
        return `${p.empresa} (${p.puesto}) actualizó tu postulación a "${p.estado}".`;
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
    return this.email.charAt(0).toUpperCase() || 'A';
  }

  get pushDisponible(): boolean {
    return this.push.firebaseConfigurado();
  }

  private actividadDe(p: Postulacion): ActividadAnnie {
    // Se agrega el puesto ademas de la empresa porque varias postulaciones
    // pueden compartir el mismo nombre de empresa (o el mismo placeholder,
    // como "Trabajando.cl (completar)" cuando el mail no trae el nombre
    // real) -- sin el puesto se ven como si fueran la misma, duplicada.
    switch (p.estado) {
      case 'oferta':
        return { id: p.id, tipo: 'oferta', texto: `¡Oferta de ${p.empresa} (${p.puesto})!` };
      case 'entrevista':
        return { id: p.id, tipo: 'entrevista', texto: `Entrevista agendada con ${p.empresa} (${p.puesto})` };
      case 'rechazada':
        return { id: p.id, tipo: 'rechazada', texto: `${p.empresa} (${p.puesto}) respondió: no avanza` };
      case 'vista':
        return { id: p.id, tipo: 'vista', texto: `${p.empresa} (${p.puesto}) vio tu postulación` };
      default:
        return { id: p.id, tipo: 'nueva', texto: `Nueva postulación detectada: ${p.empresa} (${p.puesto})` };
    }
  }

  private formatoFecha(iso: string): string {
    const fecha = new Date(iso);
    return fecha.toLocaleString('es-419', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  async activarRecordatorios(): Promise<void> {
    const resultado = await this.push.pedirPermisoYRegistrar();
    this.mensajePush.set(resultado.ok ? 'Notificaciones activadas.' : resultado.motivo ?? 'No se pudo activar.');
  }

  enviarAnnie(): void {
    const mensaje = this.annieInput.trim();
    if (!mensaje || this.annieEscribiendo()) return;

    this.annieMensajes.update((lista) => [...lista, { autor: 'usuaria', texto: mensaje }]);
    this.annieInput = '';
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
      error: () => {
        this.annieError.set('Annie no pudo responder. Intenta de nuevo.');
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
    reconocimiento.lang = 'es-419';
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
    utterance.lang = 'es-419';
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
    const voces = window.speechSynthesis?.getVoices() ?? [];
    const esVoces = voces.filter((v) => v.lang.toLowerCase().startsWith('es'));
    if (esVoces.length === 0) return null;
    const femenina = esVoces.find((v) => /female|mujer|femenin|paulina|mónica|monica|sabina|elvira|helena/i.test(v.name));
    return femenina ?? esVoces[0];
  }

  private constructorReconocimiento(): (new () => ReconocimientoVoz) | null {
    const global = window as unknown as Record<string, unknown>;
    return (global['SpeechRecognition'] || global['webkitSpeechRecognition'] || null) as
      | (new () => ReconocimientoVoz)
      | null;
  }

  salir(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
