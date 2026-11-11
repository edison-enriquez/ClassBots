package com.classbots.taller

import org.junit.Assert.*
import org.junit.Test

class ModeloTest {
    @Test fun `El modelo no imprime ni importa Android`() {
        val src = fuente("Robot.kt")
        assertTrue("Falta Robot.kt", src.isNotBlank())
        assertFalse("Robot.kt imprime: mostrar es trabajo de la vista", Regex("""\bprint(ln)?\s*\(""").containsMatchIn(src))
        assertFalse("Robot.kt importa android o androidx: el modelo debe ser Kotlin puro", IMPORTA_ANDROID.containsMatchIn(src))
    }

    @Test fun `El modelo protege su energía`() {
        val r = Robot("R")
        repeat(3) { r.avanzar() }
        val fallo = runCatching { r.avanzar() }.exceptionOrNull()
        assertTrue("avanzar() sin energía debe lanzar IllegalStateException", fallo is IllegalStateException)
        assertEquals("energía después de 3 pasos", 10, r.energia)
        assertEquals("posición después de 3 pasos", 3, r.posicion)
    }

    @Test fun `El controlador traduce las órdenes`() {
        val vista = VistaFalsa()
        val control = ControladorRobot(Robot("Chispa"), vista)
        repeat(4) { control.orden("avanzar") }
        control.orden("saltar")
        assertEquals("lo último que mostró la vista", "Chispa 3 10", vista.pantallas.last())
        assertEquals("avisos que recibió la vista", listOf("sin energía", "orden desconocida: saltar"), vista.avisos)
    }

    @Test fun `Recargar deja la energía en 100`() {
        val vista = VistaFalsa()
        val control = ControladorRobot(Robot("Chispa"), vista)
        control.orden("avanzar"); control.orden("recargar")
        assertEquals("Chispa 1 100", vista.pantallas.last())
    }
}
