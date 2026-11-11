package com.classbots.taller

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

// VISTA (Android): pinta el estado y le pasa cada toque al controlador
class MainActivity : ComponentActivity(), VistaRobot {
    private var estado by mutableStateOf(EstadoPantalla())
    private lateinit var controlador: ControladorRobot

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        controlador = ControladorRobot(Robot("Chispa"), this)
        setContent { MaterialTheme { PantallaRobot(estado, controlador::orden) } }
    }

    override fun mostrar(nombre: String, energia: Int, posicion: Int) {
        estado = estado.copy(nombre = nombre, energia = energia, posicion = posicion, aviso = null)
    }

    override fun aviso(mensaje: String) {
        estado = estado.copy(aviso = mensaje)
    }
}

data class EstadoPantalla(val nombre: String = "", val energia: Int = 0, val posicion: Int = 0, val aviso: String? = null)

@Composable
fun PantallaRobot(estado: EstadoPantalla, onOrden: (String) -> Unit) {
    Column(
        Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(estado.nombre, style = MaterialTheme.typography.headlineLarge)
        Spacer(Modifier.height(16.dp))
        Text("Posición: ${estado.posicion}")
        Text("Energía: ${estado.energia}%")
        LinearProgressIndicator(progress = { estado.energia / 100f }, modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp))
        estado.aviso?.let { Text("⚠ $it", color = MaterialTheme.colorScheme.error) }
        Spacer(Modifier.height(16.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Button(onClick = { onOrden("avanzar") }) { Text("Avanzar") }
            OutlinedButton(onClick = { onOrden("recargar") }) { Text("Recargar") }
        }
    }
}
