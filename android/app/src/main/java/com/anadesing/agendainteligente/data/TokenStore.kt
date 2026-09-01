package com.anadesing.agendainteligente.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import org.json.JSONObject
import java.util.Base64

private val Context.dataStore by preferencesDataStore(name = "auth")
private val TOKEN_KEY = stringPreferencesKey("jwt")

data class UsuarioToken(val id: Int, val email: String, val exp: Long)

/** Equivalente Android de localStorage('turnero_token') + decodeToken() en auth.service.ts. */
fun decodeToken(token: String): UsuarioToken? {
    return try {
        val payload = token.split(".")[1]
        var base64 = payload.replace('-', '+').replace('_', '/')
        while (base64.length % 4 != 0) base64 += "="
        val json = JSONObject(String(Base64.getDecoder().decode(base64)))
        UsuarioToken(id = json.getInt("id"), email = json.getString("email"), exp = json.getLong("exp"))
    } catch (e: Exception) {
        null
    }
}

class TokenStore(private val context: Context) {
    val usuario: Flow<UsuarioToken?> = context.dataStore.data.map { prefs ->
        val token = prefs[TOKEN_KEY] ?: return@map null
        val payload = decodeToken(token) ?: return@map null
        if (payload.exp * 1000 < System.currentTimeMillis()) null else payload
    }

    val token: Flow<String?> = context.dataStore.data.map { it[TOKEN_KEY] }

    suspend fun guardar(token: String) {
        context.dataStore.edit { it[TOKEN_KEY] = token }
    }

    suspend fun borrar() {
        context.dataStore.edit { it.remove(TOKEN_KEY) }
    }
}
