/* Misión especial · «El panel de control» (ramal del Mundo 7): la arquitectura MVC.
   El escenario es el panel HMI de un tanque gobernado por un PLC. Una clase que lee el botón,
   cambia el proceso y dibuja la pantalla a la vez se parte en tres:
   el Modelo (el proceso y su enclavamiento), la Vista (los indicadores del panel) y
   el Controlador (los botones del operador, o un control automático).
   El modelo avisa a sus vistas por una interfaz (Observer), así que un indicador nuevo o
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
const ESCENA = 'hmi';

/* ---------- Paso 1: el tanque que lo hace todo ---------- */
const TANQUE_OLOR = `public class Tanque {
    private String etiqueta;
    private int nivel;
    private int cargas;

    public Tanque(String etiqueta) {
        this.etiqueta = etiqueta;
        this.nivel = 10;
        this.cargas = 0;
    }

    // Lee el botón, cambia el proceso y dibuja la pantalla: hace los tres trabajos a la vez
    public void pulsar(String boton) {
        if (boton.equals("BOMBEAR")) {
            if (nivel > 70) {
                System.out.println("Aviso: nivel alto");
            } else {
                nivel = nivel + 30;
                cargas = cargas + 1;
                System.out.println(etiqueta + ": nivel " + nivel + "%, cargas " + cargas);
            }
        } else if (boton.equals("VACIAR")) {
            nivel = 10;
            System.out.println(etiqueta + ": nivel " + nivel + "%, cargas " + cargas);
        } else {
            System.out.println("Aviso: botón sin configurar: " + boton);
        }
    }
}
`;
const VISTA_INI = `// VistaTanque.java
// El contrato de cualquier indicador del panel. Declara public interface VistaTanque con:
//   void mostrar(String etiqueta, int nivel, int cargas);
//   void aviso(String mensaje);
`;
const TEXTO_INI = `// VistaTexto.java
// El indicador de texto del panel: implements VistaTanque.
//   mostrar imprime  TQ-1: nivel 40%, cargas 1
//   aviso imprime    Aviso: nivel alto
// No conoce al Tanque: solo recibe los datos que debe mostrar.
`;
const PANEL_INI = `// ControladorPanel.java
// Los botones del operador: recibe el botón pulsado y se lo traduce al modelo.
// Guarda el Tanque y la VistaTanque, y en el constructor suscribe la vista al modelo.
// No imprime: si el modelo se niega, se lo cuenta a la vista con aviso(...).
`;
const MAIN_OLOR = `public class Main {
    public static void main(String[] args) {
        Tanque tq = new Tanque("TQ-1");
        tq.pulsar("BOMBEAR");
        tq.pulsar("BOMBEAR");
        tq.pulsar("BOMBEAR");
        tq.pulsar("BOMBEAR");
        tq.pulsar("VACIAR");
        tq.pulsar("PURGAR");
    }
}
`;
const VISTA = `public interface VistaTanque {
    void mostrar(String etiqueta, int nivel, int cargas);
    void aviso(String mensaje);
}
`;
const TANQUE = `import java.util.ArrayList;

public class Tanque {
    private String etiqueta;
    private int nivel;
    private int cargas;
    private ArrayList<VistaTanque> vistas = new ArrayList<>();

    public Tanque(String etiqueta) {
        this.etiqueta = etiqueta;
        this.nivel = 10;
        this.cargas = 0;
    }

    public void suscribir(VistaTanque vista) {
        vistas.add(vista);
    }

    public void bombear() {
        if (nivel > 70) {
            throw new IllegalStateException("nivel alto");
        }
        nivel = nivel + 30;
        cargas = cargas + 1;
        notificar();
    }

    public void vaciar() {
        nivel = 10;
        notificar();
    }

    private void notificar() {
        for (VistaTanque v : vistas) {
            v.mostrar(etiqueta, nivel, cargas);
        }
    }

    public int getNivel() {
        return nivel;
    }

    public int getCargas() {
        return cargas;
    }
}
`;
const TEXTO = `public class VistaTexto implements VistaTanque {
    @Override
    public void mostrar(String etiqueta, int nivel, int cargas) {
        System.out.println(etiqueta + ": nivel " + nivel + "%, cargas " + cargas);
    }

    @Override
    public void aviso(String mensaje) {
        System.out.println("Aviso: " + mensaje);
    }
}
`;
const PANEL = `public class ControladorPanel {
    private Tanque modelo;
    private VistaTanque vista;

    public ControladorPanel(Tanque modelo, VistaTanque vista) {
        this.modelo = modelo;
        this.vista = vista;
        modelo.suscribir(vista);
    }

    public void pulsar(String boton) {
        try {
            if (boton.equals("BOMBEAR")) {
                modelo.bombear();
            } else if (boton.equals("VACIAR")) {
                modelo.vaciar();
            } else {
                vista.aviso("botón sin configurar: " + boton);
            }
        } catch (IllegalStateException e) {
            vista.aviso(e.getMessage());
        }
    }
}
`;
const MAIN_1 = `public class Main {
    public static void main(String[] args) {
        Tanque tq = new Tanque("TQ-1");
        VistaTexto pantalla = new VistaTexto();
        ControladorPanel panel = new ControladorPanel(tq, pantalla);
        panel.pulsar("BOMBEAR");
        panel.pulsar("BOMBEAR");
        panel.pulsar("BOMBEAR");
        panel.pulsar("BOMBEAR");
        panel.pulsar("VACIAR");
        panel.pulsar("PURGAR");
    }
}
`;
const SALIDA_1 = ['TQ-1: nivel 40%, cargas 1', 'TQ-1: nivel 70%, cargas 2', 'TQ-1: nivel 100%, cargas 3', 'Aviso: nivel alto', 'TQ-1: nivel 10%, cargas 3', 'Aviso: botón sin configurar: PURGAR'].join('\n');

