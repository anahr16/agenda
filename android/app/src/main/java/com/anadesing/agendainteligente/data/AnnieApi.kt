package com.anadesing.agendainteligente.data

import okhttp3.ResponseBody
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Streaming

// Mismos endpoints que ya usa la web (requieren JWT, agregado por el interceptor
// de NetworkModule). Ver backend/routes/annie.js.
interface AnnieApi {
    @POST("annie/chat")
    suspend fun chat(@Body req: AnnieChatRequest): AnnieChatResponse

    @Streaming
    @POST("annie/tts")
    suspend fun tts(@Body req: AnnieTtsRequest): ResponseBody

    @GET("annie/actividad-pendiente")
    suspend fun actividadPendiente(): ActividadPendienteResponse
}
