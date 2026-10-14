import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MISIONES, PASOS, misionDisponible, misionVisible } from '../src/levels/misiones.js';
import { evaluarNivel } from '../src/levels/evaluar.js';
import { leerRoles, claseIntrusa, filasAlAzar } from '../src/levels/expedicion-central.js';
import { parsePrograma } from '../src/engine/motor.js';

globalThis.performance ??= { now: () => Date.now() };

const exp = MISIONES.find(m => m.id === 'expedicion-central');
const [plano, construir] = PASOS.filter(p => p.misionId === exp.id);
const casosDe = r => Object.fromEntries(r.casos.map(c => [c.nombre, c]));

/* Un diseño distinto al de referencia: otros nombres, una clase abstracta como APARATO con constructor,
   y contratos con otros nombres. Debe superar todo, incluida la clase intrusa. */
const ALTERNATIVO = {
  'Roles.java': `public class Roles {
    static String CENTRAL = "Taller";
    static String APARATO = "Aparato";
    static String LAVABLE = "Lavable";
    static String ACTUALIZABLE = "ConFirmware";
    static String ROBOT = "Androide";
    static String DRON = "Cuadricoptero";
    static String LINTERNA = "Lampara";
}
`,
  'Contratos.java': `abstract class Aparato {
    private String nombre;

    public Aparato(String nombre) {
        this.nombre = nombre;
    }

    public String getNombre() {
        return nombre;
    }

    public abstract int cargar(int cuanto);
}

interface Lavable {
    void lavar();
}

interface ConFirmware {
    boolean instalar(String version);
}
`,
  'Aparatos.java': `class Androide extends Aparato implements Lavable, ConFirmware {
    private int bateria;

    public Androide(String nombre) {
        super(nombre);
    }

    public int cargar(int cuanto) {
        bateria = cuanto;
        return bateria;
    }

    public void lavar() { }

    public boolean instalar(String version) {
        return true;
    }
}

class Cuadricoptero extends Aparato implements ConFirmware {
    public Cuadricoptero(String nombre) {
        super(nombre);
    }

    public int cargar(int cuanto) {
        return cuanto;
    }

    public boolean instalar(String version) {
        return true;
    }
}

class Lampara extends Aparato {
    public Lampara(String nombre) {
        super(nombre);
    }

    public int cargar(int cuanto) {
        return cuanto;
    }
}
`,
  'Central.java': `import java.util.ArrayList;

class Taller {
    private int ganado;

    public void atender(ArrayList<Aparato> fila) {
        for (Aparato a : fila) {
            a.cargar(100);
            ganado = ganado + 5;
            if (a instanceof Lavable) {
                Lavable l = (Lavable) a;
                l.lavar();
                ganado = ganado + 3;
            } else {
                System.out.println(a.getNombre() + ": sin lavado");
            }
            if (a instanceof ConFirmware) {
                ((ConFirmware) a).instalar("3.1");
                ganado = ganado + 8;
            } else {
                System.out.println(a.getNombre() + ": sin actualización");
            }
        }
    }

    public int balance() {
        return ganado;
    }
}
`,
  'Main.java': `public class Main {
    public static void main(String[] args) {
    }
}
`,
};

test('la Expedición está oculta para estudiantes y abierta para el profesor', () => {
  assert.ok(exp, 'falta la Expedición en MISIONES');
  assert.equal(exp.oculta, true);
  assert.equal(misionVisible(exp), false);
  assert.equal(misionVisible(exp, true), true);
  assert.equal(misionDisponible(exp, []), false);
  assert.equal(misionDisponible(exp, exp.requiere), false, 'aunque cumpla el requisito, un estudiante no la ve');
  assert.equal(misionDisponible(exp, [], true), true);
  for (const m of MISIONES.filter(x => !x.oculta)) assert.equal(misionVisible(m), true);
});

test('el mapa de roles se lee de Roles.java, ignorando comentarios', () => {
  const r = leerRoles({ 'Roles.java': '// CENTRAL = "Falsa"\npublic class Roles { static String CENTRAL = "MiCentral"; static String ROBOT = ""; }' });
  assert.equal(r.CENTRAL, 'MiCentral');
  assert.equal(r.ROBOT, '');
  assert.equal(r.DRON, '');
});

