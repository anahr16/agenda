package com.anadesing.agendainteligente.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.core.view.WindowCompat
import com.anadesing.agendainteligente.R

/** Misma fuente que la clase `.display` en frontend/src/styles.css -- se usa para
 *  titulos de pantalla/panel, nunca para texto de cuerpo (ver ese archivo). */
val FuenteDisplay = FontFamily(Font(R.font.aclonica))

// Mismos tonos que --accent-purple/--accent-pink/--gold/--coral-deep en
// frontend/src/styles.css (los hex ahi son directos; el resto son
// oklch(...) convertidos a sRGB). Ver COLOR_TIPO_EVENTO en agenda.ts para
// el uso de cada uno.
private data class Paleta(
    val ink: Color,
    val inkSoft: Color,
    val bg: Color,
    val surface: Color,
    val border: Color,
    val accentPurple: Color,
    val accentPurpleDeep: Color,
    val accentPink: Color,
    val accentPinkDeep: Color,
    val goldDeep: Color,
    val coralDeep: Color,
)

private val PALETA_CLARA = Paleta(
    ink = Color(0xFF251825),
    inkSoft = Color(0xFF625263),
    bg = Color(0xFFFBF3FB),
    surface = Color(0xFFFFFBFF),
    border = Color(0xFFE6D9E6),
    accentPurple = Color(0xFF8B4FD6),
    accentPurpleDeep = Color(0xFF6B32B0),
    accentPink = Color(0xFFEF8FB0),
    accentPinkDeep = Color(0xFFD9668F),
    goldDeep = Color(0xFFB17000),
    coralDeep = Color(0xFFB64340),
)

private val PALETA_OSCURA = Paleta(
    ink = Color(0xFFF3ECF3),
    inkSoft = Color(0xFFBEB3BF),
    bg = Color(0xFF140914),
    surface = Color(0xFF201221),
    border = Color(0xFF3F2B40),
    accentPurple = Color(0xFFA875E8),
    accentPurpleDeep = Color(0xFF8B4FD6),
    accentPink = Color(0xFFF5A8C4),
    accentPinkDeep = Color(0xFFEF8FB0),
    goldDeep = Color(0xFFCA8A10),
    coralDeep = Color(0xFFE3645E),
)

/** Colores de marca que no tienen un slot en ColorScheme (puntos de tipo de evento, "gold" de entrevista) -- equivalente a leer las variables CSS directo, como hace colorTipo()/COLOR_TIPO_EVENTO en agenda.ts. */
data class ColoresAgenda(
    val personal: Color,
    val medica: Color,
    val profesional: Color,
    val social: Color,
    val entrevista: Color,
)

fun coloresAgenda(oscuro: Boolean): ColoresAgenda {
    val p = if (oscuro) PALETA_OSCURA else PALETA_CLARA
    return ColoresAgenda(
        personal = p.accentPurple,
        medica = p.coralDeep,
        profesional = p.accentPurpleDeep,
        social = p.accentPinkDeep,
        entrevista = p.goldDeep,
    )
}

private fun esquemaClaro() = lightColorScheme(
    primary = PALETA_CLARA.accentPurple,
    onPrimary = Color.White,
    secondary = PALETA_CLARA.accentPinkDeep,
    background = PALETA_CLARA.bg,
    surface = PALETA_CLARA.surface,
    onBackground = PALETA_CLARA.ink,
    onSurface = PALETA_CLARA.ink,
    onSurfaceVariant = PALETA_CLARA.inkSoft,
    outline = PALETA_CLARA.border,
    error = PALETA_CLARA.coralDeep,
)

private fun esquemaOscuro() = darkColorScheme(
    primary = PALETA_OSCURA.accentPurple,
    onPrimary = Color.White,
    secondary = PALETA_OSCURA.accentPinkDeep,
    background = PALETA_OSCURA.bg,
    surface = PALETA_OSCURA.surface,
    onBackground = PALETA_OSCURA.ink,
    onSurface = PALETA_OSCURA.ink,
    onSurfaceVariant = PALETA_OSCURA.inkSoft,
    outline = PALETA_OSCURA.border,
    error = PALETA_OSCURA.coralDeep,
)

@Suppress("DEPRECATION") // statusBarColor: alcanza para este checkpoint, migrar a edge-to-edge (WindowInsets) mas adelante.
@Composable
fun AgendaInteligenteTheme(oscuro: Boolean = isSystemInDarkTheme(), content: @Composable () -> Unit) {
    val colorScheme = if (oscuro) esquemaOscuro() else esquemaClaro()
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.background.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !oscuro
        }
    }
    MaterialTheme(colorScheme = colorScheme, content = content)
}
