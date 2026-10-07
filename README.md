# ClassBots

Juego web para aprender programación orientada a objetos en Java. El estudiante escribe clases reales y un robot en pixel art se construye y se mueve según lo que hace su código.

Mundos jugables (40 capítulos):

| Mundo | Tema | Capítulos | Escena |
|---|---|---|---|
| 1 · El Taller | Clases, atributos, constructor, objetos, métodos | 6 | Mesa de planos, línea de ensamble, pasillo |
| 2 · La Bóveda | Encapsulamiento: `private`, getters, setters con validación, invariantes, `static`/`final`, `toString`/`equals` | 7 | Bóveda con Óxido, el saboteador |
| 3 · Las Conexiones | Relaciones: dependencia, asociación, agregación, composición y multiplicidad | 5 | Diagrama de objetos en pixel art |
| 4 · Contratos | Interfaces, programar contra la interfaz, varias interfaces, `Comparable`, abierto/cerrado | 5 | Estación de carga universal |
| 5 · El Árbol | Herencia con `extends`, redefinición, clases abstractas y jerarquías multinivel | 5 | Diagrama de herencia UML |
| 6 · La Arena | Polimorfismo: listas de la clase base, tipo declarado frente a tipo real, `instanceof` y casting, sobrecarga frente a redefinición, `toString()`, polimorfismo con interfaces y torneo abierto/cerrado | 6 | Coliseo: cada luchador muestra qué versión del método se ejecutó |
| 7 · La Sala de Averías | Manejo de errores: `throw`, `try/catch`, varios `catch` y la jerarquía de excepciones, excepciones propias comprobadas (`throws`), `finally` y un protocolo que atrapa por la clase base | 6 | Sala de reparación: la baliza se enciende con cada `throw`, la red verde del `catch` la apaga y `finally` deja su marca |

Los mundos 8 a 10 (patrones de diseño) aparecen bloqueados en el mapa. Las **misiones especiales** son ramales opcionales del mapa que refuerzan, con un patrón de diseño, el concepto del mundo del que salen:

| Misión | Sale de | Pasos | Recompensa |
|---|---|---|---|
| El manual de ensamblaje · Template Method | Mundo 5 (herencia) | 3: refactorizar dos recetas copiadas, gancho opcional y `final`, mini-jefe con un modelo desconocido | Manual de ensamblaje |
| Estilos de combate · Strategy | Mundo 6 (polimorfismo) | 3: quitar los `if` sobre un texto, cambiar de estilo en ejecución, mini-jefe «¿herencia o composición?» | Módulo táctico |

Cada misión empieza con código que huele mal, cierra con un mini-jefe con un caso oculto de extensión (algo nuevo entra sin tocar lo existente) y su recompensa tiene efecto: registra el patrón en el **Códice de patrones** de la Guía y queda visible en los robots de todas las escenas. Las misiones no alteran el avance ni la experiencia de la ruta principal, y los mundos 7 a 9 no dan por hecho que se jugaron. La **Guía** (botón en la barra superior y enlaces dentro de las lecciones) explica los seis tipos de relación UML, la multiplicidad y las interfaces.

- **Columna izquierda (estilo CryptoZombies):** escenario pixel art, diálogo con Chispa (la jefa del taller), teoría, ejemplo, tarea y pista. La respuesta solo aparece en modo profesor.
- **Columna derecha (estilo HackerRank):** editor Java, casos de prueba visibles y ocultos, consola, problemas, diagrama UML con fuente PlantUML y registro de eventos.
  - **Ejecutar código** corre los casos de ejemplo y anima el escenario.
  - **Enviar** corre además los casos ocultos; si todos pasan, el capítulo queda superado (+100 XP).

## Puesta en marcha

```bash
npm install
npm run dev          # servidor de desarrollo
npm test             # pruebas del motor, los niveles y el asistente
npm run build        # versión para publicar en dist/
npm run build:single # un solo index.html autocontenido en dist-single/
```

El workflow `.github/workflows/pages.yml` prueba, compila y publica en GitHub Pages en cada push a `main` (activa Pages con «GitHub Actions» como fuente).

## Uso en clase sin servidor: avance, entregable y panel del profesor