test('sin el mapa de roles, el juez explica qué falta en vez de fallar', () => {
  const r = evaluarNivel(plano, plano.inicial(), { incluirOcultas: true });
  assert.equal(r.estado, 'previo');
  assert.match(r.previo, /Roles\.java.*CENTRAL/);
  const sinClase = { ...plano.solucion, 'Roles.java': plano.solucion['Roles.java'].replace('"Robot"', '"Robocito"') };
  assert.match(evaluarNivel(plano, sinClase).previo, /Robocito/);
});

test('un diseño alternativo, con otros nombres y una clase abstracta, supera los dos pasos', () => {
  for (const p of [plano, construir]) {
    const r = evaluarNivel(p, ALTERNATIVO, { incluirOcultas: true });
    assert.equal(r.estado, 'ejecutado', JSON.stringify(r.errores?.slice(0, 3) || r.previo));
    for (const c of r.casos) assert.equal(c.estado, 'ok', `${p.id} · ${c.nombre}: esperaba ${c.esperado}, obtuvo ${c.obtenido} ${c.error || ''}`);
  }
});

test('la clase intrusa se escribe contra el contrato del estudiante y compila', () => {
  const m = parsePrograma(ALTERNATIVO);
  const fuente = claseIntrusa(m, 'Aparato');
  assert.match(fuente, /class PanelSolar extends Aparato/);
  assert.match(fuente, /super\(nombre\)/);
  assert.match(fuente, /public int cargar\(int cuanto\) \{ return 0; \}/);
  assert.equal(parsePrograma({ ...ALTERNATIVO, 'PanelSolar.java': fuente }).errores.length, 0);
  const ref = parsePrograma(construir.solucion);
  const f2 = claseIntrusa(ref, 'Recargable');
  assert.match(f2, /class PanelSolar implements Recargable/);
  assert.match(f2, /public String getNombre\(\) \{ return nombreIntruso; \}/);
  assert.equal(parsePrograma({ ...construir.solucion, 'PanelSolar.java': f2 }).errores.length, 0);
});

test('una central que pregunta por la clase concreta pasa lo visible pero no la extensión ni las reglas', () => {
  const malo = {
    ...construir.solucion,
    'Central.java': construir.solucion['Central.java']
      .replace('if (a instanceof Lavable) {\n                ((Lavable) a).lavar();', 'if (a instanceof Robot) {\n                ((Lavable) a).lavar();')
      .replace('if (a instanceof Actualizable) {\n                ((Actualizable) a).actualizar("2.0");', 'if (a instanceof Robot || a instanceof Dron) {\n                ((Actualizable) a).actualizar("2.0");'),
  };
  const r = casosDe(evaluarNivel(construir, malo, { incluirOcultas: true }));
  assert.equal(r['Un día completo'].estado, 'ok', 'el comportamiento conocido sigue igual');
  assert.equal(r['La central no nombra robots, drones ni linternas'].estado, 'falla');
  assert.match(r['La central no nombra robots, drones ni linternas'].obtenido, /Robot, Dron/);
});

test('un diseño donde la linterna firma el lavado falla el plano', () => {
  const malo = { ...plano.solucion, 'Aparatos.java': plano.solucion['Aparatos.java'].replace('class Linterna implements Recargable {', 'class Linterna implements Recargable, Lavable {\n    public void lavar() { }') };
  const r = casosDe(evaluarNivel(plano, malo, { incluirOcultas: true }));
  assert.equal(r['Cada aparato firma solo lo que puede cumplir'].estado, 'falla');
  assert.match(r['Cada aparato firma solo lo que puede cumplir'].obtenido, /Linterna no debería ser Lavable/);
});

test('un cobro equivocado lo atrapan las filas al azar y dicen cuál fila falló', () => {
  const malo = { ...construir.solucion, 'Central.java': construir.solucion['Central.java'].replace('creditos += 8;', 'creditos += 7;') };
  const r = casosDe(evaluarNivel(construir, malo, { incluirOcultas: true }));
  assert.equal(r['El balance siempre cuadra'].estado, 'falla');
  assert.match(r['El balance siempre cuadra'].esperado, /^fila \d+ \(/);
});

test('las filas al azar son reproducibles y variadas', () => {
  const a = filasAlAzar(4412, 60), b = filasAlAzar(4412, 60);
  assert.deepEqual(a, b);
  assert.ok(a.some(f => f.length === 0), 'incluye alguna fila vacía');
  assert.ok(a.some(f => f.length >= 5), 'incluye filas largas');
  assert.notDeepEqual(filasAlAzar(1, 60), a);
});
