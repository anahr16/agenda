package com.anadesing.agendainteligente.data

import android.content.Context
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import org.json.JSONArray
import java.time.LocalDate
import java.time.YearMonth

private val Context.agendaLocalDataStore by preferencesDataStore(name = "agenda_local")

const val CANTIDAD_OBJETIVOS = 5

/** Notas del dia, objetivos del mes y afirmaciones del mes -- en la web viven solo en
 *  localStorage (NOTA_PREFIJO/OBJETIVOS_PREFIJO/AFIRMACION_PREFIJO en agenda.ts), nunca
 *  llegan al backend, asi que aca tambien quedan solo en el dispositivo.
 *
 *  Notas y afirmaciones son listas (pedido explicito: poder cargar varias
 *  sueltas, no un solo cuadro de texto libre como en la web) -- objetivos
 *  sigue siendo de a una por indice, ya tiene 5 lineas separadas de por si. */
class AgendaLocalStore(private val context: Context) {
    private fun claveNotas(fecha: LocalDate) = stringPreferencesKey("notas_$fecha")
    private fun claveObjetivos(mes: YearMonth) = stringPreferencesKey("objetivos_$mes")
    private fun claveAfirmaciones(mes: YearMonth) = stringPreferencesKey("afirmaciones_$mes")

    private suspend fun leerLista(clave: Preferences.Key<String>): List<String> {
        val guardado = context.agendaLocalDataStore.data.map { it[clave] }.first() ?: return emptyList()
        val array = JSONArray(guardado)
        return List(array.length()) { i -> array.getString(i) }
    }

    private suspend fun guardarLista(clave: Preferences.Key<String>, lista: List<String>) {
        context.agendaLocalDataStore.edit { it[clave] = JSONArray(lista).toString() }
    }

    suspend fun leerNotas(fecha: LocalDate): List<String> = leerLista(claveNotas(fecha))

    suspend fun agregarNota(fecha: LocalDate, texto: String) {
        guardarLista(claveNotas(fecha), leerNotas(fecha) + texto)
    }

    suspend fun eliminarNota(fecha: LocalDate, indice: Int) {
        guardarLista(claveNotas(fecha), leerNotas(fecha).toMutableList().apply { removeAt(indice) })
    }

    suspend fun leerObjetivos(mes: YearMonth): List<String> {
        val guardado = context.agendaLocalDataStore.data.map { it[claveObjetivos(mes)] }.first()
            ?: return List(CANTIDAD_OBJETIVOS) { "" }
        val array = JSONArray(guardado)
        return List(array.length()) { i -> array.getString(i) }
    }

    suspend fun guardarObjetivo(mes: YearMonth, indice: Int, texto: String) {
        val actuales = leerObjetivos(mes).toMutableList()
        actuales[indice] = texto
        context.agendaLocalDataStore.edit { it[claveObjetivos(mes)] = JSONArray(actuales).toString() }
    }

    suspend fun leerAfirmaciones(mes: YearMonth): List<String> = leerLista(claveAfirmaciones(mes))

    suspend fun agregarAfirmacion(mes: YearMonth, texto: String) {
        guardarLista(claveAfirmaciones(mes), leerAfirmaciones(mes) + texto)
    }

    suspend fun eliminarAfirmacion(mes: YearMonth, indice: Int) {
        guardarLista(claveAfirmaciones(mes), leerAfirmaciones(mes).toMutableList().apply { removeAt(indice) })
    }
}
