package com.anadesing.agendainteligente.ui.login

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.anadesing.agendainteligente.data.AuthRepository
import com.anadesing.agendainteligente.data.mensajeError
import kotlinx.coroutines.launch
import retrofit2.HttpException

enum class ModoLogin { LOGIN, REGISTRO }

// Mismo flujo que Login (frontend/src/app/pages/login/login.ts): un solo
// formulario que alterna entre iniciar sesion y registrarse.
class LoginViewModel(private val authRepository: AuthRepository) : ViewModel() {
    var modo by mutableStateOf(ModoLogin.LOGIN)
        private set
    var error by mutableStateOf<String?>(null)
        private set
    var cargando by mutableStateOf(false)
        private set

    fun alternarModo() {
        modo = if (modo == ModoLogin.LOGIN) ModoLogin.REGISTRO else ModoLogin.LOGIN
        error = null
    }

    fun enviar(email: String, password: String, onSesionIniciada: () -> Unit, onRegistroOk: () -> Unit) {
        error = null
        cargando = true
        viewModelScope.launch {
            try {
                if (modo == ModoLogin.LOGIN) {
                    authRepository.login(email, password)
                    cargando = false
                    onSesionIniciada()
                } else {
                    authRepository.registrar(email, password)
                    cargando = false
                    modo = ModoLogin.LOGIN
                    error = "Usuario creado. Ahora inicia sesión."
                    onRegistroOk()
                }
            } catch (e: HttpException) {
                cargando = false
                error = e.mensajeError() ?: "Ocurrió un error, intenta de nuevo."
            } catch (e: Exception) {
                cargando = false
                error = "No se pudo conectar con el servidor."
            }
        }
    }

    companion object {
        fun factory(authRepository: AuthRepository) = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T = LoginViewModel(authRepository) as T
        }
    }
}
