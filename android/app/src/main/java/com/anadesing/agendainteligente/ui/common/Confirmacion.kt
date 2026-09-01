package com.anadesing.agendainteligente.ui.common

/** Confirmacion pendiente de mostrar como dialogo -- equivalente Android de los
 *  confirm() nativos del navegador que usa la web antes de borrar algo. */
data class Confirmacion(val mensaje: String, val accion: () -> Unit)
