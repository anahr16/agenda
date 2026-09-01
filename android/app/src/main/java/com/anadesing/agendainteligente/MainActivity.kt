package com.anadesing.agendainteligente

import android.Manifest
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.anadesing.agendainteligente.data.AgendaLocalStore
import com.anadesing.agendainteligente.data.AgendaRepository
import com.anadesing.agendainteligente.data.AnnieRepository
import com.anadesing.agendainteligente.data.AuthRepository
import com.anadesing.agendainteligente.data.PostulacionesRepository
import com.anadesing.agendainteligente.data.obtenerTokenFcm
import com.anadesing.agendainteligente.ui.agenda.AgendaScreen
import com.anadesing.agendainteligente.ui.agenda.AgendaViewModel
import com.anadesing.agendainteligente.ui.annie.AnnieScreen
import com.anadesing.agendainteligente.ui.annie.AnnieViewModel
import com.anadesing.agendainteligente.ui.configuracion.ConfiguracionScreen
import com.anadesing.agendainteligente.ui.configuracion.ConfiguracionViewModel
import com.anadesing.agendainteligente.ui.login.LoginScreen
import com.anadesing.agendainteligente.ui.login.LoginViewModel
import com.anadesing.agendainteligente.ui.postulaciones.PostulacionesScreen
import com.anadesing.agendainteligente.ui.postulaciones.PostulacionesViewModel
import com.anadesing.agendainteligente.ui.theme.AgendaInteligenteTheme
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        val app = application as AgendaApp
        setContent {
            AgendaInteligenteTheme {
                AgendaInteligenteApp(
                    authRepository = app.authRepository,
                    agendaRepository = app.agendaRepository,
                    postulacionesRepository = app.postulacionesRepository,
                    annieRepository = app.annieRepository,
                    agendaLocalStore = app.agendaLocalStore,
                )
            }
        }
    }
}

private enum class Pestana(val etiqueta: String, val emoji: String) {
    AGENDA("Agenda", "🗓"),
    POSTULACIONES("Postulaciones", "📄"),
    ANNIE("Annie", "🤖"),
    CONFIGURACION("Configuración", "⚙"),
}

