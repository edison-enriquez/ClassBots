package com.classbots.taller

// VISTA (contrato): lo que el controlador y el modelo pueden pedirle a una pantalla
interface VistaRobot {
    fun mostrar(nombre: String, energia: Int, posicion: Int)
    fun aviso(mensaje: String)
}
