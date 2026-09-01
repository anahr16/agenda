package com.anadesing.agendainteligente.data

import com.google.gson.Gson
import retrofit2.HttpException

/** Extrae el { error: "..." } que manda el backend en 4xx/5xx (ver backend/routes/auth.js), como err.error?.error en la web. */
fun HttpException.mensajeError(): String? {
    val cuerpo = response()?.errorBody()?.string() ?: return null
    return try {
        Gson().fromJson(cuerpo, ErrorResponse::class.java)?.error
    } catch (e: Exception) {
        null
    }
}
