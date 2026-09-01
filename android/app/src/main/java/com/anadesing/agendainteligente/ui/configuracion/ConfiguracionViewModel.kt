package com.anadesing.agendainteligente.ui.configuracion

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.anadesing.agendainteligente.data.AuthRepository
import com.anadesing.agendainteligente.data.PerfilDto
import com.anadesing.agendainteligente.data.PerfilUpdate
import com.anadesing.agendainteligente.data.obtenerTokenFcm
import kotlinx.coroutines.launch

/** Mismo alcance que configuracion.ts: perfil (nombre/email/foto), contraseña,
 *  notificaciones, idioma y apariencia. Idioma/tema hoy solo se guardan en el
 *  backend -- Android no tiene i18n ni lee el tema del perfil todavia (usa el
 *  modo claro/oscuro del sistema), ver Tema.kt. */
class ConfiguracionViewModel(private val repository: AuthRepository) : ViewModel() {
    var perfil by mutableStateOf<PerfilDto?>(null)
        private set
    var cargando by mutableStateOf(true)
        private set

    var nombre by mutableStateOf("")
        private set
    var email by mutableStateOf("")
        private set
    var passwordActualEmail by mutableStateOf("")
        private set
    var passwordActual by mutableStateOf("")
        private set
    var passwordNueva by mutableStateOf("")
        private set

    var guardandoNombre by mutableStateOf(false)
        private set
    var mensajeNombre by mutableStateOf<String?>(null)
        private set
    var guardandoEmail by mutableStateOf(false)
        private set
    var mensajeEmail by mutableStateOf<String?>(null)
        private set
    var guardandoPassword by mutableStateOf(false)
        private set
    var mensajePassword by mutableStateOf<String?>(null)
        private set
    var subiendoFoto by mutableStateOf(false)
        private set
    var mensajeFoto by mutableStateOf<String?>(null)
        private set
    var cambiandoNotificaciones by mutableStateOf(false)
        private set
    var mensajeNotificaciones by mutableStateOf<String?>(null)
        private set

    var perfilCv by mutableStateOf("")
        private set
    var guardandoPerfilCv by mutableStateOf(false)
        private set
    var mensajePerfilCv by mutableStateOf<String?>(null)
        private set

    var computrabajoEmail by mutableStateOf("")
        private set
    var computrabajoPassword by mutableStateOf("")
        private set
    var conectandoComputrabajo by mutableStateOf(false)
        private set
    var mensajeComputrabajo by mutableStateOf<String?>(null)
        private set

    fun cargar() {
        cargando = true
        viewModelScope.launch {
            val datos = runCatching { repository.obtenerPerfil() }.getOrNull()
            perfil = datos
            nombre = datos?.nombre ?: ""
            email = datos?.email ?: ""
            perfilCv = datos?.perfil_cv ?: ""
            cargando = false
        }
    }

    fun onNombreChange(v: String) { nombre = v }
    fun onEmailChange(v: String) { email = v }
    fun onPasswordActualEmailChange(v: String) { passwordActualEmail = v }
    fun onPasswordActualChange(v: String) { passwordActual = v }
    fun onPasswordNuevaChange(v: String) { passwordNueva = v }
    fun onPerfilCvChange(v: String) { perfilCv = v }
    fun onComputrabajoEmailChange(v: String) { computrabajoEmail = v }
    fun onComputrabajoPasswordChange(v: String) { computrabajoPassword = v }

    fun guardarNombre() {
        guardandoNombre = true
        mensajeNombre = null
        viewModelScope.launch {
            try {
                perfil = repository.actualizarPerfil(PerfilUpdate(nombre = nombre))
                mensajeNombre = "Perfil actualizado."
            } catch (e: Exception) {
                mensajeNombre = "No se pudo guardar el nombre."
            } finally {
                guardandoNombre = false
            }
        }
    }

    fun cambiarEmail() {
        guardandoEmail = true
        mensajeEmail = null
        viewModelScope.launch {
            try {
                repository.cambiarEmail(email, passwordActualEmail)
                passwordActualEmail = ""
                mensajeEmail = "Perfil actualizado."
            } catch (e: Exception) {
                mensajeEmail = "No se pudo cambiar el email."
            } finally {
                guardandoEmail = false
            }
        }
    }

