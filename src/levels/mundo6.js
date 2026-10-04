/* Mundo 6 · La Arena: polimorfismo.
   Una misma llamada, muchas respuestas: listas de la clase base, tipo de la variable frente al tipo del objeto,
   sobrecarga frente a redefinición, toString(), polimorfismo por interfaces y un torneo abierto a nuevos luchadores. */
import { caso, corrMain, previoMain, exigir, casoRelacion, sinTexto } from './util.js';
import { parsePrograma, ejecutar } from '../engine/motor.js';

const NORMAL = s => (s || '').replace(/\/\/.*$/gm, '').replace(/\s+/g, ' ').trim();
const conRet = (run, f) => { const h = {}; const r = run(C => { h.v = f(C); }); return { ...r, v: h.v }; };
const salidaDe = rt => rt.salida.join('\n').trim();
/* Lista con la forma de ArrayList para pasarla desde un caso de prueba */
const lista = (...xs) => Object.assign(xs, { size() { return this.length; }, get(i) { return this[i]; }, isEmpty() { return !this.length; } });
const GUIA = '<p class="guia-link">Repasa la <button type="button" class="enlace" data-guia="relaciones">guía de relaciones</button> (herencia y realización) y la <button type="button" class="enlace" data-guia="interfaces">de interfaces</button>.</p>';

/* ---------- Código compartido ---------- */
const LUCHADOR = `public abstract class Luchador {
    protected String nombre;
    protected int energia;

    public Luchador(String nombre) {
        this.nombre = nombre;
        this.energia = 100;
    }

    public String getNombre() {
        return nombre;
    }

    public int getEnergia() {
        return energia;
    }

    public abstract String grito();
}
`;
const ROBOT = `public class Robot extends Luchador {
    public Robot(String nombre) {
        super(nombre);
    }

    @Override
    public String grito() {
        return "¡bip!";
    }
}
`;
const DRON = `public class Dron extends Luchador {
    public Dron(String nombre) {
        super(nombre);
    }

    @Override
    public String grito() {
        return "¡bzzz!";
    }

    public String volar() {
        return "despega";
    }
}
`;
const TANQUE = `public class Tanque extends Luchador {
    public Tanque(String nombre) {
        super(nombre);
    }

    @Override
    public String grito() {
        return "¡CLANK!";
    }
}
`;

/* ---------- 6.1 Todos a la arena ---------- */
const MAIN_LISTA_INI = `import java.util.ArrayList;

public class Main {
    public static void main(String[] args) {
        // 1. Crea una lista ArrayList<Luchador> llamada equipo.
        // 2. Agrega un Robot, un Dron y un Tanque (con el nombre que quieras).
        // 3. Recorre la lista con for (Luchador l : equipo) e imprime
        //    l.getNombre() + ": " + l.grito()
    }
}
`;
const MAIN_LISTA = `import java.util.ArrayList;

public class Main {
    public static void main(String[] args) {
        ArrayList<Luchador> equipo = new ArrayList<>();
        equipo.add(new Robot("Tornillo"));
        equipo.add(new Dron("Zumbi"));
        equipo.add(new Tanque("Coloso"));
        for (Luchador l : equipo) {
            System.out.println(l.getNombre() + ": " + l.grito());
        }
    }
}
`;

/* ---------- 6.2 La etiqueta y el luchador ---------- */
const MAIN_TIPO_INI = `import java.util.ArrayList;

public class Main {
    public static void main(String[] args) {
        ArrayList<Luchador> equipo = new ArrayList<>();
        equipo.add(new Robot("Tornillo"));
        equipo.add(new Dron("Zumbi"));
        equipo.add(new Dron("Avispa"));
        for (Luchador l : equipo) {
            System.out.println(l.grito());
            // Solo los drones vuelan. Esta línea no compila: ¿por qué?
            System.out.println(l.volar());
        }
    }
}
`;
const MAIN_TIPO = `import java.util.ArrayList;

public class Main {
    public static void main(String[] args) {
        ArrayList<Luchador> equipo = new ArrayList<>();
        equipo.add(new Robot("Tornillo"));
        equipo.add(new Dron("Zumbi"));
        equipo.add(new Dron("Avispa"));
        for (Luchador l : equipo) {
            System.out.println(l.grito());
            if (l instanceof Dron) {
                Dron d = (Dron) l;
                System.out.println(d.volar());
            }
        }
    }
}
`;

/* ---------- 6.3 Mismo nombre, otra firma ---------- */
const ARBITRO_INI = `public class Arbitro {
    // Escribe tres versiones de anunciar (sobrecarga):
    //   anunciar(String nombre)            → "Entra " + nombre
    //   anunciar(String nombre, int ronda) → "Ronda " + ronda + ": " + nombre
    //   anunciar(Luchador l)               → "Entra " + l.getNombre() + " con " + l.getEnergia()
}
`;
const ARBITRO = `public class Arbitro {
    public String anunciar(String nombre) {
        return "Entra " + nombre;
    }

    public String anunciar(String nombre, int ronda) {
        return "Ronda " + ronda + ": " + nombre;
    }

    public String anunciar(Luchador l) {
        return "Entra " + l.getNombre() + " con " + l.getEnergia();
    }
}
`;
const MAIN_ARBITRO = `public class Main {
    public static void main(String[] args) {
        Arbitro arbitro = new Arbitro();
        Robot tornillo = new Robot("Tornillo");
        System.out.println(arbitro.anunciar("Coloso"));
        System.out.println(arbitro.anunciar("Zumbi", 2));
        System.out.println(arbitro.anunciar(tornillo));
    }
}
`;

