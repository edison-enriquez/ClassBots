package com.classbots.taller

import android.graphics.Bitmap
import androidx.compose.ui.graphics.asAndroidBitmap
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import java.io.FileOutputStream

class PilotoTest {
    @Test fun `El piloto es Kotlin puro y no imprime`() {
        val src = fuente("ControladorPiloto.kt")
        assertTrue("Falta ControladorPiloto.kt", src.isNotBlank())
        assertFalse("ControladorPiloto importa android o androidx", IMPORTA_ANDROID.containsMatchIn(src))
        assertFalse("ControladorPiloto imprime: eso es trabajo de la vista", Regex("""\bprint(ln)?\s*\(""").containsMatchIn(src))
    }

    @Test fun `El piloto nunca se queda sin energía`() {
        val r = Robot("R")
        val fallo = runCatching { ControladorPiloto(r, VistaFalsa()).piloto(10) }.exceptionOrNull()
        assertNull("piloto(10) lanzó ${fallo?.javaClass?.simpleName}: recarga antes de que no alcance", fallo)
        assertEquals("posición después de piloto(10)", 10, r.posicion)
    }

    @Test fun `La Activity no hace las cuentas`() {
        assertFalse("MainActivity cambia la energía o la posición: eso es trabajo del modelo", HACE_CUENTAS.containsMatchIn(fuente("MainActivity.kt")))
    }
}

@RunWith(RobolectricTestRunner::class)
class PilotoPantallaTest {
    @get:Rule val regla = createAndroidComposeRule<MainActivity>()

    @Test fun `El botón Piloto automático cruza la sala`() {
        regla.onNodeWithText("Piloto automático").performClick()
        regla.onNodeWithText("Posición: 5").assertExists("Después del piloto la pantalla debe decir «Posición: 5»")
        regla.onNodeWithText("Energía: 40%").assertExists("Después del piloto la pantalla debe decir «Energía: 40%»")
    }

    @Test fun `Los botones manuales siguen funcionando`() {
        regla.onNodeWithText("Avanzar").performClick()
        regla.onNodeWithText("Posición: 1").assertExists("Avanzar debe seguir funcionando")
    }

    @Test fun `Captura de tu pantalla`() {
        regla.onNodeWithText("Piloto automático").performClick()
        regla.waitForIdle()
        val bmp = regla.onRoot().captureToImage().asAndroidBitmap()
        FileOutputStream(System.getProperty("juez.captura")).use { bmp.compress(Bitmap.CompressFormat.PNG, 100, it) }
    }
}
