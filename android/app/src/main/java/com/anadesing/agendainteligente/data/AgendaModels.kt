package com.anadesing.agendainteligente.data

// Solo los campos que usa la vista de mes -- el backend devuelve bastantes
// mas por fila (portal, descripcion, compatibilidad, etc.), Gson ignora
// los que no estan declarados aca.
data class PostulacionDto(
    val id: Int,
    val empresa: String,
    val puesto: String,
    val fecha_entrevista: String?,
)

data class EventoDto(
    val id: Int,
    val titulo: String,
    val fecha: String,
    val hora: String?,
    val notas: String?,
    val tipo: String?,
)
