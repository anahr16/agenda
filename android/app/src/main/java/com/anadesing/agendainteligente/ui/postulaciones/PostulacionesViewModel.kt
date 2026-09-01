package com.anadesing.agendainteligente.ui.postulaciones

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.anadesing.agendainteligente.data.DatosPostulacion
import com.anadesing.agendainteligente.data.MailRevision
import com.anadesing.agendainteligente.data.Postulacion
import com.anadesing.agendainteligente.data.PostulacionesRepository
import com.anadesing.agendainteligente.data.PostulacionesStats
import com.anadesing.agendainteligente.ui.common.Confirmacion
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter

private fun parseUtcInstant(iso: String): Instant = Instant.parse(if (iso.endsWith("Z")) iso else "${iso}Z")

/** Mismo formato que datetimeLocalInputToUtcIso() en postulaciones.ts: ISO sin milisegundos ni "Z" (el backend asume UTC). */
private fun formatoBackend(instant: Instant): String =
    DateTimeFormatter.ISO_LOCAL_DATE_TIME.format(instant.atZone(ZoneId.of("UTC")).toLocalDateTime())

class PostulacionesViewModel(private val repository: PostulacionesRepository) : ViewModel() {
    var postulaciones by mutableStateOf<List<Postulacion>>(emptyList())
        private set
    var stats by mutableStateOf<PostulacionesStats?>(null)
        private set
    var mailsRevision by mutableStateOf<List<MailRevision>>(emptyList())
        private set
    var cargando by mutableStateOf(true)
        private set
    var error by mutableStateOf<String?>(null)
        private set

    var filtroEstado by mutableStateOf("")
        private set
    var busqueda by mutableStateOf("")
        private set
    var expandidoId by mutableStateOf<Int?>(null)
        private set
    var editandoId by mutableStateOf<Int?>(null)
        private set
    var mostrarFormulario by mutableStateOf(false)
        private set

    var empresa by mutableStateOf("")
        private set
    var puesto by mutableStateOf("")
        private set
    var portal by mutableStateOf("")
        private set
    var descripcion by mutableStateOf("")
        private set
    var link by mutableStateOf("")
        private set
    var fechaPostulacion by mutableStateOf(LocalDate.now())
        private set
    var estado by mutableStateOf("enviada")
        private set
    var fechaEntrevista by mutableStateOf<Instant?>(null)
        private set
    var notas by mutableStateOf("")
        private set
    var errorFormulario by mutableStateOf<String?>(null)
        private set
    var guardando by mutableStateOf(false)
        private set
    private var revisionOrigenId: Int? = null

    var recalculando by mutableStateOf(false)
        private set
    var mensajeRecalculo by mutableStateOf<String?>(null)
        private set

    var expandidoRevisionId by mutableStateOf<Int?>(null)
        private set
    var seleccionadosRevision by mutableStateOf<Set<Int>>(emptySet())
        private set
    var procesandoBulk by mutableStateOf(false)
        private set

    var confirmacion by mutableStateOf<Confirmacion?>(null)
        private set

    val postulacionesFiltradas: List<Postulacion>
        get() {
            var lista = postulaciones
            if (filtroEstado.isNotEmpty()) lista = lista.filter { it.estado == filtroEstado }
            val texto = busqueda.trim().lowercase()
            if (texto.isNotEmpty()) {
                lista = lista.filter { it.empresa.lowercase().contains(texto) || it.puesto.lowercase().contains(texto) }
            }
            return lista
        }

    val todosSeleccionadosRevision: Boolean
        get() = mailsRevision.isNotEmpty() && mailsRevision.all { seleccionadosRevision.contains(it.id) }

    // Sin init{cargar()}: la carga la dispara un LaunchedEffect en PostulacionesScreen,
    // que se re-ejecuta cada vez que se vuelve a esta pestana (asi Annie puede
    // crear/actualizar una postulacion desde su chat y esta pantalla la ve fresca).
    fun cargar() {
        cargando = true
        error = null
        viewModelScope.launch {
            try {
                postulaciones = repository.listar()
            } catch (e: Exception) {
                error = "No se pudo conectar con el servidor."
            }
            stats = runCatching { repository.stats() }.getOrNull()
            mailsRevision = runCatching { repository.listarMailsRevision() }.getOrDefault(mailsRevision)
            cargando = false
        }
    }