/* ---------- Paso 2: dos indicadores, un tanque ---------- */
const BARRA_INI = `// VistaBarra.java
// Un segundo indicador para el panel: implements VistaTanque.
//   mostrar imprime "Nivel " seguido de un # por cada 10 de nivel
//   (con 40 de nivel:  Nivel ####)
//   aviso no muestra nada: la barra no sabe escribir mensajes.
`;
const BARRA = `public class VistaBarra implements VistaTanque {
    @Override
    public void mostrar(String etiqueta, int nivel, int cargas) {
        String barra = "";
        for (int i = 0; i < nivel / 10; i++) {
            barra = barra + "#";
        }
        System.out.println("Nivel " + barra);
    }

    @Override
    public void aviso(String mensaje) {
        // La barra no muestra avisos
    }
}
`;
const MAIN_2_INI = `public class Main {
    public static void main(String[] args) {
        Tanque tq = new Tanque("TQ-1");
        ControladorPanel panel = new ControladorPanel(tq, new VistaTexto());
        // Configura aquí el segundo indicador: suscribe una VistaBarra al mismo tanque

        panel.pulsar("BOMBEAR");
        panel.pulsar("BOMBEAR");
        panel.pulsar("VACIAR");
    }
}
`;
const MAIN_2 = `public class Main {
    public static void main(String[] args) {
        Tanque tq = new Tanque("TQ-1");
        ControladorPanel panel = new ControladorPanel(tq, new VistaTexto());
        tq.suscribir(new VistaBarra());
        panel.pulsar("BOMBEAR");
        panel.pulsar("BOMBEAR");
        panel.pulsar("VACIAR");
    }
}
`;
const SALIDA_2 = ['TQ-1: nivel 40%, cargas 1', 'Nivel ####', 'TQ-1: nivel 70%, cargas 2', 'Nivel #######', 'TQ-1: nivel 10%, cargas 2', 'Nivel #'].join('\n');

