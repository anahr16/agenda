package com.anadesing.agendainteligente.ui.annie

import android.content.Context
import android.media.MediaPlayer
import android.speech.tts.TextToSpeech
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.anadesing.agendainteligente.data.AnnieRepository
import com.anadesing.agendainteligente.data.AuthRepository
import com.anadesing.agendainteligente.data.HistorialItem
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.util.Locale

data class MensajeChat(val autor: String, val texto: String)

private const val AUTOR_USUARIA = "usuaria"
private const val AUTOR_ANNIE = "annie"

/** Chat con Annie -- mismo flujo que la tarjeta de Annie en shell.ts, sin el feed
 *  de actividad reciente (esa queda para una vuelta futura, ver readme.md). */
class AnnieViewModel(
    private val repository: AnnieRepository,
    private val authRepository: AuthRepository,
    private val cacheDir: File,
) : ViewModel() {
    var mensajes by mutableStateOf<List<MensajeChat>>(emptyList())
        private set
    var entrada by mutableStateOf("")
        private set
    var enviando by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set
    var vozActivada by mutableStateOf(true)
        private set
    var reproduciendo by mutableStateOf(false)
        private set

    /** Se prende cuando la ultima respuesta creo/actualizo una entrevista o evento --
     *  Agenda/Postulaciones ya recargan solas al volver a mostrarse (ver LaunchedEffect
     *  en sus Screen), esto es solo para el aviso visual en el chat. */
    var huboAccion by mutableStateOf(false)
        private set

    /** Si todavia no hay nombre guardado en el perfil, el proximo mensaje que mande
     *  la usuaria se guarda como nombre en vez de mandarse al chat -- igual que
     *  esperandoNombre en shell.ts. */
    private var esperandoNombre = false
    private var saludoHecho = false

    private var historial: List<HistorialItem> = emptyList()
    private var mediaPlayer: MediaPlayer? = null
    private var tts: TextToSpeech? = null

    fun onEntradaChange(v: String) { entrada = v }

    fun alternarVoz() {
        vozActivada = !vozActivada
        if (!vozActivada) detenerAudio()
    }

    fun inicializarTts(context: Context) {
        if (tts != null) return
        tts = TextToSpeech(context.applicationContext) { estado ->
            if (estado == TextToSpeech.SUCCESS) tts?.language = Locale("es", "419")
        }
    }

    /** Saluda una sola vez al entrar a la app -- pide el nombre si el perfil
     *  todavia no tiene uno guardado, igual que saludar() en shell.ts. Es
     *  suspend (no lanza su propio viewModelScope.launch) para que quien la
     *  llama pueda esperar a que el saludo este listo -- PrincipalScreen la usa
     *  para recien ahi abrir la pestana de Annie sola. */
    suspend fun saludar() {
        if (saludoHecho) return
        saludoHecho = true
        val nombre = runCatching { authRepository.obtenerNombre() }.getOrNull()?.takeIf { it.isNotBlank() }
        val segundaParte = if (nombre != null) {
            "¿En qué puedo ayudarte hoy, $nombre?"
        } else {
            esperandoNombre = true
            "Antes de arrancar, ¿cómo te gusta que te llame?"
        }
        // "Mientras no estuviste": lo que paso en Postulaciones con la app cerrada
        // (nueva postulacion detectada, cambio de estado) desde el ultimo saludo --
        // mismo endpoint que ya usa shell.ts en la web.
        val actividad = runCatching { repository.actividadPendiente() }.getOrDefault(emptyList())
        val resumen = if (actividad.isNotEmpty()) " Mientras no estuviste, pasó esto: ${actividad.joinToString(". ")}." else ""
        val mensaje = "¡Bienvenida a tu Agenda Inteligente! $segundaParte$resumen"
        mensajes = mensajes + MensajeChat(AUTOR_ANNIE, mensaje)
        if (vozActivada) hablar(mensaje)
    }

    fun enviar() {
        val texto = entrada.trim()
        if (texto.isEmpty() || enviando) return
        mensajes = mensajes + MensajeChat(AUTOR_USUARIA, texto)
        entrada = ""

        if (esperandoNombre) {
            guardarNombre(texto)
            return
        }

        enviando = true
        error = null
        huboAccion = false
        viewModelScope.launch {
            try {
                val res = repository.chat(texto, historial)
                historial = res.historial
                mensajes = mensajes + MensajeChat(AUTOR_ANNIE, res.respuesta)
                huboAccion = res.acciones.isNotEmpty()
                if (vozActivada) hablar(res.respuesta)
            } catch (e: Exception) {
                error = "Annie no pudo responder. Intenta de nuevo."
            } finally {
                enviando = false
            }
        }
    }

    private fun guardarNombre(nombre: String) {
        esperandoNombre = false
        enviando = true
        error = null
        viewModelScope.launch {
            try {
                authRepository.guardarNombre(nombre)
                val respuesta = "¡Un gusto, $nombre! ¿En qué puedo ayudarte hoy?"
                mensajes = mensajes + MensajeChat(AUTOR_ANNIE, respuesta)
                if (vozActivada) hablar(respuesta)
            } catch (e: Exception) {
                error = "Annie no pudo responder. Intenta de nuevo."
            } finally {
                enviando = false
            }
        }
    }

    private fun hablar(texto: String) {
        viewModelScope.launch {
            try {
                val cuerpo = repository.tts(texto)
                val archivo = File(cacheDir, "annie_tts.mp3")
                withContext(Dispatchers.IO) {
                    cuerpo.byteStream().use { entrada -> archivo.outputStream().use { salida -> entrada.copyTo(salida) } }
                }
                reproducirArchivo(archivo)
            } catch (e: Exception) {
                tts?.speak(texto, TextToSpeech.QUEUE_FLUSH, null, null)
            }
        }
    }

    private fun reproducirArchivo(archivo: File) {
        detenerAudio()
        mediaPlayer = MediaPlayer().apply {
            setDataSource(archivo.absolutePath)
            setOnCompletionListener { reproduciendo = false }
            setOnPreparedListener {
                reproduciendo = true
                it.start()
            }
            prepareAsync()
        }
    }

    private fun detenerAudio() {
        mediaPlayer?.release()
        mediaPlayer = null
        reproduciendo = false
    }

    override fun onCleared() {
        detenerAudio()
        tts?.shutdown()
    }

    companion object {
        fun factory(repository: AnnieRepository, authRepository: AuthRepository, cacheDir: File) = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T = AnnieViewModel(repository, authRepository, cacheDir) as T
        }
    }
}