    fun onFiltroEstadoChange(v: String) { filtroEstado = v }
    fun onBusquedaChange(v: String) { busqueda = v }

    fun onEmpresaChange(v: String) { empresa = v }
    fun onPuestoChange(v: String) { puesto = v }
    fun onPortalChange(v: String) { portal = v }
    fun onDescripcionChange(v: String) { descripcion = v }
    fun onLinkChange(v: String) { link = v }
    fun onFechaPostulacionChange(v: LocalDate) { fechaPostulacion = v }
    fun onEstadoChange(v: String) { estado = v }
    fun onFechaEntrevistaChange(v: Instant?) { fechaEntrevista = v }
    fun onNotasChange(v: String) { notas = v }

    fun toggleExpandido(id: Int) { expandidoId = if (expandidoId == id) null else id }
    fun toggleExpandidoRevision(id: Int) { expandidoRevisionId = if (expandidoRevisionId == id) null else id }

    fun estaSeleccionado(id: Int): Boolean = seleccionadosRevision.contains(id)

    fun toggleSeleccionRevision(id: Int) {
        seleccionadosRevision = if (seleccionadosRevision.contains(id)) seleccionadosRevision - id else seleccionadosRevision + id
    }

    fun toggleSeleccionarTodosRevision() {
        seleccionadosRevision = if (todosSeleccionadosRevision) emptySet() else mailsRevision.map { it.id }.toSet()
    }

    /** Datos de postulacion en base a un mail que no matcheo ningun portal -- empresa/puesto quedan
     *  como placeholder porque no hay forma de adivinarlos, se completan a mano despues. */
    private fun datosDesdeMail(mail: MailRevision): DatosPostulacion {
        val dominio = mail.remitente?.substringAfter('@', "") ?: ""
        return DatosPostulacion(
            empresa = if (dominio.isNotEmpty()) "Sin identificar ($dominio)" else "Sin identificar",
            puesto = mail.asunto ?: "Sin especificar",
            portal = dominio.ifEmpty { null },
            descripcion = null,
            link = null,
            fecha_postulacion = mail.fecha_recibido?.take(10) ?: LocalDate.now().toString(),
            estado = "enviada",
            fecha_entrevista = null,
            notas = "Mail original (${mail.remitente ?: "Remitente desconocido"} · \"${mail.asunto ?: "(sin asunto)"}\"):\n${mail.cuerpo}",
        )
    }

    fun confirmarCargarSeleccionados() {
        val mails = mailsRevision.filter { seleccionadosRevision.contains(it.id) }
        if (mails.isEmpty() || procesandoBulk) return
        confirmacion = Confirmacion(
            "¿Cargar ${mails.size} mail(s) como postulaciones? Van a quedar con empresa/puesto de relleno -- después los completas a mano.",
        ) { ejecutarCargarSeleccionados(mails) }
    }

    private fun ejecutarCargarSeleccionados(mails: List<MailRevision>) {
        procesandoBulk = true
        viewModelScope.launch {
            for (mail in mails) {
                runCatching {
                    repository.crear(datosDesdeMail(mail))
                    repository.descartarMailRevision(mail.id)
                }
            }
            seleccionadosRevision = emptySet()
            procesandoBulk = false
            cargar()
        }
    }

    fun confirmarDescartarSeleccionados() {
        val ids = seleccionadosRevision.toList()
        if (ids.isEmpty() || procesandoBulk) return
        confirmacion = Confirmacion(
            "¿Descartar ${ids.size} mail(s) de la bandeja de revisión? No se va a crear ninguna postulación.",
        ) { ejecutarDescartarSeleccionados(ids) }
    }

    private fun ejecutarDescartarSeleccionados(ids: List<Int>) {
        procesandoBulk = true
        viewModelScope.launch {
            for (id in ids) runCatching { repository.descartarMailRevision(id) }
            seleccionadosRevision = emptySet()
            procesandoBulk = false
            cargar()
        }
    }

    fun abrirNueva() {
        if (editandoId != null) cancelarEdicion()
        mostrarFormulario = true
    }

