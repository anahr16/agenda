package com.anadesing.agendainteligente.data

class PostulacionesRepository(private val api: PostulacionesApi) {
    suspend fun listar(): List<Postulacion> = api.listar()

    suspend fun stats(): PostulacionesStats = api.stats()

    suspend fun crear(datos: DatosPostulacion): Postulacion = api.crear(datos)

    suspend fun editar(id: Int, datos: DatosPostulacion): Postulacion = api.editar(id, datos)

    suspend fun borrar(id: Int) = api.borrar(id)

    suspend fun recalcularCompatibilidad(): RecalcularCompatibilidadResponse = api.recalcularCompatibilidad()

    suspend fun listarMailsRevision(): List<MailRevision> = api.listarMailsRevision()

    suspend fun descartarMailRevision(id: Int) = api.descartarMailRevision(id)
}
