/* Misiones especiales: ramales opcionales que refuerzan el concepto del mundo donde se cuelgan.
   Cada misión sigue cuatro reglas:
   1. Empieza con código que huele mal y el estudiante lo refactoriza.
   2. Tiene un caso oculto de extensión: algo nuevo entra sin tocar lo existente.
   3. Su recompensa tiene efecto: una entrada en el Códice de patrones (Guía) y equipo visible en el robot.
   4. Si el patrón reaparece en la ruta principal, la misión es una vista previa: nada la da por hecha. */
import { caso, corrMain, exigir, previoMain, casoRelacion, sinTexto } from './util.js';
import { parsePrograma, ejecutar } from '../engine/motor.js';
import { OBJECT } from './mision-object.js';

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
const GUIA = '<p class="guia-link">Al completar la misión, el patrón queda registrado en el <button type="button" class="enlace" data-guia="patrones">Códice de patrones</button>.</p>';

/* ======================================================================
   Misión 1 · Template Method · «El manual de ensamblaje» (ramal del Mundo 5)
   ====================================================================== */
const LIGERO_OLOR = `public class RobotLigero {
    public void ensamblar() {
        System.out.println("chasis listo");
        System.out.println("motor eléctrico");
        System.out.println("pintura azul");
        System.out.println("prueba superada");
    }
}
`;
const PESADO_OLOR = `public class RobotPesado {
    public void ensamblar() {
        System.out.println("chasis listo");
        System.out.println("motor diésel");
        System.out.println("pintura gris");
        System.out.println("prueba superada");
    }
}
`;
const ENSAMBLAJE_INI = `// Ensamblaje.java
// Los dos robots repiten los mismos pasos y solo cambian el motor y la pintura.
// 1. Declara public abstract class Ensamblaje.
// 2. Escribe public final void ensamblar() con el orden fijo de los pasos:
//      prepararChasis(); instalarMotor(); pintar(); probar();
// 3. prepararChasis() y probar() son iguales para todos: escríbelos aquí.
// 4. instalarMotor() y pintar() cambian: decláralos protected abstract.
`;
const MAIN_PLANTILLA = `public class Main {
    public static void main(String[] args) {
        new RobotLigero().ensamblar();
        new RobotPesado().ensamblar();
    }
}
`;
const ENSAMBLAJE_1 = `public abstract class Ensamblaje {
    public final void ensamblar() {
        prepararChasis();
        instalarMotor();
        pintar();
        probar();
    }

    private void prepararChasis() {
        System.out.println("chasis listo");
    }

    private void probar() {
        System.out.println("prueba superada");
    }

    protected abstract void instalarMotor();

    protected abstract void pintar();
}
`;
const LIGERO_1 = `public class RobotLigero extends Ensamblaje {
    @Override
    protected void instalarMotor() {
        System.out.println("motor eléctrico");
    }

    @Override
    protected void pintar() {
        System.out.println("pintura azul");
    }
}
`;
const PESADO_1 = `public class RobotPesado extends Ensamblaje {
    @Override
    protected void instalarMotor() {
        System.out.println("motor diésel");
    }

    @Override
    protected void pintar() {
        System.out.println("pintura gris");
    }
}
`;
const SALIDA_PLANTILLA_1 = 'chasis listo\nmotor eléctrico\npintura azul\nprueba superada\nchasis listo\nmotor diésel\npintura gris\nprueba superada';

const ENSAMBLAJE_2 = `public abstract class Ensamblaje {
    public final void ensamblar() {
        prepararChasis();
        instalarMotor();
        pintar();
        if (llevaBlindaje()) {
            System.out.println("blindaje instalado");
        }
        probar();
    }

    private void prepararChasis() {
        System.out.println("chasis listo");
    }

    private void probar() {
        System.out.println("prueba superada");
    }

    protected boolean llevaBlindaje() {
        return false;
    }

    protected abstract void instalarMotor();

    protected abstract void pintar();
}
`;
const PESADO_2 = `public class RobotPesado extends Ensamblaje {
    @Override
    protected void instalarMotor() {
        System.out.println("motor diésel");
    }

    @Override
    protected void pintar() {
        System.out.println("pintura gris");
    }

    @Override
    protected boolean llevaBlindaje() {
        return true;
    }
}
`;
const SALIDA_PLANTILLA_2 = 'chasis listo\nmotor eléctrico\npintura azul\nprueba superada\nchasis listo\nmotor diésel\npintura gris\nblindaje instalado\nprueba superada';