- **Identificación:** al abrir ClassBots por primera vez, Chispa pide el nombre y, si se quiere, el grupo.
- **Métricas que se registran** por capítulo y por paso de misión:
  - **Aprendizaje:** tiempo activo (pestaña visible con actividad reciente), ejecuciones, envíos, intentos y tiempo hasta superarlo, si lo superó al primer envío, errores de compilación, estructura y ejecución por tema, pruebas que fallaron, pistas y solución vista.
  - **Escritura:** caracteres tecleados, borrados, autocompletados y aceptados de la IA del taller; pegados (cantidad, caracteres, el mayor) y si vienen **de fuera** de ClassBots (lo copiado dentro del editor o de la lección no cuenta).
  - **Ventana:** salidas de la pestaña o de la ventana, tiempo fuera, y pegados externos en los 20 s siguientes a volver (el patrón de copiar de un chat de IA).
  - **Estilo de los envíos:** rasgos poco habituales en el curso en las líneas que escribió el estudiante (Javadoc, comentarios o nombres en inglés, lambdas, streams, `var`, `String.format`, `try/catch`, APIs no vistas).
  - **Indicio de copia o IA** (bajo, medio o alto) con sus razones. Es una heurística para conversar con el estudiante, **no una prueba**.
- **Clases (sin tocar el repositorio):** desde el acceso docente o el Panel del profesor, «Crear una clase» pide nombre y contraseña. ClassBots genera un par de llaves **ECDH P-256** solo para esa clase y guarda la privada cifrada con la contraseña (PBKDF2-SHA256, 600 000 iteraciones, y AES-GCM).
  - **Copiar enlace** da un enlace `…/?clase=…` para compartir con los estudiantes. Al abrirlo, su avance queda asociado a la clase. También pueden pegar el enlace en la bienvenida o en «Mi avance».
  - Cada archivo de estudiante lleva su clase. En cualquier computador, el profesor arrastra los archivos, escribe la contraseña y el panel **reconstruye la llave correcta**: no hay archivos de llave que guardar.
  - La contraseña no se puede recuperar. Al ir en los archivos, una contraseña débil podría adivinarse por fuerza bruta, así que conviene usar una frase larga.
- **Cifrado de las métricas:** las métricas nunca se guardan ni se descargan legibles. Cada sesión las sella para la clase del estudiante (ECDH P-256 + HKDF + AES-GCM 256). Si el estudiante no tiene clase, se sellan con la llave pública del despliegue (RSA-OAEP 3072, opción avanzada del panel).
- **Identidad:** el historial cifrado registra el alta, los cambios de nombre o de grupo, los avances cargados de otro perfil y los cambios de clase. El panel además cruza los archivos de la clase:
  - **mismo perfil con otro nombre**, es decir, una sesión entregada como dos estudiantes;
  - **sesiones de trabajo compartidas** entre estudiantes distintos;
  - **código idéntico** en capítulos no triviales y **comentarios propios idénticos**;
  - **mismo computador**, solo como dato (en un laboratorio es normal).
- **Mi avance** (botón con el nombre): el estudiante ve solo su progreso (capítulos, mundos, misiones). Desde ahí puede **⬇ Descargar mi avance** (el `.json` entregable, que también sirve para seguir en otro equipo), **⬆ Cargar un avance** o **Cambiar de estudiante**.
- **Modo profesor (secreto):** un gesto oculto, que el autor comparte con los docentes y no se publica, abre el *acceso docente*. Solo se activa entrando a una clase con su contraseña o creando una nueva. Dura hasta cerrar la pestaña, así que en un equipo compartido no queda activo, y cada activación o intento fallido queda en el historial cifrado del perfil.
- **Panel del profesor** (menú de usuario, en modo profesor):
  - carga tu **llave privada** (queda solo en esa pestaña) y arrastra los `.json` de la clase;
  - verás los indicadores del grupo, los capítulos más difíciles, los errores frecuentes, la tabla con indicio de copia o IA y el detalle por capítulo con el código del estudiante;
  - exporta **CSV resumen** y **CSV por capítulo** (separados por `;`).