/* ---------- Paso 3 (mini-jefe): el control automático ---------- */
const AUTO_INI = `// ControladorAuto.java
// Un controlador nuevo: nadie pulsa botones, decide solo (como el programa de un PLC).
//   public ControladorAuto(Tanque modelo, VistaTanque vista)  guarda el modelo y suscribe la vista
//   public void ciclos(int n)  hace esa cantidad de bombeos; si el tanque no admite otro
//                              (nivel mayor que 70), primero lo vacía
// Tanque, las vistas y ControladorPanel están sellados: no los cambies.
`;
const AUTO = `public class ControladorAuto {
    private Tanque modelo;

    public ControladorAuto(Tanque modelo, VistaTanque vista) {
        this.modelo = modelo;
        modelo.suscribir(vista);
    }

    public void ciclos(int n) {
        for (int i = 0; i < n; i++) {
            if (modelo.getNivel() > 70) {
                modelo.vaciar();
            }
            modelo.bombear();
        }
    }
}
`;
const MAIN_3_INI = `public class Main {
    public static void main(String[] args) {
        Tanque tq = new Tanque("TQ-1");
        // Crea un ControladorAuto con una VistaTexto y pídele 5 ciclos

    }
}
`;
const MAIN_3 = `public class Main {
    public static void main(String[] args) {
        Tanque tq = new Tanque("TQ-1");
        ControladorAuto auto = new ControladorAuto(tq, new VistaTexto());
        auto.ciclos(5);
    }
}
`;
const SALIDA_3 = ['TQ-1: nivel 40%, cargas 1', 'TQ-1: nivel 70%, cargas 2', 'TQ-1: nivel 100%, cargas 3', 'TQ-1: nivel 10%, cargas 3', 'TQ-1: nivel 40%, cargas 4', 'TQ-1: nivel 70%, cargas 5'].join('\n');

/* Clase intrusa de los casos ocultos: un indicador que el estudiante no conoce */
const CONTADOR = `public class VistaContador implements VistaTanque {
    public static int cambios = 0;
    public static int avisos = 0;

    public void mostrar(String etiqueta, int nivel, int cargas) {
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
  titulo: 'El panel de control',
  corto: 'MVC',
  concepto: 'Arquitectura MVC',
  mundo: 7,
  requiere: ['averia-jefe'],
  // Por ahora solo en modo profesor (igual que la misión de Kotlin, que la sigue)
  oculta: true,
  requisito: 'Superar «Protocolo de emergencia» (jefe del Mundo 7)',
  requisitoCorto: 'Supera el jefe del Mundo 7',
  recompensa: 'Visor de mando · tus robots muestran su estado en una pantalla',
  equipo: 'visor',
  codice: 'mvc',
  pasos: [
    {
      id: 'mvc-1', titulo: 'El tanque que lo hace todo', concepto: 'MVC: modelo, vista y controlador', escena: ESCENA,
      archivos: ['Tanque.java', 'VistaTanque.java', 'VistaTexto.java', 'ControladorPanel.java', 'Main.java'],
      mentor: 'Este es el panel HMI del tanque TQ-1. Hoy una sola clase lee el botón, mueve el proceso y dibuja la pantalla, todo en un mismo método. Si mañana queremos otro indicador u otra forma de mandarlo, hay que abrirla entera. Vamos a configurar el panel como se hace en una planta: el proceso por un lado, los indicadores por otro y los botones por otro.',
      teoria: `<p>Un panel <strong>HMI</strong> (la pantalla con la que un operador vigila y manda una máquina gobernada por un PLC) reparte el trabajo en tres, y ese reparto se llama <strong>MVC</strong>:</p>
