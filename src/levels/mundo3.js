/* Mundo 3 · Las Conexiones: tipos de relación entre clases
   dependencia → asociación → agregación → composición → plano completo con multiplicidad */
import { fmt, caso, corrMain, previoMain, exigir, casoRelacion, sinTexto, objetos } from './util.js';

const ROBOT_BASE = `public class Robot {
    public static final int ENERGIA_MAX = 100;
    private String nombre;
    private int energia;

    public Robot(String nombre) {
        this.nombre = nombre;
        this.energia = ENERGIA_MAX;
    }

    public String getNombre() {
        return nombre;
    }

    public int getEnergia() {
        return energia;
    }

    public boolean consumir(int cantidad) {
        if (cantidad > 0 && cantidad <= energia) {
            energia -= cantidad;
            return true;
        }
        return false;
    }
}
`;
const HERRAMIENTA = `public class Herramienta {
    private String nombre;
    private int potencia;

    public Herramienta(String nombre, int potencia) {
        this.nombre = nombre;
        this.potencia = potencia;
    }

    public String getNombre() {
        return nombre;
    }

    public int getPotencia() {
        return potencia;
    }
}
`;
const MAIN_31_INI = `public class Main {
    public static void main(String[] args) {
        Robot tornillo = new Robot("Tornillo");
        tornillo.consumir(50);
        Herramienta llave = new Herramienta("Llave", 30);
        // Repara a Tornillo con la llave e imprime su energía

    }
}
`;
const REPARAR = `

    public void reparar(Herramienta h) {
        energia = Math.min(ENERGIA_MAX, energia + h.getPotencia());
    }
}
`;
const R31 = ROBOT_BASE.replace(/\n}\n$/, REPARAR);
const M31 = `public class Main {
    public static void main(String[] args) {
        Robot tornillo = new Robot("Tornillo");
        tornillo.consumir(50);
        Herramienta llave = new Herramienta("Llave", 30);
        tornillo.reparar(llave);
        System.out.println(tornillo.getNombre() + ": " + tornillo.getEnergia());
    }
}
`;
const OPERARIO_INI = `// Operario.java
// Declara aquí la clase Operario: un nombre privado, su constructor y getNombre().
`;
const OPERARIO = `public class Operario {
    private String nombre;

    public Operario(String nombre) {
        this.nombre = nombre;
    }

    public String getNombre() {
        return nombre;
    }
}
`;
const R32 = R31.replace('    private int energia;\n', '    private int energia;\n    private Operario responsable;\n').replace(/\n}\n$/, `

    public void asignarResponsable(Operario o) {
        this.responsable = o;
    }

    public Operario getResponsable() {
        return responsable;
    }
}
`);
const M32 = `public class Main {
    public static void main(String[] args) {
        Operario ana = new Operario("Ana");
        Robot tornillo = new Robot("Tornillo");
        Robot tuerca = new Robot("Tuerca");
        tornillo.asignarResponsable(ana);
        tuerca.asignarResponsable(ana);
        System.out.println(tornillo.getNombre() + " responde a " + tornillo.getResponsable().getNombre());
        System.out.println(tuerca.getNombre() + " responde a " + tuerca.getResponsable().getNombre());
    }
}
`;
const CUADRILLA_INI = `import java.util.ArrayList;

// Cuadrilla.java
// Declara aquí la clase Cuadrilla: un nombre y una lista de robots.
`;
const CUADRILLA = `import java.util.ArrayList;

public class Cuadrilla {
    private String nombre;
    private ArrayList<Robot> miembros = new ArrayList<>();

    public Cuadrilla(String nombre) {
        this.nombre = nombre;
    }

    public String getNombre() {
        return nombre;
    }

    public void agregar(Robot r) {
        if (r != null && !miembros.contains(r)) {
            miembros.add(r);
        }
    }

    public int tamano() {
        return miembros.size();
    }

    public int energiaTotal() {
        int total = 0;
        for (Robot r : miembros) {
            total += r.getEnergia();
        }
        return total;
    }
}
`;
const M33 = `public class Main {
    public static void main(String[] args) {
        Robot tornillo = new Robot("Tornillo");
        Robot tuerca = new Robot("Tuerca");
        Robot perno = new Robot("Perno");
        Cuadrilla alfa = new Cuadrilla("Alfa");
        alfa.agregar(tornillo);
        alfa.agregar(tuerca);
        alfa.agregar(perno);
        tornillo.consumir(40);
        System.out.println(alfa.getNombre() + ": " + alfa.tamano() + " robots, " + alfa.energiaTotal() + " de energía");
    }
}
`;
const BATERIA_INI = `// Bateria.java
// Declara aquí la clase Bateria: capacidad (final), carga, getCarga(), consumir(int), cargar(int) y recargar().
`;
const BATERIA = `public class Bateria {
    private final int capacidad;
    private int carga;

    public Bateria(int capacidad) {
        this.capacidad = capacidad;
        this.carga = capacidad;
    }

    public int getCarga() {
        return carga;
    }

    public boolean consumir(int cantidad) {
        if (cantidad > 0 && cantidad <= carga) {
            carga -= cantidad;
            return true;
        }
        return false;
    }

    public void cargar(int cantidad) {
        carga = Math.min(capacidad, carga + cantidad);
    }

    public void recargar() {
        carga = capacidad;
    }
}
`;
const R34 = `public class Robot {
    public static final int ENERGIA_MAX = 100;
    private String nombre;
    private final Bateria bateria;
    private Operario responsable;

    public Robot(String nombre) {
        this.nombre = nombre;
        this.bateria = new Bateria(ENERGIA_MAX);
    }

    public String getNombre() {
        return nombre;
    }

    public int getEnergia() {
        return bateria.getCarga();
    }

    public boolean consumir(int cantidad) {
        return bateria.consumir(cantidad);
    }

    public void reparar(Herramienta h) {
        bateria.cargar(h.getPotencia());
    }

    public void asignarResponsable(Operario o) {
        this.responsable = o;
    }

    public Operario getResponsable() {
        return responsable;
    }
}
`;
const PLANTA_INI = `import java.util.ArrayList;

// Planta.java
// La planta crea y es dueña de sus cuadrillas: crearCuadrilla(String) y totalRobots().
`;
const PLANTA = `import java.util.ArrayList;

public class Planta {
    private String nombre;
    private ArrayList<Cuadrilla> cuadrillas = new ArrayList<>();

    public Planta(String nombre) {
        this.nombre = nombre;
    }

    public Cuadrilla crearCuadrilla(String nombreCuadrilla) {
        Cuadrilla c = new Cuadrilla(nombreCuadrilla);
        cuadrillas.add(c);
        return c;
    }

    public int totalRobots() {
        int total = 0;
        for (Cuadrilla c : cuadrillas) {
            total += c.tamano();
        }
        return total;
    }
}
`;
const M35 = `public class Main {
    public static void main(String[] args) {
        Planta planta = new Planta("Planta Norte");
        Cuadrilla alfa = planta.crearCuadrilla("Alfa");
        Cuadrilla beta = planta.crearCuadrilla("Beta");
        Operario ana = new Operario("Ana");
        Robot tornillo = new Robot("Tornillo");
        Robot tuerca = new Robot("Tuerca");
        Robot perno = new Robot("Perno");
        tornillo.asignarResponsable(ana);
        alfa.agregar(tornillo);
        alfa.agregar(tuerca);
        beta.agregar(perno);
        tornillo.consumir(50);
        tornillo.reparar(new Herramienta("Llave", 30));
        System.out.println("Robots en la planta: " + planta.totalRobots());
        System.out.println(tornillo.getNombre() + ": " + tornillo.getEnergia());
    }
}
`;

