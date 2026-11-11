# Juez de Kotlin de ClassBots

Califica los retos de **Kotlin + Jetpack Compose** (misión «MVC con Kotlin»). El navegador no puede compilar Kotlin ni dibujar una pantalla de Android, así que el juego envía el código aquí:

```
navegador ──https──▶ Cloudflare ──túnel──▶ cloudflared (sistema) ──▶ 127.0.0.1:8788 [api] ──red interna──▶ [worker]
                                                                                                           │ Gradle + Robolectric
                                                                                                           ▼
                                               { errores de compilación, casos de prueba, captura PNG de la pantalla }
```

- **api** (`MODO=api`): recibe los envíos, los pone en cola (uno activo por estudiante) y entrega el resultado. Nunca ejecuta código del estudiante. Es el único contenedor con puerto, y solo en `127.0.0.1`.
- **worker** (`MODO=worker`): copia el código en una plantilla de Android (`plantilla/`), agrega las pruebas del reto (`retos/<reto>/pruebas`) y corre `gradlew testDebugUnitTest --offline`. Robolectric simula Android 16 y dibuja la pantalla Compose sin emulador; la prueba «Captura de tu pantalla» guarda el PNG. Corre en una **red interna sin salida a internet** ni a los demás servicios del equipo, con usuario sin privilegios, sistema de archivos de solo lectura, `cap_drop: ALL`, límites de memoria, CPU y procesos, y un tope de 60 s por intento.

## Retos

Cada carpeta de `retos/` es un reto:

| Carpeta | Para qué |
|---|---|
| `pruebas/*.kt` | Pruebas JUnit/Robolectric. Los nombres entre comillas invertidas son los que ve el estudiante. Las clases que terminan en `OcultoTest` son casos ocultos (se revelan al **Enviar**). |
| `solucion/*.kt` | Solución de referencia: el juego la muestra en modo profesor y la imagen la usa para comprobar el reto. |
| `fijos/*.kt` | Archivos sellados: pisan los del estudiante (el mini-jefe no deja cambiar el modelo). |

`src/levels/mision-kotlin.js` (en el juego) se generó desde estas carpetas, y `tests/kotlin.test.js` comprueba que siguen iguales. Si cambias un reto, actualiza las dos cosas.

## Puesta en marcha (x99)

```bash
cd juez-kotlin
cp .env.ejemplo .env
docker compose up -d --build      # la primera vez tarda ~10 min: baja el SDK y calienta Gradle
docker compose ps                 # worker «healthy» (calienta un par de minutos) y api «healthy»
curl -s http://127.0.0.1:8788/salud
```

La construcción **falla si algún reto no pasa con su solución**, así que una imagen construida es una imagen probada.

En Cloudflare, la ruta del túnel apunta a `http://localhost:8788` con el path `^/(kotlin/.*|salud)$`, porque `cloudflared` corre en el sistema y no dentro de Docker.

## API

| Método y ruta | Qué hace |
|---|---|
| `POST /kotlin/evaluar` `{ reto, archivos: { "Robot.kt": "…" }, alumno }` | Encola el intento. Responde `202 { id, estado, posicion }`. Si el estudiante ya tiene uno en curso, devuelve ese mismo. |
| `GET /kotlin/estado/:id` | `{ estado: cola \| corriendo \| listo \| error, posicion, resultado? }`. El resultado trae `compilo`, `errores[]`, `casos[]` (`nombre`, `oculto`, `ok`, `mensaje`), `captura` (PNG en data URL) y `ms`. |
| `GET /salud` | Estado de la cola y retos disponibles. |

Solo se aceptan peticiones con `Origin` en `ORIGENES` (`.env`). Archivos: hasta 12 `.kt`, 30 KB cada uno; el paquete es siempre `com.classbots.taller` (si falta la línea `package`, se agrega y los errores conservan la línea original).

## Desarrollo sin Docker

Con JDK 21 y el Android SDK (plataforma 37):

```bash
ANDROID_HOME=~/Android/Sdk JAVA_HOME=/ruta/jdk-21 node probar-retos.mjs      # cada solución pasa
node --test test/                                                            # api, validación y lectura de resultados
```

Robolectric 4.17 necesita JDK 21: con el JDK 25 de Android Studio falla al iniciar.

## Capacidad

Con 2 copias en paralelo (`SLOTS=2`), un intento con pantalla tarda ~15 s y uno sin pantalla ~6 s. Un error de compilación vuelve en ~2 s. Una clase de 30 estudiantes que envía a la vez espera unos 4 minutos en el peor caso; sube `SLOTS` (y `MEMORIA`) si el equipo tiene RAM libre: cada copia usa ~1,5 GB.
