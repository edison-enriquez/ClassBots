/* Misión especial · «La sala de mando» (ramal del Mundo 7): la arquitectura MVC.
   Una clase que recibe órdenes, cambia sus datos e imprime a la vez se parte en tres:
   el Modelo (datos y reglas), la Vista (mostrar) y el Controlador (traducir órdenes).
   El modelo avisa a sus vistas por una interfaz (Observer), así que una vista nueva o
   un controlador nuevo entran sin tocar lo que ya funciona. */
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
const GUIA = '<p class="guia-link">Al completar la misión, MVC queda registrado en el <button type="button" class="enlace" data-guia="patrones">Códice de patrones</button>.</p>';
const ESCENA = 'mando';

/* ---------- Paso 1: el robot que lo hace todo ---------- */
const ROBOT_OLOR = `public class Robot {
    private String nombre;
    private int energia;
    private int posicion;

    public Robot(String nombre) {
        this.nombre = nombre;
        this.energia = 100;
        this.posicion = 0;
    }

    // Recibe la orden, cambia los datos e imprime: hace los tres trabajos a la vez
    public void orden(String texto) {
        if (texto.equals("avanzar")) {
            if (energia < 30) {
                System.out.println("Aviso: sin energía");
            } else {
                posicion = posicion + 1;
                energia = energia - 30;
                System.out.println(nombre + " en " + posicion + " con " + energia + "%");
            }
        } else if (texto.equals("recargar")) {
            energia = 100;
            System.out.println(nombre + " en " + posicion + " con " + energia + "%");
        } else {
            System.out.println("Aviso: orden desconocida: " + texto);
        }
    }
}
`;
const VISTA_INI = `// VistaRobot.java
// El contrato de cualquier pantalla. Declara public interface VistaRobot con:
//   void mostrar(String nombre, int energia, int posicion);
//   void aviso(String mensaje);
`;
const CONSOLA_INI = `// VistaConsola.java
// La pantalla de texto: implements VistaRobot.
//   mostrar imprime  Chispa en 1 con 70%
//   aviso imprime    Aviso: sin energía
// No conoce al Robot: solo recibe los datos que debe mostrar.
`;
const CONTROL_INI = `// Controlador.java
// Recibe las órdenes de texto y se las traduce al modelo.
// Guarda el Robot y la VistaRobot, y en el constructor suscribe la vista al modelo.
// No imprime: si algo falla, se lo cuenta a la vista con aviso(...).
`;
const MAIN_OLOR = `public class Main {
    public static void main(String[] args) {
        Robot chispa = new Robot("Chispa");
        chispa.orden("avanzar");
        chispa.orden("avanzar");
        chispa.orden("avanzar");
        chispa.orden("avanzar");
        chispa.orden("recargar");
        chispa.orden("saltar");
    }
}
`;
const VISTA = `public interface VistaRobot {
    void mostrar(String nombre, int energia, int posicion);
    void aviso(String mensaje);
}
`;
const ROBOT = `import java.util.ArrayList;

public class Robot {
    private String nombre;
    private int energia;
    private int posicion;
    private ArrayList<VistaRobot> vistas = new ArrayList<>();

    public Robot(String nombre) {
        this.nombre = nombre;
        this.energia = 100;
        this.posicion = 0;
    }

    public void suscribir(VistaRobot vista) {
        vistas.add(vista);
    }

    public void avanzar() {
        if (energia < 30) {
            throw new IllegalStateException("sin energía");
        }
        posicion = posicion + 1;
        energia = energia - 30;
        notificar();
    }

    public void recargar() {
        energia = 100;
        notificar();
    }

    private void notificar() {
        for (VistaRobot v : vistas) {
            v.mostrar(nombre, energia, posicion);
        }
    }

    public int getEnergia() {
        return energia;
    }

    public int getPosicion() {
        return posicion;
    }
}
`;
const CONSOLA = `public class VistaConsola implements VistaRobot {
    @Override
    public void mostrar(String nombre, int energia, int posicion) {
        System.out.println(nombre + " en " + posicion + " con " + energia + "%");
    }

    @Override
    public void aviso(String mensaje) {
        System.out.println("Aviso: " + mensaje);
    }
}
`;
const CONTROL = `public class Controlador {
    private Robot modelo;
    private VistaRobot vista;

    public Controlador(Robot modelo, VistaRobot vista) {
        this.modelo = modelo;
        this.vista = vista;
        modelo.suscribir(vista);
    }

    public void orden(String texto) {
        try {
            if (texto.equals("avanzar")) {
                modelo.avanzar();
            } else if (texto.equals("recargar")) {
                modelo.recargar();
            } else {
                vista.aviso("orden desconocida: " + texto);
            }
        } catch (IllegalStateException e) {
            vista.aviso(e.getMessage());
        }
    }
}
`;
const MAIN_1 = `public class Main {
    public static void main(String[] args) {
        Robot chispa = new Robot("Chispa");
        VistaConsola pantalla = new VistaConsola();
        Controlador mando = new Controlador(chispa, pantalla);
        mando.orden("avanzar");
        mando.orden("avanzar");
        mando.orden("avanzar");
        mando.orden("avanzar");
        mando.orden("recargar");
        mando.orden("saltar");
    }
}
`;
const SALIDA_1 = ['Chispa en 1 con 70%', 'Chispa en 2 con 40%', 'Chispa en 3 con 10%', 'Aviso: sin energía', 'Chispa en 3 con 100%', 'Aviso: orden desconocida: saltar'].join('\n');