@Composable
private fun PrincipalScreen(
    agendaRepository: AgendaRepository,
    authRepository: AuthRepository,
    postulacionesRepository: PostulacionesRepository,
    annieRepository: AnnieRepository,
    agendaLocalStore: AgendaLocalStore,
    onCerrarSesion: () -> Unit,
) {
    var pestana by remember { mutableStateOf(Pestana.AGENDA) }
    val context = LocalContext.current
    val cacheDir = context.cacheDir

    // Se crea acá (no dentro del "when" de Annie) para que el saludo dispare al
    // entrar a "principal" -- es decir, al abrir la app o loguearse -- y no
    // recien cuando se toca la pestaña de Annie, igual que shell.ts hace en el
    // Shell global de la web.
    val annieViewModel: AnnieViewModel = viewModel(factory = AnnieViewModel.factory(annieRepository, authRepository, cacheDir))
    LaunchedEffect(Unit) {
        annieViewModel.inicializarTts(context)
        annieViewModel.saludar()
        // Recien cuando el saludo esta listo se abre su pestana sola -- en la
        // web Annie es un widget siempre visible en la barra lateral, esto es
        // lo mas parecido en un bottom nav de a una pestana por vez.
        pestana = Pestana.ANNIE
    }

    // Push -- mismo flujo que pedirPermisoYRegistrar() en push.service.ts: pedir
    // el permiso de notificaciones (solo hace falta desde Android 13) y mandar
    // el token actual al backend. Se registra de nuevo en cada apertura de la
    // app ya logueada, no solo la primera vez -- barato y evita quedar con un
    // token viejo si Firebase lo rota. Si la usuaria las desactivo a mano en
    // Configuracion (notificaciones_activas = 0) no se re-registra solo: si no,
    // el proximo LaunchedEffect pisaria esa eleccion.
    val lanzadorPermisoNotificaciones = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) {}
    LaunchedEffect(Unit) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            lanzadorPermisoNotificaciones.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
        val activas = runCatching { authRepository.obtenerPerfil().notificaciones_activas }.getOrNull()
        if (activas != 0) {
            obtenerTokenFcm()?.let { token -> runCatching { authRepository.registrarTokenPush(token) } }
        }
    }

    Scaffold(
        bottomBar = {
            NavigationBar {
                Pestana.entries.forEach { item ->
                    NavigationBarItem(
                        selected = pestana == item,
                        onClick = { pestana = item },
                        icon = {
                            when (item) {
                                Pestana.ANNIE -> Image(
                                    painter = painterResource(R.drawable.annie),
                                    contentDescription = null,
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier.size(24.dp).clip(CircleShape),
                                )
                                // Fit, no Crop: es un icono cuadrado de punta a punta (lapicera,
                                // sello de tilde en la esquina), un recorte circular le comia
                                // justo esos detalles y quedaba irreconocible de chico.
                                Pestana.AGENDA -> Image(
                                    painter = painterResource(R.drawable.tab_agenda),
                                    contentDescription = null,
                                    contentScale = ContentScale.Fit,
                                    modifier = Modifier.size(26.dp).clip(RoundedCornerShape(7.dp)),
                                )
                                else -> Text(item.emoji)
                            }
                        },
                        label = { Text(item.etiqueta) },
                    )
                }
            }
        },
    ) { innerPadding ->
        Box(modifier = Modifier.fillMaxSize().padding(innerPadding)) {
            when (pestana) {
                Pestana.AGENDA -> {
                    val viewModel: AgendaViewModel =
                        viewModel(factory = AgendaViewModel.factory(agendaRepository, agendaLocalStore, authRepository))
                    AgendaScreen(viewModel = viewModel, onCerrarSesion = onCerrarSesion)
                }
                Pestana.POSTULACIONES -> {
                    val viewModel: PostulacionesViewModel = viewModel(factory = PostulacionesViewModel.factory(postulacionesRepository))
                    PostulacionesScreen(viewModel = viewModel)
                }
                Pestana.ANNIE -> AnnieScreen(viewModel = annieViewModel)
                Pestana.CONFIGURACION -> {
                    val viewModel: ConfiguracionViewModel = viewModel(factory = ConfiguracionViewModel.factory(authRepository))
                    ConfiguracionScreen(viewModel = viewModel)
                }
            }
        }
    }
}

@Composable
fun AgendaInteligenteApp(
    authRepository: AuthRepository,
    agendaRepository: AgendaRepository,
    postulacionesRepository: PostulacionesRepository,
    annieRepository: AnnieRepository,
    agendaLocalStore: AgendaLocalStore,
) {
    // Mientras se resuelve si ya hay un JWT valido guardado (TokenStore, via
    // DataStore) no se decide la pantalla inicial -- equivalente Android de
    // leerUsuarioGuardado() en auth.service.ts.
    var destinoInicial by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(Unit) {
        destinoInicial = if (authRepository.usuario.first() != null) "principal" else "login"
    }

    val destino = destinoInicial
    if (destino == null) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
        return
    }

    val navController = rememberNavController()
    val scope = rememberCoroutineScope()

    NavHost(navController = navController, startDestination = destino) {
        composable("login") {
            val viewModel: LoginViewModel = viewModel(factory = LoginViewModel.factory(authRepository))
            LoginScreen(
                viewModel = viewModel,
                onSesionIniciada = {
                    navController.navigate("principal") {
                        popUpTo("login") { inclusive = true }
                    }
                },
            )
        }
        composable("principal") {
            PrincipalScreen(
                agendaRepository = agendaRepository,
                authRepository = authRepository,
                postulacionesRepository = postulacionesRepository,
                annieRepository = annieRepository,
                agendaLocalStore = agendaLocalStore,
                onCerrarSesion = {
                    scope.launch {
                        authRepository.logout()
                        navController.navigate("login") {
                            popUpTo("principal") { inclusive = true }
                        }
                    }
                },
            )
        }
    }
}