const EXPLORADOR_INI = `// RobotExplorador.java
// Un modelo nuevo: motor solar, pintura naranja y con blindaje.
// Escríbelo extendiendo Ensamblaje. No toques Ensamblaje.java.
`;
const EXPLORADOR = `public class RobotExplorador extends Ensamblaje {
    @Override
    protected void instalarMotor() {
        System.out.println("motor solar");
    }

    @Override
    protected void pintar() {
        System.out.println("pintura naranja");
    }

    @Override
    protected boolean llevaBlindaje() {
        return true;
    }
}
`;
const LINEA_INI = `import java.util.ArrayList;

public class Linea {
    private ArrayList<Ensamblaje> pedidos = new ArrayList<>();

    public void agregar(Ensamblaje e) {
        pedidos.add(e);
    }

    // Escribe public void producir(): llama a ensamblar() de cada pedido, en orden.
}
`;
const LINEA = `import java.util.ArrayList;

public class Linea {
    private ArrayList<Ensamblaje> pedidos = new ArrayList<>();

    public void agregar(Ensamblaje e) {
        pedidos.add(e);
    }

    public void producir() {
        for (Ensamblaje e : pedidos) {
            e.ensamblar();
        }
    }
}
`;
const MAIN_LINEA = `public class Main {
    public static void main(String[] args) {
        Linea linea = new Linea();
        linea.agregar(new RobotLigero());
        linea.agregar(new RobotExplorador());
        linea.producir();
    }
}
`;
const SALIDA_LINEA = 'chasis listo\nmotor eléctrico\npintura azul\nprueba superada\nchasis listo\nmotor solar\npintura naranja\nblindaje instalado\nprueba superada';
const ANFIBIO = `public class RobotAnfibio extends Ensamblaje {
    @Override
    protected void instalarMotor() {
        System.out.println("motor de hélice");
    }

    @Override
    protected void pintar() {
        System.out.println("pintura verde");
    }
}
`;

