package com.anadesing.agendainteligente.ui.common

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.anadesing.agendainteligente.data.NetworkModule
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.URL

/** Foto de perfil (o la inicial si no hay una todavia) -- se usa tanto en
 *  Configuracion como en el encabezado de Agenda, por eso vive en ui/common.
 *  Sin Coil (una sola imagen chica, no vale la pena la dependencia): arma la
 *  URL completa a mano (`ruta` es relativa, ver GET /auth/perfil) y decodifica
 *  el bitmap en un hilo de IO. */
@Composable
fun AvatarPerfil(ruta: String?, inicial: String, tamano: Dp = 40.dp) {
    var bitmap by remember(ruta) { mutableStateOf<Bitmap?>(null) }
    LaunchedEffect(ruta) {
        bitmap = if (ruta != null) {
            withContext(Dispatchers.IO) {
                runCatching {
                    URL("${NetworkModule.BASE_URL.trimEnd('/')}$ruta").openStream().use { BitmapFactory.decodeStream(it) }
                }.getOrNull()
            }
        } else {
            null
        }
    }
    Box(
        modifier = Modifier.size(tamano).clip(CircleShape).background(MaterialTheme.colorScheme.primary.copy(alpha = 0.15f)),
        contentAlignment = Alignment.Center,
    ) {
        val bitmapActual = bitmap
        if (bitmapActual != null) {
            Image(
                bitmap = bitmapActual.asImageBitmap(),
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize().clip(CircleShape),
            )
        } else {
            Text(inicial, fontSize = (tamano.value / 3).sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
        }
    }
}
