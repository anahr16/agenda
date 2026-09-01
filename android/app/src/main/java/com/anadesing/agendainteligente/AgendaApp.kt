package com.anadesing.agendainteligente

import android.app.Application
import com.anadesing.agendainteligente.data.AgendaApi
import com.anadesing.agendainteligente.data.AgendaLocalStore
import com.anadesing.agendainteligente.data.AgendaRepository
import com.anadesing.agendainteligente.data.AnnieApi
import com.anadesing.agendainteligente.data.AnnieRepository
import com.anadesing.agendainteligente.data.AuthApi
import com.anadesing.agendainteligente.data.AuthRepository
import com.anadesing.agendainteligente.data.NetworkModule
import com.anadesing.agendainteligente.data.PostulacionesApi
import com.anadesing.agendainteligente.data.PostulacionesRepository
import com.anadesing.agendainteligente.data.TokenStore

// Sin Hilt/Koin: el proyecto es chico, alcanza con armar las dependencias
// una sola vez aca y pasarlas a mano a los ViewModel factories.
class AgendaApp : Application() {
    lateinit var authRepository: AuthRepository
        private set
    lateinit var agendaRepository: AgendaRepository
        private set
    lateinit var postulacionesRepository: PostulacionesRepository
        private set
    lateinit var annieRepository: AnnieRepository
        private set
    lateinit var agendaLocalStore: AgendaLocalStore
        private set

    override fun onCreate() {
        super.onCreate()
        val tokenStore = TokenStore(this)
        val retrofit = NetworkModule.crearRetrofit(tokenStore)
        authRepository = AuthRepository(retrofit.create(AuthApi::class.java), tokenStore)
        agendaRepository = AgendaRepository(retrofit.create(AgendaApi::class.java))
        postulacionesRepository = PostulacionesRepository(retrofit.create(PostulacionesApi::class.java))
        annieRepository = AnnieRepository(retrofit.create(AnnieApi::class.java))
        agendaLocalStore = AgendaLocalStore(this)
    }
}
