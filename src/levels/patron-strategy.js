/* Patrón Strategy · «Estilos de combate» (Mundo 8 · La Forja).
   Una cadena de if sobre un texto se convierte en una familia de estilos detrás de una interfaz;
   después el cambio de estilo en ejecución y un mini-jefe sobre herencia frente a composición. */
import { caso, corrMain, exigir, previoMain, casoRelacion, sinTexto } from './util.js';
import { parsePrograma, ejecutar } from '../engine/motor.js';

const NORMAL = s => (s || '').replace(/\/\/.*$/gm, '').replace(/\s+/g, ' ').trim();
const salidaDe = rt => rt.salida.join('\n').trim();
const conRet = (run, f) => { const h = {}; const r = run(C => { h.v = f(C); }); return { ...r, v: h.v }; };
/* Ejecuta el programa del estudiante con archivos extra (para los casos de extensión) */
function conExtra(archivos, extra, arnes) {
  const m = parsePrograma({ ...archivos, ...extra });
  if (m.errores.length) return { error: `${m.errores[0].archivo}:${m.errores[0].linea} ${m.errores[0].msg}` };
  const r = ejecutar(m, arnes);
  return { error: r.error, salida: r.rt.salida };
}
const GUIA = '<p class="guia-link">Al superar este mini-jefe, el patrón queda registrado en el <button type="button" class="enlace" data-guia="patrones">Códice de patrones</button>.</p>';

const GLADIADOR_OLOR = `public class Gladiador {
    private String nombre;
    private int energia = 100;
    private String estilo;

    public Gladiador(String nombre, String estilo) {
        this.nombre = nombre;
        this.estilo = estilo;
    }

    public String getNombre() {
        return nombre;
    }

    public int getEnergia() {
        return energia;
    }

    public int golpe() {
        if (estilo.equals("agresivo")) {
            return 12;
        } else if (estilo.equals("defensivo")) {
            return 4;
        }
        return 8;
    }

    public void recibir(int danio) {
        if (estilo.equals("agresivo")) {
            energia = energia - danio * 2;
        } else if (estilo.equals("defensivo")) {
            energia = energia - danio / 2;
        } else {
            energia = energia - danio;
        }
    }
}
`;
const ESTILO_INI = `// Estilo.java
// Cada if de Gladiador es en realidad un estilo distinto.
// Declara public interface Estilo con dos métodos:
//   int golpe();               cuánto pega
//   int danio(int recibido);   cuánto daño sufre de verdad
`;
const AGRESIVO_INI = `// Agresivo.java
// Implementa Estilo: golpea 12 y sufre el doble del daño.
`;
const DEFENSIVO_INI = `// Defensivo.java
// Implementa Estilo: golpea 4 y sufre la mitad del daño.
`;
const EQUILIBRADO_INI = `// Equilibrado.java
// Implementa Estilo: golpea 8 y sufre el daño tal cual.
`;
const ESTILO = `public interface Estilo {
    int golpe();

    int danio(int recibido);
}
`;
const AGRESIVO = `public class Agresivo implements Estilo {
    @Override
    public int golpe() {
        return 12;
    }

    @Override
    public int danio(int recibido) {
        return recibido * 2;
    }
}
`;
const DEFENSIVO = `public class Defensivo implements Estilo {
    @Override
    public int golpe() {
        return 4;
    }

    @Override
    public int danio(int recibido) {
        return recibido / 2;
    }
}
`;
const EQUILIBRADO = `public class Equilibrado implements Estilo {
    @Override
    public int golpe() {
        return 8;
    }

    @Override
    public int danio(int recibido) {
        return recibido;
    }
}
`;
const GLADIADOR_1 = `public class Gladiador {
    private String nombre;
    private int energia = 100;
    private Estilo estilo;

    public Gladiador(String nombre, Estilo estilo) {
        this.nombre = nombre;
        this.estilo = estilo;
    }

    public String getNombre() {
        return nombre;
    }

    public int getEnergia() {
        return energia;
    }

    public int golpe() {
        return estilo.golpe();
    }

    public void recibir(int danio) {
        energia = energia - estilo.danio(danio);
    }
}
`;
const MAIN_ESTILOS_INI = `public class Main {
    public static void main(String[] args) {
        Gladiador a = new Gladiador("Furia", "agresivo");
        Gladiador b = new Gladiador("Muro", "defensivo");
        Gladiador c = new Gladiador("Fiel", "equilibrado");
        // Cuando Gladiador reciba un Estilo, crea los tres con
        // new Agresivo(), new Defensivo() y new Equilibrado().
        a.recibir(10);
        b.recibir(10);
        c.recibir(10);
        System.out.println(a.getNombre() + " golpea " + a.golpe() + " y queda en " + a.getEnergia());
        System.out.println(b.getNombre() + " golpea " + b.golpe() + " y queda en " + b.getEnergia());
        System.out.println(c.getNombre() + " golpea " + c.golpe() + " y queda en " + c.getEnergia());
    }
}
`;
const MAIN_ESTILOS = MAIN_ESTILOS_INI
  .replace('new Gladiador("Furia", "agresivo")', 'new Gladiador("Furia", new Agresivo())')
  .replace('new Gladiador("Muro", "defensivo")', 'new Gladiador("Muro", new Defensivo())')
  .replace('new Gladiador("Fiel", "equilibrado")', 'new Gladiador("Fiel", new Equilibrado())')
  .replace(/ {8}\/\/ Cuando[^\n]*\n[^\n]*\n/, '');