const conRet = (run, f) => { const h = {}; const r = run(C => { h.v = f(C); }); return { ...r, v: h.v }; };
const R = (C, n = 'Tornillo') => new C.Robot(n);

const GUIA = '<p class="guia-link">Consulta la <button type="button" class="enlace" data-guia="relaciones">guía de relaciones</button> para compararlas todas.</p>';

export const MUNDO3 = [
  {
    id: 'dependencia', titulo: 'La caja de herramientas', concepto: 'Dependencia', escena: 'conexiones', archivos: ['Robot.java', 'Herramienta.java', 'Main.java'],
    mentor: 'Tras el ataque de Óxido, varios robots quedaron débiles. En la caja hay herramientas: un robot las toma, repara y las devuelve. No se las queda.',
    teoria: `<p>Las clases no viven solas: se <strong>relacionan</strong>. La relación más débil es la <strong>dependencia</strong>: una clase <em>usa</em> a otra de paso, como parámetro o variable local, pero no la guarda en un atributo.</p>
<p>En UML se dibuja con una línea <strong>punteada</strong> y una flecha abierta: <code>Robot ┄┄> Herramienta</code>. Se lee «Robot usa Herramienta».</p>${GUIA}`,
    ejemplo: 'public void reparar(Herramienta h) {\n    energia = Math.min(ENERGIA_MAX, energia + h.getPotencia());\n}',
    tareas: ['En <code>Robot</code>, agrega <code>reparar(Herramienta h)</code>: suma la potencia de la herramienta a la energía, sin pasar de <code>ENERGIA_MAX</code>.', 'En <code>Main</code>, repara a Tornillo con la llave e imprime <code>Tornillo: 80</code>.', 'Mira la pestaña UML: aparece la flecha punteada de dependencia.'],
    nota: 'No guardes la herramienta en un atributo: si lo haces, la relación deja de ser una dependencia.',
    pista: '<code>Math.min(a, b)</code> devuelve el menor de los dos números.',
    objetivoUML: [['Robot', 'Herramienta', 'dependencia']],
    inicial: () => ({ 'Robot.java': ROBOT_BASE, 'Herramienta.java': HERRAMIENTA, 'Main.java': MAIN_31_INI }),
    archivoInicial: 'Robot.java',
    solucion: { 'Robot.java': R31, 'Herramienta.java': HERRAMIENTA, 'Main.java': M31 },
    previo: m => exigir(m, [{ clase: 'Robot', metodos: [['reparar', 1]] }, { clase: 'Herramienta' }]) || previoMain(m),
    animacion: corrMain,
    pruebas: [
      { nombre: 'reparar suma la potencia', entrada: 'consumir(50); reparar(Llave de 30)', prueba: ({ run }) => { const { v } = conRet(run, C => { const r = R(C); r.consumir(50); r.reparar(new C.Herramienta('Llave', 30)); return r.getEnergia(); }); return caso(v === 80, 'energia = 80', 'energia = ' + fmt(v)); } },
      { nombre: 'reparar no pasa de ENERGIA_MAX', entrada: 'consumir(10); reparar(Martillo de 50)', prueba: ({ run }) => { const { v } = conRet(run, C => { const r = R(C); r.consumir(10); r.reparar(new C.Herramienta('Martillo', 50)); return r.getEnergia(); }); return caso(v === 100, 'energia = 100', 'energia = ' + fmt(v)); } },
      casoRelacion('Robot', 'Herramienta', 'dependencia'),
      { nombre: 'Main imprime la energía reparada', prueba: ({ run }) => { const { rt } = run(corrMain); return caso(rt.salida.join('\n').trim() === 'Tornillo: 80', 'Tornillo: 80', rt.salida.join('\n') || '(sin salida)'); } },
      { nombre: 'Una misma herramienta repara a varios robots', oculto: true, entrada: 'la misma llave repara a dos robots', prueba: ({ run }) => { const { v } = conRet(run, C => { const ll = new C.Herramienta('Llave', 20); const a = R(C, 'A'), b = R(C, 'B'); a.consumir(30); b.consumir(50); a.reparar(ll); b.reparar(ll); return [a.getEnergia(), b.getEnergia()]; }); return caso(v?.[0] === 90 && v?.[1] === 70, '90 y 70', `${fmt(v?.[0])} y ${fmt(v?.[1])}`); } },
    ],
    exito: 'Robot usa Herramienta sin quedársela: eso es una dependencia.',
  },
  {
    id: 'asociacion', titulo: 'El operario', concepto: 'Asociación', escena: 'conexiones', archivos: ['Robot.java', 'Operario.java', 'Herramienta.java', 'Main.java'],
    mentor: 'Cada robot necesita una persona responsable. Ana se encarga de varios. Si un robot se va a mantenimiento, Ana sigue trabajando: existen por separado.',
    teoria: `<p>Una <strong>asociación</strong> es una relación duradera: una clase <em>conoce</em> a otra y la guarda en un atributo, pero ambas existen por su cuenta. Nadie es dueño de nadie.</p>
<p>En UML es una línea <strong>continua</strong> con flecha abierta, y en el extremo se anota la <strong>multiplicidad</strong>: <code>0..1</code> significa «ninguno o uno». Un robot tiene como máximo un responsable; Ana puede tener muchos robots.</p>${GUIA}`,
    ejemplo: 'private Operario responsable;\n\npublic void asignarResponsable(Operario o) {\n    this.responsable = o;\n}',
    tareas: ['Escribe la clase <code>Operario</code> con un <code>nombre</code> privado, su constructor y <code>getNombre()</code>.', 'En <code>Robot</code>, agrega el atributo <code>private Operario responsable</code>, <code>asignarResponsable(Operario)</code> y <code>getResponsable()</code>.', 'En <code>Main</code>, crea a Ana y asígnala a dos robots.'],
    nota: 'Los dos robots deben apuntar al <strong>mismo</strong> objeto Ana, no a dos copias.',
    pista: 'Crea a Ana una sola vez: <code>Operario ana = new Operario("Ana");</code> y pásala a ambos robots.',
    objetivoUML: [['Robot', 'Operario', 'asociacion'], ['Robot', 'Herramienta', 'dependencia']],
    inicial: p => ({ 'Robot.java': p['Robot.java'], 'Operario.java': OPERARIO_INI, 'Herramienta.java': p['Herramienta.java'], 'Main.java': p['Main.java'] }),
    archivoInicial: 'Operario.java',
    solucion: { 'Robot.java': R32, 'Operario.java': OPERARIO, 'Herramienta.java': HERRAMIENTA, 'Main.java': M32 },
    previo: m => exigir(m, [{ clase: 'Operario', ctor: 1, metodos: [['getNombre', 0]] }, { clase: 'Robot', campos: ['responsable'], metodos: [['asignarResponsable', 1], ['getResponsable', 0]] }]) || previoMain(m),
    animacion: corrMain,
    pruebas: [
      casoRelacion('Robot', 'Operario', 'asociacion'),
      { nombre: 'Dos robots comparten la misma operaria', entrada: 'a y b reciben a Ana', prueba: ({ run }) => { const { v } = conRet(run, C => { const ana = new C.Operario('Ana'); const a = R(C, 'A'), b = R(C, 'B'); a.asignarResponsable(ana); b.asignarResponsable(ana); return a.getResponsable() === b.getResponsable() && a.getResponsable() === ana; }); return caso(v === true, 'el mismo objeto Ana', v ? 'el mismo objeto Ana' : 'objetos distintos'); } },
      { nombre: 'Un robot sin responsable devuelve null', entrada: 'new Robot("A").getResponsable()', prueba: ({ run }) => { const { v } = conRet(run, C => R(C).getResponsable()); return caso(v === null, 'null', fmt(v)); } },
      { nombre: 'Main asigna a Ana a dos robots', prueba: ({ run }) => { const { rt } = run(corrMain); const ops = objetos(rt, 'Operario'); const rs = objetos(rt, 'Robot').filter(r => r.responsable); return caso(ops.length >= 1 && rs.length >= 2 && rs.every(r => r.responsable === rs[0].responsable), '≥ 2 robots con la misma responsable', `${rs.length} robot(s) con responsable, ${ops.length} operario(s)`); } },
      { nombre: 'Se puede cambiar de responsable', oculto: true, entrada: 'asignar Ana y luego Luis', prueba: ({ run }) => { const { v } = conRet(run, C => { const r = R(C); r.asignarResponsable(new C.Operario('Ana')); r.asignarResponsable(new C.Operario('Luis')); return r.getResponsable().getNombre(); }); return caso(v === 'Luis', '"Luis"', fmt(v)); } },
    ],
    exito: 'Robot conoce a su operaria, pero cada uno existe por su cuenta: eso es una asociación.',
  },
  {
    id: 'agregacion', titulo: 'La cuadrilla', concepto: 'Agregación', escena: 'conexiones', archivos: ['Robot.java', 'Cuadrilla.java', 'Operario.java', 'Herramienta.java', 'Main.java'],
    mentor: 'Organicemos cuadrillas. Una cuadrilla reúne robots que ya existen; si la disolvemos, los robots siguen en el taller. Y un robot puede estar en dos cuadrillas.',
    teoria: `<p>La <strong>agregación</strong> es una asociación de tipo «todo y partes» donde las partes existen por su cuenta. La cuadrilla <em>tiene</em> robots, pero no los crea ni es su dueña: se los entregan ya fabricados.</p>
<p>En UML se dibuja con un <strong>rombo vacío</strong> del lado del todo: <code>Cuadrilla ◇── 0..* Robot</code>. <code>0..*</code> significa «cero o muchos».</p>${GUIA}`,
    ejemplo: 'private ArrayList<Robot> miembros = new ArrayList<>();\n\npublic void agregar(Robot r) {\n    miembros.add(r);\n}',
    tareas: ['Escribe <code>Cuadrilla</code> con un <code>nombre</code>, una lista <code>ArrayList&lt;Robot&gt; miembros</code> y <code>getNombre()</code>.', 'Agrega <code>agregar(Robot)</code>: ignora <code>null</code> y los robots que ya están.', 'Agrega <code>tamano()</code> y <code>energiaTotal()</code>, que suma la energía de los miembros.', 'En <code>Main</code>, arma la cuadrilla Alfa con tres robots.'],
    nota: 'Fíjate en la prueba de energía total: si Tornillo gasta energía <em>después</em> de entrar a la cuadrilla, la cuadrilla lo nota. Guarda referencias a los robots, no copias.',
    pista: 'Para no repetir: <code>if (r != null && !miembros.contains(r)) { miembros.add(r); }</code>. Para sumar: <code>for (Robot r : miembros) { total += r.getEnergia(); }</code>',
    objetivoUML: [['Cuadrilla', 'Robot', 'agregacion'], ['Robot', 'Operario', 'asociacion'], ['Robot', 'Herramienta', 'dependencia']],
    inicial: p => ({ 'Robot.java': p['Robot.java'], 'Cuadrilla.java': CUADRILLA_INI, 'Operario.java': p['Operario.java'], 'Herramienta.java': p['Herramienta.java'], 'Main.java': M33 }),
    archivoInicial: 'Cuadrilla.java',
    solucion: { 'Robot.java': R32, 'Cuadrilla.java': CUADRILLA, 'Operario.java': OPERARIO, 'Herramienta.java': HERRAMIENTA, 'Main.java': M33 },
    previo: m => exigir(m, [{ clase: 'Cuadrilla', ctor: 1, campos: ['miembros'], metodos: [['agregar', 1], ['tamano', 0], ['energiaTotal', 0], ['getNombre', 0]] }]) || previoMain(m),
    animacion: corrMain,
    pruebas: [
      casoRelacion('Cuadrilla', 'Robot', 'agregacion'),
      { nombre: 'tamano() cuenta los miembros', entrada: 'agregar 3 robots', prueba: ({ run }) => { const { v } = conRet(run, C => { const c = new C.Cuadrilla('Alfa'); c.agregar(R(C, 'A')); c.agregar(R(C, 'B')); c.agregar(R(C, 'C')); return c.tamano(); }); return caso(v === 3, '3', fmt(v)); } },
      { nombre: 'energiaTotal() ve los cambios de sus robots', entrada: '3 robots; uno gasta 40 después', prueba: ({ run }) => { const { v } = conRet(run, C => { const c = new C.Cuadrilla('Alfa'); const a = R(C, 'A'); c.agregar(a); c.agregar(R(C, 'B')); c.agregar(R(C, 'C')); a.consumir(40); return c.energiaTotal(); }); return caso(v === 260, '260', fmt(v)); } },
      { nombre: 'Un robot puede estar en dos cuadrillas', oculto: true, prueba: ({ run }) => { const { v } = conRet(run, C => { const a = R(C); const x = new C.Cuadrilla('X'), y = new C.Cuadrilla('Y'); x.agregar(a); y.agregar(a); return [x.tamano(), y.tamano()]; }); return caso(v?.[0] === 1 && v?.[1] === 1, '1 y 1', `${fmt(v?.[0])} y ${fmt(v?.[1])}`); } },
      { nombre: 'agregar ignora repetidos y null', oculto: true, entrada: 'agregar(a), agregar(a), agregar(null)', prueba: ({ run }) => { const { v } = conRet(run, C => { const c = new C.Cuadrilla('X'); const a = R(C); c.agregar(a); c.agregar(a); c.agregar(null); return c.tamano(); }); return caso(v === 1, '1', fmt(v)); } },
    ],
    exito: 'La cuadrilla agrupa robots que existen por su cuenta: eso es una agregación.',
  },
  {
    id: 'composicion', titulo: 'La batería interna', concepto: 'Composición', escena: 'conexiones', archivos: ['Robot.java', 'Bateria.java', 'Cuadrilla.java', 'Operario.java', 'Herramienta.java', 'Main.java'],
    mentor: 'Ingeniería quiere separar la batería en su propia clase. Pero la batería de un robot es suya y de nadie más: nace con el robot y se va con él.',
    teoria: `<p>La <strong>composición</strong> es la relación «todo y partes» más fuerte: el todo <em>crea</em> sus partes y es su único dueño. Si el robot desaparece, su batería también.</p>
<p>En UML se dibuja con un <strong>rombo relleno</strong> del lado del todo: <code>Robot ◆── 1 Bateria</code>. En código, el todo hace <code>new</code> de la parte en su constructor y no la entrega afuera.</p>${GUIA}`,
    ejemplo: 'private final Bateria bateria;\n\npublic Robot(String nombre) {\n    this.nombre = nombre;\n    this.bateria = new Bateria(ENERGIA_MAX);\n}',
    tareas: ['Escribe <code>Bateria</code>: <code>capacidad</code> final, <code>carga</code>, <code>getCarga()</code>, <code>consumir(int)</code>, <code>cargar(int)</code> y <code>recargar()</code>.', 'En <code>Robot</code>, reemplaza el atributo <code>energia</code> por <code>private final Bateria bateria</code>, creada en el constructor.', 'Haz que <code>getEnergia()</code>, <code>consumir()</code> y <code>reparar()</code> deleguen en la batería.'],
    nota: 'No agregues <code>getBateria()</code> ni recibas la batería por parámetro: si alguien de afuera la tiene, ya no es solo del robot.',
    pista: '<code>getEnergia()</code> queda en una línea: <code>return bateria.getCarga();</code>',
    objetivoUML: [['Robot', 'Bateria', 'composicion'], ['Cuadrilla', 'Robot', 'agregacion'], ['Robot', 'Operario', 'asociacion'], ['Robot', 'Herramienta', 'dependencia']],
    inicial: p => ({ 'Robot.java': p['Robot.java'], 'Bateria.java': BATERIA_INI, 'Cuadrilla.java': p['Cuadrilla.java'], 'Operario.java': p['Operario.java'], 'Herramienta.java': p['Herramienta.java'], 'Main.java': p['Main.java'] }),
    archivoInicial: 'Bateria.java',
    solucion: { 'Robot.java': R34, 'Bateria.java': BATERIA, 'Cuadrilla.java': CUADRILLA, 'Operario.java': OPERARIO, 'Herramienta.java': HERRAMIENTA, 'Main.java': M33 },
    previo: m => exigir(m, [{ clase: 'Bateria', ctor: 1, metodos: [['getCarga', 0], ['consumir', 1], ['cargar', 1], ['recargar', 0]] }, { clase: 'Robot', campos: ['bateria'] }]),
    animacion: corrMain,
    pruebas: [
      casoRelacion('Robot', 'Bateria', 'composicion'),
      { nombre: 'Cada robot tiene su propia batería', entrada: 'a.consumir(30); b no gasta', prueba: ({ run }) => { const { v } = conRet(run, C => { const a = R(C, 'A'), b = R(C, 'B'); a.consumir(30); return [a.getEnergia(), b.getEnergia()]; }); return caso(v?.[0] === 70 && v?.[1] === 100, '70 y 100', `${fmt(v?.[0])} y ${fmt(v?.[1])}`); } },
      { nombre: 'reparar() carga la batería sin pasar del máximo', entrada: 'consumir(10); reparar(Martillo de 50)', prueba: ({ run }) => { const { v } = conRet(run, C => { const r = R(C); r.consumir(10); r.reparar(new C.Herramienta('Martillo', 50)); return r.getEnergia(); }); return caso(v === 100, '100', fmt(v)); } },
      { nombre: 'Robot ya no guarda energia por su cuenta', prueba: ({ modelo }) => { const tiene = modelo.clases.Robot.campos.some(f => f.nombre === 'energia'); return caso(!tiene, 'sin atributo energia (la tiene la batería)', tiene ? 'Robot todavía tiene energia' : 'sin atributo energia'); } },
      { nombre: 'La batería no se entrega afuera', oculto: true, prueba: ({ modelo }) => { const c = modelo.clases.Robot; const expone = c.metodos.some(m => m.ret === 'Bateria' && m.vis !== 'private'); const recibe = [...c.ctors, ...c.metodos].some(k => k.params.some(p => p.tipo === 'Bateria')); return caso(!expone && !recibe, 'ni getBateria() ni parámetros Bateria', expone ? 'hay un método público que devuelve la batería' : recibe ? 'Robot recibe una batería desde afuera' : 'bien'); } },
    ],
    exito: 'La batería nace y muere con su robot: eso es una composición.',
  },
  {
    id: 'planta', titulo: 'Jefe: el plano de la planta', corto: 'Jefe', jefe: true, concepto: 'Relaciones y multiplicidad', escena: 'conexiones',
    archivos: ['Planta.java', 'Robot.java', 'Bateria.java', 'Cuadrilla.java', 'Operario.java', 'Herramienta.java', 'Main.java'],
    mentor: 'La gerencia mandó el plano de la planta nueva. Tu código tiene que coincidir con el diagrama, relación por relación. La pestaña UML te dice cuáles ya están.',
    teoria: `<p>Este plano combina las cuatro relaciones del mundo:</p>
<ul class="plano"><li><code>Planta ◆── 0..* Cuadrilla</code>: la planta crea sus cuadrillas (composición).</li><li><code>Cuadrilla ◇── 0..* Robot</code>: las cuadrillas reúnen robots existentes (agregación).</li><li><code>Robot ◆── 1 Bateria</code>: cada robot tiene su batería (composición).</li><li><code>Robot ──> 0..1 Operario</code>: cada robot conoce a su responsable (asociación).</li><li><code>Robot ┄┄> Herramienta</code>: los robots usan herramientas de paso (dependencia).</li></ul>${GUIA}`,
    ejemplo: 'public Cuadrilla crearCuadrilla(String nombre) {\n    Cuadrilla c = new Cuadrilla(nombre);\n    cuadrillas.add(c);\n    return c;\n}',
    tareas: ['Escribe <code>Planta</code> con su lista de cuadrillas, <code>crearCuadrilla(String)</code> y <code>totalRobots()</code>.', 'Las cuadrillas solo se crean desde la planta: <code>Main</code> no hace <code>new Cuadrilla</code>.', 'En <code>Main</code>, arma la planta del plano y haz que todas las relaciones aparezcan en la pestaña UML.'],
    pista: 'Si Main crea las cuadrillas y se las pasa a la planta, la relación sería agregación, no composición. Pídeselas a la planta.',
    objetivoUML: [['Planta', 'Cuadrilla', 'composicion'], ['Cuadrilla', 'Robot', 'agregacion'], ['Robot', 'Bateria', 'composicion'], ['Robot', 'Operario', 'asociacion'], ['Robot', 'Herramienta', 'dependencia']],
    inicial: p => ({ 'Planta.java': PLANTA_INI, 'Robot.java': p['Robot.java'], 'Bateria.java': p['Bateria.java'], 'Cuadrilla.java': p['Cuadrilla.java'], 'Operario.java': p['Operario.java'], 'Herramienta.java': p['Herramienta.java'], 'Main.java': p['Main.java'] }),
    archivoInicial: 'Planta.java',
    solucion: { 'Planta.java': PLANTA, 'Robot.java': R34, 'Bateria.java': BATERIA, 'Cuadrilla.java': CUADRILLA, 'Operario.java': OPERARIO, 'Herramienta.java': HERRAMIENTA, 'Main.java': M35 },
    previo: m => exigir(m, [{ clase: 'Planta', ctor: 1, metodos: [['crearCuadrilla', 1], ['totalRobots', 0]] }]) || previoMain(m),
    animacion: corrMain,
    pruebas: [
      casoRelacion('Planta', 'Cuadrilla', 'composicion'),
      casoRelacion('Cuadrilla', 'Robot', 'agregacion'),
      casoRelacion('Robot', 'Bateria', 'composicion'),
      casoRelacion('Robot', 'Operario', 'asociacion'),
      casoRelacion('Robot', 'Herramienta', 'dependencia'),
      { nombre: 'totalRobots() suma todas las cuadrillas', entrada: 'Alfa con 2 robots, Beta con 1', prueba: ({ run }) => { const { v } = conRet(run, C => { const p = new C.Planta('P'); const a = p.crearCuadrilla('Alfa'), b = p.crearCuadrilla('Beta'); a.agregar(R(C, 'A')); a.agregar(R(C, 'B')); b.agregar(R(C, 'C')); return p.totalRobots(); }); return caso(v === 3, '3', fmt(v)); } },
      { nombre: 'Main pide las cuadrillas a la planta', oculto: true, prueba: ({ archivos }) => { const ok = sinTexto(archivos, 'Main.java', /new\s+Cuadrilla\s*\(/); return caso(ok, 'sin new Cuadrilla en Main', ok ? 'sin new Cuadrilla' : 'Main crea cuadrillas por su cuenta'); } },
    ],
    exito: 'Tu código coincide con el plano: cada relación está donde debe. ¡La planta abre sus puertas!',
  },
];