const PLANTILLA = {
  id: 'mision-plantilla',
  titulo: 'El manual de ensamblaje',
  corto: 'Template Method',
  concepto: 'Patrón Template Method',
  mundo: 5,
  requiere: ['nueva-maquina'],
  recompensa: 'Manual de ensamblaje',
  equipo: 'manual',
  codice: 'plantilla',
  pasos: [
    {
      id: 'plantilla-1', titulo: 'Dos recetas casi iguales', concepto: 'Template Method: el esqueleto', escena: 'linea',
      archivos: ['Ensamblaje.java', 'RobotLigero.java', 'RobotPesado.java', 'Main.java'],
      mentor: 'Mira estas dos clases: copian los mismos pasos y solo cambian el motor y la pintura. Si mañana cambia la prueba de calidad, habría que corregirla en cada robot. Escribamos el manual una sola vez.',
      teoria: `<p>Cuando varias clases repiten el mismo <em>algoritmo</em> y solo cambian algunos pasos, el patrón <strong>Template Method (Método plantilla)</strong> propone escribir el esqueleto una sola vez en una clase base abstracta.</p>
<ul><li>El <strong>método plantilla</strong> (<code>ensamblar()</code>) fija el orden de los pasos y es <code>final</code>: ninguna hija puede cambiarlo.</li>
<li>Los pasos comunes se escriben en la base.</li>
<li>Los pasos que varían son <code>abstract</code>: cada hija los completa.</li></ul>
<p>Es herencia del Mundo 5 usada con intención: la base manda («yo decido el orden») y las hijas solo rellenan huecos. A esto se le llama el <em>principio de Hollywood</em>: «no nos llames, nosotros te llamamos».</p>`,
      ejemplo: 'public final void ensamblar() {\n    prepararChasis();\n    instalarMotor();   // lo completa cada hija\n    pintar();          // lo completa cada hija\n    probar();\n}',
      tareas: ['Crea <code>Ensamblaje</code> abstracta con el método plantilla <code>public final void ensamblar()</code>.', 'Mueve allí <code>prepararChasis()</code> y <code>probar()</code>; declara <code>instalarMotor()</code> y <code>pintar()</code> como <code>protected abstract</code>.', 'Haz que <code>RobotLigero</code> y <code>RobotPesado</code> extiendan <code>Ensamblaje</code> y solo escriban sus dos pasos. Ya no deben tener <code>ensamblar()</code>.'],
      nota: 'La salida debe ser exactamente la misma de antes: refactorizar es mejorar el diseño sin cambiar lo que hace el programa.',
      pista: 'Un método abstracto protegido se declara así: <code>protected abstract void pintar();</code>',
      objetivoUML: [['RobotLigero', 'Ensamblaje', 'herencia'], ['RobotPesado', 'Ensamblaje', 'herencia']],
      inicial: () => ({ 'Ensamblaje.java': ENSAMBLAJE_INI, 'RobotLigero.java': LIGERO_OLOR, 'RobotPesado.java': PESADO_OLOR, 'Main.java': MAIN_PLANTILLA }),
      archivoInicial: 'Ensamblaje.java',
      solucion: { 'Ensamblaje.java': ENSAMBLAJE_1, 'RobotLigero.java': LIGERO_1, 'RobotPesado.java': PESADO_1, 'Main.java': MAIN_PLANTILLA },
      previo: m => exigir(m, [{ clase: 'Ensamblaje', metodos: [['ensamblar', 0], ['instalarMotor', 0], ['pintar', 0]] }]) || previoMain(m),
      animacion: corrMain,
      pruebas: [
        casoRelacion('RobotLigero', 'Ensamblaje', 'herencia'),
        casoRelacion('RobotPesado', 'Ensamblaje', 'herencia'),
        { nombre: 'ensamblar() es el método plantilla', prueba: ({ modelo }) => {
          const b = modelo.clases.Ensamblaje, e = b?.metodos.find(m => m.nombre === 'ensamblar');
          const ok = b?.abstracta && e?.final;
          return caso(ok, 'clase abstract con ensamblar() final', !b?.abstracta ? 'Ensamblaje no es abstract' : e?.final ? 'correcto' : 'ensamblar() no es final');
        } },
        { nombre: 'Las hijas solo completan los pasos que cambian', prueba: ({ modelo, archivos }) => {
          const malas = ['RobotLigero', 'RobotPesado'].filter(n => modelo.clases[n]?.metodos.some(m => m.nombre === 'ensamblar') || !sinTexto(archivos, n + '.java', /chasis listo|prueba superada/));
          return caso(!malas.length, 'sin ensamblar() ni pasos comunes en las hijas', malas.length ? `${malas.join(' y ')} repite código` : 'correcto');
        } },
        { nombre: 'La salida no cambió', prueba: ({ run }) => {
          const { rt } = run(corrMain);
          return caso(salidaDe(rt) === SALIDA_PLANTILLA_1, '8 líneas iguales a las de antes', rt.salida.join(' / ') || '(sin salida)');
        } },
      ],
      exito: 'El manual existe una sola vez: la base fija el orden y cada robot solo aporta lo suyo.',
    },
    {
      id: 'plantilla-2', titulo: 'Un paso opcional', concepto: 'Ganchos (hooks) y final', escena: 'linea',
      archivos: ['Ensamblaje.java', 'RobotPesado.java', 'RobotLigero.java', 'Main.java'],
      mentor: 'Los robots pesados necesitan blindaje; los ligeros no. ¿Un if por cada tipo de robot? No: dejemos un gancho en el manual que cada robot puede activar.',
      teoria: `<p>Un <strong>gancho</strong> (<em>hook</em>) es un paso del método plantilla con un comportamiento por defecto que las hijas <em>pueden</em> redefinir, pero no están obligadas a hacerlo.</p>
<p>Aquí, <code>llevaBlindaje()</code> devuelve <code>false</code> en la base. El método plantilla pregunta <code>if (llevaBlindaje())</code>, y solo <code>RobotPesado</code> lo redefine para devolver <code>true</code>.</p>
<p>Como <code>ensamblar()</code> es <code>final</code>, ninguna hija puede saltarse pasos ni cambiar el orden. Prueba a escribir <code>ensamblar()</code> en <code>RobotPesado</code>: el compilador lo impedirá.</p>`,
      ejemplo: 'protected boolean llevaBlindaje() {\n    return false;   // por defecto\n}',
      tareas: ['En <code>Ensamblaje</code>, agrega el gancho <code>protected boolean llevaBlindaje()</code> que devuelva <code>false</code>.', 'En <code>ensamblar()</code>, después de pintar y antes de probar, imprime <code>"blindaje instalado"</code> solo si <code>llevaBlindaje()</code> es verdadero.', 'Haz que <code>RobotPesado</code> redefina <code>llevaBlindaje()</code> para devolver <code>true</code>. <code>RobotLigero</code> no cambia.'],
      nota: 'Observa en la escena qué pasos vienen de la base y cuáles de la hija: el gancho del pesado aparece como paso de la hija.',
      pista: 'En el método plantilla: <code>if (llevaBlindaje()) { System.out.println("blindaje instalado"); }</code>',
      objetivoUML: [['RobotLigero', 'Ensamblaje', 'herencia'], ['RobotPesado', 'Ensamblaje', 'herencia']],
      inicial: prev => ({ 'Ensamblaje.java': prev?.['Ensamblaje.java'] ?? ENSAMBLAJE_1, 'RobotPesado.java': prev?.['RobotPesado.java'] ?? PESADO_1, 'RobotLigero.java': prev?.['RobotLigero.java'] ?? LIGERO_1, 'Main.java': MAIN_PLANTILLA }),
      archivoInicial: 'Ensamblaje.java',
      solucion: { 'Ensamblaje.java': ENSAMBLAJE_2, 'RobotPesado.java': PESADO_2, 'RobotLigero.java': LIGERO_1, 'Main.java': MAIN_PLANTILLA },
      previo: m => exigir(m, [{ clase: 'Ensamblaje', metodos: [['ensamblar', 0], ['llevaBlindaje', 0]] }]) || previoMain(m),
      animacion: corrMain,
      pruebas: [
        { nombre: 'El gancho existe en la base y vale false', prueba: ({ modelo, archivos }) => {
          const g = modelo.clases.Ensamblaje?.metodos.find(m => m.nombre === 'llevaBlindaje');
          const ok = g && !g.abstracto && g.ret === 'boolean' && /return\s+false/.test(NORMAL(archivos['Ensamblaje.java']));
          return caso(ok, 'protected boolean llevaBlindaje() { return false; }', g ? (g.abstracto ? 'es abstracto: un gancho tiene cuerpo' : 'revisa que devuelva false') : 'falta el gancho');
        } },
        { nombre: 'Solo el pesado activa el gancho', prueba: ({ modelo }) => {
          const p = modelo.clases.RobotPesado?.metodos.some(m => m.nombre === 'llevaBlindaje');
          const l = modelo.clases.RobotLigero?.metodos.some(m => m.nombre === 'llevaBlindaje');
          return caso(p && !l, 'RobotPesado lo redefine y RobotLigero no', `pesado: ${p ? 'sí' : 'no'}, ligero: ${l ? 'sí' : 'no'}`);
        } },
        { nombre: 'ensamblar() sigue siendo final', prueba: ({ modelo }) => {
          const e = modelo.clases.Ensamblaje?.metodos.find(m => m.nombre === 'ensamblar');
          return caso(e?.final, 'final', e?.final ? 'final' : 'se puede redefinir');
        } },
        { nombre: 'El blindaje va antes de la prueba', prueba: ({ run }) => {
          const { rt } = run(corrMain);
          return caso(salidaDe(rt) === SALIDA_PLANTILLA_2, '…pintura gris / blindaje instalado / prueba superada', rt.salida.join(' / ') || '(sin salida)');
        } },
      ],
      exito: 'El gancho deja una puerta abierta sin romper el orden: la base sigue al mando.',
    },
    {
      id: 'plantilla-3', titulo: 'Mini-jefe: la línea de producción', corto: 'Mini-jefe', jefe: true, concepto: 'Template Method + polimorfismo', escena: 'linea',
      archivos: ['RobotExplorador.java', 'Linea.java', 'Main.java', 'Ensamblaje.java', 'RobotLigero.java', 'RobotPesado.java'],
      mentor: 'Llegó un pedido de un modelo nuevo y la línea de producción tiene que fabricarlo junto con los demás. El manual está sellado: si el diseño es bueno, no hará falta tocarlo.',
      teoria: `<p>La prueba de fuego de un buen método plantilla: agregar un producto nuevo escribiendo <em>solo</em> una clase hija, sin tocar el manual.</p>
<p>La <code>Linea</code> recorre una <code>ArrayList&lt;Ensamblaje&gt;</code> y llama a <code>ensamblar()</code> de cada pedido. Es el polimorfismo que ya conoces: la línea no sabe qué robot está fabricando, y no necesita saberlo.</p>`,
      ejemplo: 'for (Ensamblaje e : pedidos) {\n    e.ensamblar();\n}',
      tareas: ['Crea <code>RobotExplorador extends Ensamblaje</code>: motor solar, pintura naranja y con blindaje.', 'En <code>Linea</code>, escribe <code>producir()</code>, que ensambla cada pedido en orden.', 'No modifiques <code>Ensamblaje.java</code>. Un caso oculto fabricará un modelo que no conoces.'] ,
      nota: GUIA,
      pista: 'Textos: <code>"motor solar"</code> y <code>"pintura naranja"</code>; el blindaje se activa redefiniendo el gancho.',
      objetivoUML: [['RobotExplorador', 'Ensamblaje', 'herencia'], ['RobotLigero', 'Ensamblaje', 'herencia']],
      inicial: prev => ({ 'RobotExplorador.java': EXPLORADOR_INI, 'Linea.java': LINEA_INI, 'Main.java': MAIN_LINEA, 'Ensamblaje.java': prev?.['Ensamblaje.java'] ?? ENSAMBLAJE_2, 'RobotLigero.java': prev?.['RobotLigero.java'] ?? LIGERO_1, 'RobotPesado.java': prev?.['RobotPesado.java'] ?? PESADO_2 }),
      archivoInicial: 'RobotExplorador.java',
      solucion: { 'RobotExplorador.java': EXPLORADOR, 'Linea.java': LINEA, 'Main.java': MAIN_LINEA, 'Ensamblaje.java': ENSAMBLAJE_2, 'RobotLigero.java': LIGERO_1, 'RobotPesado.java': PESADO_2 },
      previo: m => exigir(m, [{ clase: 'RobotExplorador', metodos: [['instalarMotor', 0], ['pintar', 0]] }, { clase: 'Linea', metodos: [['producir', 0]] }]) || previoMain(m),
      animacion: corrMain,
      pruebas: [
        casoRelacion('RobotExplorador', 'Ensamblaje', 'herencia'),
        { nombre: 'El manual sigue siendo una plantilla', prueba: ({ modelo }) => {
          const b = modelo.clases.Ensamblaje, e = b?.metodos.find(m => m.nombre === 'ensamblar');
          return caso(b?.abstracta && e?.final, 'abstracta con ensamblar() final', b?.abstracta && e?.final ? 'correcto' : 'el manual perdió su forma');
        } },
        { nombre: 'La línea fabrica los pedidos en orden', prueba: ({ run }) => {
          const { rt } = run(corrMain);
          return caso(salidaDe(rt) === SALIDA_LINEA, 'ligero y luego explorador con blindaje', rt.salida.join(' / ') || '(sin salida)');
        } },
        { nombre: 'Linea no pregunta el tipo', prueba: ({ archivos }) => {
          const ok = sinTexto(archivos, 'Linea.java', /\binstanceof\b|getClass\s*\(/);
          return caso(ok, 'sin instanceof', ok ? 'correcto' : 'Linea pregunta de qué clase es cada pedido');
        } },
        { nombre: 'Un modelo desconocido sale de la línea', oculto: true, entrada: 'RobotAnfibio: motor de hélice, pintura verde, sin blindaje', prueba: ({ archivos }) => {
          const r = conExtra(archivos, { 'RobotAnfibio.java': ANFIBIO }, C => { const l = new C.Linea(); l.agregar(new C.RobotAnfibio()); l.producir(); });
          const esperado = 'chasis listo\nmotor de hélice\npintura verde\nprueba superada';
          if (r.error) return caso(false, esperado.replace(/\n/g, ' / '), r.error);
          return caso(r.salida.join('\n') === esperado, esperado.replace(/\n/g, ' / '), r.salida.join(' / '));
        } },
      ],
      exito: 'La línea fabricó un modelo nuevo sin tocar el manual. ¡Manual de ensamblaje obtenido!',
    },
  ],
};

/* ======================================================================
   Misión 2 · Strategy · «Estilos de combate» (ramal del Mundo 6)
   ====================================================================== */
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

const STRATEGY = {
  id: 'mision-strategy',
  titulo: 'Estilos de combate',
  corto: 'Strategy',
  concepto: 'Patrón Strategy',
  mundo: 6,
  requiere: ['arena-torneo'],
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

export const MISIONES = [PLANTILLA, STRATEGY, OBJECT];

/* Cada paso es un capítulo jugable con los datos de su misión */
export const PASOS = MISIONES.flatMap(m => m.pasos.map((p, k) => ({
  ...p, mision: true, misionId: m.id, misionCorto: m.corto, corto: p.corto || m.corto, mundo: m.mundo, enMundo: k, totalMundo: m.pasos.length, recompensa: m.recompensa, ultimo: k === m.pasos.length - 1,
})));
export const MISIONES_ESPECIALES = MISIONES;
export const misionDisponible = (mision, hechos, profesor = false) => profesor || mision.requiere.every(id => hechos.includes(id));
export const misionCompletada = (mision, pasosHechos = [], misionesHechas = []) => misionesHechas.includes(mision.id) || mision.pasos.every(p => pasosHechos.includes(p.id));
export const pasoAbierto = (paso, pasosHechos = [], profesor = false) => {
  const m = MISIONES.find(x => x.id === paso.misionId);
  const k = m.pasos.findIndex(p => p.id === paso.id);
  return profesor || k === 0 || pasosHechos.includes(m.pasos[k - 1].id) || pasosHechos.includes(paso.id);
};