const SALIDA_ESTILOS = 'Furia golpea 12 y queda en 80\nMuro golpea 4 y queda en 95\nFiel golpea 8 y queda en 90';

const GLADIADOR_2 = GLADIADOR_1.replace(`    public int golpe() {`, `    public void cambiarEstilo(Estilo nuevo) {
        this.estilo = nuevo;
    }

    public int golpe() {`);
const MAIN_CAMBIO_INI = `public class Main {
    public static void main(String[] args) {
        Gladiador coloso = new Gladiador("Coloso", new Defensivo());
        coloso.recibir(10);
        System.out.println(coloso.getNombre() + " golpea " + coloso.golpe() + " y queda en " + coloso.getEnergia());
        // Coloso aguantó lo peor: cámbialo a un estilo Agresivo con cambiarEstilo(...)
        // y vuelve a imprimir la misma línea.
    }
}
`;
const MAIN_CAMBIO = `public class Main {
    public static void main(String[] args) {
        Gladiador coloso = new Gladiador("Coloso", new Defensivo());
        coloso.recibir(10);
        System.out.println(coloso.getNombre() + " golpea " + coloso.golpe() + " y queda en " + coloso.getEnergia());
        coloso.cambiarEstilo(new Agresivo());
        coloso.recibir(10);
        System.out.println(coloso.getNombre() + " golpea " + coloso.golpe() + " y queda en " + coloso.getEnergia());
    }
}
`;
const SALIDA_CAMBIO = 'Coloso golpea 4 y queda en 95\nColoso golpea 12 y queda en 75';

const GLADIADOR_3 = `public abstract class Gladiador {
    private String nombre;
    private int energia = 100;
    private Estilo estilo;

    public Gladiador(String nombre, Estilo estilo) {
        this.nombre = nombre;
        this.estilo = estilo;
    }

    public String getNombre() {
        return nombre;
    }

    public int getEnergia() {
        return energia;
    }

    public void cambiarEstilo(Estilo nuevo) {
        this.estilo = nuevo;
    }

    public int golpe() {
        return estilo.golpe() + bonoDeCuerpo();
    }

    public void recibir(int danio) {
        energia = energia - estilo.danio(danio);
    }

    // El cuerpo (Robot o Dron) sí se hereda: aporta un bono fijo al golpe.
    protected abstract int bonoDeCuerpo();
}
`;
const ROBOT_3 = `public class Robot extends Gladiador {
    public Robot(String nombre, Estilo estilo) {
        super(nombre, estilo);
    }

    @Override
    protected int bonoDeCuerpo() {
        return 2;
    }
}
`;
const DRON_3 = `public class Dron extends Gladiador {
    public Dron(String nombre, Estilo estilo) {
        super(nombre, estilo);
    }

    @Override
    protected int bonoDeCuerpo() {
        return 0;
    }
}
`;
const BERSERKER_INI = `// Berserker.java
// Un estilo nuevo: golpea 20 y sufre el triple del daño.
// Escríbelo para que sirva a Robot y a Dron SIN crear RobotBerserker ni DronBerserker.
`;
const BERSERKER = `public class Berserker implements Estilo {
    @Override
    public int golpe() {
        return 20;
    }

    @Override
    public int danio(int recibido) {
        return recibido * 3;
    }
}
`;
const MAIN_COMBOS_INI = `import java.util.ArrayList;

public class Main {
    public static void main(String[] args) {
        // Arma cuatro combinaciones con solo dos cuerpos y tus estilos:
        //   Robot "Tornillo" Berserker, Dron "Zumbi" Berserker,
        //   Robot "Coloso" Defensivo,   Dron "Avispa" Agresivo
        // y para cada uno imprime: nombre + " golpea " + golpe()
    }
}
`;
const MAIN_COMBOS = `import java.util.ArrayList;

public class Main {
    public static void main(String[] args) {
        ArrayList<Gladiador> equipo = new ArrayList<>();
        equipo.add(new Robot("Tornillo", new Berserker()));
        equipo.add(new Dron("Zumbi", new Berserker()));
        equipo.add(new Robot("Coloso", new Defensivo()));
        equipo.add(new Dron("Avispa", new Agresivo()));
        for (Gladiador g : equipo) {
            System.out.println(g.getNombre() + " golpea " + g.golpe());
        }
    }
}
`;
const SALIDA_COMBOS = 'Tornillo golpea 22\nZumbi golpea 20\nColoso golpea 6\nAvispa golpea 12';
const FURTIVO = `public class Furtivo implements Estilo {
    @Override
    public int golpe() {
        return 9;
    }

    @Override
    public int danio(int recibido) {
        return 0;
    }
}
`;

