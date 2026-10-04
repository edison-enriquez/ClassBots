/* Mundo 4 · Contratos: interfaces, programar contra la interfaz, varias interfaces, Comparable y abierto/cerrado */
import { fmt, caso, corrMain, previoMain, exigir, casoRelacion, sinTexto, objetos } from './util.js';

const ROBOT_INI = `public class Robot {
    private String nombre;
    private int energia;

    public Robot(String nombre, int energia) {
        this.nombre = nombre;
        this.energia = energia;
    }

    public String getNombre() {
        return nombre;
    }
}
`;
const LINTERNA_INI = `public class Linterna {
    private int pila;

    public Linterna(int pila) {
        this.pila = pila;
    }
}
`;
const RECARGABLE_INI = `// Recargable.java
// Escribe aquí la interfaz Recargable con dos métodos: recargar() y nivel().
`;
const RECARGABLE = `public interface Recargable {
    void recargar();
    int nivel();
}
`;
const R41 = `public class Robot implements Recargable {
    private String nombre;
    private int energia;

    public Robot(String nombre, int energia) {
        this.nombre = nombre;
        this.energia = energia;
    }

    public String getNombre() {
        return nombre;
    }

    @Override
    public void recargar() {
        energia = 100;
    }

    @Override
    public int nivel() {
        return energia;
    }
}
`;
const L41 = `public class Linterna implements Recargable {
    private int pila;

    public Linterna(int pila) {
        this.pila = pila;
    }

    @Override
    public void recargar() {
        pila = 100;
    }

    @Override
    public int nivel() {
        return pila;
    }
}
`;
const M41_INI = `public class Main {
    public static void main(String[] args) {
        Recargable r1 = new Robot("Tornillo", 30);
        Recargable r2 = new Linterna(10);
        // Recarga ambos e imprime sus niveles: 100 100

    }
}
`;
const M41 = `public class Main {
    public static void main(String[] args) {
        Recargable r1 = new Robot("Tornillo", 30);
        Recargable r2 = new Linterna(10);
        r1.recargar();
        r2.recargar();
        System.out.println(r1.nivel() + " " + r2.nivel());
    }
}
`;
const ESTACION_INI = `import java.util.ArrayList;

// EstacionCarga.java
// Una estación que solo conoce la interfaz Recargable: conectar, cargarTodo y promedio.
`;
const ESTACION = `import java.util.ArrayList;

public class EstacionCarga {
    private ArrayList<Recargable> conectados = new ArrayList<>();

    public void conectar(Recargable r) {
        conectados.add(r);
    }

    public void cargarTodo() {
        for (Recargable r : conectados) {
            r.recargar();
        }
    }

    public int promedio() {
        if (conectados.isEmpty()) {
            return 0;
        }
        int suma = 0;
        for (Recargable r : conectados) {
            suma += r.nivel();
        }
        return suma / conectados.size();
    }
}
`;
const M42 = `public class Main {
    public static void main(String[] args) {
        EstacionCarga estacion = new EstacionCarga();
        estacion.conectar(new Robot("Tornillo", 30));
        estacion.conectar(new Linterna(10));
        System.out.println("Antes: " + estacion.promedio());
        estacion.cargarTodo();
        System.out.println("Después: " + estacion.promedio());
    }
}
`;
const MOVIBLE_INI = `// Movible.java
// Lo que se puede mover: avanzar() y getX().
`;
const MOVIBLE = `public interface Movible {
    void avanzar();
    int getX();
}
`;
const COMUNICABLE_INI = `// Comunicable.java
// Lo que puede informar su estado: reportar().
`;
const COMUNICABLE = `public interface Comunicable {
    String reportar();
}
`;
const DRON_INI = `// Dron.java
// Un dron se recarga y se mueve 3 casillas por paso, pero no habla.
`;
const DRON = `public class Dron implements Recargable, Movible {
    private int bateria = 50;
    private int x;

    @Override
    public void recargar() {
        bateria = 100;
    }

    @Override
    public int nivel() {
        return bateria;
    }

    @Override
    public void avanzar() {
        x += 3;
    }

    @Override
    public int getX() {
        return x;
    }
}
`;
const R43 = `public class Robot implements Recargable, Movible, Comunicable {
    private String nombre;
    private int energia;
    private int x;

    public Robot(String nombre, int energia) {
        this.nombre = nombre;
        this.energia = energia;
    }

    public String getNombre() {
        return nombre;
    }

    @Override
    public void recargar() {
        energia = 100;
    }

    @Override
    public int nivel() {
        return energia;
    }

    @Override
    public void avanzar() {
        x += 1;
    }

    @Override
    public int getX() {
        return x;
    }

    @Override
    public String reportar() {
        return nombre + " en x=" + x;
    }
}
`;
const M43 = `import java.util.ArrayList;

public class Main {
    public static void main(String[] args) {
        Robot tornillo = new Robot("Tornillo", 30);
        Dron zumbido = new Dron();
        ArrayList<Movible> flota = new ArrayList<>();
        flota.add(tornillo);
        flota.add(zumbido);
        for (Movible m : flota) {
            m.avanzar();
            m.avanzar();
        }
        System.out.println(tornillo.reportar());
        System.out.println("Dron en x=" + zumbido.getX());
    }
}
`;
const R44 = R43.replace('public class Robot implements Recargable, Movible, Comunicable {', 'public class Robot implements Recargable, Movible, Comunicable, Comparable<Robot> {').replace(/\n}\n$/, `

    @Override
    public int compareTo(Robot otro) {
        if (energia != otro.energia) {
            return Integer.compare(energia, otro.energia);
        }
        return nombre.compareTo(otro.nombre);
    }
}
`);
const M44 = `import java.util.ArrayList;
import java.util.Collections;

public class Main {
    public static void main(String[] args) {
        ArrayList<Robot> fila = new ArrayList<>();
        fila.add(new Robot("Tornillo", 70));
        fila.add(new Robot("Tuerca", 20));
        fila.add(new Robot("Perno", 45));
        Collections.sort(fila);
        for (Robot r : fila) {
            System.out.println(r.getNombre() + " " + r.nivel());
        }
    }
}
`;
const ASPIRADORA = `public class Aspiradora implements Recargable {
    private int carga = 15;

    @Override
    public void recargar() {
        carga = 100;
    }

    @Override
    public int nivel() {
        return carga;
    }
}
`;
const GRUA = `public class Grua implements Recargable {
    private int combustible = 40;

    @Override
    public void recargar() {
        combustible = 100;
    }

    @Override
    public int nivel() {
        return combustible;
    }
}
`;
const MAQUINA_INI = n => `// ${n}.java
// Escribe aquí la clase ${n}: una máquina nueva que implemente Recargable.
`;
const M45 = `public class Main {
    public static void main(String[] args) {
        EstacionCarga estacion = new EstacionCarga();
        estacion.conectar(new Robot("Tornillo", 30));
        estacion.conectar(new Linterna(10));
        estacion.conectar(new Dron());
        estacion.conectar(new Aspiradora());
        estacion.conectar(new Grua());
        estacion.cargarTodo();
        System.out.println("Promedio: " + estacion.promedio());
    }
}
`;
const NORMAL = s => (s || '').replace(/\/\/.*$/gm, '').replace(/\s+/g, ' ').trim();

