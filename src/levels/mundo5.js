/* Mundo 5 · El Árbol: herencia, redefinición y clases abstractas */
import { caso, corrMain, previoMain, exigir, casoRelacion } from './util.js';

const MAQUINA_INI = `// Maquina.java
// Declara una clase base con nombre, energia, getNombre() y getEnergia().
`;
const ROBOT_INI = `// Robot.java
// Declara Robot como una clase que hereda de Maquina.
`;
const DRON_INI = `// Dron.java
// Declara Dron como una clase que hereda de Maquina.
`;
const MAIN_FAMILIA = `public class Main {
    public static void main(String[] args) {
        Robot robot = new Robot();
        System.out.println(robot instanceof Maquina);
    }
}
`;
const MAIN_MOVER = `public class Main {
    public static void main(String[] args) {
        Robot robot = new Robot();
        Dron dron = new Dron();
        System.out.println(robot.moverse() + " y " + dron.moverse());
    }
}
`;
const MAIN_SONIDO = `public class Main {
    public static void main(String[] args) {
        Robot robot = new Robot();
        Dron dron = new Dron();
        System.out.println(robot.sonido() + " y " + dron.sonido());
    }
}
`;
const MAQUINA = `public class Maquina {
    protected String nombre;
    protected int energia;

    public String getNombre() {
        return nombre;
    }

    public int getEnergia() {
        return energia;
    }
}
`;
const ROBOT = `public class Robot extends Maquina {
}
`;
const MAQUINA_MOVER = `public class Maquina {
    protected String nombre;
    protected int energia;

    public String getNombre() {
        return nombre;
    }

    public int getEnergia() {
        return energia;
    }

    public String moverse() {
        return "se mueve";
    }
}
`;
const ROBOT_MOVER = `public class Robot extends Maquina {
    @Override
    public String moverse() {
        return "rueda";
    }
}
`;
const DRON_MOVER = `public class Dron extends Maquina {
    @Override
    public String moverse() {
        return "vuela";
    }
}
`;
const MAQUINA_ABSTRACTA = `public abstract class Maquina {
    protected String nombre;

    public String getNombre() {
        return nombre;
    }

    public abstract String sonido();
}
`;
const ROBOT_ABSTRACTO = `public class Robot extends Maquina {
    @Override
    public String sonido() {
        return "bip";
    }
}
`;
const DRON_ABSTRACTO = `public class Dron extends Maquina {
    @Override
    public String sonido() {
        return "bzzz";
    }
}
`;