export const STRATEGY = {
  id: 'mision-strategy',
  titulo: 'Estilos de combate',
  corto: 'Strategy',
  concepto: 'Patrón Strategy',
  refuerza: 6, // mundo cuyo concepto retoma
  recompensa: 'Módulo táctico · estilos intercambiables',
  equipo: 'tactico',
  codice: 'strategy',
  pasos: [
    {
      id: 'strategy-1', titulo: 'El gladiador indeciso', concepto: 'Strategy: extraer el comportamiento', escena: 'arena',
      archivos: ['Estilo.java', 'Agresivo.java', 'Defensivo.java', 'Equilibrado.java', 'Gladiador.java', 'Main.java'],
      mentor: 'Este gladiador decide cómo pelear con una cadena de ifs sobre un texto. Cada estilo nuevo obliga a abrir la clase y agregar otro if... en dos métodos. Saquemos cada estilo a su propia clase.',
      teoria: `<p>Cuando una clase elige su comportamiento con <code>if</code> sobre un texto o un tipo, y esos <code>if</code> se repiten en varios métodos, cada variante nueva obliga a modificarla. Es un olor de diseño.</p>
<p>El patrón <strong>Strategy (Estrategia)</strong> saca cada variante a su propia clase detrás de una interfaz común. La clase principal guarda <em>una</em> estrategia y le delega el trabajo:</p>
<ul><li>La <strong>interfaz</strong> (<code>Estilo</code>) es el contrato.</li>
<li>Las <strong>estrategias concretas</strong> (<code>Agresivo</code>, <code>Defensivo</code>, …) lo implementan.</li>
<li>El <strong>contexto</strong> (<code>Gladiador</code>) guarda un <code>Estilo</code> y llama a sus métodos sin preguntar cuál es.</li></ul>
<p>Combina lo que ya sabes: interfaces (Mundo 4), composición (Mundo 3) y polimorfismo (Mundo 6).</p>`,
      ejemplo: 'private Estilo estilo;\n\npublic int golpe() {\n    return estilo.golpe();\n}',
      tareas: ['Declara la interfaz <code>Estilo</code> con <code>int golpe()</code> e <code>int danio(int recibido)</code>.', 'Escribe <code>Agresivo</code> (12, el doble), <code>Defensivo</code> (4, la mitad) y <code>Equilibrado</code> (8, igual).', 'Cambia <code>Gladiador</code> para que guarde un <code>Estilo</code> y le delegue <code>golpe()</code> y <code>recibir()</code>. Ya no debe tener ningún <code>if</code> sobre el estilo.', 'Actualiza <code>Main</code> para crear cada gladiador con su estilo.'],
      nota: 'La salida debe ser la misma de antes del cambio: Furia 12 y 80, Muro 4 y 95, Fiel 8 y 90.',
      pista: 'En <code>recibir</code>: <code>energia = energia - estilo.danio(danio);</code>',
      objetivoUML: [['Agresivo', 'Estilo', 'realizacion'], ['Defensivo', 'Estilo', 'realizacion'], ['Equilibrado', 'Estilo', 'realizacion'], ['Gladiador', 'Estilo', 'asociacion']],
      inicial: () => ({ 'Estilo.java': ESTILO_INI, 'Agresivo.java': AGRESIVO_INI, 'Defensivo.java': DEFENSIVO_INI, 'Equilibrado.java': EQUILIBRADO_INI, 'Gladiador.java': GLADIADOR_OLOR, 'Main.java': MAIN_ESTILOS_INI }),
      archivoInicial: 'Gladiador.java',
      solucion: { 'Estilo.java': ESTILO, 'Agresivo.java': AGRESIVO, 'Defensivo.java': DEFENSIVO, 'Equilibrado.java': EQUILIBRADO, 'Gladiador.java': GLADIADOR_1, 'Main.java': MAIN_ESTILOS },
      previo: m => exigir(m, [{ clase: 'Estilo', interfaz: true, metodos: [['golpe', 0], ['danio', 1]] }, { clase: 'Agresivo', implementa: ['Estilo'] }, { clase: 'Defensivo', implementa: ['Estilo'] }, { clase: 'Equilibrado', implementa: ['Estilo'] }, { clase: 'Gladiador', campos: ['estilo'] }]) || previoMain(m),
      animacion: corrMain,
      pruebas: [
        casoRelacion('Gladiador', 'Estilo', 'asociacion'),
        { nombre: 'Gladiador guarda la interfaz y no pregunta el estilo', prueba: ({ modelo, archivos }) => {
          const f = modelo.clases.Gladiador?.campos.find(x => x.nombre === 'estilo');
          const limpio = sinTexto(archivos, 'Gladiador.java', /\.equals\s*\(|\binstanceof\b|\b(Agresivo|Defensivo|Equilibrado)\b/);
          return caso(f?.tipo === 'Estilo' && limpio, 'private Estilo estilo; sin ifs ni clases concretas', f?.tipo !== 'Estilo' ? `estilo es ${f?.tipo || 'inexistente'}` : limpio ? 'correcto' : 'Gladiador todavía decide el estilo');
        } },
        { nombre: 'Cada estilo cumple sus números', entrada: 'golpe() y danio(10) de cada estilo', prueba: ({ run }) => {
          const { v } = conRet(run, C => ['Agresivo', 'Defensivo', 'Equilibrado'].map(n => { const e = new C[n](); return `${n} ${e.golpe()}/${e.danio(10)}`; }));
          const ok = String(v) === 'Agresivo 12/20,Defensivo 4/5,Equilibrado 8/10';
          return caso(ok, 'Agresivo 12/20, Defensivo 4/5, Equilibrado 8/10', (v || []).join(', '));
        } },
        { nombre: 'La salida no cambió', prueba: ({ run }) => {
          const { rt } = run(corrMain);
          return caso(salidaDe(rt) === SALIDA_ESTILOS, SALIDA_ESTILOS.replace(/\n/g, ' / '), rt.salida.join(' / ') || '(sin salida)');
        } },
      ],
      exito: 'Los ifs desaparecieron: cada estilo vive en su clase y el gladiador solo delega.',
    },
    {
      id: 'strategy-2', titulo: 'Cambio de estilo en pleno combate', concepto: 'Strategy: cambiar en ejecución', escena: 'arena',
      archivos: ['Gladiador.java', 'Main.java', 'Estilo.java', 'Agresivo.java', 'Defensivo.java', 'Equilibrado.java'],
      mentor: 'Coloso aguanta a la defensiva y, cuando ve la oportunidad, se lanza al ataque. Con herencia sería otra clase, y un objeto no puede cambiar de clase. Con Strategy basta con cambiarle el módulo.',
      teoria: `<p>La gran diferencia entre Strategy y la herencia: la clase de un objeto queda fija para siempre, pero su estrategia es un <strong>atributo</strong>, y los atributos se pueden cambiar.</p>
<p>Un método como <code>cambiarEstilo(Estilo nuevo)</code> permite que el mismo <code>Gladiador</code> pelee distinto a lo largo del combate. Es el lema «favorece la composición sobre la herencia».</p>
<p>Mira la escena: el módulo de estilo del gladiador cambia sin que el gladiador deje de ser el mismo objeto.</p>`,
      ejemplo: 'public void cambiarEstilo(Estilo nuevo) {\n    this.estilo = nuevo;\n}',
      tareas: ['En <code>Gladiador</code>, agrega <code>public void cambiarEstilo(Estilo nuevo)</code>.', 'En <code>Main</code>, después del primer golpe, cambia a <code>Coloso</code> a <code>new Agresivo()</code>, hazle recibir 10 y vuelve a imprimir.', 'La salida debe ser <code>Coloso golpea 4 y queda en 95</code> y luego <code>Coloso golpea 12 y queda en 75</code>.'],
      nota: 'Fíjate que no creaste otro Gladiador: es el mismo objeto con otro módulo.',
      pista: 'Después del cambio: <code>coloso.recibir(10);</code> y la misma línea de <code>println</code>.',
      objetivoUML: [['Gladiador', 'Estilo', 'asociacion'], ['Agresivo', 'Estilo', 'realizacion'], ['Defensivo', 'Estilo', 'realizacion']],
      inicial: prev => ({ 'Gladiador.java': prev?.['Gladiador.java'] ?? GLADIADOR_1, 'Main.java': MAIN_CAMBIO_INI, 'Estilo.java': prev?.['Estilo.java'] ?? ESTILO, 'Agresivo.java': prev?.['Agresivo.java'] ?? AGRESIVO, 'Defensivo.java': prev?.['Defensivo.java'] ?? DEFENSIVO, 'Equilibrado.java': prev?.['Equilibrado.java'] ?? EQUILIBRADO }),
      archivoInicial: 'Gladiador.java',
      solucion: { 'Gladiador.java': GLADIADOR_2, 'Main.java': MAIN_CAMBIO, 'Estilo.java': ESTILO, 'Agresivo.java': AGRESIVO, 'Defensivo.java': DEFENSIVO, 'Equilibrado.java': EQUILIBRADO },
      previo: m => exigir(m, [{ clase: 'Gladiador', metodos: [['cambiarEstilo', 1]] }]) || previoMain(m),
      animacion: corrMain,
      pruebas: [
        { nombre: 'El mismo objeto cambia de estilo', entrada: 'Muro (Defensivo) → cambiarEstilo(Agresivo)', prueba: ({ run }) => {
          const { v } = conRet(run, C => { const g = new C.Gladiador('Muro', new C.Defensivo()); const a = g.golpe(); g.cambiarEstilo(new C.Agresivo()); return [a, g.golpe()]; });
          return caso(String(v) === '4,12', '4 y luego 12', (v || []).join(' y '));
        } },
        { nombre: 'Coloso pelea distinto tras el cambio', prueba: ({ run }) => {
          const { rt } = run(corrMain);
          return caso(salidaDe(rt) === SALIDA_CAMBIO, SALIDA_CAMBIO.replace(/\n/g, ' / '), rt.salida.join(' / ') || '(sin salida)');
        } },
        { nombre: 'Solo hay un gladiador en el combate', prueba: ({ run }) => {
          const { rt } = run(corrMain);
          const n = rt.registro.filter(r => r.cls === 'Gladiador').length;
          return caso(n === 1, '1 objeto Gladiador', `${n}`);
        } },
      ],
      exito: 'Mismo gladiador, otro estilo: la estrategia es un módulo que se cambia en caliente.',
    },
    {
      id: 'strategy-3', titulo: 'Mini-jefe: ¿herencia o composición?', corto: 'Mini-jefe', jefe: true, concepto: 'Composición sobre herencia', escena: 'arena',
      archivos: ['Berserker.java', 'Main.java', 'Gladiador.java', 'Robot.java', 'Dron.java', 'Estilo.java', 'Agresivo.java', 'Defensivo.java'],
      mentor: 'Ahora hay dos cuerpos, Robot y Dron, y llegó un estilo nuevo: Berserker. Con pura herencia necesitaríamos RobotBerserker, DronBerserker, RobotDefensivo... ¡una explosión de clases! Muéstrale a la arena la salida elegante.',
      teoria: `<p>Si cuerpo y estilo se resolvieran con herencia, cada combinación sería una subclase: 2 cuerpos × 4 estilos = <strong>8 clases</strong>, y cada estilo nuevo sumaría una por cuerpo. Es la <strong>explosión de subclases</strong>.</p>
<p>Con Strategy se separan los dos ejes:</p>
<ul><li>Lo que el gladiador <em>es</em> (su cuerpo) se hereda: <code>Robot</code> y <code>Dron</code> extienden <code>Gladiador</code>.</li>
<li>Lo que el gladiador <em>hace</em> (su estilo) se compone: un atributo <code>Estilo</code>.</li></ul>
<p>Resultado: 2 cuerpos + 4 estilos = 6 clases, y las combinaciones salen solas. Herencia y composición no compiten: cada una resuelve un eje distinto.</p>`,
      ejemplo: 'new Dron("Zumbi", new Berserker())',
      tareas: ['Crea el estilo <code>Berserker</code>: golpea 20 y sufre el triple del daño.', 'En <code>Main</code>, arma las cuatro combinaciones del comentario y para cada una imprime <code>nombre + " golpea " + golpe()</code>.', 'No crees subclases como <code>RobotBerserker</code> ni modifiques <code>Gladiador</code>, <code>Robot</code> o <code>Dron</code>. Un caso oculto probará un estilo que no conoces.'],
      nota: GUIA,
      pista: 'Guárdalos en una <code>ArrayList&lt;Gladiador&gt;</code> y recórrela. Recuerda que <code>golpe()</code> suma el bono del cuerpo: el Robot aporta 2.',
      objetivoUML: [['Robot', 'Gladiador', 'herencia'], ['Dron', 'Gladiador', 'herencia'], ['Gladiador', 'Estilo', 'asociacion'], ['Berserker', 'Estilo', 'realizacion']],
      inicial: () => ({ 'Berserker.java': BERSERKER_INI, 'Main.java': MAIN_COMBOS_INI, 'Gladiador.java': GLADIADOR_3, 'Robot.java': ROBOT_3, 'Dron.java': DRON_3, 'Estilo.java': ESTILO, 'Agresivo.java': AGRESIVO, 'Defensivo.java': DEFENSIVO }),
      archivoInicial: 'Berserker.java',
      solucion: { 'Berserker.java': BERSERKER, 'Main.java': MAIN_COMBOS, 'Gladiador.java': GLADIADOR_3, 'Robot.java': ROBOT_3, 'Dron.java': DRON_3, 'Estilo.java': ESTILO, 'Agresivo.java': AGRESIVO, 'Defensivo.java': DEFENSIVO },
      previo: m => exigir(m, [{ clase: 'Berserker', implementa: ['Estilo'], metodos: [['golpe', 0], ['danio', 1]] }]) || previoMain(m),
      animacion: corrMain,
      pruebas: [
        casoRelacion('Berserker', 'Estilo', 'realizacion'),
        { nombre: 'Sin explosión de subclases', prueba: ({ modelo }) => {
          const hijas = Object.values(modelo.clases).filter(c => c.__padre === 'Gladiador').map(c => c.nombre).sort();
          return caso(String(hijas) === 'Dron,Robot', 'solo Robot y Dron extienden Gladiador', hijas.join(', ') || 'ninguna');
        } },
        { nombre: 'Gladiador, Robot y Dron no cambiaron', prueba: ({ archivos }) => {
          const ok = NORMAL(archivos['Gladiador.java']) === NORMAL(GLADIADOR_3) && NORMAL(archivos['Robot.java']) === NORMAL(ROBOT_3) && NORMAL(archivos['Dron.java']) === NORMAL(DRON_3);
          return caso(ok, 'iguales a la versión sellada', ok ? 'sin cambios' : 'se modificó una clase sellada');
        } },
        { nombre: 'Berserker pega fuerte y sufre mucho', entrada: 'new Robot("R", new Berserker()) recibe 10', prueba: ({ run }) => {
          const { v } = conRet(run, C => { const r = new C.Robot('R', new C.Berserker()); r.recibir(10); return [r.golpe(), r.getEnergia()]; });
          return caso(String(v) === '22,70', 'golpe 22 y energía 70', (v || []).join(' y '));
        } },
        { nombre: 'Las cuatro combinaciones', prueba: ({ run }) => {
          const { rt } = run(corrMain);
          return caso(salidaDe(rt) === SALIDA_COMBOS, SALIDA_COMBOS.replace(/\n/g, ' / '), rt.salida.join(' / ') || '(sin salida)');
        } },
        { nombre: 'Un estilo desconocido funciona con ambos cuerpos', oculto: true, entrada: 'Furtivo (golpe 9, no sufre daño) en un Robot y un Dron', prueba: ({ archivos }) => {
          const h = {};
          const r = conExtra(archivos, { 'Furtivo.java': FURTIVO }, C => { const a = new C.Robot('A', new C.Furtivo()), b = new C.Dron('B', new C.Furtivo()); a.recibir(50); h.v = [a.golpe(), b.golpe(), a.getEnergia()]; });
          if (r.error) return caso(false, '11, 9 y 100', r.error);
          return caso(String(h.v) === '11,9,100', '11, 9 y 100', (h.v || []).join(', '));
        } },
      ],
      exito: '¡Seis clases en vez de ocho, y las que vengan salen gratis! Módulo táctico instalado.',
    },
  ],
};
