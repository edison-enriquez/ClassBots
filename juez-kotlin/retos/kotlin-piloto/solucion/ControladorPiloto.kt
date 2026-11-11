package com.classbots.taller

// Un controlador nuevo: decide solo, sin órdenes de texto
class ControladorPiloto(private val modelo: Robot, vista: VistaRobot) {
    init {
        modelo.suscribir(vista)
    }

    fun piloto(pasos: Int) {
        repeat(pasos) {
            if (modelo.energia < 30) modelo.recargar()
            modelo.avanzar()
        }
    }
}
