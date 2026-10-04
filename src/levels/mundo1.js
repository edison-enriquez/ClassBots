/* Mundo 1 · El Taller: clases, atributos, constructor, objetos y métodos */
import { robots, fmt, caso, corrMain, previoMain, previoRobot } from './util.js';

const MAIN_VACIO = `public class Main {
    public static void main(String[] args) {
        // Crea aquí tus robots con new

    }
}
`;
const R1 = `public class Robot {

}
`;
const R2 = `public class Robot {
    String nombre;
    String color;
    int energia;
}
`;
export const R3 = `public class Robot {
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
const M4 = `public class Main {
    public static void main(String[] args) {
        Robot a = new Robot("Tornillo", "azul");
        Robot b = new Robot("Tuerca", "naranja");
        System.out.println(a.nombre);
        System.out.println(b.nombre);
    }
}
`;
const R5 = R3.replace(`    int energia;
`, `    int energia;
    int x;
`).replace(/\n}\n$/, `

    public void avanzar() {
        x = x + 1;
        energia = energia - 10;
    }
}
`);
export const R6 = R5.replace('energia - 10', 'energia - 15').replace(/\n}\n$/, `

    public void recargar() {
        energia = 100;
    }
}
`);
const M6 = `public class Main {
    public static void main(String[] args) {
        Robot r = new Robot("Tornillo", "azul");
        for (int i = 0; i < 8; i++) {
            if (r.x == 4) {
                r.recargar();
            }
            r.avanzar();
        }
        System.out.println(r.nombre + " llegó con " + r.energia + " de energía");
    }
}
`;


export const MUNDO1 = [
  {
    id: 'plano', titulo: 'El plano', concepto: 'Clase', escena: 'plano', archivos: ['Robot.java'],
    mentor: '¡Bienvenido al taller! Soy Chispa. Aquí nada se fabrica sin un plano. Tu primer trabajo es dibujar el plano de nuestros robots.',
    teoria: `<p>Todo robot del taller sale de un <strong>plano</strong>. En Java ese plano es una <strong>clase</strong>: describe qué datos tendrá cada robot y qué sabrá hacer, pero todavía no es ningún robot concreto.</p>
<p>Una clase pública vive en un archivo con su mismo nombre: la clase <code>Robot</code> va en <code>Robot.java</code>.</p>`,
    ejemplo: 'public class Robot {\n\n}',
    tareas: ['En <code>Robot.java</code>, declara una clase pública llamada <code>Robot</code> con su par de llaves.'],
    nota: 'Mira la pestaña UML mientras escribes: la caja de la clase aparece sola.',
    pista: 'La palabra clave es <code>class</code>, en minúscula. El nombre empieza con mayúscula y coincide con el archivo.',
    inicial: () => ({ 'Robot.java': '// Robot.java\n// Declara aquí la clase Robot.\n\n' }),
    solucion: { 'Robot.java': R1 },
    pruebas: [
      { nombre: 'Existe una clase llamada Robot', prueba: ({ modelo }) => { const n = Object.keys(modelo.clases); return caso(modelo.clases.Robot, 'class Robot', n.length ? 'class ' + n.join(', ') : 'ninguna clase'); } },
      { nombre: 'Robot es pública', prueba: ({ modelo }) => caso(modelo.clases.Robot?.publica, 'public class Robot', modelo.clases.Robot ? (modelo.clases.Robot.publica ? 'public' : 'sin public') : '—') },
      { nombre: 'Robot está en Robot.java', oculto: true, prueba: ({ modelo }) => caso(modelo.clases.Robot?.archivo === 'Robot.java', 'Robot.java', modelo.clases.Robot?.archivo || '—') },
    ],
    exito: 'El plano existe. Todavía no hay ningún robot: esto es la descripción de cómo será cada uno.',
  },
  {
    id: 'piezas', titulo: 'Las piezas', concepto: 'Atributos', escena: 'plano', archivos: ['Robot.java'],
    mentor: 'Un plano vacío no arma nada. Cada robot necesita un nombre, un color de pintura y una batería.',
    teoria: `<p>Los <strong>atributos</strong> son las variables que guarda cada objeto. Cada uno tiene un <strong>tipo</strong>: <code>String</code> para texto, <code>int</code> para números enteros.</p>
