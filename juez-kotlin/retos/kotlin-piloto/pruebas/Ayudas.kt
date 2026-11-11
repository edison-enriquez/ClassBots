package com.classbots.taller

import java.io.File

/* Ayudas de las pruebas del juez (no las escribe el estudiante) */
fun fuente(nombre: String): String =
    File(System.getProperty("juez.fuentes"), nombre).takeIf { it.exists() }?.readText()
        ?.replace(Regex("//.*"), "") ?: ""

val IMPORTA_ANDROID = Regex("""import\s+androidx?\.""")
val HACE_CUENTAS = Regex("""\b(energia|posicion)\s*[-+]=|[-+]\s*30\b|\bcheck\s*\(""")

/** Vista falsa: anota lo que le pidieron mostrar */
class VistaFalsa : VistaRobot {
    val pantallas = mutableListOf<String>()
    val avisos = mutableListOf<String>()
    override fun mostrar(nombre: String, energia: Int, posicion: Int) { pantallas += "$nombre $posicion $energia" }
    override fun aviso(mensaje: String) { avisos += mensaje }
}
