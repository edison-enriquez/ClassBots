package com.classbots.taller

// MODELO: datos y reglas. No sabe nada de Android ni de pantallas.
class Robot(val nombre: String) {
    var energia = 100
        private set
    var posicion = 0
        private set

    private val vistas = mutableListOf<VistaRobot>()

    fun suscribir(vista: VistaRobot) {
        vistas.add(vista)
        vista.mostrar(nombre, energia, posicion)
    }

    fun avanzar() {
        check(energia >= 30) { "sin energía" }
        posicion += 1
        energia -= 30
        notificar()
    }

    fun recargar() {
        energia = 100
        notificar()
    }

    private fun notificar() = vistas.forEach { it.mostrar(nombre, energia, posicion) }
}
