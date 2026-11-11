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

En Cloudflare, la ruta del túnel usa el path `^/(kotlin/.*|salud)$`. El servicio depende de dónde corre `cloudflared`:

| `cloudflared` | Servicio de la ruta | Cómo levantar el juez |
|---|---|---|
| En el sistema | `http://localhost:8788` | `docker compose up -d --build` |
| En un contenedor | `http://juez:8788` | `RED_TUNEL=<red> docker compose -f compose.yaml -f compose.tunel.yaml up -d --build` |

`compose.tunel.yaml` une solo la api a la red de `cloudflared` con el alias `juez`; el worker no entra a esa red. La red se ve con `docker inspect <contenedor de cloudflared> --format '{{json .NetworkSettings.Networks}}'`. Si la ruta no coincide, `https://juez.cybermas.app/salud` responde 502.

## Aislamiento entre estudiantes

El código del estudiante corre dentro de la JVM de pruebas con el mismo usuario que Gradle, así que el juez no confía en nada que ese código pueda escribir:

- **Slot limpio en cada intento:** antes de compilar, el slot se restaura desde la plantilla (scripts de Gradle, `gradle.properties`, wrapper, fuentes y temporales). Solo sobreviven `app/build` y `.gradle`, que Gradle vuelve a verificar. Las cachés de build y de configuración y la compilación incremental de Kotlin están apagadas porque Gradle reusaría sus entradas sin revisarlas.
- **Casa de Gradle efímera:** las dependencias se leen de una caché de solo lectura dentro de la imagen (`GRADLE_RO_DEP_CACHE`) y el resto se copia de `/opt/casa-gradle` a un tmpfs al arrancar. Un reinicio deja el worker como recién construido.
- **Vigilante** (`VIGILAR=1`): después de cada intento revisa que no haya cambiado ningún `.jar`, `.class` o `.so` de la casa de Gradle (por inodo, tamaño y ctime, que no se pueden falsear) ni aparecido `init.d`, `init.gradle` o `gradle.properties`. Si pasa, ese intento no cuenta, se registra una `ALERTA` en el log y el worker sale; Docker lo levanta limpio en un par de minutos.
- **Procesos sobrantes:** al terminar cada intento se matan los procesos que quedaron con el slot como carpeta de trabajo.

Lo que queda: un estudiante puede hacer trampa en su propio intento (lee sus pruebas desde su código) o leer las soluciones en el bundle del juego, como en los mundos de Java. Lo que se cierra es que afecte los intentos de otros.

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

Con 2 copias en paralelo (`SLOTS=2`), un intento con pantalla tarda ~15 s (algo más sin las cachés de build y de configuración) y uno sin pantalla ~6 s. Un error de compilación vuelve en ~2 s. Una clase de 30 estudiantes que envía a la vez espera unos 4 minutos en el peor caso; sube `SLOTS` (y `MEMORIA`) si el equipo tiene RAM libre: cada copia usa ~1,5 GB.