/* ---------- 6.4 Cada quien se presenta ---------- */
const LUCHADOR_TOSTRING_INI = LUCHADOR.replace('    public abstract String grito();', `    // Redefine toString() para que devuelva: nombre + " (" + energia + ")"

    public abstract String grito();`);
const LUCHADOR_TOSTRING = LUCHADOR.replace('    public abstract String grito();', `    @Override
    public String toString() {
        return nombre + " (" + energia + ")";
    }

    public abstract String grito();`);
const TANQUE_TOSTRING_INI = TANQUE.replace(/\n}\n$/, `

    // Redefine toString() reutilizando la versión de Luchador con super.toString()
    // y agrega " [blindado]" al final.
}
`);
const TANQUE_TOSTRING = TANQUE.replace(/\n}\n$/, `

    @Override
    public String toString() {
        return super.toString() + " [blindado]";
    }
}
`);
const MAIN_TOSTRING = `import java.util.ArrayList;

public class Main {
    public static void main(String[] args) {
        ArrayList<Luchador> equipo = new ArrayList<>();
        equipo.add(new Robot("Tornillo"));
        equipo.add(new Tanque("Coloso"));
        for (Luchador l : equipo) {
            System.out.println(l);
        }
    }
}
`;

/* ---------- 6.5 Polimorfismo por contrato ---------- */
const ATACANTE = `public interface Atacante {
    int golpe();
}
`;
const ROBOT_ATACANTE = `public class Robot extends Luchador implements Atacante {
    public Robot(String nombre) {
        super(nombre);
    }

    @Override
    public String grito() {
        return "¡bip!";
    }

    @Override
    public int golpe() {
        return 10;
    }
}
`;
const DRON_ATACANTE = `public class Dron extends Luchador implements Atacante {
    public Dron(String nombre) {
        super(nombre);
    }

    @Override
    public String grito() {
        return "¡bzzz!";
    }

    @Override
    public int golpe() {
        return 7;
    }
}
`;
const TORRETA_INI = `// Torreta.java
// Una torreta NO es un Luchador (no tiene nombre ni energía), pero sí puede atacar.
// Declara public class Torreta implements Atacante y haz que golpe() devuelva 15.
`;
const TORRETA = `public class Torreta implements Atacante {
    @Override
    public int golpe() {
        return 15;
    }
}
`;
const ARENA_INI = `import java.util.ArrayList;

public class Arena {
    // Escribe public static int totalDanio(ArrayList<Atacante> atacantes)
    // que sume el golpe() de cada atacante, sin preguntar de qué clase es.
}
`;
const ARENA = `import java.util.ArrayList;

public class Arena {
    public static int totalDanio(ArrayList<Atacante> atacantes) {
        int total = 0;
        for (Atacante a : atacantes) {
            total = total + a.golpe();
        }
        return total;
    }
}
`;
const MAIN_CONTRATO = `import java.util.ArrayList;

public class Main {
    public static void main(String[] args) {
        ArrayList<Atacante> atacantes = new ArrayList<>();
        atacantes.add(new Robot("Tornillo"));
        atacantes.add(new Dron("Zumbi"));
        atacantes.add(new Torreta());
        System.out.println("Daño total: " + Arena.totalDanio(atacantes));
    }
}
`;