const conRet = (run, f) => { const h = {}; const r = run(C => { h.v = f(C); }); return { ...r, v: h.v }; };
const GUIA = '<p class="guia-link">Repasa la <button type="button" class="enlace" data-guia="interfaces">guía de interfaces</button> y la <button type="button" class="enlace" data-guia="relaciones">de relaciones</button>.</p>';
const conocidas = new Set(['Robot', 'Linterna', 'Dron', 'EstacionCarga', 'Main', 'Recargable', 'Movible', 'Comunicable']);

export const MUNDO4 = [
  {
    id: 'enchufe', titulo: 'El enchufe', concepto: 'interface', escena: 'estacion', archivos: ['Recargable.java', 'Robot.java', 'Linterna.java', 'Main.java'],
    mentor: 'Compramos una estación de carga, pero cada aparato se recarga distinto: robots, linternas, lo que venga. Necesitamos un enchufe común, un contrato.',
    teoria: `<p>Una <strong>interfaz</strong> es un contrato: dice <em>qué</em> métodos debe tener una clase, pero no <em>cómo</em> funcionan. No tiene atributos de instancia ni se puede hacer <code>new</code> de ella.</p>
<p>Una clase firma el contrato con <code>implements</code> y queda obligada a escribir todos esos métodos como <code>public</code>. En UML, la interfaz lleva <code>«interface»</code> y la relación es una <strong>realización</strong>: línea punteada con triángulo vacío, <code>Robot ┄┄▷ Recargable</code>.</p>${GUIA}`,
    ejemplo: 'public interface Recargable {\n    void recargar();\n    int nivel();\n}',
    tareas: ['En <code>Recargable.java</code>, declara la interfaz con <code>void recargar()</code> e <code>int nivel()</code>.', 'Haz que <code>Robot</code> y <code>Linterna</code> la implementen: <code>recargar()</code> deja su carga en 100 y <code>nivel()</code> la devuelve.', 'En <code>Main</code>, recarga ambos e imprime <code>100 100</code>.'],
    nota: 'Mira <code>Main</code>: las variables son de tipo <code>Recargable</code>, no <code>Robot</code> ni <code>Linterna</code>. Solo se pueden usar los métodos del contrato.',
    pista: 'Si olvidas un método, el compilador te dice cuál falta. Si lo escribes sin <code>public</code>, también.',
    objetivoUML: [['Robot', 'Recargable', 'realizacion'], ['Linterna', 'Recargable', 'realizacion']],
    inicial: () => ({ 'Recargable.java': RECARGABLE_INI, 'Robot.java': ROBOT_INI, 'Linterna.java': LINTERNA_INI, 'Main.java': M41_INI }),
    archivoInicial: 'Recargable.java',
    solucion: { 'Recargable.java': RECARGABLE, 'Robot.java': R41, 'Linterna.java': L41, 'Main.java': M41 },
    previo: m => exigir(m, [{ clase: 'Recargable', interfaz: true, metodos: [['recargar', 0], ['nivel', 0]] }, { clase: 'Robot', implementa: ['Recargable'] }, { clase: 'Linterna', implementa: ['Recargable'] }]) || previoMain(m),
    animacion: corrMain,
    pruebas: [
      { nombre: 'Recargable es una interfaz con 2 métodos', prueba: ({ modelo }) => { const I = modelo.clases.Recargable; const ok = I?.tipo === 'interface' && I.metodos.length === 2; return caso(ok, 'interface con recargar() y nivel()', I ? `${I.tipo === 'interface' ? 'interface' : 'clase'} con ${I.metodos.map(m => m.nombre + '()').join(' y ')}` : 'no existe'); } },
      casoRelacion('Robot', 'Recargable', 'realizacion'),
      casoRelacion('Linterna', 'Recargable', 'realizacion'),
      { nombre: 'recargar() deja el nivel en 100', entrada: 'new Robot("A", 30).recargar(); new Linterna(5).recargar()', prueba: ({ run }) => { const { v } = conRet(run, C => { const a = new C.Robot('A', 30), b = new C.Linterna(5); const antes = [a.nivel(), b.nivel()]; a.recargar(); b.recargar(); return [...antes, a.nivel(), b.nivel()]; }); return caso(String(v) === '30,5,100,100', '30, 5 → 100, 100', (v || []).join(', ')); } },
      { nombre: 'Main imprime 100 100', prueba: ({ run }) => { const { rt } = run(corrMain); return caso(rt.salida.join('\n').trim() === '100 100', '100 100', rt.salida.join('\n') || '(sin salida)'); } },
      { nombre: 'Ambos son instanceof Recargable', oculto: true, prueba: ({ run }) => { const { v } = conRet(run, C => [new C.Robot('A', 1) instanceof C.Recargable, new C.Linterna(1) instanceof C.Recargable]); return caso(v?.[0] && v?.[1], 'true y true', (v || []).join(' y ')); } },
    ],
    exito: 'Robot y Linterna firmaron el mismo contrato. Para la estación, los dos son simplemente Recargable.',
  },
  {
    id: 'estacion', titulo: 'La estación universal', concepto: 'Programar contra la interfaz', escena: 'estacion', archivos: ['EstacionCarga.java', 'Recargable.java', 'Robot.java', 'Linterna.java', 'Main.java'],
    mentor: 'Ahora sí: la estación. Regla de oro del taller: la estación solo conoce el enchufe. No sabe ni le importa si lo que conectas es un robot o una linterna.',
    teoria: `<p><strong>Programar contra la interfaz</strong> significa que tu clase usa el tipo <code>Recargable</code>, nunca <code>Robot</code> ni <code>Linterna</code>. Así funciona con cualquier aparato que firme el contrato, incluso con los que todavía no existen.</p>
<p>Cuando llamas <code>r.recargar()</code>, Java ejecuta la versión del objeto real: la del robot o la de la linterna. Eso es <strong>polimorfismo</strong> a través de una interfaz.</p>${GUIA}`,
    ejemplo: 'for (Recargable r : conectados) {\n    r.recargar();\n}',
    tareas: ['Escribe <code>EstacionCarga</code> con una <code>ArrayList&lt;Recargable&gt; conectados</code>.', 'Agrega <code>conectar(Recargable)</code>, <code>cargarTodo()</code> y <code>promedio()</code> (entero; 0 si no hay nada conectado).', 'No nombres a <code>Robot</code> ni a <code>Linterna</code> dentro de la estación, ni uses <code>instanceof</code>.'],
    pista: 'Para el promedio: suma <code>r.nivel()</code> de todos y divide por <code>conectados.size()</code>. Revisa antes <code>conectados.isEmpty()</code>.',
    objetivoUML: [['EstacionCarga', 'Recargable', 'agregacion'], ['Robot', 'Recargable', 'realizacion'], ['Linterna', 'Recargable', 'realizacion']],
    inicial: p => ({ 'EstacionCarga.java': ESTACION_INI, 'Recargable.java': p['Recargable.java'], 'Robot.java': p['Robot.java'], 'Linterna.java': p['Linterna.java'], 'Main.java': M42 }),
    archivoInicial: 'EstacionCarga.java',
    solucion: { 'EstacionCarga.java': ESTACION, 'Recargable.java': RECARGABLE, 'Robot.java': R41, 'Linterna.java': L41, 'Main.java': M42 },
    previo: m => exigir(m, [{ clase: 'EstacionCarga', metodos: [['conectar', 1], ['cargarTodo', 0], ['promedio', 0]] }]) || previoMain(m),
    animacion: corrMain,
    pruebas: [
      { nombre: 'cargarTodo() recarga todo lo conectado', entrada: 'Robot(30) y Linterna(10)', prueba: ({ run }) => { const { v } = conRet(run, C => { const e = new C.EstacionCarga(); const a = new C.Robot('A', 30), b = new C.Linterna(10); e.conectar(a); e.conectar(b); e.cargarTodo(); return [a.nivel(), b.nivel()]; }); return caso(String(v) === '100,100', '100 y 100', (v || []).join(' y ')); } },
      { nombre: 'promedio() de 30 y 10 es 20', prueba: ({ run }) => { const { v } = conRet(run, C => { const e = new C.EstacionCarga(); e.conectar(new C.Robot('A', 30)); e.conectar(new C.Linterna(10)); return e.promedio(); }); return caso(v === 20, '20', fmt(v)); } },
      { nombre: 'La estación solo conoce la interfaz', prueba: ({ archivos }) => { const ok = sinTexto(archivos, 'EstacionCarga.java', /\b(Robot|Linterna)\b|instanceof/); return caso(ok, 'sin Robot, Linterna ni instanceof', ok ? 'solo Recargable' : 'la estación menciona una clase concreta'); } },
      casoRelacion('EstacionCarga', 'Recargable', 'agregacion', { oculto: true }),
      { nombre: 'promedio() es entero y vale 0 sin aparatos', oculto: true, entrada: 'vacía; luego 30 y 15', prueba: ({ run }) => { const { v } = conRet(run, C => { const e = new C.EstacionCarga(); const a = e.promedio(); e.conectar(new C.Robot('A', 30)); e.conectar(new C.Linterna(15)); return [a, e.promedio()]; }); return caso(String(v) === '0,22', '0 y luego 22', (v || []).join(' y luego ')); } },
    ],
    exito: 'La estación carga cualquier cosa Recargable sin saber qué es. Ese es el poder de un contrato.',
  },
  {
    id: 'contratos', titulo: 'Contratos pequeños', concepto: 'Varias interfaces', escena: 'estacion', archivos: ['Movible.java', 'Comunicable.java', 'Dron.java', 'Robot.java', 'Recargable.java', 'Linterna.java', 'EstacionCarga.java', 'Main.java'],
    mentor: 'Llegaron drones. Se recargan y vuelan, pero no hablan. Y la linterna ni se mueve. No vamos a obligar a nadie a firmar cláusulas que no puede cumplir.',
    teoria: `<p>Una clase puede implementar <strong>varias interfaces</strong>: <code>implements Recargable, Movible</code>. Es mejor tener contratos pequeños y precisos que uno gigante.</p>
<p><strong>Segregación de interfaces (la I de SOLID):</strong> ninguna clase debería verse obligada a escribir métodos que no le sirven. Si <code>Linterna</code> tuviera que implementar <code>avanzar()</code>, ese método no tendría sentido.</p>${GUIA}`,
    ejemplo: 'public class Dron implements Recargable, Movible {\n    ...\n}',
    tareas: ['Declara <code>Movible</code> (<code>avanzar()</code>, <code>getX()</code>) y <code>Comunicable</code> (<code>String reportar()</code>).', 'Escribe <code>Dron implements Recargable, Movible</code>: empieza con 50 de batería y avanza 3 casillas por paso.', 'Haz que <code>Robot</code> implemente los tres contratos: avanza 1 casilla y <code>reportar()</code> devuelve <code>Tornillo en x=2</code>.', '<code>Linterna</code> sigue implementando solo <code>Recargable</code>.'],
    pista: 'En <code>Robot</code> agrega <code>private int x;</code>. Para el reporte: <code>return nombre + " en x=" + x;</code>',
    objetivoUML: [['Robot', 'Movible', 'realizacion'], ['Robot', 'Comunicable', 'realizacion'], ['Dron', 'Movible', 'realizacion'], ['Dron', 'Recargable', 'realizacion']],
    inicial: p => ({ 'Movible.java': MOVIBLE_INI, 'Comunicable.java': COMUNICABLE_INI, 'Dron.java': DRON_INI, 'Robot.java': p['Robot.java'], 'Recargable.java': p['Recargable.java'], 'Linterna.java': p['Linterna.java'], 'EstacionCarga.java': p['EstacionCarga.java'], 'Main.java': M43 }),
    archivoInicial: 'Movible.java',
    solucion: { 'Movible.java': MOVIBLE, 'Comunicable.java': COMUNICABLE, 'Dron.java': DRON, 'Robot.java': R43, 'Recargable.java': RECARGABLE, 'Linterna.java': L41, 'EstacionCarga.java': ESTACION, 'Main.java': M43 },
    previo: m => exigir(m, [{ clase: 'Movible', interfaz: true, metodos: [['avanzar', 0], ['getX', 0]] }, { clase: 'Comunicable', interfaz: true, metodos: [['reportar', 0]] }, { clase: 'Dron', implementa: ['Recargable', 'Movible'] }, { clase: 'Robot', implementa: ['Recargable', 'Movible', 'Comunicable'] }]) || previoMain(m),
    animacion: corrMain,
    pruebas: [
      casoRelacion('Dron', 'Movible', 'realizacion'),
      casoRelacion('Robot', 'Comunicable', 'realizacion'),
      { nombre: 'Robot y Dron avanzan a su manera', entrada: 'avanzar() ×2 en cada uno', prueba: ({ run }) => { const { v } = conRet(run, C => { const r = new C.Robot('Tornillo', 30), d = new C.Dron(); for (const m of [r, d]) { m.avanzar(); m.avanzar(); } return [r.getX(), d.getX()]; }); return caso(String(v) === '2,6', 'robot x=2, dron x=6', `robot x=${fmt(v?.[0])}, dron x=${fmt(v?.[1])}`); } },
      { nombre: 'reportar() describe al robot', entrada: 'Tornillo avanza 2 veces', prueba: ({ run }) => { const { v } = conRet(run, C => { const r = new C.Robot('Tornillo', 30); r.avanzar(); r.avanzar(); return r.reportar(); }); return caso(v === 'Tornillo en x=2', '"Tornillo en x=2"', fmt(v)); } },
      { nombre: 'Linterna no firma contratos que no cumple', prueba: ({ modelo }) => { const c = modelo.clases.Linterna; const imp = c?.implementa || []; return caso(imp.length === 1 && imp[0] === 'Recargable' && !c.metodos.some(m => m.nombre === 'avanzar'), 'solo Recargable, sin avanzar()', imp.join(', ') || 'nada'); } },
      { nombre: 'Dron empieza con 50 y se recarga', oculto: true, prueba: ({ run }) => { const { v } = conRet(run, C => { const d = new C.Dron(); const a = d.nivel(); d.recargar(); return [a, d.nivel()]; }); return caso(String(v) === '50,100', '50 y luego 100', (v || []).join(' y luego ')); } },
    ],
    exito: 'Cada máquina firma solo los contratos que puede cumplir. Contratos pequeños, máquinas honestas.',
  },
  {
    id: 'orden', titulo: 'Orden en la fila', concepto: 'Comparable', escena: 'estacion', archivos: ['Robot.java', 'Main.java', 'Recargable.java', 'Movible.java', 'Comunicable.java', 'Dron.java', 'Linterna.java', 'EstacionCarga.java'],
    mentor: 'Hay fila en la estación. Quiero atender primero al robot con menos energía. Java ya sabe ordenar listas, siempre que le digamos cómo comparar dos robots.',
    teoria: `<p>Java trae interfaces listas para usar. <code>Comparable&lt;T&gt;</code> tiene un solo método, <code>compareTo(T otro)</code>: devuelve un número negativo si este objeto va antes, positivo si va después y 0 si empatan.</p>
<p>Si <code>Robot implements Comparable&lt;Robot&gt;</code>, entonces <code>Collections.sort(lista)</code> sabe ordenar robots. Así la biblioteca de Java trabaja con tus clases sin conocerlas: otra vez, un contrato.</p>${GUIA}`,
    ejemplo: '@Override\npublic int compareTo(Robot otro) {\n    return Integer.compare(energia, otro.energia);\n}',
    tareas: ['Agrega <code>Comparable&lt;Robot&gt;</code> a la lista de <code>implements</code> de <code>Robot</code>.', 'Escribe <code>compareTo(Robot otro)</code>: primero el de menos energía; si empatan, por nombre en orden alfabético.', 'Ejecuta: <code>Main</code> imprime la fila ordenada.'],
    pista: 'Para el desempate: <code>return nombre.compareTo(otro.nombre);</code> (los String también son Comparable).',
    inicial: p => ({ 'Robot.java': p['Robot.java'], 'Main.java': M44, 'Recargable.java': p['Recargable.java'], 'Movible.java': p['Movible.java'], 'Comunicable.java': p['Comunicable.java'], 'Dron.java': p['Dron.java'], 'Linterna.java': p['Linterna.java'], 'EstacionCarga.java': p['EstacionCarga.java'] }),
    archivoInicial: 'Robot.java',
    solucion: { 'Robot.java': R44, 'Main.java': M44, 'Recargable.java': RECARGABLE, 'Movible.java': MOVIBLE, 'Comunicable.java': COMUNICABLE, 'Dron.java': DRON, 'Linterna.java': L41, 'EstacionCarga.java': ESTACION },
    previo: m => exigir(m, [{ clase: 'Robot', implementa: ['Comparable'], metodos: [['compareTo', 1]] }]) || previoMain(m),
    animacion: corrMain,
    pruebas: [
      { nombre: 'Main imprime la fila de menor a mayor energía', prueba: ({ run }) => { const { rt } = run(corrMain); const t = rt.salida.join('\n'); return caso(t.trim() === 'Tuerca 20\nPerno 45\nTornillo 70', 'Tuerca 20\nPerno 45\nTornillo 70', t || '(sin salida)'); } },
      { nombre: 'compareTo da el signo correcto', entrada: 'A(20).compareTo(B(70)) y al revés', prueba: ({ run }) => { const { v } = conRet(run, C => { const a = new C.Robot('A', 20), b = new C.Robot('B', 70); return [Math.sign(a.compareTo(b)), Math.sign(b.compareTo(a))]; }); return caso(String(v) === '-1,1', 'negativo y positivo', (v || []).map(x => (x < 0 ? 'negativo' : x > 0 ? 'positivo' : 'cero')).join(' y ')); } },
      { nombre: 'Empate de energía: orden alfabético', oculto: true, entrada: 'Zeta(50), Alfa(50), Mio(10)', prueba: ({ run }) => { const { v } = conRet(run, C => { const l = [new C.Robot('Zeta', 50), new C.Robot('Alfa', 50), new C.Robot('Mio', 10)]; l.sort((a, b) => a.compareTo(b)); return l.map(r => r.getNombre()); }); return caso(String(v) === 'Mio,Alfa,Zeta', 'Mio, Alfa, Zeta', (v || []).join(', ')); } },
    ],
    exito: 'Collections.sort ordenó tus robots sin conocerlos: le bastó con el contrato Comparable.',
  },
  {
    id: 'futuro', titulo: 'Jefe: las máquinas del futuro', corto: 'Jefe', jefe: true, concepto: 'Abierto/cerrado', escena: 'estacion',
    archivos: ['Aspiradora.java', 'Grua.java', 'EstacionCarga.java', 'Recargable.java', 'Robot.java', 'Linterna.java', 'Dron.java', 'Movible.java', 'Comunicable.java', 'Main.java'],
    mentor: 'Prueba final del mundo: llegan máquinas nuevas y la estación está sellada. Si tuviste que tocarla para que funcione, el diseño falló.',
    teoria: `<p><strong>Abierto/cerrado (la O de SOLID):</strong> una clase debe estar <em>abierta</em> a la extensión y <em>cerrada</em> a la modificación. Para soportar una máquina nueva, escribes una clase nueva; no editas la estación.</p>
<p>Las interfaces son lo que lo hace posible: la estación depende del contrato, y cada máquina nueva solo tiene que firmarlo.</p>${GUIA}`,
    ejemplo: 'public class Aspiradora implements Recargable {\n    ...\n}',
    tareas: ['No cambies <code>EstacionCarga.java</code>: está sellada.', 'Escribe <code>Aspiradora</code> y <code>Grua</code>: dos máquinas nuevas que implementan <code>Recargable</code>, cada una con una carga inicial menor que 100.', 'En <code>Main</code>, conecta al menos 5 aparatos de 5 clases distintas, recárgalos todos e imprime <code>Promedio: 100</code>.'],
    pista: 'Copia la forma de <code>Linterna</code>: un atributo con la carga, <code>recargar()</code> y <code>nivel()</code>. Nada más.',
    objetivoUML: [['EstacionCarga', 'Recargable', 'agregacion']],
    inicial: p => ({ 'Aspiradora.java': MAQUINA_INI('Aspiradora'), 'Grua.java': MAQUINA_INI('Grua'), 'EstacionCarga.java': ESTACION, 'Recargable.java': p['Recargable.java'], 'Robot.java': p['Robot.java'], 'Linterna.java': p['Linterna.java'], 'Dron.java': p['Dron.java'], 'Movible.java': p['Movible.java'], 'Comunicable.java': p['Comunicable.java'], 'Main.java': M42 }),
    archivoInicial: 'Aspiradora.java',
    solucion: { 'Aspiradora.java': ASPIRADORA, 'Grua.java': GRUA, 'EstacionCarga.java': ESTACION, 'Recargable.java': RECARGABLE, 'Robot.java': R44, 'Linterna.java': L41, 'Dron.java': DRON, 'Movible.java': MOVIBLE, 'Comunicable.java': COMUNICABLE, 'Main.java': M45 },
    previo: m => previoMain(m),
    animacion: corrMain,
    pruebas: [
      { nombre: 'EstacionCarga.java no cambió', prueba: ({ archivos }) => { const ok = NORMAL(archivos['EstacionCarga.java']) === NORMAL(ESTACION); return caso(ok, 'igual a la versión sellada', ok ? 'sin cambios' : 'la estación fue modificada'); } },
      { nombre: 'Hay al menos 2 máquinas nuevas Recargable', prueba: ({ modelo }) => { const nuevas = Object.values(modelo.clases).filter(c => c.tipo === 'clase' && !conocidas.has(c.nombre) && c.implementa.includes('Recargable')); return caso(nuevas.length >= 2, '≥ 2 clases nuevas con implements Recargable', nuevas.map(c => c.nombre).join(', ') || 'ninguna'); } },
      { nombre: 'Main conecta 5 aparatos de 5 clases distintas', prueba: ({ run }) => { const { rt } = run(corrMain); const est = objetos(rt, 'EstacionCarga')[0]; const cls = est ? new Set(Array.from(est.conectados || [], o => rt.registro[rt.idDe(o) - 1]?.cls)) : new Set(); return caso((est?.conectados?.length || 0) >= 5 && cls.size >= 5, '≥ 5 aparatos, 5 clases', est ? `${est.conectados.length} aparatos de ${cls.size} clases (${[...cls].join(', ')})` : 'no hay estación'); } },
      { nombre: 'Main imprime Promedio: 100', prueba: ({ run }) => { const { rt } = run(corrMain); const t = rt.salida.join('\n').trim(); return caso(t.endsWith('Promedio: 100'), 'Promedio: 100', t || '(sin salida)'); } },
      { nombre: 'Las máquinas nuevas empiezan por debajo de 100', oculto: true, prueba: ({ modelo, run }) => { const nuevas = Object.values(modelo.clases).filter(c => c.tipo === 'clase' && !conocidas.has(c.nombre) && c.implementa.includes('Recargable') && c.ctors.every(k => k.params.length === 0)); const { v } = conRet(run, C => nuevas.map(c => { const o = new C[c.nombre](); const a = o.nivel(); o.recargar(); return [c.nombre, a, o.nivel()]; })); const malas = (v || []).filter(([, a, b]) => !(a < 100 && b === 100)); return caso(nuevas.length >= 2 && !malas.length, 'carga inicial < 100 y 100 tras recargar', malas.length ? malas.map(([n, a, b]) => `${n}: ${a} → ${b}`).join('; ') : nuevas.length < 2 ? 'faltan máquinas con constructor sin parámetros' : 'bien'); } },
    ],
    exito: 'Llegaron máquinas nuevas y la estación ni se enteró: abierta a la extensión, cerrada a la modificación.',
  },
];
