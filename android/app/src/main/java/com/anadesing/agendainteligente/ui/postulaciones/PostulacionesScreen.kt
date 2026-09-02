@file:OptIn(ExperimentalMaterial3Api::class)

package com.anadesing.agendainteligente.ui.postulaciones

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TimePicker
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.material3.rememberTimePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.anadesing.agendainteligente.data.ESTADOS_POSTULACION
import com.anadesing.agendainteligente.data.MailRevision
import com.anadesing.agendainteligente.data.Postulacion
import com.anadesing.agendainteligente.data.PostulacionesStats
import com.anadesing.agendainteligente.data.etiquetaEstado
import com.anadesing.agendainteligente.ui.common.BotonDegradado
import com.anadesing.agendainteligente.ui.common.TarjetaAnadesing
import com.anadesing.agendainteligente.ui.theme.FuenteDisplay
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.ZoneId

private val MESES_ABREV = listOf("ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic")

private fun formatoFecha(fecha: String): String {
    val d = runCatching { LocalDate.parse(fecha) }.getOrNull() ?: return fecha
    return "${d.dayOfMonth.toString().padStart(2, '0')} ${MESES_ABREV[d.monthValue - 1]}"
}

private fun formatoEntrevista(iso: String?): String {
    if (iso == null) return "-"
    val instant = runCatching { Instant.parse(if (iso.endsWith("Z")) iso else "${iso}Z") }.getOrNull() ?: return "-"
    val ldt = instant.atZone(ZoneId.systemDefault())
    return "${ldt.dayOfMonth.toString().padStart(2, '0')}/${ldt.monthValue.toString().padStart(2, '0')} " +
        "${ldt.hour.toString().padStart(2, '0')}:${ldt.minute.toString().padStart(2, '0')}"
}

private fun colorEstado(estado: String): Color = when (estado) {
    "enviada" -> Color(0xFF2A78D6)
    "vista" -> Color(0xFF4A3AA7)
    "entrevista" -> Color(0xFFEDA100)
    "rechazada" -> Color(0xFFD03B3B)
    "oferta" -> Color(0xFF1BAF7A)
    else -> Color(0xFF8B4FD6)
}

