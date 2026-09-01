package com.anadesing.agendainteligente.ui.agenda

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.anadesing.agendainteligente.data.EventoDto
import com.anadesing.agendainteligente.ui.common.AvatarPerfil
import com.anadesing.agendainteligente.ui.common.LETTERING
import com.anadesing.agendainteligente.ui.common.TarjetaConStickers
import com.anadesing.agendainteligente.ui.common.stickerFlor
import com.anadesing.agendainteligente.ui.theme.ColoresAgenda
import com.anadesing.agendainteligente.ui.theme.FuenteDisplay
import com.anadesing.agendainteligente.ui.theme.coloresAgenda

private val DIAS = listOf("Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom")
private val MESES = listOf(
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
)

private fun colorTipoEvento(tipo: String?, oscuro: Boolean): Color {
    val c = coloresAgenda(oscuro)
    return when (tipo) {
        "medica" -> c.medica
        "profesional" -> c.profesional
        "social" -> c.social
        else -> c.personal
    }
}

@Composable
fun AgendaScreen(viewModel: AgendaViewModel, onCerrarSesion: () -> Unit) {
    LaunchedEffect(Unit) { viewModel.cargar() }
    val oscuro = androidx.compose.foundation.isSystemInDarkTheme()
    val colores = coloresAgenda(oscuro)
    var mostrarDialogoDia by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                AvatarPerfil(
                    ruta = viewModel.fotoPerfilUrl,
                    inicial = (viewModel.nombreUsuaria ?: "A").take(1).uppercase(),
                    tamano = 36.dp,
                )
                Text("Agenda", fontSize = 24.sp, fontFamily = FuenteDisplay, color = MaterialTheme.colorScheme.onBackground)
            }
            TextButton(onClick = onCerrarSesion) { Text("Cerrar sesión") }
        }

        Spacer(Modifier.height(20.dp))

        TarjetaConStickers(stickerTl = stickerFlor(0), stickerBr = stickerFlor(2), modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    IconButton(onClick = { viewModel.cambiarMes(-1) }) {
                        Text("‹", fontSize = 22.sp, color = MaterialTheme.colorScheme.primary)
                    }
                    PildoraMes("${MESES[viewModel.mesVisible.monthValue - 1]} ${viewModel.mesVisible.year}")
                    IconButton(onClick = { viewModel.cambiarMes(1) }) {
                        Text("›", fontSize = 22.sp, color = MaterialTheme.colorScheme.primary)
                    }
                }

                Spacer(Modifier.height(12.dp))

                when {
                    viewModel.cargando -> Box(Modifier.fillMaxWidth().height(160.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator()
                    }
                    viewModel.error != null -> Column(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Text(viewModel.error ?: "", color = MaterialTheme.colorScheme.error)
                        Spacer(Modifier.height(10.dp))
                        Button(onClick = { viewModel.cargar() }) { Text("Reintentar") }
                    }
                    else -> {
                        Row(modifier = Modifier.fillMaxWidth()) {
                            DIAS.forEach { dia ->
                                Text(
                                    text = dia,
                                    modifier = Modifier.weight(1f),
                                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                        Spacer(Modifier.height(4.dp))
                        viewModel.celdas.chunked(7).forEach { semana ->
                            Row(modifier = Modifier.fillMaxWidth()) {
                                semana.forEach { celda ->
                                    DiaCelda(
                                        celda = celda,
                                        seleccionada = celda.fecha == viewModel.fechaSeleccionada,
                                        colores = colores,
                                        oscuro = oscuro,
                                        onClick = {
                                            viewModel.seleccionarDia(celda.fecha)
                                            mostrarDialogoDia = true
                                        },
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        if (!viewModel.cargando && viewModel.error == null) {
            Spacer(Modifier.height(20.dp))
            PanelNota(viewModel)

            Spacer(Modifier.height(20.dp))
            PanelObjetivos(viewModel)

            Spacer(Modifier.height(20.dp))
            PanelAfirmacion(viewModel)
        }
    }

    if (mostrarDialogoDia) {
        DialogoDia(viewModel = viewModel, oscuro = oscuro, onCerrar = { mostrarDialogoDia = false })
    }
}

/** Mismo look que `.calendar-month` en agenda.css: pildora con degrade en vez de texto plano. */
@Composable
private fun PildoraMes(texto: String) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(999.dp))
            .background(Brush.linearGradient(listOf(MaterialTheme.colorScheme.primary, MaterialTheme.colorScheme.secondary)))
            .padding(horizontal = 16.dp, vertical = 6.dp),
    ) {
        Text(texto, color = Color.White, fontSize = 14.sp, fontFamily = FuenteDisplay)
    }
}

/** Mismo look que `.day-cell` en agenda.css: fondo lavanda suave + borde morado
 *  finito siempre, "hoy" resalta solo el numero con una burbuja en degrade
 *  (no toda la celda) y "seleccionado" pasa a blanco con borde morado mas marcado. */
@Composable
private fun RowScope.DiaCelda(celda: CeldaMes, seleccionada: Boolean, colores: ColoresAgenda, oscuro: Boolean, onClick: () -> Unit) {
    val forma = RoundedCornerShape(8.dp)
    Box(
        modifier = Modifier
            .weight(1f)
            .aspectRatio(1f)
            .padding(2.dp)
            .alpha(if (celda.otroMes) 0.4f else 1f)
            .clip(forma)
            .background(if (seleccionada) MaterialTheme.colorScheme.surface else MaterialTheme.colorScheme.primary.copy(alpha = 0.07f))
            .border(
                width = if (seleccionada) 1.5.dp else 1.dp,
                color = MaterialTheme.colorScheme.primary.copy(alpha = if (seleccionada) 0.55f else 0.16f),
                shape = forma,
            )
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            if (celda.hoy) {
                Box(
                    modifier = Modifier
                        .size(20.dp)
                        .clip(CircleShape)
                        .background(Brush.linearGradient(listOf(MaterialTheme.colorScheme.primary, MaterialTheme.colorScheme.secondary))),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(celda.fecha.dayOfMonth.toString(), fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.White)
                }
            } else {
                Text(text = celda.fecha.dayOfMonth.toString(), fontSize = 13.sp, color = MaterialTheme.colorScheme.onBackground)
            }
            Row(horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                if (celda.entrevistas.isNotEmpty()) {
                    Puntito(colores.entrevista)
                }
                celda.eventos.map { it.tipo }.distinct().take(3).forEach { tipo ->
                    Puntito(colorTipoEvento(tipo, oscuro))
                }
            }
        }
    }
}

@Composable
private fun Puntito(color: Color) {
    Box(
        modifier = Modifier
            .size(5.dp)
            .clip(CircleShape)
            .background(color)
    )
}

/** Item a mostrar en el pop up del día -- entrevista o evento, ya resueltos a
 *  color/hora/titulo para no repetir esa lógica en el armado de la lista. */
private data class ItemDia(
    val claveOrden: String,
    val hora: String,
    val color: Color,
    val titulo: String,
    val onBorrar: (() -> Unit)?,
)

/** Pop up con los eventos/entrevistas del día tocado en el calendario, a modo de
 *  timeline (ordenados por hora, "todo el día" primero) -- pedido explícito:
 *  reemplaza el panel plano de antes, que además tenía un simple "×" para
 *  borrar un evento y nada más. Decorado con los mismos stickers de flores que
 *  el resto de Agenda. */
@Composable
private fun DialogoDia(viewModel: AgendaViewModel, oscuro: Boolean, onCerrar: () -> Unit) {
    val celda = viewModel.celdaSeleccionada()
    val fecha = viewModel.fechaSeleccionada
    val colores = coloresAgenda(oscuro)

    val items = buildList {
        celda?.entrevistas.orEmpty().forEach { entrevista ->
            add(
                ItemDia(
                    claveOrden = entrevista.hora,
                    hora = entrevista.hora,
                    color = colores.entrevista,
                    titulo = "${entrevista.postulacion.empresa} — ${entrevista.postulacion.puesto}",
                    onBorrar = null,
                ),
            )
        }
        celda?.eventos.orEmpty().forEach { evento: EventoDto ->
            add(
                ItemDia(
                    claveOrden = evento.hora ?: "",
                    hora = evento.hora ?: "Todo el día",
                    color = colorTipoEvento(evento.tipo, oscuro),
                    titulo = evento.titulo,
                    onBorrar = { viewModel.confirmarBorrarEvento(evento) },
                ),
            )
        }
    }.sortedBy { it.claveOrden }

    Dialog(onDismissRequest = onCerrar, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Box(modifier = Modifier.fillMaxWidth(0.9f).heightIn(max = 560.dp)) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(24.dp))
                    .background(MaterialTheme.colorScheme.surface),
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Brush.linearGradient(listOf(MaterialTheme.colorScheme.primary, MaterialTheme.colorScheme.secondary)))
                        .padding(20.dp),
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column {
                            Text(
                                "${DIAS[fecha.dayOfWeek.value - 1]} ${fecha.dayOfMonth}",
                                color = Color.White,
                                fontSize = 20.sp,
                                fontFamily = FuenteDisplay,
                            )
                            Text(
                                "de ${MESES[fecha.monthValue - 1]}",
                                color = Color.White.copy(alpha = 0.85f),
                                fontSize = 13.sp,
                            )
                        }
                        IconButton(onClick = onCerrar) {
                            Text("✕", color = Color.White, fontSize = 16.sp)
                        }
                    }
                }

                if (items.isEmpty()) {
                    Text(
                        "Nada agendado este día.",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 14.sp,
                        modifier = Modifier.fillMaxWidth().padding(32.dp),
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                    )
                } else {
                    Column(
                        modifier = Modifier
                            .verticalScroll(rememberScrollState())
                            .padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        items.forEach { item ->
                            FilaTimeline(color = item.color, hora = item.hora, titulo = item.titulo, onBorrar = item.onBorrar)
                        }
                    }
                }
            }

            Image(
                painter = painterResource(stickerFlor(1)),
                contentDescription = null,
                modifier = Modifier.align(Alignment.TopStart).offset(x = (-14).dp, y = (-14).dp).size(44.dp).rotate(-14f),
            )
            Image(
                painter = painterResource(stickerFlor(3)),
                contentDescription = null,
                modifier = Modifier.align(Alignment.BottomEnd).offset(x = 14.dp, y = 14.dp).size(44.dp).rotate(11f),
            )
        }
    }

    viewModel.confirmacion?.let { confirmacion ->
        AlertDialog(
            onDismissRequest = viewModel::cancelarConfirmacion,
            confirmButton = { TextButton(onClick = viewModel::confirmar) { Text("Confirmar") } },
            dismissButton = { TextButton(onClick = viewModel::cancelarConfirmacion) { Text("Cancelar") } },
            text = { Text(confirmacion.mensaje) },
        )
    }
}

