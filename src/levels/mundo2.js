/* Mundo 2 · La Bóveda: encapsulamiento, getters, setters con validación, invariantes, static/final, toString/equals */
import { robots, fmt, caso, corrMain, previoMain, exigir, sinTexto } from './util.js';

const ROBOT_INI = `public class Robot {
    String nombre;
    String color;
    int energia;

    public Robot(String nombre, String color) {
        this.nombre = nombre;
        this.color = color;
        this.energia = 100;
    }
}
`;
const MAIN_OXIDO = `public class Main {
    public static void main(String[] args) {
        Robot tornillo = new Robot("Tornillo", "azul");
        // Óxido se cuela en el taller...
        tornillo.energia = 9999;
        System.out.println(tornillo.nombre + " tiene " + tornillo.energia + " de energía");
    }
}
`;
const R21 = ROBOT_INI.replace('    String nombre;\n    String color;\n    int energia;', '    private String nombre;\n    private String color;\n    private int energia;');
const M21 = `public class Main {
    public static void main(String[] args) {
        Robot tornillo = new Robot("Tornillo", "azul");
        // Óxido ya no puede tocar la energía de Tornillo
    }
}
`;
const GETTERS = `

    public String getNombre() {
        return nombre;
    }

    public String getColor() {
        return color;
    }

    public int getEnergia() {
        return energia;
    }
}
`;
const R22 = R21.replace(/\n}\n$/, GETTERS);
const M22_INI = `public class Main {
    public static void main(String[] args) {
        Robot tornillo = new Robot("Tornillo", "azul");
        // Imprime usando los getters: Tornillo tiene 100 de energía

    }
}
`;
const M22 = `public class Main {
    public static void main(String[] args) {
        Robot tornillo = new Robot("Tornillo", "azul");
        System.out.println(tornillo.getNombre() + " tiene " + tornillo.getEnergia() + " de energía");
    }
}
`;
const SETTERS = `

    public void setEnergia(int energia) {
        if (energia >= 0 && energia <= 100) {
            this.energia = energia;
        }
    }

    public void setColor(String color) {
        if (color != null && !color.isEmpty()) {
            this.color = color;
        }
    }
}
`;
const R23 = R22.replace(/\n}\n$/, SETTERS);
const R24 = R23.replace('    private int energia;\n', '    private int energia;\n    private int x;\n').replace(/\n}\n$/, `

    public int getX() {
        return x;
    }

    public boolean consumir(int cantidad) {
        if (cantidad <= energia) {
            energia = energia - cantidad;
            return true;
        }
        return false;
    }

    public boolean estaApagado() {
        return energia == 0;
    }

    public void avanzar() {
        if (consumir(10)) {
            x = x + 1;
        }
    }
}
`);
const R25 = `public class Robot {
    public static final int ENERGIA_MAX = 100;
    private static int fabricados = 0;

    private final int serie;
    private String nombre;
    private String color;
    private int energia;
    private int x;

    public Robot(String nombre, String color) {
        fabricados++;
        this.serie = fabricados;
        this.nombre = nombre;
        this.color = color;
        this.energia = ENERGIA_MAX;
    }

    public static int getFabricados() {
        return fabricados;
    }

    public int getSerie() {
        return serie;
    }

    public String getNombre() {
        return nombre;
    }

    public String getColor() {
        return color;
    }

    public int getEnergia() {
        return energia;
    }

    public int getX() {
        return x;
    }

    public void setEnergia(int energia) {
        if (energia >= 0 && energia <= ENERGIA_MAX) {
            this.energia = energia;
        }
    }

    public void setColor(String color) {
        if (color != null && !color.isEmpty()) {
            this.color = color;
        }
    }

    public boolean consumir(int cantidad) {
        if (cantidad <= energia) {
            energia = energia - cantidad;
            return true;
        }
        return false;
    }

    public boolean estaApagado() {
        return energia == 0;
    }

    public void avanzar() {
        if (consumir(10)) {
            x = x + 1;
        }
    }
}
`;
const M25 = `public class Main {
    public static void main(String[] args) {
        Robot tornillo = new Robot("Tornillo", "azul");
        Robot tuerca = new Robot("Tuerca", "naranja");
        Robot perno = new Robot("Perno", "verde");
        System.out.println("Fabricados: " + Robot.getFabricados());
        System.out.println(perno.getNombre() + " tiene la serie " + perno.getSerie());
    }
}
`;
const R26 = R25.replace(/\n}\n$/, `

    @Override
    public String toString() {
        return "#" + serie + " " + nombre + " (" + color + ", " + energia + ")";
    }

    @Override
    public boolean equals(Object otro) {
        if (otro == null || getClass() != otro.getClass()) {
            return false;
        }
        Robot r = (Robot) otro;
        return serie == r.serie;
    }
}
`);
const M26 = `public class Main {
    public static void main(String[] args) {
        Robot tornillo = new Robot("Tornillo", "azul");
        Robot tuerca = new Robot("Tuerca", "naranja");
        System.out.println(tornillo);
        System.out.println(tuerca);
        System.out.println(tornillo.equals(tuerca));
    }
}
`;
const R27 = R26.replace('        if (cantidad <= energia) {', '        if (cantidad > 0 && cantidad <= energia) {').replace(`    public void setColor(String color) {`, `    public void setNombre(String nombre) {
        if (nombre != null && !nombre.isEmpty()) {
            this.nombre = nombre;
        }
    }

    public void setColor(String color) {`);

