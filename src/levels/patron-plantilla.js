/* Patrón Template Method · «El manual de ensamblaje» (Mundo 8 · La Forja).
   Dos recetas casi iguales se convierten en una clase base con el método plantilla final;
   después un gancho opcional y un mini-jefe donde un modelo nuevo entra sin tocar el manual. */
import { caso, corrMain, exigir, previoMain, casoRelacion, sinTexto } from './util.js';
import { parsePrograma, ejecutar } from '../engine/motor.js';

const NORMAL = s => (s || '').replace(/\/\/.*$/gm, '').replace(/\s+/g, ' ').trim();
const salidaDe = rt => rt.salida.join('\n').trim();
/* Ejecuta el programa del estudiante con archivos extra (para los casos de extensión) */
function conExtra(archivos, extra, arnes) {
  const m = parsePrograma({ ...archivos, ...extra });
  if (m.errores.length) return { error: `${m.errores[0].archivo}:${m.errores[0].linea} ${m.errores[0].msg}` };
  const r = ejecutar(m, arnes);
  return { error: r.error, salida: r.rt.salida };
}
const GUIA = '<p class="guia-link">Al superar este mini-jefe, el patrón queda registrado en el <button type="button" class="enlace" data-guia="patrones">Códice de patrones</button>.</p>';

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

export const PLANTILLA = {
  id: 'mision-plantilla',
  titulo: 'El manual de ensamblaje',
  corto: 'Template Method',
  concepto: 'Patrón Template Method',
  refuerza: 5, // mundo cuyo concepto retoma
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