    /** Prellena el formulario de "nueva postulacion" con el contenido de un mail de la bandeja de revision. */
    fun cargarDesdeRevision(mail: MailRevision) {
        if (editandoId != null) cancelarEdicion()
        revisionOrigenId = mail.id
        empresa = ""
        puesto = ""
        portal = mail.remitente?.substringAfter('@', "") ?: ""
        descripcion = ""
        link = ""
        fechaPostulacion = mail.fecha_recibido?.take(10)?.let { runCatching { LocalDate.parse(it) }.getOrNull() } ?: LocalDate.now()
        estado = "enviada"
        fechaEntrevista = null
        notas = "Mail original (${mail.remitente ?: "Remitente desconocido"} · \"${mail.asunto ?: "(sin asunto)"}\"):\n${mail.cuerpo}"
        mostrarFormulario = true
    }

    fun confirmarDescartarRevision(mail: MailRevision) {
        confirmacion = Confirmacion(
            "¿Descartar este mail de la bandeja de revisión? No se va a crear ninguna postulación.",
        ) {
            viewModelScope.launch {
                runCatching { repository.descartarMailRevision(mail.id) }
                cargar()
            }
        }
    }

    fun editar(p: Postulacion) {
        editandoId = p.id
        expandidoId = p.id
        empresa = p.empresa
        puesto = p.puesto
        portal = p.portal ?: ""
        descripcion = p.descripcion ?: ""
        link = p.link ?: ""
        fechaPostulacion = runCatching { LocalDate.parse(p.fecha_postulacion) }.getOrDefault(LocalDate.now())
        estado = p.estado
        fechaEntrevista = p.fecha_entrevista?.let { parseUtcInstant(it) }
        notas = p.notas ?: ""
        errorFormulario = null
        mostrarFormulario = true
    }

    fun cancelarEdicion() {
        editandoId = null
        revisionOrigenId = null
        mostrarFormulario = false
        empresa = ""
        puesto = ""
        portal = ""
        descripcion = ""
        link = ""
        fechaPostulacion = LocalDate.now()
        estado = "enviada"
        fechaEntrevista = null
        notas = ""
        errorFormulario = null
    }

    fun guardar() {
        errorFormulario = null
        if (empresa.isBlank() || puesto.isBlank()) {
            errorFormulario = "empresa, puesto y fecha_postulacion son obligatorios"
            return
        }
        val datos = DatosPostulacion(
            empresa = empresa,
            puesto = puesto,
            portal = portal.ifBlank { null },
            descripcion = descripcion.ifBlank { null },
            link = link.ifBlank { null },
            fecha_postulacion = fechaPostulacion.toString(),
            estado = estado,
            fecha_entrevista = fechaEntrevista?.let { formatoBackend(it) },
            notas = notas.ifBlank { null },
        )
        val id = editandoId
        val revisionAId = revisionOrigenId
        guardando = true
        viewModelScope.launch {
            try {
                if (id != null) repository.editar(id, datos) else repository.crear(datos)
                cancelarEdicion()
                if (revisionAId != null) runCatching { repository.descartarMailRevision(revisionAId) }
                cargar()
            } catch (e: Exception) {
                errorFormulario = "No se pudo guardar la postulación."
            } finally {
                guardando = false
            }
        }
    }

    fun confirmarBorrar(p: Postulacion) {
        confirmacion = Confirmacion("¿Borrar la postulación a ${p.empresa}?") {
            viewModelScope.launch {
                runCatching { repository.borrar(p.id) }
                cargar()
            }
        }
    }

    fun recalcularCompatibilidad() {
        recalculando = true
        mensajeRecalculo = null
        viewModelScope.launch {
            try {
                val res = repository.recalcularCompatibilidad()
                mensajeRecalculo = "Listo, se recalcularon ${res.actualizadas} postulación(es)."
                cargar()
            } catch (e: Exception) {
                mensajeRecalculo = "No se pudo recalcular la compatibilidad."
            } finally {
                recalculando = false
            }
        }
    }

    fun confirmar() {
        confirmacion?.accion?.invoke()
        confirmacion = null
    }

    fun cancelarConfirmacion() { confirmacion = null }

    companion object {
        fun factory(repository: PostulacionesRepository) = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T = PostulacionesViewModel(repository) as T
        }
    }
}
