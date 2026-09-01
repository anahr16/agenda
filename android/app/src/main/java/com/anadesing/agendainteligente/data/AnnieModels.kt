package com.anadesing.agendainteligente.data

import com.google.gson.JsonElement

/** El backend devuelve/espera el historial de Claude tal cual (role + content, donde content
 *  puede ser un string simple o bloques de tool_use/tool_result) -- igual que `unknown` en
 *  AnnieMensaje de annie.service.ts, Android tampoco necesita interpretarlo, solo reenviarlo. */
data class HistorialItem(val role: String, val content: JsonElement)

data class AnnieChatRequest(val mensaje: String, val historial: List<HistorialItem>)

data class AnnieChatResponse(
    val respuesta: String,
    val historial: List<HistorialItem>,
    val acciones: List<JsonElement>,
)

data class AnnieTtsRequest(val texto: String)

/** "Mientras no estuviste" del saludo -- ver actividad_postulaciones en el backend. */
data class ActividadPendienteResponse(val actividad: List<String>)