/* ---------- 6.6 Jefe: el gran torneo ---------- */
const LUCHADOR_TORNEO = `public abstract class Luchador {
    protected String nombre;
    protected int energia;

    public Luchador(String nombre) {
        this.nombre = nombre;
        this.energia = 100;
    }

    public String getNombre() {
        return nombre;
    }

    public int getEnergia() {
        return energia;
    }

    public void recibir(int danio) {
        energia = energia - danio;
        if (energia < 0) {
            energia = 0;
        }
    }

    public abstract int golpe();
}
`;
const TORNEO = `import java.util.ArrayList;

// Torneo está sellado: no lo modifiques. Funciona con cualquier Luchador.
public class Torneo {
    private ArrayList<Luchador> luchadores = new ArrayList<>();

    public void inscribir(Luchador l) {
        luchadores.add(l);
    }

    public void ronda() {
        for (int i = 0; i < luchadores.size(); i++) {
            Luchador atacante = luchadores.get(i);
            Luchador rival = luchadores.get((i + 1) % luchadores.size());
            rival.recibir(atacante.golpe());
        }
    }

    public void mostrar() {
        for (Luchador l : luchadores) {
            System.out.println(l.getNombre() + ": " + l.getEnergia());
        }
    }

    public Luchador ganador() {
        Luchador mejor = luchadores.get(0);
        for (Luchador l : luchadores) {
            if (l.getEnergia() > mejor.getEnergia()) {
                mejor = l;
            }
        }
        return mejor;
    }
}
`;
const MAIN_TORNEO = `public class Main {
    public static void main(String[] args) {
        Torneo torneo = new Torneo();
        torneo.inscribir(new Robot("Tornillo"));
        torneo.inscribir(new Tanque("Coloso"));
        torneo.inscribir(new Sanador("Chispita"));
        for (int r = 1; r <= 3; r++) {
            torneo.ronda();
        }
        torneo.mostrar();
        System.out.println("Ganador: " + torneo.ganador().getNombre());
    }
}
`;
const R_INI = nombre => `// ${nombre}.java\n`;
const ROBOT_TORNEO_INI = `${R_INI('Robot')}// Robot extends Luchador. Constructor con super(nombre). golpe() devuelve 10.
`;
const TANQUE_TORNEO_INI = `${R_INI('Tanque')}// Tanque extends Luchador. golpe() devuelve 6.
// Su blindaje le hace recibir solo la mitad del daño:
// redefine recibir(int danio) y llama a super.recibir(danio / 2).
`;
const SANADOR_TORNEO_INI = `${R_INI('Sanador')}// Sanador extends Luchador. golpe() devuelve 4.
// Después de recibir un golpe se cura 3 puntos (sin pasar de 100):
// redefine recibir(int danio), llama a super.recibir(danio) y luego suma 3.
`;
const ROBOT_TORNEO = `public class Robot extends Luchador {
    public Robot(String nombre) {
        super(nombre);
    }

    @Override
    public int golpe() {
        return 10;
    }
}
`;
const TANQUE_TORNEO = `public class Tanque extends Luchador {
    public Tanque(String nombre) {
        super(nombre);
    }

    @Override
    public int golpe() {
        return 6;
    }

    @Override
    public void recibir(int danio) {
        super.recibir(danio / 2);
    }
}
`;
const SANADOR_TORNEO = `public class Sanador extends Luchador {
    public Sanador(String nombre) {
        super(nombre);
    }

    @Override
    public int golpe() {
        return 4;
    }

    @Override
    public void recibir(int danio) {
        super.recibir(danio);
        energia = energia + 3;
        if (energia > 100) {
            energia = 100;
        }
    }
}
`;
const NINJA = `public class Ninja extends Luchador {
    public Ninja(String nombre) {
        super(nombre);
    }

    @Override
    public int golpe() {
        return 20;
    }
}
`;
const SALIDA_TORNEO = 'Tornillo: 88\nColoso: 85\nChispita: 91\nGanador: Chispita';