<ul><li><strong>Modelo</strong> (<code>Tanque</code>): el proceso, con sus datos y sus reglas. Decide si se puede bombear y, si el nivel ya está alto, lanza una excepción: es el <em>enclavamiento</em> que protege el tanque. No imprime ni sabe qué indicadores existen.</li>
<li><strong>Vista</strong> (<code>VistaTexto</code>): un indicador del panel. Solo muestra lo que le llega; no cambia el proceso.</li>
<li><strong>Controlador</strong> (<code>ControladorPanel</code>): los botones. Recibe lo que hace el operador y lo traduce en llamadas al modelo. Si el modelo se niega, le pasa el aviso a la vista.</li></ul>
<p>¿Cómo se entera un indicador de que el proceso cambió? El modelo guarda una lista de <code>VistaTanque</code> (una interfaz, Mundo 4) y, después de cada cambio, las <em>notifica</em> a todas. Esa idea es <strong>Observer</strong>, el pegamento de MVC.</p>
<p>Las piezas ya las conoces: interfaces (Mundo 4), una lista que el modelo recibe desde fuera (Mundo 3) y excepciones (Mundo 7).</p>`,
      ejemplo: 'private void notificar() {\n    for (VistaTanque v : vistas) {\n        v.mostrar(etiqueta, nivel, cargas);\n    }\n}',
      tareas: ['Declara la interfaz <code>VistaTanque</code> con <code>mostrar(String etiqueta, int nivel, int cargas)</code> y <code>aviso(String mensaje)</code>.', 'Convierte <code>Tanque</code> en un modelo: <code>bombear()</code> (sube 30 y cuenta una carga; lanza <code>IllegalStateException("nivel alto")</code> si el nivel es mayor que 70), <code>vaciar()</code> (deja el nivel en 10), <code>suscribir(VistaTanque)</code>, una lista de vistas, <code>getNivel()</code> y <code>getCargas()</code>. Que no imprima nada.', 'Escribe <code>VistaTexto</code>: imprime <code>TQ-1: nivel 40%, cargas 1</code> y <code>Aviso: …</code>.', 'Escribe <code>ControladorPanel</code> con <code>pulsar(String boton)</code>: suscribe la vista en su constructor y, si el modelo lanza la excepción, llama a <code>vista.aviso(e.getMessage())</code>. Un botón que no sea <code>BOMBEAR</code> ni <code>VACIAR</code> avisa <code>botón sin configurar: …</code>.', 'En <code>Main</code>, crea las tres piezas y pulsa los mismos botones por el controlador.'],
      nota: 'La salida debe ser idéntica a la de antes: lo que cambia es quién hace cada trabajo. En la escena, el botón, el tanque y cada indicador se encienden cuando les toca.',
      pista: 'En el controlador: <code>try { modelo.bombear(); } catch (IllegalStateException e) { vista.aviso(e.getMessage()); }</code>',
      objetivoUML: [['VistaTexto', 'VistaTanque', 'realizacion'], ['Tanque', 'VistaTanque', 'agregacion'], ['ControladorPanel', 'Tanque', 'asociacion'], ['ControladorPanel', 'VistaTanque', 'asociacion']],
      inicial: () => ({ 'Tanque.java': TANQUE_OLOR, 'VistaTanque.java': VISTA_INI, 'VistaTexto.java': TEXTO_INI, 'ControladorPanel.java': PANEL_INI, 'Main.java': MAIN_OLOR }),
      archivoInicial: 'Tanque.java',
      solucion: { 'Tanque.java': TANQUE, 'VistaTanque.java': VISTA, 'VistaTexto.java': TEXTO, 'ControladorPanel.java': PANEL, 'Main.java': MAIN_1 },
      previo: m => exigir(m, [
        { clase: 'VistaTanque', interfaz: true, metodos: [['mostrar', 3], ['aviso', 1]] },
        { clase: 'VistaTexto', implementa: ['VistaTanque'] },
        { clase: 'Tanque', metodos: [['bombear', 0], ['vaciar', 0], ['suscribir', 1], ['getNivel', 0], ['getCargas', 0]] },
        { clase: 'ControladorPanel', metodos: [['pulsar', 1]] },
      ]) || previoMain(m),
      animacion: corrMain,
      pruebas: [
        casoRelacion('VistaTexto', 'VistaTanque', 'realizacion'),
        casoRelacion('ControladorPanel', 'Tanque', 'asociacion'),
        { nombre: 'El modelo no imprime ni conoce el panel', prueba: ({ archivos }) => {
          const ok = sinTexto(archivos, 'Tanque.java', /System\.out|VistaTexto|Controlador/);
          return caso(ok, 'Tanque sin println ni clases de vista o control', ok ? 'correcto' : 'Tanque todavía imprime o nombra otra pieza');
        } },
        { nombre: 'La vista solo muestra: no toca el modelo', prueba: ({ archivos }) => {
          const ok = sinTexto(archivos, 'VistaTexto.java', /\bTanque\b|Controlador/);
          return caso(ok, 'VistaTexto recibe datos, no al Tanque', ok ? 'correcto' : 'la vista usa el Tanque o el Controlador');
        } },
        { nombre: 'El controlador no imprime', prueba: ({ archivos }) => {
          const ok = sinTexto(archivos, 'ControladorPanel.java', /System\.out/);
          return caso(ok, 'ControladorPanel sin println', ok ? 'correcto' : 'el controlador imprime en vez de avisar a la vista');
        } },
        { nombre: 'El enclavamiento protege el tanque', entrada: 'bombear() 4 veces seguidas sobre un Tanque', prueba: ({ run }) => {
          const h = {};
          run(C => { const t = new C.Tanque('T'); t.bombear(); t.bombear(); t.bombear(); try { t.bombear(); h.v = 'sin excepción'; } catch (e) { h.v = 'excepción'; } h.n = t.getNivel(); h.c = t.getCargas(); });
          return caso(h.v === 'excepción' && h.n === 100 && h.c === 3, 'excepción, nivel 100 y 3 cargas', `${h.v}, nivel ${h.n} y ${h.c} cargas`);
        } },
        { nombre: 'La salida del panel', prueba: ({ run }) => {
          const { rt } = run(corrMain);
          return caso(salidaDe(rt) === SALIDA_1, SALIDA_1.replace(/\n/g, ' / '), rt.salida.join(' / ') || '(sin salida)');
        } },
      ],
      exito: 'Cada pieza hace un solo trabajo: el proceso decide, el indicador muestra y los botones traducen lo que pide el operador.',
    },
    {
      id: 'mvc-2', titulo: 'Dos indicadores, un tanque', concepto: 'MVC: varias vistas de un mismo modelo', escena: ESCENA,
      archivos: ['VistaBarra.java', 'Main.java', 'Tanque.java', 'VistaTanque.java', 'VistaTexto.java', 'ControladorPanel.java'],
      mentor: 'Los operarios piden una barra de nivel al lado del texto. Antes habríamos metido otro println en el tanque. Ahora el tanque ni se entera: configurar el panel es conectar otro indicador a la misma variable.',
      teoria: `<p>Como el modelo habla con una <strong>interfaz</strong> y no con un indicador concreto, puede tener <em>varias</em> vistas a la vez: cada <code>notificar()</code> recorre la lista y todas se actualizan solas.</p>
