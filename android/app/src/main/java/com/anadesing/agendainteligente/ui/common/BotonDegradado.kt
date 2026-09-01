package com.anadesing.agendainteligente.ui.common

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

/** Boton de accion primaria con degrade morado->rosa -- mismo estilo que los
 *  botones/insignias de la web (linear-gradient(135deg, --accent-purple,
 *  --accent-pink-deep), ver agenda.css/postulaciones.css). Pildora completa
 *  (999px) por defecto, que es lo que usan .btn-add/.btn-recalcular/
 *  .btn-bulk-agregar; el login (.btn-primary) pasa 14.dp en su lugar. */
@Composable
fun BotonDegradado(
    texto: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    cargando: Boolean = false,
    shape: Shape = RoundedCornerShape(999.dp),
) {
    Button(
        onClick = onClick,
        enabled = enabled,
        shape = shape,
        colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, disabledContainerColor = Color.Transparent),
        contentPadding = PaddingValues(horizontal = 22.dp, vertical = 12.dp),
        modifier = modifier
            .background(
                brush = Brush.linearGradient(listOf(MaterialTheme.colorScheme.primary, MaterialTheme.colorScheme.secondary)),
                shape = shape,
            )
            .alpha(if (enabled) 1f else 0.5f),
    ) {
        if (cargando) {
            CircularProgressIndicator(modifier = Modifier.height(18.dp).width(18.dp), color = Color.White, strokeWidth = 2.dp)
        } else {
            Text(texto, color = Color.White, fontWeight = FontWeight.Bold)
        }
    }
}
