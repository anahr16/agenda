package com.anadesing.agendainteligente.ui.agenda

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.anadesing.agendainteligente.data.AgendaLocalStore
import com.anadesing.agendainteligente.data.AgendaRepository
import com.anadesing.agendainteligente.data.AuthRepository
import com.anadesing.agendainteligente.data.CANTIDAD_OBJETIVOS
import com.anadesing.agendainteligente.data.EventoDto
import com.anadesing.agendainteligente.data.PostulacionDto
import com.anadesing.agendainteligente.ui.common.Confirmacion
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDate
import java.time.YearMonth
import java.time.ZoneId
import java.time.format.DateTimeFormatter

data class EntrevistaDelDia(val postulacion: PostulacionDto, val hora: String)

data class CeldaMes(
    val fecha: LocalDate,
    val otroMes: Boolean,
    val hoy: Boolean,
    val entrevistas: List<EntrevistaDelDia>,
    val eventos: List<EventoDto>,
)

// Vista de mes, de solo lectura para postulaciones/eventos -- equivalente
// reducido de `celdas` en agenda.ts (sin vista semana ni alta/edicion de
// eventos, que quedan para un siguiente checkpoint). Notas/objetivos/
// afirmacion si estan, ver AgendaLocalStore.
class AgendaViewModel(
    private val repository: AgendaRepository,
    private val local: AgendaLocalStore,
    private val authRepository: AuthRepository,
) : ViewModel() {
    var mesVisible by mutableStateOf(YearMonth.now())
        private set
    var fechaSeleccionada by mutableStateOf(LocalDate.now())
        private set
    var cargando by mutableStateOf(true)
        private set
    var error by mutableStateOf<String?>(null)
        private set
    var celdas by mutableStateOf<List<CeldaMes>>(emptyList())
        private set

    var notas by mutableStateOf<List<String>>(emptyList())
        private set
    var nuevaNota by mutableStateOf("")
        private set
    var objetivos by mutableStateOf(List(CANTIDAD_OBJETIVOS) { "" })
        private set
    var afirmaciones by mutableStateOf<List<String>>(emptyList())
        private set
    var nuevaAfirmacion by mutableStateOf("")
        private set
    var confirmacion by mutableStateOf<Confirmacion?>(null)
        private set

    // Para el avatar del encabezado -- se recarga junto con el resto en cargar(),
    // asi que si se cambia la foto en Configuracion y se vuelve a esta pestana,
    // se ve la nueva sin tener que cerrar y reabrir la app.
    var nombreUsuaria by mutableStateOf<String?>(null)
        private set
    var fotoPerfilUrl by mutableStateOf<String?>(null)
        private set

    private var postulaciones: List<PostulacionDto> = emptyList()
    private var eventos: List<EventoDto> = emptyList()

    // Sin init{cargar()}: la carga la dispara un LaunchedEffect en AgendaScreen,
    // que se re-ejecuta cada vez que se vuelve a esta pestana (asi Annie puede
    // crear una entrevista/evento desde su chat y esta pantalla lo ve fresco).
    fun cargar() {
        cargando = true
        error = null
        viewModelScope.launch {
            try {
                postulaciones = repository.listarPostulaciones()
                eventos = repository.listarEventos()
                recalcularCeldas()
            } catch (e: Exception) {
                error = "No se pudo conectar con el servidor."
            } finally {
                cargando = false
            }
            notas = local.leerNotas(fechaSeleccionada)
            objetivos = local.leerObjetivos(mesVisible)
            afirmaciones = local.leerAfirmaciones(mesVisible)
            val perfil = runCatching { authRepository.obtenerPerfil() }.getOrNull()
            nombreUsuaria = perfil?.nombre
            fotoPerfilUrl = perfil?.foto_perfil
        }
    }

    fun cambiarMes(delta: Long) {
        mesVisible = mesVisible.plusMonths(delta)
        recalcularCeldas()
        viewModelScope.launch {
            objetivos = local.leerObjetivos(mesVisible)
            afirmaciones = local.leerAfirmaciones(mesVisible)
        }
    }

    fun seleccionarDia(fecha: LocalDate) {
        fechaSeleccionada = fecha
        viewModelScope.launch { notas = local.leerNotas(fecha) }
    }

    fun onNuevaNotaChange(texto: String) { nuevaNota = texto }

    fun agregarNota() {
        val texto = nuevaNota.trim()
        if (texto.isEmpty()) return
        nuevaNota = ""
        viewModelScope.launch {
            local.agregarNota(fechaSeleccionada, texto)
            notas = local.leerNotas(fechaSeleccionada)
        }
    }

    fun eliminarNota(indice: Int) {
        viewModelScope.launch {
            local.eliminarNota(fechaSeleccionada, indice)
            notas = local.leerNotas(fechaSeleccionada)
        }
    }

    fun onObjetivoChange(indice: Int, texto: String) {
        objetivos = objetivos.toMutableList().apply { this[indice] = texto }
        viewModelScope.launch { local.guardarObjetivo(mesVisible, indice, texto) }
    }

    fun onNuevaAfirmacionChange(texto: String) { nuevaAfirmacion = texto }

    fun agregarAfirmacion() {
        val texto = nuevaAfirmacion.trim()
        if (texto.isEmpty()) return
        nuevaAfirmacion = ""
        viewModelScope.launch {
            local.agregarAfirmacion(mesVisible, texto)
            afirmaciones = local.leerAfirmaciones(mesVisible)
        }
    }

    fun eliminarAfirmacion(indice: Int) {
        viewModelScope.launch {
            local.eliminarAfirmacion(mesVisible, indice)
            afirmaciones = local.leerAfirmaciones(mesVisible)
        }
    }

    /** Borrar un evento personal -- los mismos que crea Annie con crear_evento
     *  o que ya vengan del backend. Las entrevistas no se borran desde aca: son
     *  parte de una postulacion, se editan/borran desde la pestana Postulaciones. */
    fun confirmarBorrarEvento(evento: EventoDto) {
        confirmacion = Confirmacion("¿Borrar \"${evento.titulo}\"?") {
            viewModelScope.launch {
                runCatching { repository.borrarEvento(evento.id) }
                eventos = runCatching { repository.listarEventos() }.getOrDefault(eventos)
                recalcularCeldas()
            }
        }
    }

    fun confirmar() {
        confirmacion?.accion?.invoke()
        confirmacion = null
    }

    fun cancelarConfirmacion() { confirmacion = null }

    fun celdaSeleccionada(): CeldaMes? = celdas.find { it.fecha == fechaSeleccionada }

    private fun fechaEntrevista(iso: String): LocalDate = instanteEntrevista(iso).toLocalDate()

    private fun instanteEntrevista(iso: String) =
        Instant.parse(if (iso.endsWith("Z")) iso else "${iso}Z").atZone(ZoneId.systemDefault())

    fun horaEntrevista(iso: String): String = DateTimeFormatter.ofPattern("HH:mm").format(instanteEntrevista(iso))

    private fun recalcularCeldas() {
        val primerDia = mesVisible.atDay(1)
        val offsetLunes = primerDia.dayOfWeek.value - 1 // lunes = 0, igual que inicioDeSemana() en agenda.ts
        val inicioGrilla = primerDia.minusDays(offsetLunes.toLong())
        val hoy = LocalDate.now()

        celdas = (0 until 42).map { i ->
            val fecha = inicioGrilla.plusDays(i.toLong())
            val entrevistasDia = postulaciones
                .mapNotNull { p -> p.fecha_entrevista?.let { p to it } }
                .filter { (_, iso) -> fechaEntrevista(iso) == fecha }
                .map { (p, iso) -> EntrevistaDelDia(p, horaEntrevista(iso)) }
                .sortedBy { it.hora }
            val eventosDia = eventos
                .filter { runCatching { LocalDate.parse(it.fecha) }.getOrNull() == fecha }
                .sortedBy { it.hora ?: "" }
            CeldaMes(
                fecha = fecha,
                otroMes = fecha.month != mesVisible.month,
                hoy = fecha == hoy,
                entrevistas = entrevistasDia,
                eventos = eventosDia,
            )
        }
    }

    companion object {
        fun factory(repository: AgendaRepository, local: AgendaLocalStore, authRepository: AuthRepository) =
            object : ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : ViewModel> create(modelClass: Class<T>): T =
                    AgendaViewModel(repository, local, authRepository) as T
            }
    }
}