<p>Se declaran dentro de la clase, fuera de cualquier método, y terminan en punto y coma.</p>`,
    ejemplo: 'String nombre;',
    tareas: ['Agrega los atributos <code>nombre</code> y <code>color</code>, de tipo <code>String</code>.', 'Agrega <code>energia</code>, de tipo <code>int</code>.'],
    nota: 'En el Mundo 2 los protegeremos con <code>private</code>. Por ahora quedan con acceso de paquete, que en UML se marca con <code>~</code>.',
    pista: '<code>String</code> va con S mayúscula e <code>int</code> en minúscula. Cada atributo termina en punto y coma.',
    inicial: p => ({ 'Robot.java': p['Robot.java'] }),
    solucion: { 'Robot.java': R2 },
    previo: m => (m.clases.Robot ? null : 'No encuentro la clase Robot.'),
    pruebas: ['nombre:String', 'color:String', 'energia:int'].map(s => {
      const [n, t] = s.split(':');
      return { nombre: `Atributo ${n} de tipo ${t}`, prueba: ({ modelo }) => { const f = modelo.clases.Robot.campos.find(x => x.nombre === n); return caso(f && f.tipo === t, `${t} ${n};`, f ? `${f.tipo} ${n};` : 'no existe'); } };
    }),
    exito: 'El plano ya tiene piezas. Cada robot que fabriques tendrá su propio nombre, color y energía.',
  },
  {
    id: 'encendido', titulo: 'Encendido', concepto: 'Constructor', escena: 'taller', archivos: ['Robot.java'],
    mentor: 'Hora de encender la línea de ensamble. Cada vez que alguien pida un robot, el constructor lo arma pieza por pieza.',
    teoria: `<p>El <strong>constructor</strong> se ejecuta cada vez que alguien escribe <code>new Robot(...)</code>. Se llama igual que la clase y no lleva tipo de retorno.</p>
<p><code>this.nombre</code> es el atributo del objeto; <code>nombre</code> a secas es el parámetro que llega.</p>`,
    ejemplo: 'public Robot(String nombre, String color) {\n    this.nombre = nombre;\n}',
    tareas: ['Crea un constructor que reciba <code>String nombre</code> y <code>String color</code>.', 'Guarda ambos valores en los atributos usando <code>this</code>.', 'Deja la <code>energia</code> en <code>100</code>.'],
    nota: 'Las pruebas crean robots con <code>new Robot("Tornillo", "azul")</code> y revisan qué quedó guardado.',
    pista: 'Si escribes <code>nombre = nombre;</code> solo le asignas el parámetro a sí mismo y el atributo queda en <code>null</code>. Usa <code>this.nombre = nombre;</code>',
    inicial: p => ({ 'Robot.java': p['Robot.java'] }),
    solucion: { 'Robot.java': R3 },
    previo: m => previoRobot(m, { ctor: true }),
    animacion: C => { new C.Robot('Tornillo', 'azul'); },
    pruebas: [
      { nombre: 'new Robot("Tornillo", "azul") guarda el nombre', entrada: 'new Robot("Tornillo", "azul")', prueba: ({ run }) => { const r = robots(run(C => { new C.Robot('Tornillo', 'azul'); }).rt)[0]; return caso(r?.nombre === 'Tornillo', 'nombre = "Tornillo"', 'nombre = ' + fmt(r?.nombre), r?.nombre === null ? 'Dentro del constructor, nombre a secas es el parámetro: escribe this.nombre = nombre;' : ''); } },
      { nombre: 'Guarda el color', entrada: 'new Robot("Tornillo", "azul")', prueba: ({ run }) => { const r = robots(run(C => { new C.Robot('Tornillo', 'azul'); }).rt)[0]; return caso(r?.color === 'azul', 'color = "azul"', 'color = ' + fmt(r?.color)); } },
      { nombre: 'La energía inicial es 100', entrada: 'new Robot("Tornillo", "azul")', prueba: ({ run }) => { const r = robots(run(C => { new C.Robot('Tornillo', 'azul'); }).rt)[0]; return caso(r?.energia === 100, 'energia = 100', 'energia = ' + fmt(r?.energia)); } },
      { nombre: 'Funciona con otros valores', oculto: true, entrada: 'new Robot("Tuerca", "rojo")', prueba: ({ run }) => { const r = robots(run(C => { new C.Robot('Tuerca', 'rojo'); }).rt)[0]; return caso(r?.nombre === 'Tuerca' && r?.color === 'rojo', 'Tuerca / rojo', `${fmt(r?.nombre)} / ${fmt(r?.color)}`); } },
    ],
    exito: 'Tornillo está encendido. new ejecutó tu constructor y guardó los valores dentro del objeto.',
  },
  {
    id: 'cuadrilla', titulo: 'La cuadrilla', concepto: 'Objetos', escena: 'taller', archivos: ['Robot.java', 'Main.java'],
    mentor: 'Un robot solo no levanta el taller. Fabrica una cuadrilla: mismo plano, robots distintos.',
    teoria: `<p>Con un solo plano puedes fabricar todos los robots que quieras. Cada <code>new</code> crea un <strong>objeto</strong> distinto: comparten la clase, pero cada uno guarda sus propios valores.</p>