    fun cambiarPassword() {
        guardandoPassword = true
        mensajePassword = null
        viewModelScope.launch {
            try {
                repository.cambiarPassword(passwordActual, passwordNueva)
                passwordActual = ""
                passwordNueva = ""
                mensajePassword = "Contraseña actualizada."
            } catch (e: Exception) {
                mensajePassword = "No se pudo cambiar la contraseña."
            } finally {
                guardandoPassword = false
            }
        }
    }

    fun subirFoto(bytes: ByteArray, nombreArchivo: String, mimeType: String) {
        subiendoFoto = true
        mensajeFoto = null
        viewModelScope.launch {
            try {
                val ruta = repository.subirFotoPerfil(bytes, nombreArchivo, mimeType)
                perfil = perfil?.copy(foto_perfil = ruta)
            } catch (e: Exception) {
                mensajeFoto = "No se pudo subir la foto."
            } finally {
                subiendoFoto = false
            }
        }
    }

    fun toggleNotificaciones() {
        val activarAhora = perfil?.notificaciones_activas != 1
        cambiandoNotificaciones = true
        mensajeNotificaciones = null
        viewModelScope.launch {
            try {
                if (activarAhora) {
                    val token = obtenerTokenFcm()
                    if (token == null) {
                        mensajeNotificaciones = "No se pudo activar."
                        return@launch
                    }
                    repository.registrarTokenPush(token)
                } else {
                    repository.registrarTokenPush(null)
                }
                perfil = repository.actualizarPerfil(PerfilUpdate(notificaciones_activas = activarAhora))
                mensajeNotificaciones = if (activarAhora) "Notificaciones activadas." else "Notificaciones desactivadas."
            } catch (e: Exception) {
                mensajeNotificaciones = "No se pudo activar."
            } finally {
                cambiandoNotificaciones = false
            }
        }
    }

    fun cambiarIdioma(idioma: String) {
        viewModelScope.launch { perfil = runCatching { repository.actualizarPerfil(PerfilUpdate(idioma = idioma)) }.getOrNull() ?: perfil }
    }

    fun cambiarTema(tema: String) {
        viewModelScope.launch { perfil = runCatching { repository.actualizarPerfil(PerfilUpdate(tema = tema)) }.getOrNull() ?: perfil }
    }

    fun guardarPerfilCv() {
        guardandoPerfilCv = true
        mensajePerfilCv = null
        viewModelScope.launch {
            try {
                repository.actualizarPerfilCv(perfilCv)
                perfil = perfil?.copy(perfil_cv = perfilCv)
                mensajePerfilCv = "CV actualizado."
            } catch (e: Exception) {
                mensajePerfilCv = "No se pudo guardar el CV."
            } finally {
                guardandoPerfilCv = false
            }
        }
    }

    fun conectarComputrabajo() {
        conectandoComputrabajo = true
        mensajeComputrabajo = null
        viewModelScope.launch {
            try {
                repository.conectarComputrabajo(computrabajoEmail, computrabajoPassword)
                perfil = perfil?.copy(computrabajo_email = computrabajoEmail, computrabajo_conectado = 1)
                computrabajoPassword = ""
                mensajeComputrabajo = "Cuenta conectada."
            } catch (e: Exception) {
                mensajeComputrabajo = "No se pudo conectar la cuenta."
            } finally {
                conectandoComputrabajo = false
            }
        }
    }

    fun desconectarComputrabajo() {
        conectandoComputrabajo = true
        mensajeComputrabajo = null
        viewModelScope.launch {
            try {
                repository.desconectarComputrabajo()
                perfil = perfil?.copy(computrabajo_email = null, computrabajo_conectado = 0)
                computrabajoEmail = ""
                mensajeComputrabajo = "Cuenta desconectada."
            } catch (e: Exception) {
                mensajeComputrabajo = "No se pudo desconectar la cuenta."
            } finally {
                conectandoComputrabajo = false
            }
        }
    }

    companion object {
        fun factory(repository: AuthRepository) = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T = ConfiguracionViewModel(repository) as T
        }
    }
}
