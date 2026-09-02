package com.anadesing.agendainteligente.data

// Mismos campos que devuelve GET /postulaciones (ver backend/routes/postulaciones.js
// y frontend/src/app/core/postulaciones.service.ts) -- probabilidad_llamada y
// compatibilidad_oferta ya vienen calculados por el backend, no hay logica de IA
// ni heuristica que portar aca.
data class Postulacion(
    val id: Int,
    val empresa: String,
    val puesto: String,
    val portal: String?,
    val descripcion: String?,
    val link: String?,
    val fecha_postulacion: String,
    val estado: String,
    val fecha_entrevista: String?,
    val notas: String?,
    val creado_en: String,
    val probabilidad_llamada: Int?,
    val compatibilidad_oferta: Int?,
    val compatibilidad_razon: String?,
)

/** Cuerpo para crear/editar -- mismos campos opcionales que DatosPostulacion en postulaciones.service.ts. */
data class DatosPostulacion(
    val empresa: String,
    val puesto: String,
    val portal: String?,
    val descripcion: String?,
    val link: String?,
    val fecha_postulacion: String,
    val estado: String?,
    val fecha_entrevista: String?,
    val notas: String?,
)

data class EstadoCount(val estado: String, val n: Int)
data class PortalCount(val portal: String, val n: Int)

data class PostulacionesStats(
    val total: Int,
    val porEstado: List<EstadoCount>,
    val porPortal: List<PortalCount>,
)

data class RecalcularCompatibilidadResponse(val actualizadas: Int)

data class SincronizarComputrabajoResponse(val actualizadas: Int, val sinMatch: Int)

/** Mail que no matcheo ningun portal conocido -- bandeja de revision (postulaciones_emails_revision). */
data class MailRevision(
    val id: Int,
    val remitente: String?,
    val asunto: String?,
    val cuerpo: String,
    val fecha_recibido: String?,
    val creado_en: String,
)

val ESTADOS_POSTULACION = listOf("enviada", "vista", "entrevista", "rechazada", "oferta")

fun etiquetaEstado(estado: String): String = when (estado) {
    "enviada" -> "Enviada"
    "vista" -> "Vista"
    "entrevista" -> "Entrevista"
    "rechazada" -> "Rechazada"
    "oferta" -> "Oferta"
    else -> estado
}
