package com.anadesing.agendainteligente.data

import com.anadesing.agendainteligente.BuildConfig
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

object NetworkModule {
    // Definida por build type en app/build.gradle.kts (buildConfigField) --
    // asi el dia que haya hosting real (ver readme.md) cambiar la URL de
    // release es una sola linea de Gradle, sin tocar Kotlin. Hoy debug y
    // release apuntan a la misma IP LAN de la PC (ipconfig -> Direccion
    // IPv4), para probar desde el Redmi Note 13 Pro real por Wi-Fi. Si se
    // prueba en el emulador de Android Studio, es "http://10.0.2.2:4000/"
    // (alias fijo al localhost de la PC).
    // No privado: ui/configuracion/ConfiguracionScreen.kt lo usa para armar la
    // URL completa de la foto de perfil (el backend devuelve una ruta relativa,
    // "/uploads/perfil/...", igual que fotoPerfil() en configuracion.ts).
    val BASE_URL: String = BuildConfig.API_BASE_URL

    fun crearRetrofit(tokenStore: TokenStore): Retrofit {
        val authInterceptor = Interceptor { chain ->
            val token = runBlocking { tokenStore.token.first() }
            val request = chain.request().let {
                if (token != null) it.newBuilder().addHeader("Authorization", "Bearer $token").build() else it
            }
            chain.proceed(request)
        }
        // BASIC solo en debug -- en release no tiene sentido filtrar metadata
        // de cada request (incluido que hay un header Authorization) al logcat.
        val logging = HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) HttpLoggingInterceptor.Level.BASIC else HttpLoggingInterceptor.Level.NONE
        }
        val client = OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
            .addInterceptor(logging)
            .build()

        return Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }
}
