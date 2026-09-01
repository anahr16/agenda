package com.anadesing.agendainteligente.data

data class LoginRequest(val email: String, val password: String)

data class RegisterRequest(val email: String, val password: String)

data class LoginResponse(val token: String)

data class UsuarioResponse(val id: Int, val email: String, val creado_en: String?)

data class ErrorResponse(val error: String?)

/** Mismos campos que GET /auth/perfil -- antes solo tenia `nombre` (lo unico
 *  que usaba el saludo de Annie), ahora completo para la pantalla de
 *  Configuracion. */
data class PerfilDto(
    val nombre: String?,
    val email: String? = null,
    val foto_perfil: String? = null,
    val idioma: String? = null,
    val tema: String? = null,
    val notificaciones_activas: Int? = null,
    val perfil_cv: String? = null,
    val computrabajo_email: String? = null,
    val computrabajo_conectado: Int? = null,
)

/** Cada campo es opcional -- Gson (por defecto) omite los que quedan en null
 *  al serializar, asi que solo se manda lo que se quiere actualizar, igual
 *  que DatosPerfil en perfil.service.ts. */
data class PerfilUpdate(
    val nombre: String? = null,
    val idioma: String? = null,
    val tema: String? = null,
    val notificaciones_activas: Boolean? = null,
)

data class EmailUpdate(val email: String, val password_actual: String)

data class PasswordUpdate(val password_actual: String, val password_nueva: String)

data class TokenResponse(val token: String)

data class FotoPerfilResponse(val foto_perfil: String)

data class FcmTokenUpdate(val fcm_token: String?)

data class OkResponse(val ok: Boolean)

data class PerfilCvUpdate(val perfil_cv: String)

data class PerfilCvResponse(val perfil_cv: String)

data class ComputrabajoCredenciales(val email: String, val password: String)
