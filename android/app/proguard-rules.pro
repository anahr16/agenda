# Retrofit + Gson + Firebase Messaging necesitan reflexion (interfaces de
# API, deserializacion de los modelos en data/*Models.kt) -- sin estas
# reglas, R8 puede renombrar/eliminar justo lo que necesitan para funcionar
# y romper el parseo de respuestas del backend recien en el build de
# release (isMinifyEnabled = true), no en debug.

# Retrofit
-keepattributes Signature, InnerClasses, EnclosingMethod, RuntimeVisibleAnnotations, RuntimeVisibleParameterAnnotations
-keepclassmembers,allowshrinking,allowobfuscation interface * {
    @retrofit2.http.* <methods>;
}
-dontwarn org.codehaus.mojo.animal_sniffer.*
-dontwarn javax.annotation.**
-dontwarn kotlin.Unit
-dontwarn retrofit2.KotlinExtensions
-dontwarn okhttp3.**
-dontwarn okio.**

# Gson (deserializa data/*Models.kt vía reflexion -- los data class deben
# conservar sus nombres de campo)
-keepattributes *Annotation*
-keep class com.google.gson.** { *; }
-dontwarn com.google.gson.**
-keep class com.anadesing.agendainteligente.data.** { <fields>; }

# Firebase Messaging
-keep class com.google.firebase.messaging.** { *; }