export const MUNDO5 = [
  {
    id: 'herencia', titulo: 'El árbol familiar', concepto: 'Herencia', escena: 'conexiones',
    archivos: ['Maquina.java', 'Robot.java', 'Main.java'],
    mentor: 'Llegaron robots distintos al taller. Todos son máquinas y comparten datos y funciones; no hace falta copiar el mismo código en cada clase.',
    teoria: `<p>La <strong>herencia</strong> expresa una relación «es un»: <code>Robot</code> <em>es una</em> <code>Maquina</code>. En Java, la clase hija usa <code>extends</code> para recibir los atributos y métodos de su clase base.</p>
<p>Los atributos <code>protected</code> son accesibles desde la clase y sus hijas. En UML, la herencia (o generalización) se dibuja con una línea continua y un triángulo vacío que apunta a la clase base.</p>`,
    ejemplo: 'public class Robot extends Maquina {\n}',
    tareas: ['En <code>Maquina</code>, declara <code>nombre</code> y <code>energia</code> como <code>protected</code>, junto con sus getters.', 'Declara <code>Robot extends Maquina</code> sin volver a copiar esos atributos ni getters.', 'Observa en UML la flecha de generalización de <code>Robot</code> hacia <code>Maquina</code>.'],
    nota: 'La clase hija hereda los miembros de la base; no necesitas volver a declararlos. En Java, cada clase solo puede extender una clase.',
    pista: 'La forma es <code>public class Robot extends Maquina { }</code>. Escribe <code>protected</code> antes del tipo para los atributos que compartirán las hijas.',
    objetivoUML: [['Robot', 'Maquina', 'herencia']],
    inicial: () => ({ 'Maquina.java': MAQUINA_INI, 'Robot.java': ROBOT_INI, 'Main.java': MAIN_FAMILIA }),
    archivoInicial: 'Maquina.java',
    solucion: { 'Maquina.java': MAQUINA, 'Robot.java': ROBOT, 'Main.java': MAIN_FAMILIA },
    previo: m => exigir(m, [{ clase: 'Maquina', campos: ['nombre', 'energia'], metodos: [['getNombre', 0], ['getEnergia', 0]] }, { clase: 'Robot' }]) || previoMain(m),
    animacion: corrMain,
    pruebas: [
      casoRelacion('Robot', 'Maquina', 'herencia'),
      { nombre: 'Robot hereda los atributos de Maquina', prueba: ({ modelo }) => {
        const fs = modelo.clases.Robot?.__campos || [];
        const ok = ['nombre', 'energia'].every(n => fs.some(f => f.nombre === n && f.vis === 'protected'));
        return caso(ok, 'nombre y energia protected heredados', fs.map(f => f.nombre).join(', ') || 'ningún atributo');
      } },
      { nombre: 'Robot hereda los getters', prueba: ({ modelo }) => {
        const ms = modelo.clases.Robot?.__metodos || [];
        const ok = ['getNombre', 'getEnergia'].every(n => ms.some(m => m.nombre === n));
        return caso(ok, 'getNombre() y getEnergia()', ms.map(m => m.nombre + '()').join(', ') || 'ningún método');
      } },
      { nombre: 'Una instancia de Robot también es Maquina', prueba: ({ run }) => {
        const { rt } = run(corrMain);
        return caso(rt.salida.join('\n').trim() === 'true', 'true', rt.salida.join('\n') || '(sin salida)');
      } },
    ],
    exito: 'Robot comparte lo común con Maquina: la flecha del UML muestra quién hereda de quién.',
  },
  {
    id: 'redefinir', titulo: 'Cada quien a su manera', concepto: 'Redefinición de métodos', escena: 'conexiones',
    archivos: ['Maquina.java', 'Robot.java', 'Dron.java', 'Main.java'],
    mentor: 'Las máquinas comparten el hecho de moverse, pero un robot rueda y un dron vuela. Conservemos la operación común y dejemos que cada hija la redefina.',
    teoria: `<p>Una clase hija puede <strong>redefinir</strong> un método heredado escribiendo otro método con la misma firma. La anotación <code>@Override</code> deja claro que se trata de una redefinición.</p>
<p>Así cada tipo especializado aporta su comportamiento, sin perder los datos y métodos que recibe de la clase base.</p>`,
    ejemplo: '@Override\npublic String moverse() {\n    return "vuela";\n}',
    tareas: ['Agrega <code>moverse()</code> a <code>Maquina</code> como comportamiento general.', 'Haz que <code>Robot</code> y <code>Dron</code> extiendan <code>Maquina</code> y redefinan <code>moverse()</code> con <code>@Override</code>.', 'Conserva en las hijas los atributos y getters heredados; no los dupliques.'],
    nota: '<code>@Override</code> es opcional para Java, pero recomendable: ayuda a detectar errores de nombre o firma.',
    pista: 'Ambos métodos deben llamarse <code>moverse</code> y devolver <code>String</code>; cambia solo el resultado que devuelve cada hija.',
    objetivoUML: [['Robot', 'Maquina', 'herencia'], ['Dron', 'Maquina', 'herencia']],
    inicial: p => ({ 'Maquina.java': MAQUINA_MOVER, 'Robot.java': ROBOT_INI, 'Dron.java': DRON_INI, 'Main.java': MAIN_MOVER }),
    archivoInicial: 'Robot.java',
    solucion: { 'Maquina.java': MAQUINA_MOVER, 'Robot.java': ROBOT_MOVER, 'Dron.java': DRON_MOVER, 'Main.java': MAIN_MOVER },
    previo: m => exigir(m, [{ clase: 'Maquina', metodos: [['moverse', 0]] }, { clase: 'Robot', metodos: [['moverse', 0]] }, { clase: 'Dron', metodos: [['moverse', 0]] }]) || previoMain(m),
    animacion: corrMain,
    pruebas: [
      casoRelacion('Robot', 'Maquina', 'herencia'),
      casoRelacion('Dron', 'Maquina', 'herencia'),
      { nombre: 'Las dos hijas redefinen el método', prueba: ({ modelo }) => {
        const hijas = ['Robot', 'Dron'].map(n => modelo.clases[n]);
        const ok = hijas.every(c => c?.metodos.some(m => m.nombre === 'moverse'));
        return caso(ok, 'Robot y Dron declaran moverse()', hijas.map(c => c?.metodos.map(m => m.nombre + '()').join(', ') || 'falta clase').join(' / '));
      } },
      { nombre: 'Ambas conservan los métodos heredados', prueba: ({ modelo }) => {
        const ok = ['Robot', 'Dron'].every(n => (modelo.clases[n]?.__metodos || []).some(m => m.nombre === 'getNombre'));
        return caso(ok, 'getNombre() heredado por ambas', ok ? 'ambas lo heredan' : 'falta en una hija');
      } },
      { nombre: 'Cada tipo ejecuta su versión de moverse()', prueba: ({ run }) => {
        const { rt } = run(corrMain);
        return caso(rt.salida.join('\n').trim() === 'rueda y vuela', 'rueda y vuela', rt.salida.join('\n') || '(sin salida)');
      } },
    ],
    exito: 'Robot y Dron comparten la clase base, pero cada uno aporta su propia forma de moverse.',
  },
  {
    id: 'abstractas', titulo: 'El molde incompleto', concepto: 'Clases abstractas', escena: 'conexiones',
    archivos: ['Maquina.java', 'Robot.java', 'Dron.java', 'Main.java'],
    mentor: 'La clase Maquina reúne lo común, pero no todas las máquinas hacen el mismo sonido. No tiene sentido fabricar una máquina genérica: cada hija debe definirlo.',
    teoria: `<p>Una <strong>clase abstracta</strong> sirve como base común, pero no se instancia directamente. Puede tener atributos y métodos completos, además de métodos abstractos que declaran qué falta implementar.</p>
<p>Una clase concreta que extiende una clase abstracta debe implementar todos sus métodos abstractos. La herencia sigue siendo única: una clase puede extender una sola clase base.</p>`,
    ejemplo: 'public abstract class Maquina {\n    public abstract String sonido();\n}',
    tareas: ['Declara <code>Maquina</code> como <code>abstract</code> y conserva allí el método común <code>getNombre()</code>.', 'Declara <code>sonido()</code> como método abstracto: termina en <code>;</code> y no lleva cuerpo.', 'Haz que <code>Robot</code> y <code>Dron</code> extiendan <code>Maquina</code> e implementen <code>sonido()</code>.'],
    nota: 'Las clases hijas concretas deben implementar el método abstracto; de lo contrario, también tendrían que declararse abstractas.',
    pista: 'Escribe <code>public abstract String sonido();</code>. La clase base también necesita la palabra <code>abstract</code> antes de <code>class</code>.',
    objetivoUML: [['Robot', 'Maquina', 'herencia'], ['Dron', 'Maquina', 'herencia']],
    inicial: () => ({ 'Maquina.java': MAQUINA_ABSTRACTA, 'Robot.java': ROBOT_INI, 'Dron.java': DRON_INI, 'Main.java': MAIN_SONIDO }),
    archivoInicial: 'Maquina.java',
    solucion: { 'Maquina.java': MAQUINA_ABSTRACTA, 'Robot.java': ROBOT_ABSTRACTO, 'Dron.java': DRON_ABSTRACTO, 'Main.java': MAIN_SONIDO },
    previo: m => exigir(m, [{ clase: 'Maquina', metodos: [['sonido', 0]] }, { clase: 'Robot', metodos: [['sonido', 0]] }, { clase: 'Dron', metodos: [['sonido', 0]] }]) || previoMain(m),
    animacion: corrMain,
    pruebas: [
      casoRelacion('Robot', 'Maquina', 'herencia'),
      casoRelacion('Dron', 'Maquina', 'herencia'),
      { nombre: 'Maquina es abstracta y sonido() no tiene cuerpo', prueba: ({ modelo }) => {
        const base = modelo.clases.Maquina;
        const sonido = base?.metodos.find(m => m.nombre === 'sonido');
        return caso(base?.abstracta && sonido?.abstracto, 'abstract class con sonido() abstracto', base?.abstracta ? (sonido?.abstracto ? 'correcto' : 'sonido() tiene cuerpo') : 'Maquina no es abstract');
      } },
      { nombre: 'Las clases concretas implementan sonido()', prueba: ({ modelo }) => {
        const ok = ['Robot', 'Dron'].every(n => {
          const c = modelo.clases[n];
          return c && !c.abstracta && c.metodos.some(m => m.nombre === 'sonido' && !m.abstracto);
        });
        return caso(ok, 'Robot y Dron implementan sonido()', ok ? 'ambas clases son concretas' : 'falta una implementación');
      } },
      { nombre: 'Las hijas ejecutan su implementación', prueba: ({ run }) => {
        const { rt } = run(corrMain);
        return caso(rt.salida.join('\n').trim() === 'bip y bzzz', 'bip y bzzz', rt.salida.join('\n') || '(sin salida)');
      } },
    ],
    exito: 'Maquina define lo común y deja sonido() a las hijas: el molde abstracto está completo.',
  },
];