- **Revisión de los archivos:** el panel avisa si un archivo fue editado a mano, si falta un segmento de métricas, si hay capítulos superados sin registro o si las métricas son de otro estudiante.
- **Llave del despliegue (avanzado):** para estudiantes sin clase, el repositorio trae una llave pública (`src/metricas/llaveProfesor.js`), que se puede reemplazar con la variable `VITE_LLAVE_PROFESOR`. Su llave privada se carga en «Avanzado» del panel.
- **Límites sin servidor:**
  - si el estudiante borra los datos del navegador sin descargar, pierde su avance;
  - alguien con conocimientos podría fabricar un archivo nuevo cifrado con la llave pública; el panel no lo detecta todo;
  - el código de los capítulos viaja en claro, porque el estudiante lo necesita para continuar.

## Aula en vivo (opcional, con servidor propio)

Si la clase tiene **servidor del aula**, el profesor ve en vivo a cada estudiante y le puede escribir. Sin servidor, todo funciona igual con los archivos.

- **Al crear la clase**, el campo «📡 Aula en vivo» trae la dirección del servidor (por defecto `wss://aula.eehub.ing/aula`; se cambia con la variable `VITE_AULA_URL` al compilar, o el profesor escribe otra). La clase genera además una llave de firma **ECDSA P-256** protegida con la misma contraseña, y su id se deriva de sus llaves públicas.
- **El estudiante** que entra con el enlace se conecta solo y envía, **cifrado para la clase**:
  - cada 3 s, si algo cambió: capítulo, código abierto, errores, resultado de las pruebas, si está fuera de la ventana o inactivo;
  - cada minuto y al superar un capítulo: su archivo de avance completo (el mismo `.json`, comprimido).
  El juego le avisa en la bienvenida y en «Mi avance» que la clase usa el aula en vivo, y muestra el estado de la conexión.
- **El profesor**, en el Panel con la clase abierta, ve las tarjetas de la clase (🟢 trabajando, 🟡 inactivo, 🟠 fuera de la ventana, ⚫ desconectado), el código de cualquier estudiante en tiempo real, y puede enviar mensajes a uno o a todos. Los archivos que llegan del aula entran en las mismas tablas, indicadores y alertas que los archivos arrastrados.
- **Seguridad:** el servidor solo guarda y reenvía sobres cerrados; no puede leer métricas ni código. Para recibir datos, el profesor firma un reto con la llave de la clase, así que adivinar el id de una sala no sirve. Un estudiante no puede enviar mensajes ni recibir los datos de otros.
- **Servidor:** carpeta [`servidor/`](servidor/README.md) (Node.js, WebSocket y SQLite, sin dependencias nativas), con `Dockerfile` y `compose.yaml` endurecidos para **Docker rootless**. Por defecto se publica con Cloudflare Tunnel en su propio contenedor, sin puertos abiertos; también trae configuración para Nginx o Caddy. Incluye `AGENTS.md` para que un agente haga la instalación, y el despliegue publica el paquete en `/classbots-aula.zip`.

## Editor

Basado en CodeMirror 6, con un asistente propio que entiende las clases del proyecto:

