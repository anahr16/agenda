package com.anadesing.agendainteligente.ui.common

import com.anadesing.agendainteligente.R

/** Mismos assets que frontend/src/app/core/stickers.ts (disenos hechos a mano por
 *  Ana en Procreate) -- FLORES son stickers decorativos de esquina (formas, se
 *  reconocen bien chicas), LETTERING son palabras/frases para protagonizar un
 *  cuadro (ver "Una afirmación" en Agenda). */
val FLORES = listOf(
    R.drawable.sticker_margarita,
    R.drawable.sticker_hibisco_morado,
    R.drawable.sticker_hibisco_rosa,
    R.drawable.sticker_shell2,
)

val LETTERING = listOf(
    R.drawable.lettering_hello,
    R.drawable.lettering_aloha,
    R.drawable.lettering_beautiful,
    R.drawable.lettering_poderosa,
    R.drawable.lettering_autentica,
    R.drawable.lettering_eres_genial,
)

/** Igual que stickerFlor() en agenda.ts: eleccion determinada por indice, no al azar. */
fun stickerFlor(indice: Int): Int = FLORES[indice % FLORES.size]
