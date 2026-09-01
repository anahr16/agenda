package com.anadesing.agendainteligente.data

import com.google.firebase.messaging.FirebaseMessaging
import kotlin.coroutines.resume
import kotlinx.coroutines.suspendCancellableCoroutine

/** Envuelve la API con Task de FirebaseMessaging en una funcion suspend, sin
 *  agregar la dependencia de kotlinx-coroutines-play-services solo por esto. */
suspend fun obtenerTokenFcm(): String? = suspendCancellableCoroutine { continuacion ->
    FirebaseMessaging.getInstance().token.addOnCompleteListener { tarea ->
        continuacion.resume(if (tarea.isSuccessful) tarea.result else null)
    }
}
