package com.anadesing.agendainteligente.data

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.anadesing.agendainteligente.MainActivity
import com.anadesing.agendainteligente.R
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

private const val CANAL_ID = "agenda_push"

/** Recibe los push que ya manda el backend (recordatoriosEntrevistas.js,
 *  emailSync.js) -- mismo proyecto Firebase que la web (push.service.ts),
 *  turnero-ec3cd, mismo google-services.json que registra esta app. */
class AgendaFirebaseMessagingService : FirebaseMessagingService() {
    override fun onMessageReceived(mensaje: RemoteMessage) {
        val notificacion = mensaje.notification ?: return
        mostrarNotificacion(notificacion.title ?: getString(R.string.app_name), notificacion.body ?: "")
    }

    private fun mostrarNotificacion(titulo: String, cuerpo: String) {
        crearCanalSiHaceFalta()
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val notificacion = NotificationCompat.Builder(this, CANAL_ID)
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .setContentTitle(titulo)
            .setContentText(cuerpo)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()
        ContextCompat.getSystemService(this, NotificationManager::class.java)
            ?.notify(System.currentTimeMillis().toInt(), notificacion)
    }

    private fun crearCanalSiHaceFalta() {
        val manager = ContextCompat.getSystemService(this, NotificationManager::class.java) ?: return
        if (manager.getNotificationChannel(CANAL_ID) != null) return
        manager.createNotificationChannel(
            NotificationChannel(CANAL_ID, "Agenda Inteligente", NotificationManager.IMPORTANCE_HIGH),
        )
    }
}
