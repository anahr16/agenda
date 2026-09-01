package com.anadesing.agendainteligente.ui.login

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.anadesing.agendainteligente.R
import com.anadesing.agendainteligente.ui.common.BotonDegradado
import com.anadesing.agendainteligente.ui.theme.FuenteDisplay

@Composable
fun LoginScreen(viewModel: LoginViewModel, onSesionIniciada: () -> Unit) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }

    Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
        Column(modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
            AnnieHero()

            Column(modifier = Modifier.fillMaxWidth().padding(32.dp)) {
                Text(
                    text = if (viewModel.modo == ModoLogin.LOGIN) "Bienvenida de nuevo" else "Crea tu cuenta",
                    fontSize = 26.sp,
                    fontFamily = FuenteDisplay,
                    color = MaterialTheme.colorScheme.onBackground,
                )
                Spacer(Modifier.height(6.dp))
                Text(
                    text = "Tus entrevistas y tus postulaciones, en un solo lugar.",
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(28.dp))

                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it },
                    label = { Text("Email") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(Modifier.height(14.dp))
                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it },
                    label = { Text("Contraseña") },
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    modifier = Modifier.fillMaxWidth(),
                )

                viewModel.error?.let { mensaje ->
                    Spacer(Modifier.height(14.dp))
                    Text(text = mensaje, color = MaterialTheme.colorScheme.error, fontSize = 13.sp)
                }

                Spacer(Modifier.height(20.dp))
                BotonDegradado(
                    texto = if (viewModel.modo == ModoLogin.LOGIN) "Ingresar" else "Registrarme",
                    onClick = {
                        viewModel.enviar(
                            email = email,
                            password = password,
                            onSesionIniciada = onSesionIniciada,
                            onRegistroOk = { password = "" },
                        )
                    },
                    enabled = !viewModel.cargando && email.isNotBlank() && password.isNotBlank(),
                    cargando = viewModel.cargando,
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier.fillMaxWidth().height(50.dp),
                )

                Spacer(Modifier.height(18.dp))
                Row(horizontalArrangement = Arrangement.Center, modifier = Modifier.fillMaxWidth()) {
                    Text(
                        text = if (viewModel.modo == ModoLogin.LOGIN) "¿No tienes cuenta?" else "¿Ya tienes cuenta?",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 13.sp,
                    )
                    TextButton(onClick = { viewModel.alternarModo() }) {
                        Text(
                            text = if (viewModel.modo == ModoLogin.LOGIN) "Crear una" else "Iniciar sesión",
                            color = MaterialTheme.colorScheme.primary,
                            fontSize = 13.sp,
                        )
                    }
                }

                Spacer(Modifier.height(24.dp))
                FirmaCredit()
            }
        }
    }
}

/** Mismo credito que `.firma-credit`/`.firma-crop` en login.css -- "Un producto
 *  de Anadesing" mas la firma manuscrita de Ana. */
@Composable
private fun FirmaCredit() {
    Column(modifier = Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            text = "UN PRODUCTO DE ANADESING",
            fontSize = 10.sp,
            letterSpacing = 1.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.75f),
        )
        Spacer(Modifier.height(4.dp))
        Image(
            painter = painterResource(R.drawable.firma),
            contentDescription = "Firma de Ana Hernández",
            modifier = Modifier.height(48.dp),
        )
    }
}

/** Mismo panel que `.login-brand-side`/`.annie-hero` en login.css -- en la web
 *  esta al lado del formulario en pantallas anchas, pero en mobile (<760px)
 *  la propia web lo pone primero y en columna (order:-1), que es lo que se
 *  imita acá directo dado que el telefono siempre es angosto. */
@Composable
private fun AnnieHero() {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Brush.linearGradient(listOf(MaterialTheme.colorScheme.primary, MaterialTheme.colorScheme.secondary)))
            .padding(vertical = 36.dp, horizontal = 28.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Image(
            painter = painterResource(R.drawable.annie),
            contentDescription = "Annie",
            contentScale = ContentScale.Crop,
            modifier = Modifier
                .size(96.dp)
                .clip(CircleShape)
                .border(4.dp, Color.White.copy(alpha = 0.85f), CircleShape),
        )
        Spacer(Modifier.height(14.dp))
        Text(
            "Hola, soy Annie",
            color = Color.White,
            fontSize = 22.sp,
            fontFamily = FuenteDisplay,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(8.dp))
        Text(
            "Reviso tus mails, te aviso apenas pase algo importante y te acompaño a no perder ni una entrevista.",
            color = Color.White.copy(alpha = 0.92f),
            fontSize = 13.sp,
            textAlign = TextAlign.Center,
        )
    }
}