<p>Agregar un indicador es escribir una clase nueva que implemente <code>VistaTanque</code> y suscribirla. <code>Tanque</code> no cambia ni una línea: está <strong>cerrado</strong> a modificaciones y <strong>abierto</strong> a extensiones (Mundo 4).</p>
<p>Así se arma un HMI de verdad: el nivel del mismo tanque se ve a la vez en un número, en una barra y en una gráfica de tendencia, y ninguno de esos elementos está escrito dentro del programa que controla el proceso.</p>`,
      ejemplo: 'tq.suscribir(new VistaBarra());',
      tareas: ['Escribe <code>VistaBarra</code>, que implementa <code>VistaTanque</code>: <code>mostrar</code> imprime <code>Nivel </code> y un <code>#</code> por cada 10 de nivel; <code>aviso</code> no hace nada.', 'En <code>Main</code>, suscribe una <code>VistaBarra</code> al mismo tanque.', 'No modifiques <code>Tanque</code>: un caso revisa que no nombre a ninguna vista.'],
      nota: 'Con 40 de nivel la barra es <code>Nivel ####</code>. Fíjate en el orden: el texto se suscribió primero, así que se actualiza primero.',
      pista: 'Arma la barra con un <code>for</code> hasta <code>nivel / 10</code>, sumando <code>"#"</code> a un <code>String</code>.',
      objetivoUML: [['VistaBarra', 'VistaTanque', 'realizacion'], ['VistaTexto', 'VistaTanque', 'realizacion'], ['Tanque', 'VistaTanque', 'agregacion']],
      inicial: prev => ({ 'VistaBarra.java': BARRA_INI, 'Main.java': MAIN_2_INI, 'Tanque.java': prev?.['Tanque.java'] ?? TANQUE, 'VistaTanque.java': prev?.['VistaTanque.java'] ?? VISTA, 'VistaTexto.java': prev?.['VistaTexto.java'] ?? TEXTO, 'ControladorPanel.java': prev?.['ControladorPanel.java'] ?? PANEL }),
      archivoInicial: 'VistaBarra.java',
      solucion: { 'VistaBarra.java': BARRA, 'Main.java': MAIN_2, 'Tanque.java': TANQUE, 'VistaTanque.java': VISTA, 'VistaTexto.java': TEXTO, 'ControladorPanel.java': PANEL },
      previo: m => exigir(m, [{ clase: 'VistaBarra', implementa: ['VistaTanque'], metodos: [['mostrar', 3], ['aviso', 1]] }]) || previoMain(m),
      animacion: corrMain,
      pruebas: [
        casoRelacion('VistaBarra', 'VistaTanque', 'realizacion'),
        { nombre: 'El modelo no sabe qué indicadores tiene', prueba: ({ archivos }) => {
          const ok = sinTexto(archivos, 'Tanque.java', /VistaBarra|VistaTexto|System\.out/);
          return caso(ok, 'Tanque sin VistaBarra, VistaTexto ni println', ok ? 'correcto' : 'Tanque nombra una vista concreta o imprime');
        } },
        { nombre: 'La barra dibuja el nivel', entrada: 'mostrar("X", 40, 0)', prueba: ({ run }) => {
          const { rt } = run(C => { new C.VistaBarra().mostrar('X', 40, 0); });
          return caso(salidaDe(rt) === 'Nivel ####', 'Nivel ####', rt.salida.join(' / ') || '(sin salida)');
        } },
        { nombre: 'Todas las vistas suscritas se enteran', entrada: 'dos VistaBarra en un Tanque, bombear()', prueba: ({ run }) => {
          const { rt } = run(C => { const t = new C.Tanque('T'); t.suscribir(new C.VistaBarra()); t.suscribir(new C.VistaBarra()); t.bombear(); });
          return caso(rt.salida.length === 2, '2 barras actualizadas', `${rt.salida.length}`);
        } },
        { nombre: 'Texto y barra a la vez', prueba: ({ run }) => {
          const { rt } = run(corrMain);
          return caso(salidaDe(rt) === SALIDA_2, SALIDA_2.replace(/\n/g, ' / '), rt.salida.join(' / ') || '(sin salida)');
        } },
      ],
      exito: 'Un indicador nuevo y el tanque ni se enteró: lo conectaste desde fuera.',
    },
    {
      id: 'mvc-3', titulo: 'Mini-jefe: el control automático', corto: 'Mini-jefe', jefe: true, concepto: 'MVC: cambiar el controlador', escena: ESCENA,
      archivos: ['ControladorAuto.java', 'Main.java', 'Tanque.java', 'VistaTanque.java', 'VistaTexto.java', 'VistaBarra.java', 'ControladorPanel.java'],
      mentor: 'El turno de noche no tiene operador. Un control automático debe seguir bombeando y vaciar a tiempo, sin disparar nunca el enclavamiento. El tanque y los indicadores están sellados: si el diseño es bueno, basta con un controlador nuevo.',
      teoria: `<p>Igual que se pueden agregar vistas, se puede <strong>cambiar el controlador</strong>: el modelo no sabe quién lo maneja. Hoy es un operador con botones; mañana, la lógica automática de un PLC, una app en el teléfono o un servidor web.</p>
