# ClassBots

Juego web para aprender programación orientada a objetos en Java. El estudiante escribe clases reales y un robot en pixel art se construye y se mueve según lo que hace su código.

Mundos jugables (28 capítulos):

| Mundo | Tema | Capítulos | Escena |
|---|---|---|---|
| 1 · El Taller | Clases, atributos, constructor, objetos, métodos | 6 | Mesa de planos, línea de ensamble, pasillo |
| 2 · La Bóveda | Encapsulamiento: `private`, getters, setters con validación, invariantes, `static`/`final`, `toString`/`equals` | 7 | Bóveda con Óxido, el saboteador |
| 3 · Las Conexiones | Relaciones: dependencia, asociación, agregación, composición y multiplicidad | 5 | Diagrama de objetos en pixel art |
| 4 · Contratos | Interfaces, programar contra la interfaz, varias interfaces, `Comparable`, abierto/cerrado | 5 | Estación de carga universal |
| 5 · El Árbol | Herencia con `extends`, redefinición, clases abstractas y jerarquías multinivel | 5 | Diagrama de herencia UML |

Los mundos 6 a 9 (polimorfismo y patrones de diseño) aparecen bloqueados en el mapa. Al completar el Mundo 4 se abre una rama opcional con la misión **Módulos de movimiento**, que presenta Strategy y desbloquea el módulo táctico del robot. Las misiones no alteran el avance ni la experiencia de la ruta principal. La **Guía** (botón en la barra superior y enlaces dentro de las lecciones) explica los seis tipos de relación UML, la multiplicidad y las interfaces.

- **Columna izquierda (estilo CryptoZombies):** escenario pixel art, diálogo con Chispa (la jefa del taller), teoría, ejemplo, tarea, pista y respuesta.
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
  levels/mundo1..5.js   capítulos: lección, código inicial, solución y casos de prueba
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

- El código del estudiante no corre en una JVM: el motor traduce a JavaScript el subconjunto que usan los mundos 1 a 5 y la misión Strategy (clases, interfaces, herencia, métodos abstractos, constructores, métodos, `static`, `final`, casting, `if`, `for`, `while`, `ArrayList`, `Comparable`, `Collections.sort`, `System.out.println`).
- El formato del registro de eventos (`crear`, `set`, `llamada`, `print`) es el contrato con el escenario: un backend con Java o Kotlin real (Piston, Judge0) puede devolver ese mismo registro y el juego no cambia.
- El progreso se guarda en el navegador (`localStorage`).
