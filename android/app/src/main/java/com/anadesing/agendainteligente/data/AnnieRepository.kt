package com.anadesing.agendainteligente.data

import okhttp3.ResponseBody

class AnnieRepository(private val api: AnnieApi) {
    suspend fun chat(mensaje: String, historial: List<HistorialItem>): AnnieChatResponse =
        api.chat(AnnieChatRequest(mensaje, historial))

    suspend fun tts(texto: String): ResponseBody = api.tts(AnnieTtsRequest(texto))

    suspend fun actividadPendiente(): List<String> = api.actividadPendiente().actividad
}