<p>Fíjate en el reparto de trabajo:</p>
<ul><li>El <strong>modelo</strong> pone la regla: con el nivel alto no se bombea, y si alguien lo intenta, lanza la excepción.</li>
<li>El <strong>controlador</strong> decide <em>qué hacer</em> con esa regla. El automático consulta <code>getNivel()</code> y vacía antes de que el modelo tenga que negarse.</li>
<li>Las <strong>vistas</strong> siguen mostrando todo sin que nadie las toque.</li></ul>
<p>Esta es la razón de ser de MVC: cada pieza cambia sin arrastrar a las otras dos. Por eso en una planta se puede pasar de MANUAL a AUTO sin rehacer las pantallas.</p>`,
      ejemplo: 'if (modelo.getNivel() > 70) {\n    modelo.vaciar();\n}\nmodelo.bombear();',
      tareas: ['Escribe <code>ControladorAuto</code>: su constructor recibe <code>(Tanque modelo, VistaTanque vista)</code>, guarda el modelo y suscribe la vista.', 'Agrega <code>ciclos(int n)</code>: hace esa cantidad de bombeos y, antes de cada uno, vacía el tanque si no admite otro (nivel mayor que 70).', 'En <code>Main</code>, conéctale una <code>VistaTexto</code> y pídele 5 ciclos.', 'No modifiques <code>Tanque</code>, <code>VistaTanque</code>, <code>VistaTexto</code>, <code>VistaBarra</code> ni <code>ControladorPanel</code>. Un caso oculto conectará un indicador que no conoces.'],
      nota: GUIA,
      pista: 'Vaciar <em>antes</em> de bombear evita que el modelo lance la excepción: el control automático nunca necesita un <code>catch</code>.',
      objetivoUML: [['ControladorAuto', 'Tanque', 'asociacion'], ['Tanque', 'VistaTanque', 'agregacion'], ['VistaTexto', 'VistaTanque', 'realizacion'], ['ControladorPanel', 'Tanque', 'asociacion']],
      inicial: () => ({ 'ControladorAuto.java': AUTO_INI, 'Main.java': MAIN_3_INI, 'Tanque.java': TANQUE, 'VistaTanque.java': VISTA, 'VistaTexto.java': TEXTO, 'VistaBarra.java': BARRA, 'ControladorPanel.java': PANEL }),
      archivoInicial: 'ControladorAuto.java',
      solucion: { 'ControladorAuto.java': AUTO, 'Main.java': MAIN_3, 'Tanque.java': TANQUE, 'VistaTanque.java': VISTA, 'VistaTexto.java': TEXTO, 'VistaBarra.java': BARRA, 'ControladorPanel.java': PANEL },
      previo: m => exigir(m, [{ clase: 'ControladorAuto', ctor: 2, metodos: [['ciclos', 1]] }]) || previoMain(m),
      animacion: corrMain,
      pruebas: [
        casoRelacion('ControladorAuto', 'Tanque', 'asociacion'),
        { nombre: 'El tanque, los indicadores y el panel manual no cambiaron', prueba: ({ archivos }) => {
          const tocados = sellados(archivos, { 'Tanque.java': TANQUE, 'VistaTanque.java': VISTA, 'VistaTexto.java': TEXTO, 'VistaBarra.java': BARRA, 'ControladorPanel.java': PANEL });
          return caso(!tocados.length, 'iguales a la versión sellada', tocados.length ? `se modificó ${tocados.join(', ')}` : 'sin cambios');
        } },
        { nombre: 'El control automático no imprime', prueba: ({ archivos }) => {
          const ok = sinTexto(archivos, 'ControladorAuto.java', /System\.out/);
          return caso(ok, 'ControladorAuto sin println', ok ? 'correcto' : 'el controlador imprime en vez de dejarlo a las vistas');
        } },
        { nombre: 'El automático nunca dispara el enclavamiento', entrada: 'ciclos(10) con una VistaBarra', prueba: ({ run }) => {
          const h = {};
          run(C => { const t = new C.Tanque('T'); const a = new C.ControladorAuto(t, new C.VistaBarra()); try { a.ciclos(10); h.v = 'completó'; } catch (e) { h.v = 'lanzó una excepción'; } h.c = t.getCargas(); });
          return caso(h.v === 'completó' && h.c === 10, 'completó y 10 cargas', `${h.v}, ${h.c} cargas`);
        } },
        { nombre: 'Cinco ciclos en automático', prueba: ({ run }) => {
          const { rt } = run(corrMain);
          return caso(salidaDe(rt) === SALIDA_3, SALIDA_3.replace(/\n/g, ' / '), rt.salida.join(' / ') || '(sin salida)');
        } },
        { nombre: 'Un indicador desconocido sigue al automático', oculto: true, entrada: 'VistaContador conectada a un automático de 4 ciclos', prueba: ({ archivos }) => {
          const h = {};
          const r = conExtra(archivos, { 'VistaContador.java': CONTADOR }, C => {
            new C.ControladorAuto(new C.Tanque('X'), new C.VistaContador()).ciclos(4);
            h.v = [C.VistaContador.cambios, C.VistaContador.avisos];
          });
          if (r.error) return caso(false, '5 cambios y 0 avisos', r.error);
          return caso(String(h.v) === '5,0', '5 cambios y 0 avisos', `${h.v?.[0]} cambios y ${h.v?.[1]} avisos`);
        } },
        { nombre: 'Dos controladores manejan el mismo modelo', oculto: true, entrada: 'ControladorPanel y ControladorAuto sobre un solo Tanque', prueba: ({ archivos }) => {
          const h = {};
          const r = conExtra(archivos, { 'VistaContador.java': CONTADOR }, C => {
            const tanque = new C.Tanque('X');
            const manual = new C.ControladorPanel(tanque, new C.VistaContador());
            const auto = new C.ControladorAuto(tanque, new C.VistaContador());
            manual.pulsar('BOMBEAR'); auto.ciclos(3);
            h.v = [tanque.getCargas(), C.VistaContador.cambios];
          });
          if (r.error) return caso(false, '4 cargas y 10 cambios', r.error);
          return caso(String(h.v) === '4,10', '4 cargas y 10 cambios', `${h.v?.[0]} cargas y ${h.v?.[1]} cambios`);
        } },
      ],
      exito: '¡El panel trabaja solo! Cambiaste el controlador sin tocar el proceso ni los indicadores. Visor de mando instalado.',
    },
  ],
};
