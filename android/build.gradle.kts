// Root -- solo declara los plugins para que las versiones queden fijas una
// sola vez (los módulos los aplican sin repetir versión). No hay tareas ni
// dependencias acá, ver app/build.gradle.kts para el modulo real.
plugins {
    id("com.android.application") version "8.6.0" apply false
    id("org.jetbrains.kotlin.android") version "2.0.20" apply false
    id("org.jetbrains.kotlin.plugin.compose") version "2.0.20" apply false
    id("com.google.gms.google-services") version "4.4.2" apply false
}