/* Ayudas para las pruebas */
const nuevo = (C, n = 'Tornillo', c = 'azul') => new C.Robot(n, c);
const conRet = (run, f) => { const h = {}; const r = run(C => { h.v = f(C, h); }); return { ...r, v: h.v, h }; };
const privado = (m, campo) => { const f = m.clases.Robot?.campos.find(x => x.nombre === campo); return { ok: f?.vis === 'private', obt: f ? `${f.vis === 'package' ? '(sin modificador)' : f.vis} ${f.tipo} ${campo}` : 'no existe' }; };

const ATAQUES = [
  ['setEnergia', 9999], ['setEnergia', -1], ['consumir', -50], ['setEnergia', 101], ['setNombre', ''], ['consumir', 40],
  ['setColor', ''], ['setEnergia', 0], ['consumir', 1], ['setEnergia', 100], ['consumir', 100], ['consumir', 101],
  ['setNombre', null], ['setEnergia', 50], ['consumir', -1000], ['setColor', null], ['setEnergia', -100], ['consumir', 0], ['setEnergia', 2147483647], ['setNombre', 'Oxido'],
];

export const MUNDO2 = [
  {
    id: 'candado', titulo: 'El candado', concepto: 'private', escena: 'boveda', archivos: ['Robot.java', 'Main.java'],
    mentor: '¡Alarma! Óxido, un robot saboteador, entró al taller y le puso 9999 de energía a Tornillo. Si nadie lo detiene, va a fundirle los circuitos.',
    teoria: `<p>Hasta ahora cualquier clase podía escribir <code>tornillo.energia = 9999</code>. El <strong>encapsulamiento</strong> consiste en que cada objeto proteja sus propios datos.</p>
<p>Con <code>private</code>, un atributo solo se puede usar dentro de su clase. En UML se marca con <code>−</code>. Afuera, el compilador lo bloquea.</p>`,
    ejemplo: 'private int energia;',
    tareas: ['Marca <code>nombre</code>, <code>color</code> y <code>energia</code> como <code>private</code>.', 'Mira la consola: <code>Main</code> deja de compilar. Ese error es tu candado funcionando.', 'Borra las líneas de Óxido en <code>Main</code> y deja solo la creación del robot.'],
    nota: 'Por ahora nadie podrá leer los atributos desde afuera. En el próximo capítulo abrimos una ventanilla controlada.',
    pista: 'Escribe <code>private</code> antes del tipo: <code>private String nombre;</code>. El error de <code>Main</code> desaparece cuando ya no hay accesos directos como <code>tornillo.energia</code>.',
    inicial: () => ({ 'Robot.java': ROBOT_INI, 'Main.java': MAIN_OXIDO }),
    archivoInicial: 'Robot.java',
    solucion: { 'Robot.java': R21, 'Main.java': M21 },
    previo: m => exigir(m, [{ clase: 'Robot' }]) || previoMain(m),
    animacion: corrMain,
    pruebas: [
      ...['nombre', 'color', 'energia'].map(n => ({ nombre: `${n} es private`, prueba: ({ modelo }) => { const p = privado(modelo, n); return caso(p.ok, `private ... ${n}`, p.obt); } })),
      { nombre: 'Main ya no toca atributos directamente', oculto: true, prueba: ({ archivos }) => caso(sinTexto(archivos, 'Main.java', /\.\s*(energia|nombre|color)\b(?!\s*\()/), 'sin accesos como robot.energia', sinTexto(archivos, 'Main.java', /\.\s*(energia|nombre|color)\b(?!\s*\()/) ? 'sin accesos directos' : 'todavía accede a un atributo') },
    ],
    exito: 'El candado funciona: Óxido ya no puede escribir la energía de Tornillo.',
  },
  {
    id: 'ventanilla', titulo: 'La ventanilla', concepto: 'Getters', escena: 'boveda', archivos: ['Robot.java', 'Main.java'],
    mentor: 'Bien cerrado, pero ahora ni yo puedo ver cómo está Tornillo. Necesitamos una ventanilla: se puede mirar, pero no tocar.',
    teoria: `<p>Un <strong>getter</strong> es un método público que devuelve el valor de un atributo privado. Por convención se llama <code>get</code> + el nombre del atributo.</p>
<p>Así la clase decide qué deja ver. Leer está permitido; escribir sigue bloqueado.</p>`,
    ejemplo: 'public int getEnergia() {\n    return energia;\n}',
    tareas: ['Agrega <code>getNombre()</code>, <code>getColor()</code> y <code>getEnergia()</code> a <code>Robot</code>.', 'En <code>Main</code>, imprime exactamente: <code>Tornillo tiene 100 de energía</code>, usando los getters.'],
    pista: '<code>System.out.println(tornillo.getNombre() + " tiene " + tornillo.getEnergia() + " de energía");</code>',
    inicial: p => ({ 'Robot.java': p['Robot.java'], 'Main.java': M22_INI }),
    archivoInicial: 'Robot.java',
    solucion: { 'Robot.java': R22, 'Main.java': M22 },
    previo: m => exigir(m, [{ clase: 'Robot', metodos: [['getNombre', 0], ['getColor', 0], ['getEnergia', 0]] }]) || previoMain(m),
    animacion: corrMain,
    pruebas: [
      { nombre: 'getNombre() devuelve el nombre', entrada: 'new Robot("Tornillo", "azul").getNombre()', prueba: ({ run }) => { const { v } = conRet(run, C => nuevo(C).getNombre()); return caso(v === 'Tornillo', '"Tornillo"', fmt(v)); } },
      { nombre: 'getColor() devuelve el color', entrada: 'new Robot("Tornillo", "azul").getColor()', prueba: ({ run }) => { const { v } = conRet(run, C => nuevo(C).getColor()); return caso(v === 'azul', '"azul"', fmt(v)); } },
      { nombre: 'getEnergia() devuelve 100 al empezar', entrada: 'new Robot("Tornillo", "azul").getEnergia()', prueba: ({ run }) => { const { v } = conRet(run, C => nuevo(C).getEnergia()); return caso(v === 100, '100', fmt(v)); } },
      { nombre: 'Main imprime la frase con los getters', prueba: ({ run }) => { const { rt } = run(corrMain); const t = rt.salida.join('\n'); return caso(t.trim() === 'Tornillo tiene 100 de energía', 'Tornillo tiene 100 de energía', t || '(sin salida)'); } },
      { nombre: 'Los atributos siguen privados', oculto: true, prueba: ({ modelo }) => { const ok = ['nombre', 'color', 'energia'].every(n => privado(modelo, n).ok); return caso(ok, 'todos private', ok ? 'todos private' : 'alguno quedó visible'); } },
    ],
    exito: 'La ventanilla está abierta: se puede leer, pero no escribir.',
  },
  {
    id: 'guardia', titulo: 'El guardia', concepto: 'Setters con validación', escena: 'boveda', archivos: ['Robot.java', 'Main.java'],
    mentor: 'Hay que poder cambiar la energía cuando recargamos. Pero si abrimos la puerta, Óxido se cuela. Pongamos un guardia que revise cada cambio.',
    teoria: `<p>Un <strong>setter</strong> cambia un atributo privado, pero antes puede <strong>validar</strong> el valor. Si es inválido, lo rechaza y el objeto queda como estaba.</p>
<p>Esa es la gran ventaja frente a un atributo público: la clase garantiza que sus datos siempre tienen sentido.</p>`,
    ejemplo: 'public void setEnergia(int energia) {\n    if (energia >= 0 && energia <= 100) {\n        this.energia = energia;\n    }\n}',
    tareas: ['Agrega <code>setEnergia(int)</code>: acepta solo valores de 0 a 100; cualquier otro se ignora.', 'Agrega <code>setColor(String)</code>: ignora <code>null</code> y el texto vacío.'],
    nota: 'Las pruebas imitan a Óxido: intentan poner energía negativa, 250 y colores vacíos.',
    pista: 'Para el color: <code>if (color != null && !color.isEmpty()) { this.color = color; }</code>',
    inicial: p => ({ 'Robot.java': p['Robot.java'], 'Main.java': p['Main.java'] }),
    archivoInicial: 'Robot.java',
    solucion: { 'Robot.java': R23, 'Main.java': M22 },
    previo: m => exigir(m, [{ clase: 'Robot', metodos: [['setEnergia', 1], ['setColor', 1], ['getEnergia', 0]] }]),
    animacion: C => { const r = nuevo(C); r.setEnergia(50); r.setEnergia(-50); r.setEnergia(250); r.setColor('verde'); r.setColor(''); },
    pruebas: [
      { nombre: 'setEnergia(50) se acepta', entrada: 'r.setEnergia(50)', prueba: ({ run }) => { const { v } = conRet(run, C => { const r = nuevo(C); r.setEnergia(50); return r.getEnergia(); }); return caso(v === 50, 'energia = 50', 'energia = ' + fmt(v)); } },
      { nombre: 'setEnergia(-50) se rechaza', entrada: 'r.setEnergia(-50)', prueba: ({ run }) => { const { v } = conRet(run, C => { const r = nuevo(C); r.setEnergia(-50); return r.getEnergia(); }); return caso(v === 100, 'energia = 100 (sin cambios)', 'energia = ' + fmt(v)); } },
      { nombre: 'setEnergia(250) se rechaza', entrada: 'r.setEnergia(250)', prueba: ({ run }) => { const { v } = conRet(run, C => { const r = nuevo(C); r.setEnergia(250); return r.getEnergia(); }); return caso(v === 100, 'energia = 100 (sin cambios)', 'energia = ' + fmt(v)); } },
      { nombre: 'Los bordes 0 y 100 son válidos', oculto: true, entrada: 'setEnergia(0), luego setEnergia(100)', prueba: ({ run }) => { const { v } = conRet(run, C => { const r = nuevo(C); r.setEnergia(0); const a = r.getEnergia(); r.setEnergia(100); return [a, r.getEnergia()]; }); return caso(v?.[0] === 0 && v?.[1] === 100, '0 y luego 100', fmt(v?.[0]) + ' y luego ' + fmt(v?.[1])); } },
      { nombre: 'setColor ignora el texto vacío', oculto: true, entrada: 'setColor(""), luego setColor("verde")', prueba: ({ run }) => { const { v } = conRet(run, C => { const r = nuevo(C); r.setColor(''); const a = r.getColor(); r.setColor('verde'); return [a, r.getColor()]; }); return caso(v?.[0] === 'azul' && v?.[1] === 'verde', '"azul" y luego "verde"', `${fmt(v?.[0])} y luego ${fmt(v?.[1])}`); } },
    ],
    exito: 'El guardia funciona: los valores inválidos rebotan y el robot queda intacto.',
  },
  {
    id: 'invariantes', titulo: 'Reglas que nunca se rompen', concepto: 'Invariantes', escena: 'boveda', archivos: ['Robot.java', 'Main.java'],
    mentor: 'Un robot no puede gastar energía que no tiene. Esa regla tiene que cumplirse siempre, no solo cuando alguien se acuerda.',
    teoria: `<p>Una <strong>invariante</strong> es una regla que el objeto cumple siempre: aquí, que la energía nunca sea negativa.</p>
<p>La forma de garantizarla es que <em>todos</em> los cambios pasen por métodos de la clase que la revisen. Un método puede devolver <code>boolean</code> para avisar si pudo hacer lo que se le pidió.</p>`,
    ejemplo: 'public boolean consumir(int cantidad) {\n    if (cantidad <= energia) {\n        energia = energia - cantidad;\n        return true;\n    }\n    return false;\n}',
    tareas: ['Agrega <code>private int x;</code> y su getter <code>getX()</code>.', 'Agrega <code>consumir(int)</code>: si alcanza la energía, la descuenta y devuelve <code>true</code>; si no, devuelve <code>false</code> sin tocar nada.', 'Agrega <code>estaApagado()</code>, que devuelve <code>true</code> cuando la energía es 0.', 'Agrega <code>avanzar()</code>: usa <code>consumir(10)</code> y solo avanza si pudo consumir.'],
    pista: 'En <code>avanzar()</code>: <code>if (consumir(10)) { x = x + 1; }</code>',
    inicial: p => ({ 'Robot.java': p['Robot.java'], 'Main.java': p['Main.java'] }),
    archivoInicial: 'Robot.java',
    solucion: { 'Robot.java': R24, 'Main.java': M22 },
    previo: m => exigir(m, [{ clase: 'Robot', campos: ['x'], metodos: [['getX', 0], ['consumir', 1], ['estaApagado', 0], ['avanzar', 0]] }]),
    animacion: C => { const r = nuevo(C); for (let i = 0; i < 4; i++) r.avanzar(); r.consumir(150); r.consumir(60); },
    pruebas: [
      { nombre: 'consumir(30) devuelve true y descuenta', entrada: 'r.consumir(30)', prueba: ({ run }) => { const { v } = conRet(run, C => { const r = nuevo(C); return [r.consumir(30), r.getEnergia()]; }); return caso(v?.[0] === true && v?.[1] === 70, 'true, energia = 70', `${fmt(v?.[0])}, energia = ${fmt(v?.[1])}`); } },
      { nombre: 'consumir(150) devuelve false sin tocar la energía', entrada: 'r.consumir(150)', prueba: ({ run }) => { const { v } = conRet(run, C => { const r = nuevo(C); return [r.consumir(150), r.getEnergia()]; }); return caso(v?.[0] === false && v?.[1] === 100, 'false, energia = 100', `${fmt(v?.[0])}, energia = ${fmt(v?.[1])}`); } },
      { nombre: 'estaApagado() tras gastar todo', entrada: 'r.consumir(100); r.estaApagado()', prueba: ({ run }) => { const { v } = conRet(run, C => { const r = nuevo(C); const a = r.estaApagado(); r.consumir(100); return [a, r.estaApagado()]; }); return caso(v?.[0] === false && v?.[1] === true, 'false y luego true', `${fmt(v?.[0])} y luego ${fmt(v?.[1])}`); } },
      { nombre: '12 pasos: avanza 10 y se detiene', oculto: true, entrada: 'r.avanzar() ×12', prueba: ({ run }) => { const { v } = conRet(run, C => { const r = nuevo(C); for (let i = 0; i < 12; i++) r.avanzar(); return [r.getX(), r.getEnergia()]; }); return caso(v?.[0] === 10 && v?.[1] === 0, 'x = 10, energia = 0', `x = ${fmt(v?.[0])}, energia = ${fmt(v?.[1])}`); } },
    ],
    exito: 'La invariante se cumple: la energía nunca baja de cero, pase lo que pase.',
  },
  {
    id: 'serie', titulo: 'Número de serie', concepto: 'static y final', escena: 'boveda', archivos: ['Robot.java', 'Main.java'],
    mentor: 'Para saber cuál robot saboteó Óxido, cada uno necesita un número de serie único que nadie pueda cambiar. Y quiero saber cuántos hemos fabricado.',
    teoria: `<p>Un atributo <code>static</code> pertenece a la <strong>clase</strong>, no a cada objeto: todos los robots comparten el mismo <code>fabricados</code>. En UML va subrayado.</p>
<p>Un atributo <code>final</code> recibe su valor una sola vez, en el constructor, y después no cambia. <code>static final</code> es una constante, como <code>ENERGIA_MAX</code>.</p>`,
    ejemplo: 'private static int fabricados = 0;\nprivate final int serie;\n\npublic Robot(String nombre, String color) {\n    fabricados++;\n    this.serie = fabricados;\n    ...\n}',
    tareas: ['Agrega la constante <code>public static final int ENERGIA_MAX = 100;</code> y úsala en el constructor y en <code>setEnergia</code>.', 'Agrega <code>private static int fabricados</code> y <code>private final int serie</code>: cada robot nuevo recibe la siguiente serie.', 'Agrega <code>getSerie()</code> y el método de clase <code>public static int getFabricados()</code>.'],
    nota: '<code>serie</code> no debe tener setter: un número de serie no se cambia.',
    pista: 'En el constructor, primero <code>fabricados++;</code> y luego <code>this.serie = fabricados;</code>',
    inicial: p => ({ 'Robot.java': p['Robot.java'], 'Main.java': M25 }),
    archivoInicial: 'Robot.java',
    solucion: { 'Robot.java': R25, 'Main.java': M25 },
    previo: m => exigir(m, [{ clase: 'Robot', campos: ['serie', 'fabricados', 'ENERGIA_MAX'], metodos: [['getSerie', 0], ['getFabricados', 0]] }]) || previoMain(m),
    animacion: corrMain,
    pruebas: [
      { nombre: 'Tres robots reciben las series 1, 2 y 3', entrada: 'new Robot(...) ×3', prueba: ({ run }) => { const { v } = conRet(run, C => [nuevo(C, 'A'), nuevo(C, 'B'), nuevo(C, 'C')].map(r => r.getSerie())); return caso(String(v) === '1,2,3', '1, 2, 3', (v || []).join(', ')); } },
      { nombre: 'Robot.getFabricados() cuenta los robots', entrada: 'new Robot(...) ×3; Robot.getFabricados()', prueba: ({ run }) => { const { v } = conRet(run, C => { nuevo(C); nuevo(C); nuevo(C); return C.Robot.getFabricados(); }); return caso(v === 3, '3', fmt(v)); } },
      { nombre: 'ENERGIA_MAX es una constante de 100', prueba: ({ modelo, run }) => { const f = modelo.clases.Robot.campos.find(x => x.nombre === 'ENERGIA_MAX'); const { v } = conRet(run, C => C.Robot.ENERGIA_MAX); const ok = f?.estatico && f?.final && v === 100; return caso(ok, 'static final int ENERGIA_MAX = 100', f ? `${f.estatico ? 'static ' : ''}${f.final ? 'final ' : ''}${f.tipo} ENERGIA_MAX = ${fmt(v)}` : 'no existe'); } },
      { nombre: 'serie es final y no tiene setter', oculto: true, prueba: ({ modelo }) => { const c = modelo.clases.Robot; const f = c.campos.find(x => x.nombre === 'serie'); const ok = f?.final && !c.metodos.some(x => x.nombre === 'setSerie'); return caso(ok, 'final, sin setSerie', `${f?.final ? 'final' : 'no final'}, ${c.metodos.some(x => x.nombre === 'setSerie') ? 'con setSerie' : 'sin setSerie'}`); } },
      { nombre: 'fabricados es static y private', oculto: true, prueba: ({ modelo }) => { const f = modelo.clases.Robot.campos.find(x => x.nombre === 'fabricados'); return caso(f?.estatico && f?.vis === 'private', 'private static', f ? `${f.vis}${f.estatico ? ' static' : ''}` : 'no existe'); } },
    ],
    exito: 'Cada robot tiene su número de serie para siempre, y el taller sabe cuántos ha fabricado.',
  },
  {
    id: 'ficha', titulo: 'La ficha técnica', concepto: 'toString y equals', escena: 'boveda', archivos: ['Robot.java', 'Main.java'],
    mentor: 'Al imprimir un robot sale algo como Robot@1f3a. Quiero su ficha técnica. Y necesito saber si dos fichas son del mismo robot.',
    teoria: `<p><code>toString()</code> decide cómo se ve un objeto como texto; <code>println(robot)</code> lo usa solo. <code>equals(Object)</code> decide cuándo dos objetos son <em>el mismo</em> para tu programa. Aquí, cuando tienen la misma serie.</p>
<p><strong>Responsabilidad única:</strong> <code>toString</code> devuelve el texto, no lo imprime. Quien lo usa decide si lo muestra, lo guarda o lo envía.</p>`,
    ejemplo: '@Override\npublic String toString() {\n    return "#" + serie + " " + nombre;\n}',
    tareas: ['Agrega <code>toString()</code> con el formato exacto <code>#1 Tornillo (azul, 100)</code>.', 'Agrega <code>equals(Object otro)</code>: dos robots son iguales si tienen la misma serie. Con <code>null</code> u otra clase devuelve <code>false</code>.'],
    nota: '<code>@Override</code> le avisa al compilador que estás redefiniendo un método que todo objeto ya tiene.',
    pista: 'Dentro de <code>equals</code>: <code>if (otro == null || getClass() != otro.getClass()) return false;</code> y luego <code>Robot r = (Robot) otro; return serie == r.serie;</code>',
    inicial: p => ({ 'Robot.java': p['Robot.java'], 'Main.java': M26 }),
    archivoInicial: 'Robot.java',
    solucion: { 'Robot.java': R26, 'Main.java': M26 },
    previo: m => exigir(m, [{ clase: 'Robot', metodos: [['toString', 0], ['equals', 1]] }]) || previoMain(m),
    animacion: corrMain,
    pruebas: [
      { nombre: 'println(robot) muestra la ficha', entrada: 'System.out.println(new Robot("Tornillo", "azul"))', prueba: ({ run }) => { const { v } = conRet(run, C => String(nuevo(C))); return caso(v === '#1 Tornillo (azul, 100)', '#1 Tornillo (azul, 100)', fmt(v)); } },
      { nombre: 'Un robot es igual a sí mismo', entrada: 'a.equals(a)', prueba: ({ run }) => { const { v } = conRet(run, C => { const a = nuevo(C); return a.equals(a); }); return caso(v === true, 'true', fmt(v)); } },
      { nombre: 'Dos robots distintos no son iguales', entrada: 'a.equals(b)', prueba: ({ run }) => { const { v } = conRet(run, C => nuevo(C, 'A').equals(nuevo(C, 'B'))); return caso(v === false, 'false', fmt(v)); } },
      { nombre: 'equals(null) devuelve false', oculto: true, entrada: 'a.equals(null)', prueba: ({ run }) => { const { v } = conRet(run, C => nuevo(C).equals(null)); return caso(v === false, 'false', fmt(v)); } },
      { nombre: 'toString() no imprime nada', oculto: true, prueba: ({ run }) => { const { rt } = run(C => { String(nuevo(C)); }); return caso(rt.salida.length === 0, 'sin salida en consola', rt.salida.length ? 'imprimió: ' + rt.salida[0] : 'sin salida'); } },
    ],
    exito: 'Cada robot tiene su ficha y sabemos cuándo dos fichas son del mismo robot.',
  },
  {
    id: 'saboteador', titulo: 'Jefe: el saboteador', corto: 'Jefe', jefe: true, concepto: 'Encapsulamiento', escena: 'boveda', archivos: ['Robot.java', 'Main.java'],
    mentor: 'Óxido volvió con 20 trucos nuevos. Va a intentar todo: energía negativa, consumos negativos para recargarse gratis, nombres vacíos. Tu Robot tiene que resistir.',
    teoria: `<p>Una clase bien encapsulada no confía en quien la usa. Cada método público es una puerta, y cada puerta revisa lo que entra.</p>
<p>Ojo con <code>consumir(-50)</code>: si no lo revisas, restar un negativo <em>suma</em> energía.</p>`,
    ejemplo: 'if (cantidad > 0 && cantidad <= energia) { ... }',
    tareas: ['Haz que <code>consumir</code> rechace cantidades menores o iguales a 0.', 'Agrega <code>setNombre(String)</code> con guardia: ignora <code>null</code> y el texto vacío.', 'Resiste los 20 ataques de Óxido: la energía siempre entre 0 y 100 y el nombre nunca vacío.'],
    pista: 'Revisa cada método público y pregúntate: ¿qué pasa si me mandan un número negativo, uno gigante o <code>null</code>?',
    inicial: p => ({ 'Robot.java': p['Robot.java'], 'Main.java': p['Main.java'] }),
    archivoInicial: 'Robot.java',
    solucion: { 'Robot.java': R27, 'Main.java': M26 },
    previo: m => exigir(m, [{ clase: 'Robot', metodos: [['setNombre', 1], ['consumir', 1], ['setEnergia', 1], ['setColor', 1]] }]),
    animacion: C => { const r = nuevo(C); for (const [m, v] of ATAQUES.slice(0, 8)) r[m](v); },
    pruebas: [
      { nombre: 'Ataque: setEnergia(9999)', entrada: 'r.setEnergia(9999)', prueba: ({ run }) => { const { v } = conRet(run, C => { const r = nuevo(C); r.setEnergia(9999); return r.getEnergia(); }); return caso(v === 100, 'energia = 100', 'energia = ' + fmt(v)); } },
      { nombre: 'Ataque: consumir(-50) para recargarse gratis', entrada: 'r.consumir(-50)', prueba: ({ run }) => { const { v } = conRet(run, C => { const r = nuevo(C); r.consumir(30); return [r.consumir(-50), r.getEnergia()]; }); return caso(v?.[0] === false && v?.[1] === 70, 'false, energia = 70', `${fmt(v?.[0])}, energia = ${fmt(v?.[1])}`); } },
      { nombre: 'Ataque: setNombre("")', entrada: 'r.setNombre("")', prueba: ({ run }) => { const { v } = conRet(run, C => { const r = nuevo(C); r.setNombre(''); return r.getNombre(); }); return caso(v === 'Tornillo', '"Tornillo"', fmt(v)); } },
      { nombre: 'Los 20 ataques de Óxido', oculto: true, entrada: '20 llamadas con valores tramposos', prueba: ({ run }) => { const { v } = conRet(run, C => { const r = nuevo(C); for (const [m, x] of ATAQUES) { r[m](x); const e = r.getEnergia(), n = r.getNombre(); if (e < 0 || e > 100 || !n) return `falló tras ${m}(${fmt(x)}): energia = ${e}, nombre = ${fmt(n)}`; } return 'ok'; }); return caso(v === 'ok', 'todas las invariantes se cumplen', v); } },
      { nombre: 'Todo sigue privado y serie es final', oculto: true, prueba: ({ modelo }) => { const c = modelo.clases.Robot; const inst = c.campos.filter(f => !f.estatico); const ok = inst.every(f => f.vis === 'private') && c.campos.find(f => f.nombre === 'serie')?.final; return caso(ok, 'atributos private, serie final', inst.filter(f => f.vis !== 'private').map(f => f.nombre + ' visible').join(', ') || 'serie no es final'); } },
    ],
    exito: 'Óxido se rindió: tu Robot resistió los 20 ataques. La Bóveda está a salvo.',
  },
];
