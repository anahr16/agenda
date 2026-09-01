package com.anadesing.agendainteligente.ui.configuracion

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.anadesing.agendainteligente.ui.common.AvatarPerfil
import com.anadesing.agendainteligente.ui.common.BotonDegradado
import com.anadesing.agendainteligente.ui.common.TarjetaAnadesing
import com.anadesing.agendainteligente.ui.theme.FuenteDisplay
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun ConfiguracionScreen(viewModel: ConfiguracionViewModel) {
    LaunchedEffect(Unit) { viewModel.cargar() }
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    val selectorImagen = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult
        scope.launch {
            val bytes = withContext(Dispatchers.IO) {
                runCatching { context.contentResolver.openInputStream(uri)?.use { it.readBytes() } }.getOrNull()
            }
            val mime = context.contentResolver.getType(uri) ?: "image/jpeg"
            if (bytes != null) viewModel.subirFoto(bytes, "foto.${mime.substringAfterLast('/')}", mime)
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp),
    ) {
        Text("Configuración", fontSize = 24.sp, fontFamily = FuenteDisplay, color = MaterialTheme.colorScheme.onBackground)

        if (viewModel.cargando) {
            Box(Modifier.fillMaxWidth().height(160.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
            return
        }

        TarjetaAnadesing(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("Perfil", fontSize = 16.sp, fontFamily = FuenteDisplay, color = MaterialTheme.colorScheme.onSurface)

                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                    AvatarPerfil(
                        ruta = viewModel.perfil?.foto_perfil,
                        inicial = (viewModel.nombre.ifBlank { viewModel.email }).take(1).uppercase(),
                        tamano = 72.dp,
                    )
                    BotonDegradado(
                        texto = if (viewModel.subiendoFoto) "Subiendo…" else "Subir foto",
                        onClick = { selectorImagen.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) },
                        enabled = !viewModel.subiendoFoto,
                    )
                }
                viewModel.mensajeFoto?.let { Text(it, fontSize = 12.sp, color = MaterialTheme.colorScheme.error) }

                OutlinedTextField(
                    value = viewModel.nombre,
                    onValueChange = viewModel::onNombreChange,
                    label = { Text("Nombre") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                BotonDegradado(
                    texto = if (viewModel.guardandoNombre) "Guardando…" else "Guardar nombre",
                    onClick = viewModel::guardarNombre,
                    enabled = !viewModel.guardandoNombre && viewModel.nombre.isNotBlank(),
                )
                viewModel.mensajeNombre?.let { Text(it, fontSize = 12.sp, color = MaterialTheme.colorScheme.primary) }

                Spacer(Modifier.height(4.dp))

                OutlinedTextField(
                    value = viewModel.email,
                    onValueChange = viewModel::onEmailChange,
                    label = { Text("Email") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = viewModel.passwordActualEmail,
                    onValueChange = viewModel::onPasswordActualEmailChange,
                    label = { Text("Contraseña actual") },
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    modifier = Modifier.fillMaxWidth(),
                )
                BotonDegradado(
                    texto = if (viewModel.guardandoEmail) "Guardando…" else "Cambiar email",
                    onClick = viewModel::cambiarEmail,
                    enabled = !viewModel.guardandoEmail && viewModel.email.isNotBlank() && viewModel.passwordActualEmail.isNotBlank(),
                )
                viewModel.mensajeEmail?.let { Text(it, fontSize = 12.sp, color = MaterialTheme.colorScheme.primary) }
            }
        }

        TarjetaAnadesing(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("Contraseña", fontSize = 16.sp, fontFamily = FuenteDisplay, color = MaterialTheme.colorScheme.onSurface)
                OutlinedTextField(
                    value = viewModel.passwordActual,
                    onValueChange = viewModel::onPasswordActualChange,
                    label = { Text("Contraseña actual") },
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation(),
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = viewModel.passwordNueva,
                    onValueChange = viewModel::onPasswordNuevaChange,
                    label = { Text("Contraseña nueva") },
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation(),
                    modifier = Modifier.fillMaxWidth(),
                )
                BotonDegradado(
                    texto = if (viewModel.guardandoPassword) "Guardando…" else "Cambiar contraseña",
                    onClick = viewModel::cambiarPassword,
                    enabled = !viewModel.guardandoPassword && viewModel.passwordActual.isNotBlank() && viewModel.passwordNueva.isNotBlank(),
                )
                viewModel.mensajePassword?.let { Text(it, fontSize = 12.sp, color = MaterialTheme.colorScheme.primary) }
            }
        }

        TarjetaAnadesing(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("Notificaciones", fontSize = 16.sp, fontFamily = FuenteDisplay, color = MaterialTheme.colorScheme.onSurface)
                Text(
                    "Recordatorios push antes de cada entrevista o evento con hora.",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                BotonDegradado(
                    texto = if (viewModel.perfil?.notificaciones_activas == 1) "Desactivar notificaciones" else "Activar notificaciones",
                    onClick = viewModel::toggleNotificaciones,
                    enabled = !viewModel.cambiandoNotificaciones,
                )
                viewModel.mensajeNotificaciones?.let { Text(it, fontSize = 12.sp, color = MaterialTheme.colorScheme.primary) }
            }
        }

        TarjetaAnadesing(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("Mi CV / Perfil", fontSize = 16.sp, fontFamily = FuenteDisplay, color = MaterialTheme.colorScheme.onSurface)
                Text(
                    "Se usa para calcular qué tan compatible es cada oferta con tu perfil.",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                OutlinedTextField(
                    value = viewModel.perfilCv,
                    onValueChange = viewModel::onPerfilCvChange,
                    label = { Text("Resumen de experiencia, habilidades y lo que buscás") },
                    minLines = 6,
                    modifier = Modifier.fillMaxWidth(),
                )
                BotonDegradado(
                    texto = if (viewModel.guardandoPerfilCv) "Guardando…" else "Guardar CV",
                    onClick = viewModel::guardarPerfilCv,
                    enabled = !viewModel.guardandoPerfilCv,
                )
                viewModel.mensajePerfilCv?.let { Text(it, fontSize = 12.sp, color = MaterialTheme.colorScheme.primary) }
            }
        }

        TarjetaAnadesing(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("Computrabajo", fontSize = 16.sp, fontFamily = FuenteDisplay, color = MaterialTheme.colorScheme.onSurface)
                Text(
                    "Conectá tu cuenta para traer automáticamente el link y la descripción real de tus postulaciones (hoy el mail de confirmación de Computrabajo no la trae).",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                if (viewModel.perfil?.computrabajo_conectado == 1) {
                    Text(
                        "Conectada como ${viewModel.perfil?.computrabajo_email}",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                    BotonDegradado(
                        texto = "Desconectar",
                        onClick = viewModel::desconectarComputrabajo,
                        enabled = !viewModel.conectandoComputrabajo,
                    )
                } else {
                    OutlinedTextField(
                        value = viewModel.computrabajoEmail,
                        onValueChange = viewModel::onComputrabajoEmailChange,
                        label = { Text("Email de Computrabajo") },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                        modifier = Modifier.fillMaxWidth(),
                    )
                    OutlinedTextField(
                        value = viewModel.computrabajoPassword,
                        onValueChange = viewModel::onComputrabajoPasswordChange,
                        label = { Text("Contraseña de Computrabajo") },
                        singleLine = true,
                        visualTransformation = PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                        modifier = Modifier.fillMaxWidth(),
                    )
                    BotonDegradado(
                        texto = if (viewModel.conectandoComputrabajo) "Conectando…" else "Conectar",
                        onClick = viewModel::conectarComputrabajo,
                        enabled = !viewModel.conectandoComputrabajo &&
                            viewModel.computrabajoEmail.isNotBlank() &&
                            viewModel.computrabajoPassword.isNotBlank(),
                    )
                }
                viewModel.mensajeComputrabajo?.let { Text(it, fontSize = 12.sp, color = MaterialTheme.colorScheme.primary) }
            }
        }

        TarjetaAnadesing(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("Idioma", fontSize = 16.sp, fontFamily = FuenteDisplay, color = MaterialTheme.colorScheme.onSurface)
                Text(
                    "Todavía no cambia nada en la app (no tiene selector de idioma propio) -- se guarda en tu cuenta para cuando lo tenga.",
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(
                        selected = viewModel.perfil?.idioma == "es",
                        onClick = { viewModel.cambiarIdioma("es") },
                        label = { Text("Español") },
                    )
                    FilterChip(
                        selected = viewModel.perfil?.idioma == "en",
                        onClick = { viewModel.cambiarIdioma("en") },
                        label = { Text("English") },
                    )
                }
            }
        }

        TarjetaAnadesing(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("Apariencia", fontSize = 16.sp, fontFamily = FuenteDisplay, color = MaterialTheme.colorScheme.onSurface)
                Text(
                    "Todavía no cambia nada en la app (usa el modo claro/oscuro del sistema) -- se guarda en tu cuenta para cuando lo tenga.",
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(
                        selected = viewModel.perfil?.tema == "claro",
                        onClick = { viewModel.cambiarTema("claro") },
                        label = { Text("Claro") },
                    )
                    FilterChip(
                        selected = viewModel.perfil?.tema == "oscuro",
                        onClick = { viewModel.cambiarTema("oscuro") },
                        label = { Text("Oscuro") },
                    )
                }
            }
        }
    }
}