/* ---------- Paso 2: dos pantallas, un robot ---------- */
const BARRA_INI = `// VistaBarra.java
// Una segunda pantalla: implements VistaRobot.
//   mostrar imprime "Energía " seguido de un # por cada 10 de energía
//   (con 40 de energía:  Energía ####)
//   aviso no muestra nada: la barra no sabe escribir mensajes.
`;
const BARRA = `public class VistaBarra implements VistaRobot {
    @Override
    public void mostrar(String nombre, int energia, int posicion) {
        String barra = "";
        for (int i = 0; i < energia / 10; i++) {
            barra = barra + "#";
        }
        System.out.println("Energía " + barra);
    }

    @Override
    public void aviso(String mensaje) {
        // La barra no muestra avisos
    }
}
`;
const MAIN_2_INI = `public class Main {
    public static void main(String[] args) {
        Robot chispa = new Robot("Chispa");
        Controlador mando = new Controlador(chispa, new VistaConsola());
        // Suscribe aquí una VistaBarra al mismo robot

        mando.orden("avanzar");
        mando.orden("avanzar");
        mando.orden("recargar");
    }
}
`;
const MAIN_2 = `public class Main {
    public static void main(String[] args) {
        Robot chispa = new Robot("Chispa");
        Controlador mando = new Controlador(chispa, new VistaConsola());
        chispa.suscribir(new VistaBarra());
        mando.orden("avanzar");
        mando.orden("avanzar");
        mando.orden("recargar");
    }
}
`;
const SALIDA_2 = ['Chispa en 1 con 70%', 'Energía #######', 'Chispa en 2 con 40%', 'Energía ####', 'Chispa en 2 con 100%', 'Energía ##########'].join('\n');

/* ---------- Paso 3 (mini-jefe): el piloto automático ---------- */
const PILOTO_INI = `// ControladorPiloto.java
// Un controlador nuevo: nadie le da órdenes de texto, decide solo.
//   public ControladorPiloto(Robot modelo, VistaRobot vista)  guarda el modelo y suscribe la vista
//   public void piloto(int pasos)  avanza esa cantidad de pasos; si la energía no alcanza
//                                  para el siguiente (menos de 30), primero recarga
// Robot, las vistas y Controlador están sellados: no los cambies.
`;
const PILOTO = `public class ControladorPiloto {
    private Robot modelo;

    public ControladorPiloto(Robot modelo, VistaRobot vista) {
        this.modelo = modelo;
        modelo.suscribir(vista);
    }

    public void piloto(int pasos) {
        for (int i = 0; i < pasos; i++) {
            if (modelo.getEnergia() < 30) {
                modelo.recargar();
            }
            modelo.avanzar();
        }
    }
}
`;
const MAIN_3_INI = `public class Main {
    public static void main(String[] args) {
        Robot chispa = new Robot("Chispa");
        // Crea un ControladorPiloto con una VistaConsola y pídele 5 pasos

    }
}
`;
const MAIN_3 = `public class Main {
    public static void main(String[] args) {
        Robot chispa = new Robot("Chispa");
        ControladorPiloto auto = new ControladorPiloto(chispa, new VistaConsola());
        auto.piloto(5);
    }
}
`;
const SALIDA_3 = ['Chispa en 1 con 70%', 'Chispa en 2 con 40%', 'Chispa en 3 con 10%', 'Chispa en 3 con 100%', 'Chispa en 4 con 70%', 'Chispa en 5 con 40%'].join('\n');

