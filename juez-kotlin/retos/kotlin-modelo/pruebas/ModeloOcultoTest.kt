package com.classbots.taller

import org.junit.Assert.*
import org.junit.Test

class ModeloOcultoTest {
    @Test fun `Dos vistas se enteran de cada cambio`() {
        val a = VistaFalsa(); val b = VistaFalsa()
        val r = Robot("X")
        r.suscribir(a); r.suscribir(b)
        r.avanzar()
        assertEquals("la primera vista", "X 1 70", a.pantallas.last())
        assertEquals("la segunda vista", "X 1 70", b.pantallas.last())
    }
}