<p>El programa arranca en <code>main</code>, dentro de <code>Main.java</code>.</p>`,
    ejemplo: 'Robot a = new Robot("Tornillo", "azul");\nSystem.out.println(a.nombre);',
    tareas: ['Abre la pestaña <code>Main.java</code>.', 'Dentro de <code>main</code>, crea dos robots con nombres y colores distintos.', 'Imprime el nombre de cada uno con <code>System.out.println</code>.'],
    nota: 'Colores del taller: azul, rojo, verde, amarillo, morado, naranja, rosado y cian.',
    pista: 'Cada robot necesita su propia variable: <code>Robot a = new Robot("Tornillo", "azul");</code> y <code>Robot b = new Robot("Tuerca", "naranja");</code>',
    inicial: p => ({ 'Robot.java': p['Robot.java'], 'Main.java': MAIN_VACIO }),
    archivoInicial: 'Main.java',
    solucion: { 'Robot.java': R3, 'Main.java': M4 },
    previo: m => previoRobot(m, { ctor: true }) || previoMain(m),
    animacion: corrMain,
    pruebas: [
      { nombre: 'Se crean al menos dos robots', prueba: ({ run }) => { const rs = robots(run(corrMain).rt); return caso(rs.length >= 2, '≥ 2 objetos Robot', `${rs.length} objeto(s)`); } },
      { nombre: 'Cada robot tiene su propio nombre', prueba: ({ run }) => { const rs = robots(run(corrMain).rt); const n = rs.map(r => r.nombre); return caso(rs.length >= 2 && new Set(n).size === n.length, 'nombres distintos', n.map(fmt).join(', ') || '—'); } },
      { nombre: 'Cada robot tiene su propio color', prueba: ({ run }) => { const rs = robots(run(corrMain).rt); const n = rs.map(r => r.color); return caso(rs.length >= 2 && new Set(n).size === n.length, 'colores distintos', n.map(fmt).join(', ') || '—'); } },
      { nombre: 'Se imprime el nombre de cada robot', prueba: ({ run }) => { const { rt } = run(corrMain); const rs = robots(rt); const falt = rs.filter(r => !rt.salida.some(t => t.includes(r.nombre))); return caso(rs.length >= 2 && !falt.length, rs.map(r => r.nombre).join('\n'), rt.salida.join('\n') || '(sin salida)'); } },
    ],
    exito: 'Objetos distintos, un solo plano. Cada uno guarda sus propios valores.',
  },
  {
    id: 'paso', titulo: 'Primer paso', concepto: 'Métodos', escena: 'pasillo', largo: 5, estacion: null, archivos: ['Robot.java', 'Main.java'],
    mentor: 'Los robots ya existen, pero están quietos. Enséñales a caminar: cada paso gasta batería.',
    teoria: `<p>Los <strong>métodos</strong> son lo que el objeto sabe hacer. Un método puede leer y cambiar los atributos de su propio objeto.</p>
<p>Cuando llamas <code>tornillo.avanzar()</code>, solo cambia Tornillo: los demás robots siguen donde estaban.</p>`,
    ejemplo: 'public void avanzar() {\n    x = x + 1;\n}',
    tareas: ['Agrega un atributo <code>int x</code>: la casilla donde está el robot.', 'Agrega el método <code>public void avanzar()</code>, que suma 1 a <code>x</code> y resta 10 a <code>energia</code>.'],
    nota: 'Las pruebas llaman <code>avanzar()</code> varias veces y revisan la posición y la batería.',
    pista: 'Puedes escribir <code>x = x + 1;</code> o <code>x++;</code>, y para la energía <code>energia -= 10;</code>',
    inicial: p => ({ 'Robot.java': p['Robot.java'], 'Main.java': p['Main.java'] || MAIN_VACIO }),
    solucion: { 'Robot.java': R5, 'Main.java': M4 },
    previo: m => previoRobot(m, { ctor: true, campos: [['x', 'int']], metodos: ['avanzar'] }),
    animacion: C => { const r = new C.Robot('Tornillo', 'azul'); for (let i = 0; i < 5; i++) r.avanzar(); },
    pruebas: [
      { nombre: 'Un paso: x pasa de 0 a 1', entrada: 'r.avanzar()  ×1', prueba: ({ run }) => { const r = robots(run(C => { new C.Robot('A', 'azul').avanzar(); }).rt)[0]; return caso(r?.x === 1, 'x = 1', 'x = ' + fmt(r?.x)); } },
      { nombre: 'Un paso cuesta 10 de energía', entrada: 'r.avanzar()  ×1', prueba: ({ run }) => { const r = robots(run(C => { new C.Robot('A', 'azul').avanzar(); }).rt)[0]; return caso(r?.energia === 90, 'energia = 90', 'energia = ' + fmt(r?.energia)); } },
      { nombre: 'Cinco pasos llegan a la puerta', entrada: 'r.avanzar()  ×5', prueba: ({ run }) => { const r = robots(run(C => { const a = new C.Robot('A', 'azul'); for (let i = 0; i < 5; i++) a.avanzar(); }).rt)[0]; return caso(r?.x === 5 && r?.energia === 50, 'x = 5, energia = 50', `x = ${fmt(r?.x)}, energia = ${fmt(r?.energia)}`); } },
      { nombre: 'Cada robot avanza por su cuenta', oculto: true, entrada: 'a.avanzar() ×3, b.avanzar() ×1', prueba: ({ run }) => { const rs = robots(run(C => { const a = new C.Robot('A', 'azul'), b = new C.Robot('B', 'rojo'); a.avanzar(); a.avanzar(); a.avanzar(); b.avanzar(); }).rt); return caso(rs[0]?.x === 3 && rs[1]?.x === 1, 'a.x = 3, b.x = 1', `a.x = ${fmt(rs[0]?.x)}, b.x = ${fmt(rs[1]?.x)}`); } },
    ],
    exito: 'Tornillo llegó a la puerta. Cada llamada a avanzar() cambió el estado de ese objeto.',
  },
  {
    id: 'jefe', titulo: 'Jefe: el pasillo largo', corto: 'Jefe', jefe: true, concepto: 'Objetos + métodos', escena: 'pasillo', largo: 8, estacion: 4, archivos: ['Robot.java', 'Main.java'],
    mentor: 'Prueba final del Mundo 1. El pasillo de salida mide 8 casillas y la batería no alcanza. Hay una estación de carga a mitad de camino. No dejes que tu robot se apague.',
    teoria: `<p>Ahora cada paso cuesta <strong>15</strong> de energía. Con 100 no alcanza para 8 casillas: hay una estación de carga en la casilla 4. Si la energía baja de 0, el robot se apaga.</p>
