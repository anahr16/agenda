package com.anadesing.agendainteligente.ui.common

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp

/** Misma tarjeta que `.card` en frontend/src/styles.css: esquinas de 20px y una
 *  sombra tenida de morado en vez de la elevacion gris generica de Material. */
@Composable
fun TarjetaAnadesing(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    val forma = RoundedCornerShape(20.dp)
    Card(
        modifier = modifier.shadow(
            elevation = 14.dp,
            shape = forma,
            ambientColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.25f),
            spotColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.35f),
        ),
        shape = forma,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        content = content,
    )
}

/** Misma tarjeta de arriba con los stickers de flores en las esquinas que usa
 *  `.planner-box`/`.box-sticker` en agenda.css (Notas/Objetivos/Afirmación). */
@Composable
fun TarjetaConStickers(
    stickerTl: Int,
    stickerBr: Int,
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit,
) {
    Box(modifier = modifier) {
        TarjetaAnadesing(modifier = Modifier.fillMaxWidth(), content = content)
        Image(
            painter = painterResource(stickerTl),
            contentDescription = null,
            modifier = Modifier
                .align(Alignment.TopStart)
                .offset(x = (-14).dp, y = (-14).dp)
                .size(44.dp)
                .rotate(-14f),
        )
        Image(
            painter = painterResource(stickerBr),
            contentDescription = null,
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .offset(x = 14.dp, y = 14.dp)
                .size(44.dp)
                .rotate(11f),
        )
    }
}
