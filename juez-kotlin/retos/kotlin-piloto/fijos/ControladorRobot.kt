package com.classbots.taller

// CONTROLADOR: traduce lo que hace el usuario en llamadas al modelo
class ControladorRobot(private val modelo: Robot, private val vista: VistaRobot) {
    init {
        modelo.suscribir(vista)
    }

    fun orden(texto: String) {
        try {
            when (texto) {
                "avanzar" -> modelo.avanzar()
                "recargar" -> modelo.recargar()
                else -> vista.aviso("orden desconocida: $texto")
            }
        } catch (e: IllegalStateException) {
            vista.aviso(e.message ?: "error")
        }
    }
}
