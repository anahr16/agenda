package com.anadesing.agendainteligente.data

import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path

// Mismos endpoints que ya usa la web para Postulaciones (requieren JWT, agregado
// por el interceptor de NetworkModule). Ver backend/routes/postulaciones.js y
// backend/routes/mailsRevision.js.
interface PostulacionesApi {
    @GET("postulaciones")
    suspend fun listar(): List<Postulacion>

    @GET("postulaciones/stats")
    suspend fun stats(): PostulacionesStats

    @POST("postulaciones")
    suspend fun crear(@Body datos: DatosPostulacion): Postulacion

    @PUT("postulaciones/{id}")
    suspend fun editar(@Path("id") id: Int, @Body datos: DatosPostulacion): Postulacion

    @DELETE("postulaciones/{id}")
    suspend fun borrar(@Path("id") id: Int)

    @POST("postulaciones/recalcular-compatibilidad")
    suspend fun recalcularCompatibilidad(): RecalcularCompatibilidadResponse

    @GET("mails-revision")
    suspend fun listarMailsRevision(): List<MailRevision>

    @DELETE("mails-revision/{id}")
    suspend fun descartarMailRevision(@Path("id") id: Int)
}
