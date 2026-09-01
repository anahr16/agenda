package com.anadesing.agendainteligente.data

import okhttp3.MultipartBody
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Multipart
import retrofit2.http.PUT
import retrofit2.http.POST
import retrofit2.http.Part

// Mismos endpoints que ya usa la web (frontend/src/app/core/auth.service.ts,
// perfil.service.ts, push.service.ts).
interface AuthApi {
    @POST("auth/login")
    suspend fun login(@Body body: LoginRequest): LoginResponse

    @POST("auth/register")
    suspend fun register(@Body body: RegisterRequest): UsuarioResponse

    @GET("auth/perfil")
    suspend fun perfil(): PerfilDto

    @PUT("auth/perfil")
    suspend fun actualizarPerfil(@Body body: PerfilUpdate): PerfilDto

    @PUT("auth/email")
    suspend fun cambiarEmail(@Body body: EmailUpdate): TokenResponse

    @PUT("auth/password")
    suspend fun cambiarPassword(@Body body: PasswordUpdate): OkResponse

    @Multipart
    @POST("auth/foto-perfil")
    suspend fun subirFoto(@Part foto: MultipartBody.Part): FotoPerfilResponse

    @PUT("auth/fcm-token")
    suspend fun actualizarFcmToken(@Body body: FcmTokenUpdate): OkResponse

    @PUT("auth/perfil-cv")
    suspend fun actualizarPerfilCv(@Body body: PerfilCvUpdate): PerfilCvResponse

    @PUT("auth/computrabajo")
    suspend fun conectarComputrabajo(@Body body: ComputrabajoCredenciales): OkResponse

    @DELETE("auth/computrabajo")
    suspend fun desconectarComputrabajo(): OkResponse
}
