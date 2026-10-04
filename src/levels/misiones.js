import { caso, corrMain, exigir, previoMain } from './util.js';
import { relaciones } from '../engine/motor.js';

const MOVIMIENTO_INI = `// Movimiento.java
// Declara el contrato Movimiento con el método mover().
`;
const CAMINAR_INI = `// Caminar.java
// Implementa Movimiento: mover() debe devolver "camina".
`;
const SALTAR_INI = `// Saltar.java
// Implementa Movimiento: mover() debe devolver "salta".
`;
const ROBOT_INI = `// Robot.java
// Guarda una estrategia Movimiento y permite cambiarla.
`;
const MAIN_INI = `public class Main {
    public static void main(String[] args) {
        Robot robot = new Robot(new Caminar());
        System.out.println(robot.mover());
        // Cambia la estrategia a Saltar e imprime el nuevo movimiento.
    }
}
`;

const MOVIMIENTO = `public interface Movimiento {
    String mover();
}
`;
const CAMINAR = `public class Caminar implements Movimiento {
    @Override
    public String mover() {
        return "camina";
    }
}
`;
const SALTAR = `public class Saltar implements Movimiento {
    @Override
    public String mover() {
        return "salta";
    }
}
`;
const ROBOT = `public class Robot {
    private Movimiento estrategia;

    public Robot(Movimiento estrategia) {
        this.estrategia = estrategia;
    }

    public void cambiarEstrategia(Movimiento estrategia) {
        this.estrategia = estrategia;
    }

    public String mover() {
        return estrategia.mover();
    }
}
`;
const MAIN = `public class Main {
    public static void main(String[] args) {
        Robot robot = new Robot(new Caminar());
        System.out.println(robot.mover());
        robot.cambiarEstrategia(new Saltar());
        System.out.println(robot.mover());
    }
}
`;

export const MISIONES = [
  {
    id: 'mision-strategy',
    mision: true,
    requiere: ['futuro'],
    titulo: 'Módulos de movimiento',
    corto: 'Strategy',
    concepto: 'Patrón Strategy',
    escena: 'conexiones',
    mundo: 4,
    enMundo: 0,
    totalMundo: 1,
    archivos: ['Movimiento.java', 'Caminar.java', 'Saltar.java', 'Robot.java', 'Main.java'],
    mentor: 'El taller necesita robots para distintos terrenos. En vez de llenar Robot de condiciones, instalemos módulos de movimiento intercambiables.',
    teoria: `<p>El patrón <strong>Strategy (Estrategia)</strong> encapsula varios comportamientos detrás de una misma interfaz. El robot conserva una estrategia y puede cambiarla sin cambiar su propia clase.</p>
<p><code>Robot</code> programa contra el contrato <code>Movimiento</code>, no contra <code>Caminar</code> ni <code>Saltar</code>. Al invocar <code>mover()</code>, se ejecuta el comportamiento del módulo instalado: eso combina composición y polimorfismo.</p>`,
    ejemplo: 'private Movimiento estrategia;\n\npublic String mover() {\n    return estrategia.mover();\n}',
    tareas: [
      'Declara la interfaz <code>Movimiento</code> con <code>String mover()</code>.',
      'Implementa dos estrategias: <code>Caminar</code> devuelve <code>"camina"</code> y <code>Saltar</code> devuelve <code>"salta"</code>.',
      'Haz que <code>Robot</code> reciba una estrategia en el constructor, la guarde como <code>Movimiento</code> y pueda cambiarla.',
      'En <code>Main</code>, instala primero <code>Caminar</code> y luego <code>Saltar</code>; imprime <code>camina</code> y <code>salta</code>.',
    ],
    nota: 'La clase Robot no debe decidir qué estrategia concreta usar ni crearla por su cuenta. El comportamiento se recibe desde afuera.',
    pista: 'El método del robot puede limitarse a <code>return estrategia.mover();</code>. Para cambiar el módulo: <code>robot.cambiarEstrategia(new Saltar());</code>.',
    objetivoUML: [['Caminar', 'Movimiento', 'realizacion'], ['Saltar', 'Movimiento', 'realizacion'], ['Robot', 'Movimiento', 'asociacion']],
    inicial: () => ({
      'Movimiento.java': MOVIMIENTO_INI,
      'Caminar.java': CAMINAR_INI,
      'Saltar.java': SALTAR_INI,
      'Robot.java': ROBOT_INI,
      'Main.java': MAIN_INI,
    }),
    archivoInicial: 'Movimiento.java',
    solucion: {
      'Movimiento.java': MOVIMIENTO,
      'Caminar.java': CAMINAR,
      'Saltar.java': SALTAR,
      'Robot.java': ROBOT,
      'Main.java': MAIN,
    },
    previo: m => exigir(m, [
      { clase: 'Movimiento', interfaz: true, metodos: [['mover', 0]] },
      { clase: 'Caminar', implementa: ['Movimiento'], metodos: [['mover', 0]] },
      { clase: 'Saltar', implementa: ['Movimiento'], metodos: [['mover', 0]] },
      { clase: 'Robot', campos: ['estrategia'], ctor: 1, metodos: [['mover', 0], ['cambiarEstrategia', 1]] },
    ]) || previoMain(m),
    animacion: corrMain,
    pruebas: [
      { nombre: 'Caminar y Saltar cumplen el contrato', prueba: ({ modelo }) => {
        const ok = ['Caminar', 'Saltar'].every(n => modelo.clases[n]?.implementa.includes('Movimiento'));
        return caso(ok, 'ambas implementan Movimiento', ['Caminar', 'Saltar'].map(n => `${n}: ${modelo.clases[n]?.implementa.join(', ') || 'nada'}`).join('; '));
      } },
      { nombre: 'Robot guarda la interfaz, no una estrategia concreta', prueba: ({ modelo, archivos }) => {
        const campo = modelo.clases.Robot?.campos.find(f => f.nombre === 'estrategia');
        const ok = campo?.tipo === 'Movimiento' && !/\b(Caminar|Saltar)\b/.test((archivos['Robot.java'] || '').replace(/\/\/.*$/gm, ''));
        return caso(ok, 'private Movimiento estrategia; sin clases concretas', campo ? `${campo.tipo} estrategia` : 'falta estrategia');
      } },
      { nombre: 'El UML muestra las tres relaciones del patrón', prueba: ({ modelo }) => {
        const obtenido = relaciones(modelo).map(r => `${r.de}-${r.a}:${r.tipo}`);
        const ok = [['Caminar', 'Movimiento', 'realizacion'], ['Saltar', 'Movimiento', 'realizacion'], ['Robot', 'Movimiento', 'asociacion']]
          .every(([de, a, tipo]) => obtenido.includes(`${de}-${a}:${tipo}`));
        return caso(ok, 'dos realizaciones y una asociación', obtenido.join(', ') || 'ninguna');
      } },
      { nombre: 'El robot cambia de estrategia en ejecución', prueba: ({ run }) => {
        const { rt } = run(corrMain);
        const salida = rt.salida.join('\n').trim();
        return caso(salida === 'camina\nsalta', 'camina y luego salta', salida || '(sin salida)');
      } },
    ],
    exito: '¡Módulo táctico instalado! El robot ahora cambia su forma de moverse sin cambiar su clase.',
    recompensa: 'Módulo táctico · estrategias intercambiables',
  },
];

export const MISIONES_ESPECIALES = MISIONES;
export const misionDisponible = (mision, hechos, profesor = false) => profesor
  || mision.requiere.every(id => hechos.includes(id));