/** Fila tipo "timeline": hora destacada + punto de color + titulo, con un botón
 *  de borrar circular (no un "×" pelado) cuando es un evento personal. Las
 *  entrevistas no lo tienen -- son parte de una postulación, se editan/borran
 *  desde la pestaña Postulaciones. */
@Composable
private fun FilaTimeline(color: Color, hora: String, titulo: String, onBorrar: (() -> Unit)?) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(color.copy(alpha = 0.10f))
            .padding(horizontal = 12.dp, vertical = 10.dp),
    ) {
        Text(
            hora,
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            color = color,
            modifier = Modifier.width(58.dp),
        )
        Box(modifier = Modifier.size(8.dp).clip(CircleShape).background(color))
        Spacer(Modifier.width(8.dp))
        Text(titulo, fontSize = 14.sp, color = MaterialTheme.colorScheme.onBackground, modifier = Modifier.weight(1f))
        if (onBorrar != null) {
            IconButton(
                onClick = onBorrar,
                modifier = Modifier.size(30.dp).clip(CircleShape).background(MaterialTheme.colorScheme.error.copy(alpha = 0.14f)),
            ) {
                Text("🗑", fontSize = 13.sp)
            }
        }
    }
}

/** Notas sueltas del dia seleccionado -- solo local (AgendaLocalStore). Pedido
 *  explicito: varias notas separadas (una por Enter), no un solo cuadro de
 *  texto libre como NOTA_PREFIJO en agenda.ts. */
