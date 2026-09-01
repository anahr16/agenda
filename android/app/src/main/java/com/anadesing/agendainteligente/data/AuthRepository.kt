package com.anadesing.agendainteligente.data

import kotlinx.coroutines.flow.Flow
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody

class AuthRepository(private val api: AuthApi, private val tokenStore: TokenStore) {
    val usuario: Flow<UsuarioToken?> = tokenStore.usuario

    suspend fun login(email: String, password: String) {
        val respuesta = api.login(LoginRequest(email, password))
        tokenStore.guardar(respuesta.token)
    }

    suspend fun registrar(email: String, password: String) {
        api.register(RegisterRequest(email, password))
    }

    suspend fun logout() {
        tokenStore.borrar()
    }

    /** Usado por el saludo de Annie -- ver AnnieViewModel.saludar(). */
    suspend fun obtenerNombre(): String? = api.perfil().nombre

    suspend fun guardarNombre(nombre: String) {
        api.actualizarPerfil(PerfilUpdate(nombre = nombre))
    }

    /** Perfil completo -- ver ui/configuracion/ConfiguracionViewModel.kt. */
    suspend fun obtenerPerfil(): PerfilDto = api.perfil()

    suspend fun actualizarPerfil(datos: PerfilUpdate): PerfilDto = api.actualizarPerfil(datos)

    /** Devuelve un token nuevo (el JWT lleva el email embebido) -- hay que
     *  reemplazar el guardado, igual que setToken() en auth.service.ts. */
    suspend fun cambiarEmail(email: String, passwordActual: String) {
        val respuesta = api.cambiarEmail(EmailUpdate(email, passwordActual))
        tokenStore.guardar(respuesta.token)
    }

    suspend fun cambiarPassword(passwordActual: String, passwordNueva: String) {
        api.cambiarPassword(PasswordUpdate(passwordActual, passwordNueva))
    }

    /** Sube la foto y devuelve la ruta relativa (`/uploads/perfil/...`) -- armar
     *  la URL completa con NetworkModule.BASE_URL, como fotoPerfil() en
     *  configuracion.ts. */
    suspend fun subirFotoPerfil(bytes: ByteArray, nombreArchivo: String, mimeType: String): String {
        val cuerpo = bytes.toRequestBody(mimeType.toMediaTypeOrNull())
        val parte = MultipartBody.Part.createFormData("foto", nombreArchivo, cuerpo)
        return api.subirFoto(parte).foto_perfil
    }

    /** Mismo endpoint que push.service.ts en la web -- registra (o borra, con
     *  null) el token de este dispositivo para que el backend le mande push. */
    suspend fun registrarTokenPush(token: String?) {
        api.actualizarFcmToken(FcmTokenUpdate(token))
    }

    suspend fun actualizarPerfilCv(perfilCv: String) {
        api.actualizarPerfilCv(PerfilCvUpdate(perfilCv))
    }

    suspend fun conectarComputrabajo(email: String, password: String) {
        api.conectarComputrabajo(ComputrabajoCredenciales(email, password))
    }

    suspend fun desconectarComputrabajo() {
        api.desconectarComputrabajo()
    }
}