export const MUNDO6 = [
  {
    id: 'arena-lista', titulo: 'Todos a la arena', concepto: 'Polimorfismo', escena: 'arena',
    archivos: ['Main.java', 'Luchador.java', 'Robot.java', 'Dron.java', 'Tanque.java'],
    mentor: '¡Bienvenido a la Arena! Aquí llegan luchadores de todas las clases. El presentador no necesita saber quién es quién: le pide a cada uno su grito y cada cual responde a su manera.',
    teoria: `<p><strong>Polimorfismo</strong> significa «muchas formas»: una misma llamada, como <code>l.grito()</code>, produce resultados distintos según el objeto que la recibe.</p>
<p>Como <code>Robot</code>, <code>Dron</code> y <code>Tanque</code> <em>son</em> <code>Luchador</code>, caben en una <code>ArrayList&lt;Luchador&gt;</code>. Al recorrerla, Java ejecuta la versión de <code>grito()</code> de la clase real de cada objeto. A esto se le llama <strong>despacho dinámico</strong>.</p>
<p>La gran ventaja: el código que recorre la lista no usa <code>if</code> para preguntar el tipo. Si mañana llega otro luchador, el recorrido no cambia.</p>`,
    ejemplo: 'ArrayList<Luchador> equipo = new ArrayList<>();\nequipo.add(new Robot("Tornillo"));\nfor (Luchador l : equipo) {\n    System.out.println(l.grito());\n}',
    tareas: ['En <code>Main</code>, crea una <code>ArrayList&lt;Luchador&gt;</code> llamada <code>equipo</code>.', 'Agrega un <code>Robot</code>, un <code>Dron</code> y un <code>Tanque</code>.', 'Recórrela e imprime <code>l.getNombre() + ": " + l.grito()</code>. No uses <code>instanceof</code> ni <code>if</code>: deja que cada objeto responda.'],
    nota: 'Mira la escena: cuando cada luchador responde, el globo muestra de qué clase es la versión que se ejecutó.',
    pista: 'El tipo de la lista es la clase base: <code>ArrayList&lt;Luchador&gt;</code>. Dentro del <code>for</code>, la variable también es <code>Luchador</code>.',
    objetivoUML: [['Robot', 'Luchador', 'herencia'], ['Dron', 'Luchador', 'herencia'], ['Tanque', 'Luchador', 'herencia']],
    inicial: () => ({ 'Main.java': MAIN_LISTA_INI, 'Luchador.java': LUCHADOR, 'Robot.java': ROBOT, 'Dron.java': DRON, 'Tanque.java': TANQUE }),
    archivoInicial: 'Main.java',
    solucion: { 'Main.java': MAIN_LISTA, 'Luchador.java': LUCHADOR, 'Robot.java': ROBOT, 'Dron.java': DRON, 'Tanque.java': TANQUE },
    previo: m => exigir(m, [{ clase: 'Luchador', metodos: [['grito', 0]] }, { clase: 'Robot' }, { clase: 'Dron' }, { clase: 'Tanque' }]) || previoMain(m),
    animacion: corrMain,
    pruebas: [
      { nombre: 'Hay un luchador de cada clase', prueba: ({ run }) => {
        const { rt } = run(corrMain);
        const cls = new Set(rt.registro.map(r => r.cls));
        const ok = ['Robot', 'Dron', 'Tanque'].every(c => cls.has(c));
        return caso(ok, 'Robot, Dron y Tanque', [...cls].join(', ') || 'ningún objeto');
      } },
      { nombre: 'Cada uno grita a su manera', prueba: ({ run }) => {
        const { rt } = run(corrMain);
        const lineas = rt.salida.map(String);
        const gritos = lineas.map(l => (/: (¡bip!|¡bzzz!|¡CLANK!)$/.exec(l) || [])[1]).filter(Boolean);
        const ok = lineas.length === 3 && new Set(gritos).size === 3;
        return caso(ok, '3 líneas «nombre: grito» con ¡bip!, ¡bzzz! y ¡CLANK!', lineas.join(' / ') || '(sin salida)');
      } },
      { nombre: 'El recorrido no pregunta el tipo', prueba: ({ archivos }) => {
        const ok = sinTexto(archivos, 'Main.java', /\binstanceof\b|getClass\s*\(/);
        return caso(ok, 'sin instanceof ni getClass()', ok ? 'cada objeto responde solo' : 'Main pregunta el tipo');
      } },
      { nombre: 'La lista es de la clase base', oculto: true, prueba: ({ archivos }) => {
        const ok = /ArrayList\s*<\s*Luchador\s*>/.test(NORMAL(archivos['Main.java']));
        return caso(ok, 'ArrayList<Luchador>', ok ? 'correcto' : 'la lista no es de tipo Luchador');
      } },
    ],
    exito: 'Una sola llamada, tres respuestas distintas: eso es polimorfismo. El recorrido ni siquiera sabe quién es quién.',
  },
  {
    id: 'arena-tipo', titulo: 'La etiqueta y el luchador', concepto: 'Tipo de la variable y casting', escena: 'arena',
    archivos: ['Main.java', 'Luchador.java', 'Robot.java', 'Dron.java'],
    mentor: 'Los drones quieren volar en la exhibición, pero el compilador se queja. La variable dice «Luchador», y no todo luchador sabe volar. Ayúdame a preguntar con cuidado.',
    teoria: `<p>Toda variable tiene dos tipos que conviene distinguir:</p>
<ul><li>El <strong>tipo declarado</strong> (la etiqueta): en <code>Luchador l</code> es <code>Luchador</code>. Decide <em>qué métodos se pueden llamar</em> y lo revisa el compilador.</li>
<li>El <strong>tipo real del objeto</strong>: puede ser <code>Dron</code>. Decide <em>qué versión se ejecuta</em>, en tiempo de ejecución.</li></ul>
<p>Por eso <code>l.volar()</code> no compila aunque el objeto sea un dron. Para usar lo específico, primero se comprueba con <code>instanceof</code> y luego se hace un <strong>cast</strong> (conversión hacia abajo): <code>Dron d = (Dron) l;</code>. Si haces el cast sin comprobar y el objeto no es un dron, Java lanza <code>ClassCastException</code>.</p>`,
    ejemplo: 'if (l instanceof Dron) {\n    Dron d = (Dron) l;\n    System.out.println(d.volar());\n}',
    tareas: ['Ejecuta el código y lee el error del compilador en la línea de <code>l.volar()</code>.', 'Deja que todos griten con <code>l.grito()</code>: eso sí lo tiene cualquier <code>Luchador</code>.', 'Solo si <code>l instanceof Dron</code>, conviértelo con <code>(Dron) l</code> y llama a <code>volar()</code>.'],
    nota: '<code>instanceof</code> es la herramienta correcta para lo que <em>solo</em> tiene una subclase. Si lo usas para todo, estás desaprovechando el polimorfismo del capítulo anterior.',
    pista: 'La salida esperada es: ¡bip!, ¡bzzz!, despega, ¡bzzz!, despega (una por línea).',
    objetivoUML: [['Robot', 'Luchador', 'herencia'], ['Dron', 'Luchador', 'herencia']],
    inicial: () => ({ 'Main.java': MAIN_TIPO_INI, 'Luchador.java': LUCHADOR, 'Robot.java': ROBOT, 'Dron.java': DRON }),
    archivoInicial: 'Main.java',
    solucion: { 'Main.java': MAIN_TIPO, 'Luchador.java': LUCHADOR, 'Robot.java': ROBOT, 'Dron.java': DRON },
    previo: m => exigir(m, [{ clase: 'Luchador' }, { clase: 'Robot' }, { clase: 'Dron', metodos: [['volar', 0]] }]) || previoMain(m),
    animacion: corrMain,
    pruebas: [
      { nombre: 'Todos gritan y solo los drones vuelan', prueba: ({ run }) => {
        const { rt } = run(corrMain);
        const t = salidaDe(rt);
        return caso(t === '¡bip!\n¡bzzz!\ndespega\n¡bzzz!\ndespega', '¡bip! ¡bzzz! despega ¡bzzz! despega', rt.salida.join(' ') || '(sin salida)');
      } },
      { nombre: 'Comprueba el tipo antes del cast', prueba: ({ archivos }) => {
        const t = NORMAL(archivos['Main.java']);
        const ok = /instanceof\s+Dron/.test(t) && /\(\s*Dron\s*\)/.test(t);
        return caso(ok, 'instanceof Dron y (Dron) l', ok ? 'correcto' : /\(\s*Dron\s*\)/.test(t) ? 'hay cast pero falta instanceof' : 'falta el cast a Dron');
      } },
      { nombre: 'La lista sigue siendo de Luchador', oculto: true, prueba: ({ archivos }) => {
        const ok = /ArrayList\s*<\s*Luchador\s*>/.test(NORMAL(archivos['Main.java']));
        return caso(ok, 'ArrayList<Luchador>', ok ? 'correcto' : 'cambiaste el tipo de la lista');
      } },
    ],
    exito: 'La etiqueta decide qué puedes pedir; el objeto decide cómo responde. Y cuando necesitas lo específico, instanceof y el cast te cuidan la espalda.',
  },
  {
    id: 'arena-sobrecarga', titulo: 'Mismo nombre, otra firma', concepto: 'Sobrecarga de métodos', escena: 'arena',
    archivos: ['Arbitro.java', 'Main.java', 'Luchador.java', 'Robot.java'],
    mentor: 'El árbitro anuncia a los luchadores, pero a veces solo tiene el nombre, a veces la ronda y a veces al luchador completo. Un solo nombre de método puede atender los tres casos.',
    teoria: `<p>La <strong>sobrecarga</strong> permite varios métodos con el mismo nombre en una clase, siempre que su lista de parámetros sea distinta (cantidad o tipos). Java elige la versión según los argumentos de la llamada, <em>al compilar</em>.</p>
<p>No la confundas con la <strong>redefinición</strong> (<code>@Override</code>), que vimos en el Mundo 5:</p>
<ul><li><strong>Sobrecarga</strong>: misma clase, mismo nombre, <em>distintos parámetros</em>. Decide el compilador.</li>
<li><strong>Redefinición</strong>: subclase, <em>misma firma</em> que el padre. Decide el objeto al ejecutar.</li></ul>
<p>El nombre de los parámetros y el tipo de retorno no cuentan para distinguir una sobrecarga.</p>`,
    ejemplo: 'public String anunciar(String nombre) { ... }\npublic String anunciar(String nombre, int ronda) { ... }',
    tareas: ['En <code>Arbitro</code>, escribe <code>anunciar(String nombre)</code> que devuelva <code>"Entra " + nombre</code>.', 'Escribe <code>anunciar(String nombre, int ronda)</code> que devuelva <code>"Ronda " + ronda + ": " + nombre</code>.', 'Escribe <code>anunciar(Luchador l)</code> que devuelva <code>"Entra " + l.getNombre() + " con " + l.getEnergia()</code>.'],
    nota: 'Prueba a escribir dos versiones con los mismos tipos de parámetros: el compilador te avisará que la firma está repetida.',
    pista: 'Las tres versiones son <code>public String anunciar(...)</code>; solo cambian los parámetros y lo que devuelven.',
    objetivoUML: [['Robot', 'Luchador', 'herencia']],
    inicial: () => ({ 'Arbitro.java': ARBITRO_INI, 'Main.java': MAIN_ARBITRO, 'Luchador.java': LUCHADOR, 'Robot.java': ROBOT }),
    archivoInicial: 'Arbitro.java',
    solucion: { 'Arbitro.java': ARBITRO, 'Main.java': MAIN_ARBITRO, 'Luchador.java': LUCHADOR, 'Robot.java': ROBOT },
    previo: m => exigir(m, [{ clase: 'Arbitro', metodos: [['anunciar', 1], ['anunciar', 2]] }]) || previoMain(m),
    animacion: corrMain,
    pruebas: [
      { nombre: 'Arbitro tiene tres versiones de anunciar', prueba: ({ modelo }) => {
        const ms = (modelo.clases.Arbitro?.metodos || []).filter(m => m.nombre === 'anunciar');
        const firmas = ms.map(m => `(${m.params.map(p => p.tipo).join(', ')})`);
        const ok = ['(String)', '(String, int)', '(Luchador)'].every(f => firmas.includes(f));
        return caso(ok, '(String), (String, int) y (Luchador)', firmas.join(' ') || 'ninguna');
      } },
      { nombre: 'Con solo el nombre', entrada: 'anunciar("Coloso")', prueba: ({ run }) => {
        const { v } = conRet(run, C => new C.Arbitro().anunciar('Coloso'));
        return caso(v === 'Entra Coloso', 'Entra Coloso', String(v));
      } },
      { nombre: 'Con nombre y ronda', entrada: 'anunciar("Zumbi", 2)', prueba: ({ run }) => {
        const { v } = conRet(run, C => new C.Arbitro().anunciar('Zumbi', 2));
        return caso(v === 'Ronda 2: Zumbi', 'Ronda 2: Zumbi', String(v));
      } },
      { nombre: 'Con el luchador completo', entrada: 'anunciar(new Robot("Tornillo"))', prueba: ({ run }) => {
        const { v } = conRet(run, C => new C.Arbitro().anunciar(new C.Robot('Tornillo')));
        return caso(v === 'Entra Tornillo con 100', 'Entra Tornillo con 100', String(v));
      } },
      { nombre: 'Otros valores', oculto: true, entrada: 'anunciar("Avispa", 7) y un robot con 40 de energía', prueba: ({ run }) => {
        const { v } = conRet(run, C => { const r = new C.Robot('Bulón'); r.energia = 40; const a = new C.Arbitro(); return [a.anunciar('Avispa', 7), a.anunciar(r), a.anunciar('X')]; });
        const ok = String(v) === 'Ronda 7: Avispa,Entra Bulón con 40,Entra X';
        return caso(ok, 'Ronda 7: Avispa / Entra Bulón con 40 / Entra X', (v || []).join(' / '));
      } },
    ],
    exito: 'Tres anuncios con un solo nombre de método: el compilador elige la versión mirando los argumentos.',
  },
  {
    id: 'arena-tostring', titulo: 'Cada quien se presenta', concepto: 'Redefinir toString()', escena: 'arena',
    archivos: ['Luchador.java', 'Tanque.java', 'Main.java', 'Robot.java'],
    mentor: 'Cuando imprimo a un luchador sale algo como Robot#1. ¡Qué poco elegante! Todas las clases heredan toString() de Object, y podemos redefinirlo para que cada uno se presente bien.',
    teoria: `<p>En Java toda clase hereda, en última instancia, de <code>Object</code>. Uno de los métodos que recibe es <code>toString()</code>, que <code>System.out.println(objeto)</code> llama automáticamente.</p>
<p>Si lo redefines en la clase base, todas las hijas lo heredan. Y una hija puede <em>extenderlo</em> sin repetir código llamando a <code>super.toString()</code> y agregando lo suyo.</p>
<p>Así <code>println(l)</code> es otra llamada polimórfica: cada objeto decide cómo presentarse.</p>`,
    ejemplo: '@Override\npublic String toString() {\n    return super.toString() + " [blindado]";\n}',
    tareas: ['En <code>Luchador</code>, redefine <code>toString()</code> para devolver <code>nombre + " (" + energia + ")"</code>.', 'En <code>Tanque</code>, redefine <code>toString()</code> usando <code>super.toString()</code> y agrega <code>" [blindado]"</code>.', 'Ejecuta: <code>Main</code> imprime la lista con <code>System.out.println(l)</code>.'],
    nota: 'No necesitas escribir <code>toString()</code> en <code>Robot</code>: lo hereda de <code>Luchador</code>.',
    pista: 'La salida esperada es <code>Tornillo (100)</code> y <code>Coloso (100) [blindado]</code>.',
    objetivoUML: [['Robot', 'Luchador', 'herencia'], ['Tanque', 'Luchador', 'herencia']],
    inicial: () => ({ 'Luchador.java': LUCHADOR_TOSTRING_INI, 'Tanque.java': TANQUE_TOSTRING_INI, 'Main.java': MAIN_TOSTRING, 'Robot.java': ROBOT }),
    archivoInicial: 'Luchador.java',
    solucion: { 'Luchador.java': LUCHADOR_TOSTRING, 'Tanque.java': TANQUE_TOSTRING, 'Main.java': MAIN_TOSTRING, 'Robot.java': ROBOT },
    previo: m => exigir(m, [{ clase: 'Luchador', metodos: [['toString', 0]] }, { clase: 'Tanque', metodos: [['toString', 0]] }]) || previoMain(m),
    animacion: corrMain,
    pruebas: [
      { nombre: 'Cada luchador se presenta', prueba: ({ run }) => {
        const { rt } = run(corrMain);
        const t = salidaDe(rt);
        return caso(t === 'Tornillo (100)\nColoso (100) [blindado]', 'Tornillo (100) / Coloso (100) [blindado]', rt.salida.join(' / ') || '(sin salida)');
      } },
      { nombre: 'Tanque reutiliza la versión del padre', prueba: ({ archivos }) => {
        const ok = /super\s*\.\s*toString\s*\(\s*\)/.test(NORMAL(archivos['Tanque.java']));
        return caso(ok, 'super.toString() en Tanque', ok ? 'correcto' : 'Tanque repite el texto en vez de usar super');
      } },
      { nombre: 'Robot hereda toString() sin escribirlo', prueba: ({ modelo }) => {
        const r = modelo.clases.Robot;
        const ok = r && !r.metodos.some(m => m.nombre === 'toString') && (r.__metodos || []).some(m => m.nombre === 'toString');
        return caso(ok, 'toString() heredado de Luchador', ok ? 'heredado' : r?.metodos.some(m => m.nombre === 'toString') ? 'Robot lo redefinió' : 'no lo hereda');
      } },
      { nombre: 'Funciona con otra energía', oculto: true, entrada: 'un Tanque con 37 de energía', prueba: ({ run }) => {
        const { v } = conRet(run, C => { const t = new C.Tanque('Muro'); t.energia = 37; return t.toString(); });
        return caso(v === 'Muro (37) [blindado]', 'Muro (37) [blindado]', String(v));
      } },
    ],
    exito: 'Ahora cada luchador se presenta solo: println llama a toString(), y cada clase decide su versión.',
  },
  {
    id: 'arena-contrato', titulo: 'Polimorfismo por contrato', concepto: 'Polimorfismo con interfaces', escena: 'arena',
    archivos: ['Torreta.java', 'Arena.java', 'Main.java', 'Atacante.java', 'Luchador.java', 'Robot.java', 'Dron.java'],
    mentor: 'Llegó una torreta. No es un luchador: no tiene nombre ni energía, pero dispara. ¿Cómo la sumamos al conteo de daño sin hacerla heredar de Luchador?',
    teoria: `<p>El polimorfismo no exige herencia de clases. Una <strong>interfaz</strong> también es un tipo: cualquier objeto cuya clase la implemente puede ir en una variable o lista de ese tipo.</p>
<p><code>Robot</code> y <code>Dron</code> son luchadores <em>y además</em> atacantes. <code>Torreta</code> solo es atacante. Una <code>ArrayList&lt;Atacante&gt;</code> puede reunirlos a todos, porque lo que importa es el contrato <code>golpe()</code>, no el árbol familiar.</p>
<p>Programar contra interfaces deja el código abierto a clases que todavía no existen.</p>`,
    ejemplo: 'for (Atacante a : atacantes) {\n    total = total + a.golpe();\n}',
    tareas: ['Crea <code>Torreta implements Atacante</code> con <code>golpe()</code> que devuelva <code>15</code>. No debe extender <code>Luchador</code>.', 'En <code>Arena</code>, escribe <code>public static int totalDanio(ArrayList&lt;Atacante&gt; atacantes)</code>, que sume los golpes.', 'Ejecuta: <code>Main</code> debe imprimir <code>Daño total: 32</code>.'],
    nota: GUIA,
    pista: 'Dentro de <code>totalDanio</code> usa <code>for (Atacante a : atacantes)</code> y acumula <code>a.golpe()</code> en un <code>int</code>.',
    objetivoUML: [['Robot', 'Atacante', 'realizacion'], ['Dron', 'Atacante', 'realizacion'], ['Torreta', 'Atacante', 'realizacion'], ['Robot', 'Luchador', 'herencia']],
    inicial: () => ({ 'Torreta.java': TORRETA_INI, 'Arena.java': ARENA_INI, 'Main.java': MAIN_CONTRATO, 'Atacante.java': ATACANTE, 'Luchador.java': LUCHADOR, 'Robot.java': ROBOT_ATACANTE, 'Dron.java': DRON_ATACANTE }),
    archivoInicial: 'Torreta.java',
    solucion: { 'Torreta.java': TORRETA, 'Arena.java': ARENA, 'Main.java': MAIN_CONTRATO, 'Atacante.java': ATACANTE, 'Luchador.java': LUCHADOR, 'Robot.java': ROBOT_ATACANTE, 'Dron.java': DRON_ATACANTE },
    previo: m => exigir(m, [{ clase: 'Atacante', interfaz: true }, { clase: 'Torreta', metodos: [['golpe', 0]], implementa: ['Atacante'] }, { clase: 'Arena', metodos: [['totalDanio', 1]] }]) || previoMain(m),
    animacion: corrMain,
    pruebas: [
      casoRelacion('Torreta', 'Atacante', 'realizacion'),
      { nombre: 'Torreta no es un Luchador', prueba: ({ modelo }) => {
        const t = modelo.clases.Torreta;
        return caso(t && !t.__padre, 'sin extends', t?.__padre ? `extiende ${t.__padre}` : 'correcto');
      } },
      { nombre: 'Main imprime Daño total: 32', prueba: ({ run }) => {
        const { rt } = run(corrMain);
        return caso(salidaDe(rt) === 'Daño total: 32', 'Daño total: 32', salidaDe(rt) || '(sin salida)');
      } },
      { nombre: 'totalDanio suma cualquier atacante', entrada: 'totalDanio([Torreta, Torreta, Dron])', prueba: ({ run }) => {
        const { v } = conRet(run, C => C.Arena.totalDanio(lista(new C.Torreta(), new C.Torreta(), new C.Dron('D'))));
        return caso(v === 37, '37', String(v));
      } },
      { nombre: 'Lista vacía', oculto: true, entrada: 'totalDanio([])', prueba: ({ run }) => {
        const { v } = conRet(run, C => C.Arena.totalDanio(lista()));
        return caso(v === 0, '0', String(v));
      } },
      { nombre: 'Arena no pregunta el tipo', oculto: true, prueba: ({ archivos }) => {
        const ok = sinTexto(archivos, 'Arena.java', /\binstanceof\b|getClass\s*\(/);
        return caso(ok, 'sin instanceof', ok ? 'correcto' : 'Arena pregunta de qué clase es cada atacante');
      } },
    ],
    exito: 'La torreta entra al conteo sin ser luchador: el contrato Atacante basta para el polimorfismo.',
  },
  {
    id: 'arena-torneo', titulo: 'Jefe: el gran torneo', corto: 'Jefe', jefe: true, concepto: 'Polimorfismo y abierto/cerrado', escena: 'arena',
    archivos: ['Robot.java', 'Tanque.java', 'Sanador.java', 'Main.java', 'Luchador.java', 'Torneo.java'],
    mentor: '¡Prueba final! El torneo está sellado: no se toca. Inscribe a un robot, un tanque y un sanador. Cada uno recibe los golpes a su manera, y el torneo jamás pregunta quién es quién.',
    teoria: `<p>El <code>Torneo</code> solo conoce a <code>Luchador</code>: llama a <code>golpe()</code> y <code>recibir()</code> sin saber la clase real. Cada subclase aporta su comportamiento <strong>redefiniendo</strong> esos métodos.</p>
<p>Las reglas del torneo:</p>
<ul><li><code>Robot</code>: golpea 10.</li>
<li><code>Tanque</code>: golpea 6 y, gracias a su blindaje, recibe solo la mitad del daño (<code>super.recibir(danio / 2)</code>).</li>
<li><code>Sanador</code>: golpea 4 y, después de recibir el golpe, se cura 3 puntos, sin pasar de 100.</li></ul>
<p>En cada ronda, cada luchador golpea al siguiente de la lista (y el último al primero). Tras 3 rondas debe ganar el sanador.</p>`,
    ejemplo: '@Override\npublic void recibir(int danio) {\n    super.recibir(danio / 2);\n}',
    tareas: ['Escribe <code>Robot</code>, <code>Tanque</code> y <code>Sanador</code>, que extienden <code>Luchador</code>, con constructor <code>super(nombre)</code> y su <code>golpe()</code>.', 'En <code>Tanque</code> y <code>Sanador</code>, redefine <code>recibir(int danio)</code> reutilizando <code>super.recibir(...)</code>.', 'No modifiques <code>Torneo.java</code> ni <code>Luchador.java</code>. La salida debe terminar en <code>Ganador: Chispita</code>.'],
    nota: 'Un caso oculto inscribe a un luchador que no conoces, y el torneo debe seguir funcionando sin cambios.',
    pista: 'Salida esperada: <code>Tornillo: 88</code>, <code>Coloso: 85</code>, <code>Chispita: 91</code>, <code>Ganador: Chispita</code>.',
    objetivoUML: [['Robot', 'Luchador', 'herencia'], ['Tanque', 'Luchador', 'herencia'], ['Sanador', 'Luchador', 'herencia']],
    inicial: () => ({ 'Robot.java': ROBOT_TORNEO_INI, 'Tanque.java': TANQUE_TORNEO_INI, 'Sanador.java': SANADOR_TORNEO_INI, 'Main.java': MAIN_TORNEO, 'Luchador.java': LUCHADOR_TORNEO, 'Torneo.java': TORNEO }),
    archivoInicial: 'Robot.java',
    solucion: { 'Robot.java': ROBOT_TORNEO, 'Tanque.java': TANQUE_TORNEO, 'Sanador.java': SANADOR_TORNEO, 'Main.java': MAIN_TORNEO, 'Luchador.java': LUCHADOR_TORNEO, 'Torneo.java': TORNEO },
    previo: m => exigir(m, [{ clase: 'Robot', metodos: [['golpe', 0]] }, { clase: 'Tanque', metodos: [['golpe', 0], ['recibir', 1]] }, { clase: 'Sanador', metodos: [['golpe', 0], ['recibir', 1]] }]) || previoMain(m),
    animacion: corrMain,
    pruebas: [
      { nombre: 'Torneo y Luchador no cambiaron', prueba: ({ archivos }) => {
        const ok = NORMAL(archivos['Torneo.java']) === NORMAL(TORNEO) && NORMAL(archivos['Luchador.java']) === NORMAL(LUCHADOR_TORNEO);
        return caso(ok, 'iguales a la versión sellada', ok ? 'sin cambios' : 'se modificó una clase sellada');
      } },
      casoRelacion('Tanque', 'Luchador', 'herencia'),
      casoRelacion('Sanador', 'Luchador', 'herencia'),
      { nombre: 'El tanque recibe la mitad', entrada: 'new Tanque("T").recibir(30)', prueba: ({ run }) => {
        const { v } = conRet(run, C => { const t = new C.Tanque('T'); t.recibir(30); return t.getEnergia(); });
        return caso(v === 85, '85', String(v));
      } },
      { nombre: 'El sanador se cura sin pasar de 100', entrada: 'Sanador: recibir(10) y luego recibir(1)', prueba: ({ run }) => {
        const { v } = conRet(run, C => { const s = new C.Sanador('S'); s.recibir(10); const a = s.getEnergia(); s.recibir(1); return [a, s.getEnergia()]; });
        return caso(String(v) === '93,95', '93 y luego 95', (v || []).join(' y '));
      } },
      { nombre: 'Las redefiniciones reutilizan super.recibir', prueba: ({ archivos }) => {
        const usa = a => /super\s*\.\s*recibir\s*\(/.test(NORMAL(archivos[a]));
        const ok = usa('Tanque.java') && usa('Sanador.java');
        return caso(ok, 'super.recibir(...) en Tanque y Sanador', ok ? 'correcto' : ['Tanque', 'Sanador'].filter(n => !usa(n + '.java')).join(' y ') + ' repite la lógica');
      } },
      { nombre: 'Resultado del torneo', prueba: ({ run }) => {
        const { rt } = run(corrMain);
        return caso(salidaDe(rt) === SALIDA_TORNEO, SALIDA_TORNEO.replace(/\n/g, ' / '), rt.salida.join(' / ') || '(sin salida)');
      } },
      { nombre: 'Un luchador desconocido entra al torneo', oculto: true, entrada: 'Ninja (golpe 20) contra tu Tanque', prueba: ({ archivos }) => {
        const m = parsePrograma({ ...archivos, 'Ninja.java': NINJA });
        if (m.errores.length) return caso(false, 'compila con Ninja.java', m.errores[0].msg || 'error');
        const h = {};
        const r = ejecutar(m, C => { const t = new C.Torneo(); const n = new C.Ninja('Kage'), k = new C.Tanque('Muro'); t.inscribir(n); t.inscribir(k); t.ronda(); h.v = [k.getEnergia(), n.getEnergia()]; });
        if (r.error) return caso(false, 'sin errores', r.error);
        return caso(String(h.v) === '90,94', 'Tanque 90, Ninja 94', (h.v || []).join(', '));
      } },
    ],
    exito: '¡Campeón de la Arena! El torneo nunca preguntó quién era quién: cada luchador respondió a su manera. Eso es polimorfismo de verdad.',
  },
];
