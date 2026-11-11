package com.classbots.taller

import org.junit.Assert.*
import org.junit.Test

/* Una vista que el estudiante no conoce: cuenta lo que le muestran */
class VistaContador : VistaRobot {
    var cambios = 0
    var avisos = 0
    override fun mostrar(nombre: String, energia: Int, posicion: Int) { cambios++ }
    override fun aviso(mensaje: String) { avisos++ }
}

class PilotoOcultoTest {
    @Test fun `Una vista desconocida sigue al piloto`() {
        val contador = VistaContador()
        ControladorPiloto(Robot("X"), contador).piloto(4)
        assertEquals("veces que se mostró (1 al suscribir + 4 pasos + 1 recarga)", 6, contador.cambios)
        assertEquals("avisos", 0, contador.avisos)
    }

    @Test fun `Dos controladores manejan el mismo robot`() {
        val r = Robot("X")
        val manual = ControladorRobot(r, VistaFalsa())
        val auto = ControladorPiloto(r, VistaFalsa())
        manual.orden("avanzar"); auto.piloto(3)
        assertEquals("posición final", 4, r.posicion)
    }
}