@Composable
fun PostulacionesScreen(viewModel: PostulacionesViewModel) {
    LaunchedEffect(Unit) { viewModel.cargar() }
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Column {
            Text("Postulaciones", fontSize = 22.sp, fontFamily = FuenteDisplay, color = MaterialTheme.colorScheme.onBackground)
            Text(
                "Seguimiento de tu búsqueda laboral",
                fontSize = 13.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }

        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.horizontalScroll(rememberScrollState()),
        ) {
            OutlinedButton(
                onClick = viewModel::recalcularCompatibilidad,
                enabled = !viewModel.recalculando,
                shape = RoundedCornerShape(999.dp),
            ) {
                Text(if (viewModel.recalculando) "Recalculando…" else "Recalcular compatibilidad")
            }
            OutlinedButton(
                onClick = viewModel::sincronizarComputrabajo,
                enabled = !viewModel.sincronizandoComputrabajo,
                shape = RoundedCornerShape(999.dp),
            ) {
                Text(if (viewModel.sincronizandoComputrabajo) "Sincronizando…" else "Traer links de Computrabajo")
            }
            if (!viewModel.mostrarFormulario) {
                BotonDegradado(texto = "Nueva postulación", onClick = viewModel::abrirNueva)
            }
        }

        viewModel.mensajeRecalculo?.let {
            Text(it, fontSize = 12.sp, color = MaterialTheme.colorScheme.primary)
        }

        viewModel.mensajeSincronizacionComputrabajo?.let {
            Text(it, fontSize = 12.sp, color = MaterialTheme.colorScheme.primary)
        }

        if (viewModel.mostrarFormulario && viewModel.editandoId == null) {
            FormularioPostulacion(viewModel)
        }

        if (viewModel.mailsRevision.isNotEmpty()) {
            TarjetaRevision(viewModel)
        }

        viewModel.stats?.let { TarjetaStats(it) }

        OutlinedTextField(
            value = viewModel.busqueda,
            onValueChange = viewModel::onBusquedaChange,
            placeholder = { Text("Buscar por empresa o puesto…") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )

        FiltrosRow(viewModel)

        when {
            viewModel.cargando -> Box(Modifier.fillMaxWidth().height(160.dp), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
            viewModel.error != null -> Column(
                modifier = Modifier.fillMaxWidth().padding(vertical = 20.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(viewModel.error ?: "", color = MaterialTheme.colorScheme.error)
                Spacer(Modifier.height(8.dp))
                Button(onClick = viewModel::cargar) { Text("Reintentar") }
            }
            viewModel.postulacionesFiltradas.isEmpty() -> Text(
                "Todavía no hay postulaciones cargadas.",
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(vertical = 20.dp),
            )
            else -> Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                viewModel.postulacionesFiltradas.forEach { p -> PostulacionItem(p, viewModel) }
            }
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

@Composable
private fun FormularioPostulacion(viewModel: PostulacionesViewModel) {
    TarjetaAnadesing(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            OutlinedTextField(viewModel.empresa, viewModel::onEmpresaChange, label = { Text("Empresa") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(viewModel.puesto, viewModel::onPuestoChange, label = { Text("Puesto") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(
                viewModel.portal,
                viewModel::onPortalChange,
                label = { Text("Portal") },
                placeholder = { Text("LinkedIn, Computrabajo…") },
                modifier = Modifier.fillMaxWidth(),
            )
            CampoFecha("Fecha de postulación", viewModel.fechaPostulacion, viewModel::onFechaPostulacionChange)
            CampoEstado(viewModel.estado, viewModel::onEstadoChange)
            CampoFechaEntrevista(viewModel.fechaEntrevista, viewModel::onFechaEntrevistaChange)
            OutlinedTextField(viewModel.link, viewModel::onLinkChange, label = { Text("Link (opcional)") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(
                viewModel.descripcion,
                viewModel::onDescripcionChange,
                label = { Text("De qué trata (opcional)") },
                modifier = Modifier.fillMaxWidth(),
            )
            OutlinedTextField(viewModel.notas, viewModel::onNotasChange, label = { Text("Notas (opcional)") }, modifier = Modifier.fillMaxWidth())

            viewModel.errorFormulario?.let { Text(it, color = MaterialTheme.colorScheme.error, fontSize = 12.sp) }

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                BotonDegradado(
                    texto = if (viewModel.editandoId != null) "Guardar cambios" else "Agregar postulación",
                    onClick = viewModel::guardar,
                    enabled = !viewModel.guardando,
                )
                TextButton(onClick = viewModel::cancelarEdicion) { Text("Cancelar") }
            }
        }
    }
}

@Composable
private fun CampoFecha(label: String, fecha: LocalDate, onChange: (LocalDate) -> Unit) {
    var mostrar by remember { mutableStateOf(false) }
    OutlinedButton(onClick = { mostrar = true }, modifier = Modifier.fillMaxWidth()) {
        Text("$label: $fecha")
    }
    if (mostrar) {
        val estadoPicker = rememberDatePickerState(
            initialSelectedDateMillis = fecha.atStartOfDay(ZoneId.of("UTC")).toInstant().toEpochMilli(),
        )
        DatePickerDialog(
            onDismissRequest = { mostrar = false },
            confirmButton = {
                TextButton(onClick = {
                    estadoPicker.selectedDateMillis?.let { onChange(Instant.ofEpochMilli(it).atZone(ZoneId.of("UTC")).toLocalDate()) }
                    mostrar = false
                }) { Text("Aceptar") }
            },
            dismissButton = { TextButton(onClick = { mostrar = false }) { Text("Cancelar") } },
        ) { DatePicker(state = estadoPicker) }
    }
}

@Composable
private fun CampoEstado(estado: String, onChange: (String) -> Unit) {
    var expandido by remember { mutableStateOf(false) }
    ExposedDropdownMenuBox(expanded = expandido, onExpandedChange = { expandido = it }) {
        OutlinedTextField(
            value = etiquetaEstado(estado),
            onValueChange = {},
            readOnly = true,
            label = { Text("Estado") },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expandido) },
            modifier = Modifier.menuAnchor(MenuAnchorType.PrimaryNotEditable).fillMaxWidth(),
        )
        ExposedDropdownMenu(expanded = expandido, onDismissRequest = { expandido = false }) {
            ESTADOS_POSTULACION.forEach { e ->
                DropdownMenuItem(text = { Text(etiquetaEstado(e)) }, onClick = { onChange(e); expandido = false })
            }
        }
    }
}

@Composable
private fun CampoFechaEntrevista(instant: Instant?, onChange: (Instant?) -> Unit) {
    var mostrarFecha by remember { mutableStateOf(false) }
    var mostrarHora by remember { mutableStateOf(false) }
    var fechaElegida by remember { mutableStateOf<LocalDate?>(null) }
    val zonaLocal = ZoneId.systemDefault()

    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        OutlinedButton(onClick = { mostrarFecha = true }, modifier = Modifier.weight(1f)) {
            Text(if (instant != null) "Entrevista: ${formatoEntrevista(instant.toString())}" else "Entrevista (opcional)")
        }
        if (instant != null) {
            TextButton(onClick = { onChange(null) }) { Text("Quitar") }
        }
    }

    if (mostrarFecha) {
        val base = instant?.atZone(zonaLocal)?.toLocalDate() ?: LocalDate.now()
        val estadoPicker = rememberDatePickerState(
            initialSelectedDateMillis = base.atStartOfDay(ZoneId.of("UTC")).toInstant().toEpochMilli(),
        )
        DatePickerDialog(
            onDismissRequest = { mostrarFecha = false },
            confirmButton = {
                TextButton(onClick = {
                    fechaElegida = estadoPicker.selectedDateMillis?.let { Instant.ofEpochMilli(it).atZone(ZoneId.of("UTC")).toLocalDate() } ?: base
                    mostrarFecha = false
                    mostrarHora = true
                }) { Text("Siguiente") }
            },
            dismissButton = { TextButton(onClick = { mostrarFecha = false }) { Text("Cancelar") } },
        ) { DatePicker(state = estadoPicker) }
    }

    if (mostrarHora) {
        val baseHora = instant?.atZone(zonaLocal)
        val estadoHora = rememberTimePickerState(initialHour = baseHora?.hour ?: 9, initialMinute = baseHora?.minute ?: 0, is24Hour = true)
        AlertDialog(
            onDismissRequest = { mostrarHora = false },
            confirmButton = {
                TextButton(onClick = {
                    val fecha = fechaElegida ?: instant?.atZone(zonaLocal)?.toLocalDate() ?: LocalDate.now()
                    val ldt = LocalDateTime.of(fecha, LocalTime.of(estadoHora.hour, estadoHora.minute))
                    onChange(ldt.atZone(zonaLocal).toInstant())
                    mostrarHora = false
                }) { Text("Aceptar") }
            },
            dismissButton = { TextButton(onClick = { mostrarHora = false }) { Text("Cancelar") } },
            text = { TimePicker(state = estadoHora) },
        )
    }
}

@Composable
private fun TarjetaRevision(viewModel: PostulacionesViewModel) {
    TarjetaAnadesing(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(
                "Mails sin identificar (${viewModel.mailsRevision.size})",
                fontWeight = FontWeight.SemiBold,
                fontSize = 16.sp,
                color = MaterialTheme.colorScheme.onSurface,
            )
            Text(
                "No matchean ningún portal conocido pero parecen de un proceso de postulación. Revisalos y cargalos a mano, o descartalos.",
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Row(verticalAlignment = Alignment.CenterVertically) {
                Checkbox(checked = viewModel.todosSeleccionadosRevision, onCheckedChange = { viewModel.toggleSeleccionarTodosRevision() })
                Text("Seleccionar todos", fontSize = 13.sp)
            }
            if (viewModel.seleccionadosRevision.isNotEmpty()) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("${viewModel.seleccionadosRevision.size} seleccionado(s)", fontSize = 12.sp)
                    OutlinedButton(
                        onClick = viewModel::confirmarCargarSeleccionados,
                        enabled = !viewModel.procesandoBulk,
                        shape = RoundedCornerShape(999.dp),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.primary),
                    ) {
                        Text(if (viewModel.procesandoBulk) "Agregando…" else "Agregar todos")
                    }
                    OutlinedButton(
                        onClick = viewModel::confirmarDescartarSeleccionados,
                        enabled = !viewModel.procesandoBulk,
                        shape = RoundedCornerShape(999.dp),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error),
                    ) {
                        Text(if (viewModel.procesandoBulk) "Descartando…" else "Descartar todos")
                    }
                }
            }
            viewModel.mailsRevision.forEach { mail -> ItemRevision(mail, viewModel) }
        }
    }
}

@Composable
private fun ItemRevision(mail: MailRevision, viewModel: PostulacionesViewModel) {
    Column {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Checkbox(checked = viewModel.estaSeleccionado(mail.id), onCheckedChange = { viewModel.toggleSeleccionRevision(mail.id) })
            Column(
                modifier = Modifier.weight(1f).clickable { viewModel.toggleExpandidoRevision(mail.id) },
            ) {
                Text(mail.remitente ?: "Remitente desconocido", fontSize = 13.sp, fontWeight = FontWeight.Medium)
                Text(mail.asunto ?: "(sin asunto)", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        if (viewModel.expandidoRevisionId == mail.id) {
            Column(modifier = Modifier.padding(start = 40.dp, top = 4.dp, bottom = 8.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(mail.cuerpo, fontSize = 12.sp)
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    TextButton(onClick = { viewModel.cargarDesdeRevision(mail) }) { Text("Cargar como postulación") }
                    TextButton(onClick = { viewModel.confirmarDescartarRevision(mail) }) { Text("Descartar") }
                }
            }
        }
    }
}

@Composable
private fun TarjetaStats(stats: PostulacionesStats) {
    TarjetaAnadesing(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Text("${stats.total}", fontSize = 28.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                Text("postulaciones", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            ESTADOS_POSTULACION.forEach { estadoVal ->
                val n = stats.porEstado.find { it.estado == estadoVal }?.n ?: 0
                val pct = if (stats.total > 0) (n * 100 / stats.total) else 0
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(etiquetaEstado(estadoVal), fontSize = 12.sp, modifier = Modifier.width(72.dp))
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .height(8.dp)
                            .clip(RoundedCornerShape(4.dp))
                            .background(MaterialTheme.colorScheme.surfaceVariant),
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxHeight()
                                .fillMaxWidth(pct / 100f)
                                .clip(RoundedCornerShape(4.dp))
                                .background(colorEstado(estadoVal)),
                        )
                    }
                    Text("$n · $pct%", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }
}

@Composable
private fun FiltrosRow(viewModel: PostulacionesViewModel) {
    Row(
        modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        val opciones = listOf("" to "Todas") + ESTADOS_POSTULACION.map { it to etiquetaEstado(it) }
        opciones.forEach { (valor, etiqueta) ->
            val activo = viewModel.filtroEstado == valor
            FilterChip(
                selected = activo,
                onClick = { viewModel.onFiltroEstadoChange(valor) },
                label = { Text(etiqueta) },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = if (valor.isEmpty()) MaterialTheme.colorScheme.primary else colorEstado(valor),
                    selectedLabelColor = Color.White,
                ),
            )
        }
    }
}

@Composable
private fun PostulacionItem(p: Postulacion, viewModel: PostulacionesViewModel) {
    TarjetaAnadesing(modifier = Modifier.fillMaxWidth()) {
        Column {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { viewModel.toggleExpandido(p.id) }
                    .padding(12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Box(
                    modifier = Modifier.size(36.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primary.copy(alpha = 0.15f)),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(p.empresa.take(1).uppercase(), fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                }
                Column(modifier = Modifier.weight(1f)) {
                    Text(p.empresa, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurface)
                    Text(p.puesto, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        p.portal?.let { Text(it, fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                        Text(formatoFecha(p.fecha_postulacion), fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                Column(horizontalAlignment = Alignment.End) {
                    p.compatibilidad_oferta?.let { Text("$it% compatibilidad", fontSize = 9.sp, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                    p.probabilidad_llamada?.let { Text("$it% prob. llamada", fontSize = 9.sp, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                    Spacer(Modifier.height(2.dp))
                    EstadoPill(p.estado)
                }
            }
            if (viewModel.editandoId == p.id) {
                Box(modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)) { FormularioPostulacion(viewModel) }
            } else if (viewModel.expandidoId == p.id) {
                Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(p.descripcion ?: "Sin descripción cargada.", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface)
                    if (p.compatibilidad_oferta != null) {
                        Text(
                            "Compatibilidad con la oferta (${p.compatibilidad_oferta}%): ${p.compatibilidad_razon ?: ""}",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurface,
                        )
                    }
                    if (p.fecha_entrevista != null) {
                        Text("Entrevista: ${formatoEntrevista(p.fecha_entrevista)}", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface)
                    }
                    if (!p.notas.isNullOrBlank()) {
                        Text("Notas: ${p.notas}", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface)
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                        TextButton(onClick = { viewModel.editar(p) }) { Text("Editar") }
                        TextButton(onClick = { viewModel.confirmarBorrar(p) }) { Text("Borrar") }
                    }
                }
            }
        }
    }
}

@Composable
private fun EstadoPill(estado: String) {
    Box(
        modifier = Modifier.clip(RoundedCornerShape(20.dp)).background(colorEstado(estado)).padding(horizontal = 8.dp, vertical = 3.dp),
    ) {
        Text(etiquetaEstado(estado), color = Color.White, fontSize = 10.sp)
    }
}