@Composable
private fun PanelNota(viewModel: AgendaViewModel) {
    TarjetaConStickers(stickerTl = stickerFlor(4), stickerBr = stickerFlor(6), modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Notas", fontSize = 16.sp, fontFamily = FuenteDisplay, color = MaterialTheme.colorScheme.onSurface)
            ListaConAgregar(
                items = viewModel.notas,
                valorNuevo = viewModel.nuevaNota,
                onValorNuevoChange = viewModel::onNuevaNotaChange,
                onAgregar = viewModel::agregarNota,
                onEliminar = viewModel::eliminarNota,
                placeholder = "Escribe lo que necesites recordar de este día…",
            )
        }
    }
}

/** Objetivos del mes visible -- solo local (AgendaLocalStore), igual que OBJETIVOS_PREFIJO en agenda.ts. */
@Composable
private fun PanelObjetivos(viewModel: AgendaViewModel) {
    val focusManager = LocalFocusManager.current
    val teclado = LocalSoftwareKeyboardController.current
    TarjetaConStickers(stickerTl = stickerFlor(2), stickerBr = stickerFlor(4), modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Objetivos del mes", fontSize = 16.sp, fontFamily = FuenteDisplay, color = MaterialTheme.colorScheme.onSurface)
            viewModel.objetivos.forEachIndexed { indice, texto ->
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("${indice + 1}", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    OutlinedTextField(
                        value = texto,
                        onValueChange = { viewModel.onObjetivoChange(indice, it) },
                        placeholder = { Text("Escribe una meta…") },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                        keyboardActions = KeyboardActions(onDone = {
                            focusManager.clearFocus()
                            teclado?.hide()
                        }),
                        modifier = Modifier.weight(1f),
                    )
                }
            }
        }
    }
}

