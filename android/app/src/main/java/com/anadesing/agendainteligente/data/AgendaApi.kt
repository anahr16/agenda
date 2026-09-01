package com.anadesing.agendainteligente.data

import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Path

// Mismos endpoints que ya usa la web para la Agenda (requieren JWT, agregado
// por el interceptor de NetworkModule) -- /citas queda afuera, la vista de
// mes de este checkpoint solo pinta entrevistas (postulaciones) y eventos.
interface AgendaApi {
    @GET("postulaciones")
    suspend fun listarPostulaciones(): List<PostulacionDto>

    @GET("eventos")
    suspend fun listarEventos(): List<EventoDto>

    @DELETE("eventos/{id}")
    suspend fun borrarEvento(@Path("id") id: Int)
}