| Función | Cómo se usa |
|---|---|
| Autocompletado contextual | Aparece al escribir. Después de `robot.` muestra solo los miembros de `Robot`, y oculta los `private` fuera de la clase. `Ctrl+Espacio` lo abre a mano. |
| Sugerencia en gris (estilo Copilot) | `Tab` acepta, `Ctrl+→` acepta una palabra, `Esc` descarta. Ejemplos: `this.nombre = nombre;` dentro del constructor, `robot = new Robot("", "");` después de `Robot `, `;` al cerrar una instrucción. |
| Plantillas | `sout`, `fori`, `psvm`, `metodo`, `ctor` (constructor con todos los atributos), `getters` e `interfaz`, seguidas de `Tab`. |
| Diagnóstico en vivo | Subrayado y mensaje al final de la línea. Además de los errores de compilación detecta `=` dentro de un `if`, textos comparados con `==`, `nombre = nombre;` sin `this`, métodos llamados sin paréntesis y convenciones de nombres. |
| Corrección rápida | `Ctrl+.` en la línea, o el botón **Corregir** en la pestaña Problemas. |
| Interfaces | Después de `implements` sugiere las interfaces del proyecto; en una línea vacía de la clase propone el método que falta para cumplir el contrato. |
| Ayuda de parámetros | Al escribir `new Robot(` o `r.metodo(` muestra la firma y resalta el parámetro actual. |
| Modo del asistente | **Apagado** (solo diagnóstico, útil en evaluaciones), **Básico** (reglas locales, sin costo) o **IA ✦** (`Alt+\` pide la sugerencia a un modelo). |

### Modo IA

`src/editor/ia.js` elige el proveedor:

1. Si existe `VITE_AI_URL`, hace `POST {prompt}` y espera `{text}` (también acepta el formato de OpenAI). Así las claves quedan en tu servidor.
2. Si la página corre como artifact de Claude con el permiso `sample`, usa la cuenta de quien la abre.
3. Si no hay ninguno, el botón IA queda deshabilitado y el modo básico sigue funcionando.

## Estructura

```
src/
  engine/motor.js       analizador del subconjunto de Java, traductor a JS, runtime con eventos, PlantUML
  levels/mundo1..6.js   capítulos: lección, código inicial, solución y casos de prueba
  levels/misiones.js    misiones opcionales y sus recompensas, separadas de la ruta principal
  levels/niveles.js     catálogo de mundos
  levels/util.js        ayudas para pruebas: caso, exigir, casoRelacion, sinTexto
  levels/evaluar.js     juez: compila, valida estructura, corre cada caso en limpio y prepara la animación
  editor/analisis.js    contexto del cursor, tipos, sugerencias, sugerencia en gris, ayuda de firma
  editor/diagnostico.js errores + advertencias con correcciones
  editor/extensiones.js integración con CodeMirror
  editor/ia.js          proveedor de IA y prompt
  game/sprites.js       fuente 3×5, sprites y paletas en pixel art
  game/PixelStage.jsx   escenas: mesa de planos, línea de ensamble y pasillo
  game/escenas2.js      escenas de la bóveda, las conexiones y la estación
  components/           lección, editor, panel de resultados, UML con relaciones, guía, avatar
tests/                  pruebas con node:test
e2e/                    recorridos con Playwright sobre dist-single
```

## Agregar un capítulo

Cada capítulo en `niveles.js` define `escena` (`plano`, `taller` o `pasillo`), `archivos`, `inicial(prevFiles)`, `solucion`, `previo(modelo)` para validar estructura, `animacion(C)` para lo que se reproduce en el escenario y `pruebas`:

```js
{ nombre: 'La energía inicial es 100', entrada: 'new Robot("Tornillo", "azul")', oculto: false,
  prueba: ({ run }) => {
    const r = robots(run(C => { new C.Robot('Tornillo', 'azul'); }).rt)[0];
    return caso(r?.energia === 100, 'energia = 100', 'energia = ' + fmt(r?.energia));
  } }
```

## Cómo clasifica las relaciones

`relaciones()` en `src/engine/motor.js` lee el código y decide:

- **Realización:** `A implements B`.
- **Composición:** A guarda un B que crea él mismo (`new B` dentro de A) y nadie se lo pasa desde afuera.
- **Agregación:** A guarda una colección de B que recibe desde afuera.
- **Asociación:** A guarda una sola referencia a un B que existe por su cuenta.
- **Dependencia:** A usa B de paso (parámetro, variable local o `new`) sin guardarlo.

Entre asociación y agregación la frontera es de intención; el taller usa esta regla fija para poder revisarla y lo explica en la guía.

## Límites actuales

- El código del estudiante no corre en una JVM: el motor traduce a JavaScript el subconjunto que usan los mundos 1 a 7 y las misiones (clases, interfaces, herencia con `super`, métodos abstractos, sobrecarga, constructores, métodos, `static`, `final`, casting con `ClassCastException`, excepciones con `throw`, `try/catch/finally`, multi-catch, `throws` y comprobadas, `if`, `for`, `while`, `ArrayList`, `Comparable`, `Collections.sort`, `System.out.println`).
- El formato del registro de eventos (`crear`, `set`, `llamada`, `print`) es el contrato con el escenario: un backend con Java o Kotlin real (Piston, Judge0) puede devolver ese mismo registro y el juego no cambia.
- El progreso se guarda en el navegador (`localStorage`).