<p>Esta vez tú escribes el programa completo en <code>main</code>: el taller solo lo ejecuta y vigila.</p>`,
    ejemplo: 'for (int i = 0; i < 8; i++) {\n    r.avanzar();\n}',
    tareas: ['Cambia <code>avanzar()</code> para que cueste 15.', 'Agrega <code>public void recargar()</code>, que deja la energía en 100.', 'En <code>main</code>, crea un robot y llévalo hasta la casilla 8, recargando solo en la estación.'],
    pista: 'Antes de cada paso, pregunta si está en la estación: <code>if (r.x == 4) { r.recargar(); }</code>',
    inicial: p => ({ 'Robot.java': p['Robot.java'], 'Main.java': p['Main.java'] || MAIN_VACIO }),
    archivoInicial: 'Main.java',
    solucion: { 'Robot.java': R6, 'Main.java': M6 },
    previo: m => previoRobot(m, { ctor: true, campos: [['x', 'int']], metodos: ['avanzar', 'recargar'] }) || previoMain(m),
    animacion: corrMain,
    pruebas: [
      { nombre: 'Cada paso cuesta 15 de energía', entrada: 'r.avanzar()  ×1', prueba: ({ run }) => { const r = robots(run(C => { new C.Robot('A', 'azul').avanzar(); }).rt)[0]; return caso(r?.energia === 85, 'energia = 85', 'energia = ' + fmt(r?.energia)); } },
      { nombre: 'recargar() deja la energía en 100', entrada: 'avanzar ×3, recargar()', prueba: ({ run }) => { const r = robots(run(C => { const a = new C.Robot('A', 'azul'); a.avanzar(); a.avanzar(); a.avanzar(); a.recargar(); }).rt)[0]; return caso(r?.energia === 100, 'energia = 100', 'energia = ' + fmt(r?.energia)); } },
      { nombre: 'Tu main nunca deja que el robot se apague', prueba: ({ run }) => { const { rep } = run(corrMain); const a = rep.info.apagados[0]; return caso(!a, 'energía ≥ 0 todo el recorrido', a ? `se apagó en la casilla ${a.x}` : 'energía ≥ 0'); } },
      { nombre: 'Recarga solo en la estación (casilla 4)', prueba: ({ run }) => { const { rep } = run(corrMain); const xs = rep.info.recargas.map(r => r.x); return caso(xs.length > 0 && xs.every(x => x === 4), 'recargar() en x = 4', xs.length ? 'recargar() en x = ' + xs.join(', ') : 'nunca recargó'); } },
      { nombre: 'Llega exactamente a la salida', oculto: true, prueba: ({ run }) => { const rs = robots(run(corrMain).rt); const r = rs.reduce((a, b) => (!a || b.x > a.x ? b : a), null); return caso(r && r.x === 8, 'x = 8', r ? 'x = ' + fmt(r.x) : 'sin robots'); } },
    ],
    exito: 'Jefe superado: tu robot cruzó el pasillo. Resolviste el problema con objetos, atributos y métodos.',
  },
];
