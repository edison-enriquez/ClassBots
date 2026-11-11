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

class EstructuraTest {
    @Test fun `El modelo no importa nada de Android`() {
        assertFalse("Robot.kt importa android o androidx: el modelo debe ser Kotlin puro", IMPORTA_ANDROID.containsMatchIn(fuente("Robot.kt")))
    }

    @Test fun `La Activity es la vista y no hace las cuentas`() {
        val src = fuente("MainActivity.kt")
        assertTrue("MainActivity debe implementar VistaRobot", Regex("""class\s+MainActivity\b[^{]*\bVistaRobot\b""").containsMatchIn(src))
        assertFalse("MainActivity cambia la energía o la posición: eso es trabajo del modelo", HACE_CUENTAS.containsMatchIn(src))
        assertTrue("MainActivity debe usar un ControladorRobot", "ControladorRobot(" in src)
    }
}

@RunWith(RobolectricTestRunner::class)
class PantallaTest {
    @get:Rule val regla = createAndroidComposeRule<MainActivity>()

    @Test fun `Avanzar mueve al robot en la pantalla`() {
        regla.onNodeWithText("Avanzar").performClick()
        regla.onNodeWithText("Posición: 1").assertExists("Después de un Avanzar la pantalla debe decir «Posición: 1»")
        regla.onNodeWithText("Energía: 70%").assertExists("Después de un Avanzar la pantalla debe decir «Energía: 70%»")
    }

    @Test fun `Sin energía la pantalla muestra el aviso`() {
        repeat(4) { regla.onNodeWithText("Avanzar").performClick() }
        regla.onNodeWithText("sin energía", substring = true).assertExists("La pantalla debe mostrar el aviso «sin energía»")
        regla.onNodeWithText("Recargar").performClick()
        regla.onNodeWithText("Energía: 100%").assertExists("Recargar debe dejar «Energía: 100%»")
    }

    @Test fun `Captura de tu pantalla`() {
        regla.onNodeWithText("Avanzar").performClick()
        regla.waitForIdle()
        val bmp = regla.onRoot().captureToImage().asAndroidBitmap()
        FileOutputStream(System.getProperty("juez.captura")).use { bmp.compress(Bitmap.CompressFormat.PNG, 100, it) }
    }
}

@RunWith(RobolectricTestRunner::class)
class PantallaOcultoTest {
    @get:Rule val regla = createAndroidComposeRule<MainActivity>()

    @Test fun `La pantalla aguanta una sesión larga`() {
        repeat(3) { regla.onNodeWithText("Avanzar").performClick() }
        regla.onNodeWithText("Recargar").performClick()
        repeat(2) { regla.onNodeWithText("Avanzar").performClick() }
        regla.onNodeWithText("Posición: 5").assertExists("Esperaba «Posición: 5»")
        regla.onNodeWithText("Energía: 40%").assertExists("Esperaba «Energía: 40%»")
    }
}
