import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("com.google.gms.google-services")
}

// Firma de release -- vive fuera del repo (ver readme.md, seccion
// "Publicacion en Google Play"). Si el archivo no existe (ej. en la maquina
// de desarrollo sin el keystore) el build de debug sigue andando igual;
// solo assembleRelease/bundleRelease lo necesitan de verdad.
val keystorePropertiesFile = rootProject.file("key.properties")
val keystoreProperties = Properties()
val hayKeystore = keystorePropertiesFile.exists()
if (hayKeystore) {
    keystoreProperties.load(keystorePropertiesFile.inputStream())
}

android {
    namespace = "com.anadesing.agendainteligente"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.anadesing.agendainteligente"
        minSdk = 26
        targetSdk = 35
        versionCode = 2
        versionName = "1.0.0"
    }

    signingConfigs {
        if (hayKeystore) {
            create("release") {
                storeFile = file(keystoreProperties["storeFile"] as String)
                storePassword = keystoreProperties["storePassword"] as String
                keyAlias = keystoreProperties["keyAlias"] as String
                keyPassword = keystoreProperties["keyPassword"] as String
            }
        }
    }

    buildTypes {
        debug {
            // Misma IP de LAN que ya se usaba a mano en NetworkModule.kt --
            // ahora es un buildConfigField para que release pueda apuntar a
            // otra URL sin tocar codigo Kotlin (ver esa nota en release).
            buildConfigField("String", "API_BASE_URL", "\"http://192.168.1.118:4000/\"")
        }
        release {
            // TODO: cuando exista hosting real (ver readme.md), esta es la
            // UNICA linea que hay que cambiar para que la app publicada deje
            // de apuntar a la PC de casa.
            buildConfigField("String", "API_BASE_URL", "\"http://192.168.1.118:4000/\"")
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            if (hayKeystore) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }
}

dependencies {
    // Compose -- version alineada por el BOM, no hace falta fijar cada libreria a mano.
    implementation(platform("androidx.compose:compose-bom:2024.09.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    debugImplementation("androidx.compose.ui:ui-tooling")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.activity:activity-compose:1.9.2")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.5")
    implementation("androidx.navigation:navigation-compose:2.8.0")
    implementation("androidx.core:core-splashscreen:1.0.1")

    // Mismo cliente HTTP que se planeo en el readme (Retrofit) para hablar
    // con el backend de Express -- mismos endpoints que ya usa la web.
    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.squareup.retrofit2:converter-gson:2.11.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")

    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")

    // Guardar el JWT localmente (equivalente Android de localStorage en la web).
    implementation("androidx.datastore:datastore-preferences:1.1.1")

    // Push -- mismo proyecto Firebase (turnero-ec3cd) que ya usa la web para
    // notificaciones (google-services.json), equivalente Android de
    // frontend/src/app/core/push.service.ts.
    implementation(platform("com.google.firebase:firebase-bom:33.5.1"))
    implementation("com.google.firebase:firebase-messaging")
}