/** Afirmaciones sueltas del mes visible -- solo local (AgendaLocalStore). Pedido
 *  explicito: varias afirmaciones separadas (una por Enter), no un solo cuadro
 *  de texto libre como AFIRMACION_PREFIJO en agenda.ts. */
@Composable
private fun PanelAfirmacion(viewModel: AgendaViewModel) {
    val lettering = remember { LETTERING.random() }
    TarjetaConStickers(stickerTl = stickerFlor(3), stickerBr = stickerFlor(5), modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Afirmaciones", fontSize = 16.sp, fontFamily = FuenteDisplay, color = MaterialTheme.colorScheme.onSurface)
            Image(
                painter = painterResource(lettering),
                contentDescription = null,
                modifier = Modifier.height(56.dp),
            )
            ListaConAgregar(
                items = viewModel.afirmaciones,
                valorNuevo = viewModel.nuevaAfirmacion,
                onValorNuevoChange = viewModel::onNuevaAfirmacionChange,
                onAgregar = viewModel::agregarAfirmacion,
                onEliminar = viewModel::eliminarAfirmacion,
                placeholder = "Escribe tu afirmación…",
            )
        }
    }
}

/** Lista de textos sueltos + campo para agregar uno nuevo (Enter o el botón) y
 *  poder borrar cualquiera -- misma pieza para Notas y Afirmaciones. */
@Composable
private fun ListaConAgregar(
    items: List<String>,
    valorNuevo: String,
    onValorNuevoChange: (String) -> Unit,
    onAgregar: () -> Unit,
    onEliminar: (Int) -> Unit,
    placeholder: String,
) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        items.forEachIndexed { indice, texto ->
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                Text(texto, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.weight(1f))
                IconButton(onClick = { onEliminar(indice) }, modifier = Modifier.size(28.dp)) {
                    Text("×", fontSize = 16.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            OutlinedTextField(
                value = valorNuevo,
                onValueChange = onValorNuevoChange,
                placeholder = { Text(placeholder) },
                singleLine = true,
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                keyboardActions = KeyboardActions(onDone = { onAgregar() }),
                modifier = Modifier.weight(1f),
            )
            IconButton(onClick = onAgregar, enabled = valorNuevo.isNotBlank()) {
                Text("➤", fontSize = 16.sp, color = MaterialTheme.colorScheme.primary)
            }
        }
    }
}
