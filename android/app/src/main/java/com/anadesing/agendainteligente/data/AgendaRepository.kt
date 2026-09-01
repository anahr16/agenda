package com.anadesing.agendainteligente.data

class AgendaRepository(private val api: AgendaApi) {
    suspend fun listarPostulaciones(): List<PostulacionDto> = api.listarPostulaciones()

    suspend fun listarEventos(): List<EventoDto> = api.listarEventos()

    suspend fun borrarEvento(id: Int) = api.borrarEvento(id)
}