/* Clase intrusa de los casos ocultos: una vista que el estudiante no conoce */
const CONTADOR = `public class VistaContador implements VistaRobot {
    public static int cambios = 0;
    public static int avisos = 0;

    public void mostrar(String nombre, int energia, int posicion) {
        cambios = cambios + 1;
    }

    public void aviso(String mensaje) {
        avisos = avisos + 1;
    }
}
`;

const sellados = (archivos, mapa) => Object.entries(mapa).filter(([a, v]) => NORMAL(archivos[a]) !== NORMAL(v)).map(([a]) => a.replace('.java', ''));

export const MVC = {
  id: 'mision-mvc',
  titulo: 'La sala de mando',
  corto: 'MVC',
  concepto: 'Arquitectura MVC',
  mundo: 7,
  requiere: ['averia-jefe'],
  requisito: 'Superar «Protocolo de emergencia» (jefe del Mundo 7)',
  requisitoCorto: 'Supera el jefe del Mundo 7',
  recompensa: 'Visor de mando · tus robots muestran su estado en una pantalla',
  equipo: 'visor',
  codice: 'mvc',
  pasos: [
    {
      id: 'mvc-1', titulo: 'La consola de mando', concepto: 'MVC: modelo, vista y controlador', escena: ESCENA,
      archivos: ['Robot.java', 'VistaRobot.java', 'VistaConsola.java', 'Controlador.java', 'Main.java'],
      mentor: 'Este robot lo hace todo: escucha las órdenes, mueve sus datos e imprime en pantalla, todo en un mismo método. Si mañana queremos otra pantalla u otra forma de mandarlo, hay que abrirlo entero. Vamos a repartir el trabajo en tres puestos de la sala de mando.',
      teoria: `<p>En una aplicación hay tres trabajos distintos, y <strong>MVC</strong> le da a cada uno su propia clase:</p>
<ul><li><strong>Modelo</strong> (<code>Robot</code>): los datos y las reglas. Decide si se puede avanzar y lanza una excepción si no. No imprime ni sabe qué pantallas existen.</li>
<li><strong>Vista</strong> (<code>VistaConsola</code>): solo muestra lo que le llega. No cambia el modelo.</li>
<li><strong>Controlador</strong> (<code>Controlador</code>): recibe lo que hace el usuario (una orden de texto, un botón) y lo traduce en llamadas al modelo. Si el modelo se niega, le pasa el aviso a la vista.</li></ul>
<p>¿Cómo se entera la vista de que el modelo cambió? El modelo guarda una lista de <code>VistaRobot</code> (una interfaz, Mundo 4) y, después de cada cambio, las <em>notifica</em> a todas. Esa idea se llama <strong>Observer</strong> y es el pegamento de MVC.</p>
<p>Las piezas ya las conoces: interfaces (Mundo 4), una lista que el modelo recibe desde fuera (Mundo 3) y excepciones (Mundo 7).</p>`,
      ejemplo: 'private void notificar() {\n    for (VistaRobot v : vistas) {\n        v.mostrar(nombre, energia, posicion);\n    }\n}',
      tareas: ['Declara la interfaz <code>VistaRobot</code> con <code>mostrar(String nombre, int energia, int posicion)</code> y <code>aviso(String mensaje)</code>.', 'Cambia <code>Robot</code> en un modelo: <code>avanzar()</code> (cuesta 30 y lanza <code>IllegalStateException("sin energía")</code> si no alcanza), <code>recargar()</code>, <code>suscribir(VistaRobot)</code>, una lista de vistas y <code>getEnergia()</code>. Que no imprima nada.', 'Escribe <code>VistaConsola</code>: imprime <code>Chispa en 1 con 70%</code> y <code>Aviso: …</code>.', 'Escribe <code>Controlador</code> con <code>orden(String)</code>: suscribe la vista en su constructor y, si el modelo lanza la excepción, llama a <code>vista.aviso(e.getMessage())</code>.', 'En <code>Main</code>, crea las tres piezas y da las mismas órdenes por el controlador.'],
      nota: 'La salida debe ser idéntica a la de antes: lo que cambia es quién hace cada trabajo.',
      pista: 'En el controlador: <code>try { modelo.avanzar(); } catch (IllegalStateException e) { vista.aviso(e.getMessage()); }</code>',
      objetivoUML: [['VistaConsola', 'VistaRobot', 'realizacion'], ['Robot', 'VistaRobot', 'agregacion'], ['Controlador', 'Robot', 'asociacion'], ['Controlador', 'VistaRobot', 'asociacion']],
      inicial: () => ({ 'Robot.java': ROBOT_OLOR, 'VistaRobot.java': VISTA_INI, 'VistaConsola.java': CONSOLA_INI, 'Controlador.java': CONTROL_INI, 'Main.java': MAIN_OLOR }),
      archivoInicial: 'Robot.java',
      solucion: { 'Robot.java': ROBOT, 'VistaRobot.java': VISTA, 'VistaConsola.java': CONSOLA, 'Controlador.java': CONTROL, 'Main.java': MAIN_1 },
      previo: m => exigir(m, [
        { clase: 'VistaRobot', interfaz: true, metodos: [['mostrar', 3], ['aviso', 1]] },
        { clase: 'VistaConsola', implementa: ['VistaRobot'] },
        { clase: 'Robot', metodos: [['avanzar', 0], ['recargar', 0], ['suscribir', 1], ['getEnergia', 0]] },
        { clase: 'Controlador', metodos: [['orden', 1]] },
      ]) || previoMain(m),
      animacion: corrMain,
      pruebas: [
        casoRelacion('VistaConsola', 'VistaRobot', 'realizacion'),
        casoRelacion('Controlador', 'Robot', 'asociacion'),
        { nombre: 'El modelo no imprime ni conoce la consola', prueba: ({ archivos }) => {
          const ok = sinTexto(archivos, 'Robot.java', /System\.out|VistaConsola|Controlador/);
          return caso(ok, 'Robot sin println ni clases de vista o control', ok ? 'correcto' : 'Robot todavía imprime o nombra otra pieza');
        } },
        { nombre: 'La vista solo muestra: no toca el modelo', prueba: ({ archivos }) => {
          const ok = sinTexto(archivos, 'VistaConsola.java', /\bRobot\b|Controlador/);
          return caso(ok, 'VistaConsola recibe datos, no al Robot', ok ? 'correcto' : 'la vista usa el Robot o el Controlador');
        } },
        { nombre: 'El controlador no imprime', prueba: ({ archivos }) => {
          const ok = sinTexto(archivos, 'Controlador.java', /System\.out/);
          return caso(ok, 'Controlador sin println', ok ? 'correcto' : 'el controlador imprime en vez de avisar a la vista');
        } },
        { nombre: 'El modelo protege su energía', entrada: 'avanzar() 4 veces seguidas sobre un Robot', prueba: ({ run }) => {
          const h = {};
          run(C => { const r = new C.Robot('R'); r.avanzar(); r.avanzar(); r.avanzar(); try { r.avanzar(); h.v = 'sin excepción'; } catch (e) { h.v = 'excepción'; } h.e = r.getEnergia(); });
          return caso(h.v === 'excepción' && h.e === 10, 'excepción y energía 10', `${h.v}, energía ${h.e}`);
        } },
        { nombre: 'La salida de la consola de mando', prueba: ({ run }) => {
          const { rt } = run(corrMain);
          return caso(salidaDe(rt) === SALIDA_1, SALIDA_1.replace(/\n/g, ' / '), rt.salida.join(' / ') || '(sin salida)');
        } },
      ],
      exito: 'Cada puesto hace un solo trabajo: el modelo decide, la vista muestra y el controlador traduce las órdenes.',
    },
    {
      id: 'mvc-2', titulo: 'Dos pantallas, un robot', concepto: 'MVC: varias vistas de un mismo modelo', escena: ESCENA,
      archivos: ['VistaBarra.java', 'Main.java', 'Robot.java', 'VistaRobot.java', 'VistaConsola.java', 'Controlador.java'],
      mentor: 'Los operarios piden una barra de energía al lado de la consola. Antes habríamos metido otro println en el robot. Ahora el robot ni se entera: solo hay que conectar otra pantalla.',
      teoria: `<p>Como el modelo habla con una <strong>interfaz</strong> y no con una pantalla concreta, puede tener <em>varias</em> vistas a la vez: cada <code>notificar()</code> recorre la lista y todas se actualizan solas.</p>
<p>Agregar una vista es escribir una clase nueva que implemente <code>VistaRobot</code> y suscribirla. <code>Robot</code> no cambia ni una línea: está <strong>cerrado</strong> a modificaciones y <strong>abierto</strong> a extensiones (Mundo 4).</p>
<p>Así funcionan las apps reales: el mismo dato se ve a la vez en una lista, en un gráfico y en una notificación.</p>`,
      ejemplo: 'chispa.suscribir(new VistaBarra());',
      tareas: ['Escribe <code>VistaBarra</code>, que implementa <code>VistaRobot</code>: <code>mostrar</code> imprime <code>Energía </code> y un <code>#</code> por cada 10 de energía; <code>aviso</code> no hace nada.', 'En <code>Main</code>, suscribe una <code>VistaBarra</code> al mismo robot.', 'No modifiques <code>Robot</code>: un caso revisa que no nombre a ninguna vista.'],
      nota: 'Con 40 de energía la barra es <code>Energía ####</code>. Fíjate en el orden: la consola se suscribió primero, así que habla primero.',
      pista: 'Arma la barra con un <code>for</code> hasta <code>energia / 10</code>, sumando <code>"#"</code> a un <code>String</code>.',
      objetivoUML: [['VistaBarra', 'VistaRobot', 'realizacion'], ['VistaConsola', 'VistaRobot', 'realizacion'], ['Robot', 'VistaRobot', 'agregacion']],
      inicial: prev => ({ 'VistaBarra.java': BARRA_INI, 'Main.java': MAIN_2_INI, 'Robot.java': prev?.['Robot.java'] ?? ROBOT, 'VistaRobot.java': prev?.['VistaRobot.java'] ?? VISTA, 'VistaConsola.java': prev?.['VistaConsola.java'] ?? CONSOLA, 'Controlador.java': prev?.['Controlador.java'] ?? CONTROL }),
      archivoInicial: 'VistaBarra.java',
      solucion: { 'VistaBarra.java': BARRA, 'Main.java': MAIN_2, 'Robot.java': ROBOT, 'VistaRobot.java': VISTA, 'VistaConsola.java': CONSOLA, 'Controlador.java': CONTROL },
      previo: m => exigir(m, [{ clase: 'VistaBarra', implementa: ['VistaRobot'], metodos: [['mostrar', 3], ['aviso', 1]] }]) || previoMain(m),
      animacion: corrMain,
      pruebas: [
        casoRelacion('VistaBarra', 'VistaRobot', 'realizacion'),
        { nombre: 'El modelo no sabe qué pantallas tiene', prueba: ({ archivos }) => {
          const ok = sinTexto(archivos, 'Robot.java', /VistaBarra|VistaConsola|System\.out/);
          return caso(ok, 'Robot sin VistaBarra, VistaConsola ni println', ok ? 'correcto' : 'Robot nombra una vista concreta o imprime');
        } },
        { nombre: 'La barra dibuja la energía', entrada: 'mostrar("X", 40, 0)', prueba: ({ run }) => {
          const { rt } = run(C => { new C.VistaBarra().mostrar('X', 40, 0); });
          return caso(salidaDe(rt) === 'Energía ####', 'Energía ####', rt.salida.join(' / ') || '(sin salida)');
        } },
        { nombre: 'Todas las vistas suscritas se enteran', entrada: 'dos VistaBarra en un Robot, avanzar()', prueba: ({ run }) => {
          const { rt } = run(C => { const r = new C.Robot('R'); r.suscribir(new C.VistaBarra()); r.suscribir(new C.VistaBarra()); r.avanzar(); });
          return caso(rt.salida.length === 2, '2 barras actualizadas', `${rt.salida.length}`);
        } },
        { nombre: 'Consola y barra a la vez', prueba: ({ run }) => {
          const { rt } = run(corrMain);
          return caso(salidaDe(rt) === SALIDA_2, SALIDA_2.replace(/\n/g, ' / '), rt.salida.join(' / ') || '(sin salida)');
        } },
      ],
      exito: 'Una pantalla nueva y el robot ni se enteró: la conectaste desde fuera.',
    },
    {
      id: 'mvc-3', titulo: 'Mini-jefe: el piloto automático', corto: 'Mini-jefe', jefe: true, concepto: 'MVC: cambiar el controlador', escena: ESCENA,
      archivos: ['ControladorPiloto.java', 'Main.java', 'Robot.java', 'VistaRobot.java', 'VistaConsola.java', 'VistaBarra.java', 'Controlador.java'],
      mentor: 'Hay que cruzar la sala sin nadie al mando. Un piloto automático debe recargar a tiempo para no quedarse nunca sin energía. Las vistas y el robot están sellados: si el diseño es bueno, basta con un controlador nuevo.',
      teoria: `<p>Igual que se pueden agregar vistas, se puede <strong>cambiar el controlador</strong>: el modelo no sabe quién lo maneja. Hoy es un humano con órdenes de texto; mañana, un piloto automático, botones en Android o un servidor web.</p>
<p>Fíjate en el reparto de trabajo:</p>
<ul><li>El <strong>modelo</strong> pone la regla: sin energía no se avanza, y si alguien lo intenta, lanza la excepción.</li>
<li>El <strong>controlador</strong> decide <em>qué hacer</em> con esa regla. El piloto consulta <code>getEnergia()</code> y recarga antes de que el modelo tenga que negarse.</li>
<li>Las <strong>vistas</strong> siguen mostrando todo sin que nadie las toque.</li></ul>
<p>Esta es la razón de ser de MVC: cada pieza cambia sin arrastrar a las otras dos.</p>`,
      ejemplo: 'if (modelo.getEnergia() < 30) {\n    modelo.recargar();\n}\nmodelo.avanzar();',
      tareas: ['Escribe <code>ControladorPiloto</code>: su constructor recibe <code>(Robot modelo, VistaRobot vista)</code>, guarda el modelo y suscribe la vista.', 'Agrega <code>piloto(int pasos)</code>: avanza esa cantidad de pasos y, antes de cada uno, recarga si la energía no alcanza (menos de 30).', 'En <code>Main</code>, conéctale una <code>VistaConsola</code> y pídele 5 pasos.', 'No modifiques <code>Robot</code>, <code>VistaRobot</code>, <code>VistaConsola</code>, <code>VistaBarra</code> ni <code>Controlador</code>. Un caso oculto conectará una vista que no conoces.'],
      nota: GUIA,
      pista: 'Recargar <em>antes</em> de avanzar evita que el modelo lance la excepción: el piloto nunca necesita un <code>catch</code>.',
      objetivoUML: [['ControladorPiloto', 'Robot', 'asociacion'], ['Robot', 'VistaRobot', 'agregacion'], ['VistaConsola', 'VistaRobot', 'realizacion'], ['Controlador', 'Robot', 'asociacion']],
      inicial: () => ({ 'ControladorPiloto.java': PILOTO_INI, 'Main.java': MAIN_3_INI, 'Robot.java': ROBOT, 'VistaRobot.java': VISTA, 'VistaConsola.java': CONSOLA, 'VistaBarra.java': BARRA, 'Controlador.java': CONTROL }),
      archivoInicial: 'ControladorPiloto.java',
      solucion: { 'ControladorPiloto.java': PILOTO, 'Main.java': MAIN_3, 'Robot.java': ROBOT, 'VistaRobot.java': VISTA, 'VistaConsola.java': CONSOLA, 'VistaBarra.java': BARRA, 'Controlador.java': CONTROL },
      previo: m => exigir(m, [{ clase: 'ControladorPiloto', ctor: 2, metodos: [['piloto', 1]] }]) || previoMain(m),
      animacion: corrMain,
      pruebas: [
        casoRelacion('ControladorPiloto', 'Robot', 'asociacion'),
        { nombre: 'El robot, las vistas y el controlador manual no cambiaron', prueba: ({ archivos }) => {
          const tocados = sellados(archivos, { 'Robot.java': ROBOT, 'VistaRobot.java': VISTA, 'VistaConsola.java': CONSOLA, 'VistaBarra.java': BARRA, 'Controlador.java': CONTROL });
          return caso(!tocados.length, 'iguales a la versión sellada', tocados.length ? `se modificó ${tocados.join(', ')}` : 'sin cambios');
        } },
        { nombre: 'El piloto no imprime', prueba: ({ archivos }) => {
          const ok = sinTexto(archivos, 'ControladorPiloto.java', /System\.out/);
          return caso(ok, 'ControladorPiloto sin println', ok ? 'correcto' : 'el piloto imprime en vez de dejarlo a las vistas');
        } },
        { nombre: 'El piloto nunca se queda sin energía', entrada: 'piloto(10) con una VistaBarra', prueba: ({ run }) => {
          const h = {};
          run(C => { const r = new C.Robot('R'); const p = new C.ControladorPiloto(r, new C.VistaBarra()); try { p.piloto(10); h.v = 'completó'; } catch (e) { h.v = 'lanzó una excepción'; } h.p = r.getPosicion(); });
          return caso(h.v === 'completó' && h.p === 10, 'completó y posición 10', `${h.v}, posición ${h.p}`);
        } },
        { nombre: 'Cinco pasos en piloto automático', prueba: ({ run }) => {
          const { rt } = run(corrMain);
          return caso(salidaDe(rt) === SALIDA_3, SALIDA_3.replace(/\n/g, ' / '), rt.salida.join(' / ') || '(sin salida)');
        } },
        { nombre: 'Una vista desconocida sigue al piloto', oculto: true, entrada: 'VistaContador conectada a un piloto de 4 pasos', prueba: ({ archivos }) => {
          const h = {};
          const r = conExtra(archivos, { 'VistaContador.java': CONTADOR }, C => {
            new C.ControladorPiloto(new C.Robot('X'), new C.VistaContador()).piloto(4);
            h.v = [C.VistaContador.cambios, C.VistaContador.avisos];
          });
          if (r.error) return caso(false, '5 cambios y 0 avisos', r.error);
          return caso(String(h.v) === '5,0', '5 cambios y 0 avisos', `${h.v?.[0]} cambios y ${h.v?.[1]} avisos`);
        } },
        { nombre: 'Dos controladores manejan el mismo modelo', oculto: true, entrada: 'Controlador manual y piloto sobre un solo Robot', prueba: ({ archivos }) => {
          const h = {};
          const r = conExtra(archivos, { 'VistaContador.java': CONTADOR }, C => {
            const robot = new C.Robot('X');
            const manual = new C.Controlador(robot, new C.VistaContador());
            const auto = new C.ControladorPiloto(robot, new C.VistaContador());
            manual.orden('avanzar'); auto.piloto(3);
            h.v = [robot.getPosicion(), C.VistaContador.cambios];
          });
          if (r.error) return caso(false, 'posición 4 y 10 cambios', r.error);
          return caso(String(h.v) === '4,10', 'posición 4 y 10 cambios', `posición ${h.v?.[0]} y ${h.v?.[1]} cambios`);
        } },
      ],
      exito: '¡La sala de mando funciona sola! Cambiaste el controlador sin tocar el modelo ni las vistas. Visor de mando instalado.',
    },
  ],
};
