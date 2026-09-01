@file:OptIn(ExperimentalMaterial3Api::class)

package com.anadesing.agendainteligente.ui.annie

import android.app.Activity
import android.content.Intent
import android.speech.RecognizerIntent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.anadesing.agendainteligente.R

/** Chat con Annie, mismo lenguaje visual que `.annie-card` en shell.css (panel
 *  degrade morado->rosa, burbujas translucidas) pero como pantalla completa en
 *  vez de widget de barra lateral -- en la web es parte del Shell global, acá
 *  es su propia pestaña. */
@Composable
fun AnnieScreen(viewModel: AnnieViewModel) {
    // inicializarTts()/saludar() se disparan una sola vez desde PrincipalScreen
    // (al entrar a la app, no al tocar esta pestaña), no hace falta repetirlos acá.
    val lanzadorVoz = rememberLauncherForActivityResult(ActivityResultContracts.StartActivityForResult()) { resultado ->
        if (resultado.resultCode == Activity.RESULT_OK) {
            val texto = resultado.data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)?.firstOrNull()
            if (!texto.isNullOrBlank()) viewModel.onEntradaChange(texto)
        }
    }

    val listState = rememberLazyListState()
    LaunchedEffect(viewModel.mensajes.size) {
        if (viewModel.mensajes.isNotEmpty()) listState.animateScrollToItem(viewModel.mensajes.size - 1)
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Brush.linearGradient(listOf(MaterialTheme.colorScheme.primary, MaterialTheme.colorScheme.secondary))),
    ) {
        Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                Image(
                    painter = painterResource(R.drawable.annie),
                    contentDescription = "Annie",
                    contentScale = ContentScale.Crop,
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .border(2.dp, Color.White.copy(alpha = 0.75f), CircleShape),
                )
                Spacer(Modifier.width(10.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text("Annie", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                    Text(
                        if (viewModel.enviando) "Escribiendo…" else "Tu asistente",
                        color = Color.White.copy(alpha = 0.85f),
                        fontSize = 12.sp,
                    )
                }
                IconButton(onClick = viewModel::alternarVoz) {
                    Text(if (viewModel.vozActivada) "🔊" else "🔇", fontSize = 18.sp)
                }
            }

            Spacer(Modifier.height(12.dp))

            LazyColumn(
                state = listState,
                modifier = Modifier.weight(1f).fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                items(viewModel.mensajes) { mensaje -> BurbujaMensaje(mensaje) }
            }

            viewModel.error?.let {
                Spacer(Modifier.height(6.dp))
                Text(it, color = Color.White, fontSize = 12.sp)
            }

            Spacer(Modifier.height(10.dp))

            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                IconButton(
                    onClick = {
                        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                            putExtra(RecognizerIntent.EXTRA_LANGUAGE, "es-419")
                            putExtra(RecognizerIntent.EXTRA_PROMPT, "Háblale a Annie…")
                        }
                        runCatching { lanzadorVoz.launch(intent) }
                    },
                    enabled = !viewModel.enviando,
                ) {
                    Text("🎤", fontSize = 18.sp)
                }
                OutlinedTextField(
                    value = viewModel.entrada,
                    onValueChange = viewModel::onEntradaChange,
                    placeholder = { Text("Escríbele algo a Annie…", color = Color.White.copy(alpha = 0.7f)) },
                    enabled = !viewModel.enviando,
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = Color.White.copy(alpha = 0.6f),
                        unfocusedBorderColor = Color.White.copy(alpha = 0.35f),
                        cursorColor = Color.White,
                    ),
                    modifier = Modifier.weight(1f),
                )
                IconButton(onClick = viewModel::enviar, enabled = !viewModel.enviando && viewModel.entrada.isNotBlank()) {
                    Text("➤", fontSize = 18.sp, color = Color.White)
                }
            }
        }
    }
}

@Composable
private fun BurbujaMensaje(mensaje: MensajeChat) {
    val propio = mensaje.autor == "usuaria"
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = if (propio) Arrangement.End else Arrangement.Start) {
        Box(
            modifier = Modifier
                .widthIn(max = 280.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(if (propio) Color.Black.copy(alpha = 0.28f) else Color.White.copy(alpha = 0.16f))
                .padding(horizontal = 12.dp, vertical = 8.dp),
        ) {
            Text(mensaje.texto, color = Color.White, fontSize = 13.sp)
        }
    }
}
