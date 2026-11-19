/* Mundo 8 · La Forja · patrón «El panel de control»: la arquitectura MVC (último sector).
   El escenario es el panel HMI de un tanque gobernado por un PLC. Una clase que lee el botón,
   cambia el proceso y dibuja la pantalla a la vez se parte en tres:
   el Modelo (el proceso y su enclavamiento), la Vista (los indicadores del panel) y
   el Controlador (los botones del operador).
   MVC cierra el mundo porque se arma con los otros cinco patrones, uno por pieza:
     1. Observer: el tanque avisa a sus indicadores por una interfaz.
     2. Decorator: una alarma envuelve a cualquier indicador.
     3. Strategy: el modo (manual o automático) decide qué hace el botón MARCHA.
     4. Template Method + Factory Method: el armado del panel es una plantilla con métodos fábrica.
   Conserva los ids de cuando fue misión-ramal (mision-mvc, mvc-1, …). */
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
const GUIA = '<p class="guia-link">Al superar este mini-jefe, MVC queda registrado en el <button type="button" class="enlace" data-guia="patrones">Códice de patrones</button>, junto a los patrones que reúne.</p>';
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
        tq.pulsar("MARCHA");
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
        panel.pulsar("MARCHA");
    }
}
`;
const SALIDA_1 = ['TQ-1: nivel 40%, cargas 1', 'TQ-1: nivel 70%, cargas 2', 'TQ-1: nivel 100%, cargas 3', 'Aviso: nivel alto', 'TQ-1: nivel 10%, cargas 3', 'Aviso: botón sin configurar: MARCHA'].join('\n');

/* ---------- Paso 2: dos indicadores y una alarma (Observer + Decorator) ---------- */
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
const ALARMA_INI = `// VistaConAlarma.java
// Un decorador de indicadores: implements VistaTanque y guarda otra VistaTanque (la que envuelve).
//   public VistaConAlarma(VistaTanque interna)
//   mostrar: primero se lo pasa a la vista interna; si el nivel es mayor que 70,
//            le pide además  interna.aviso("nivel crítico: " + nivel + "%")
//   aviso:   se lo pasa tal cual a la vista interna
// No imprime y no nombra a VistaTexto ni a VistaBarra: sirve para cualquier indicador.
`;
const ALARMA = `public class VistaConAlarma implements VistaTanque {
    private VistaTanque interna;

    public VistaConAlarma(VistaTanque interna) {
        this.interna = interna;
    }

    @Override
    public void mostrar(String etiqueta, int nivel, int cargas) {
        interna.mostrar(etiqueta, nivel, cargas);
        if (nivel > 70) {
            interna.aviso("nivel crítico: " + nivel + "%");
        }
    }

    @Override
    public void aviso(String mensaje) {
        interna.aviso(mensaje);
    }
}
`;
const MAIN_2_INI = `public class Main {
    public static void main(String[] args) {
        Tanque tq = new Tanque("TQ-1");
        // 1. Envuelve la VistaTexto en una VistaConAlarma antes de dársela al controlador
        ControladorPanel panel = new ControladorPanel(tq, new VistaTexto());
        // 2. Suscribe aquí una VistaBarra al mismo tanque

        panel.pulsar("BOMBEAR");
        panel.pulsar("BOMBEAR");
        panel.pulsar("BOMBEAR");
        panel.pulsar("VACIAR");
    }
}
`;
const MAIN_2 = `public class Main {
    public static void main(String[] args) {
        Tanque tq = new Tanque("TQ-1");
        ControladorPanel panel = new ControladorPanel(tq, new VistaConAlarma(new VistaTexto()));
        tq.suscribir(new VistaBarra());
        panel.pulsar("BOMBEAR");
        panel.pulsar("BOMBEAR");
        panel.pulsar("BOMBEAR");
        panel.pulsar("VACIAR");
    }
}
`;
const SALIDA_2 = ['TQ-1: nivel 40%, cargas 1', 'Nivel ####', 'TQ-1: nivel 70%, cargas 2', 'Nivel #######', 'TQ-1: nivel 100%, cargas 3', 'Aviso: nivel crítico: 100%', 'Nivel ##########', 'TQ-1: nivel 10%, cargas 3', 'Nivel #'].join('\n');

/* ---------- Paso 3: selector MANUAL / AUTO (Strategy) ---------- */
const MODO_INI = `// Modo.java
// La estrategia del mando: qué hace el panel cuando el operador pulsa MARCHA.
// Declara public interface Modo con:
//   void marcha(Tanque tanque);
`;
const MANUAL_INI = `// ModoManual.java
// implements Modo. En manual, MARCHA es un bombeo y nada más:
// si el tanque está alto, el modelo se niega (y el controlador avisa).
`;
const AUTO_INI = `// ModoAuto.java
// implements Modo. En automático, MARCHA cuida el tanque:
// si el nivel es mayor que 70, primero lo vacía; después bombea.
// Así el enclavamiento nunca se dispara.
`;
const MODO = `public interface Modo {
    void marcha(Tanque tanque);
}
`;
const MANUAL = `public class ModoManual implements Modo {
    @Override
    public void marcha(Tanque tanque) {
        tanque.bombear();
    }
}
`;
const AUTO = `public class ModoAuto implements Modo {
    @Override
    public void marcha(Tanque tanque) {
        if (tanque.getNivel() > 70) {
            tanque.vaciar();
        }
        tanque.bombear();
    }
}
`;
const PANEL_3 = `public class ControladorPanel {
    private Tanque modelo;
    private VistaTanque vista;
    private Modo modo;

    public ControladorPanel(Tanque modelo, VistaTanque vista, Modo modo) {
        this.modelo = modelo;
        this.vista = vista;
        this.modo = modo;
        modelo.suscribir(vista);
    }

    public void cambiarModo(Modo modo) {
        this.modo = modo;
    }

    public void pulsar(String boton) {
        try {
            if (boton.equals("BOMBEAR")) {
                modelo.bombear();
            } else if (boton.equals("VACIAR")) {
                modelo.vaciar();
            } else if (boton.equals("MARCHA")) {
                modo.marcha(modelo);
            } else {
                vista.aviso("botón sin configurar: " + boton);
            }
        } catch (IllegalStateException e) {
            vista.aviso(e.getMessage());
        }
    }
}
`;
const MAIN_3_INI = `public class Main {
    public static void main(String[] args) {
        Tanque tq = new Tanque("TQ-1");
        // 1. Crea el panel en manual: new ControladorPanel(tq, new VistaTexto(), new ModoManual())
        // 2. Pulsa MARCHA cuatro veces
        // 3. Cambia el panel a ModoAuto y pulsa MARCHA tres veces más

    }
}
`;
const MAIN_3 = `public class Main {
    public static void main(String[] args) {
        Tanque tq = new Tanque("TQ-1");
        ControladorPanel panel = new ControladorPanel(tq, new VistaTexto(), new ModoManual());
        panel.pulsar("MARCHA");
        panel.pulsar("MARCHA");
        panel.pulsar("MARCHA");
        panel.pulsar("MARCHA");
        panel.cambiarModo(new ModoAuto());
        panel.pulsar("MARCHA");
        panel.pulsar("MARCHA");
        panel.pulsar("MARCHA");
    }
}
`;
const SALIDA_3 = ['TQ-1: nivel 40%, cargas 1', 'TQ-1: nivel 70%, cargas 2', 'TQ-1: nivel 100%, cargas 3', 'Aviso: nivel alto', 'TQ-1: nivel 10%, cargas 3', 'TQ-1: nivel 40%, cargas 4', 'TQ-1: nivel 70%, cargas 5', 'TQ-1: nivel 100%, cargas 6'].join('\n');

/* ---------- Paso 4 (mini-jefe): el panel de la planta (Template Method + Factory Method) ---------- */
const ARMADO_INI = `// Panel.java
// El manual de armado de cualquier panel: public abstract class Panel.
//   public final ControladorPanel armar(Tanque tanque)
//       1. pide la vista con crearVista()
//       2. pide el modo con crearModo()
//       3. devuelve un ControladorPanel nuevo con el tanque, esa vista y ese modo
//   protected abstract VistaTanque crearVista();
//   protected abstract Modo crearModo();
// Panel no nombra ninguna vista ni ningún modo concretos: eso lo decide cada subclase.
`;
const OPERADOR_INI = `// PanelOperador.java
// extends Panel. El panel del turno de día:
//   crearVista devuelve una VistaTexto envuelta en una VistaConAlarma
//   crearModo devuelve un ModoManual
`;
const NOCTURNO_INI = `// PanelNocturno.java
// extends Panel. El panel del turno de noche, sin operador:
//   crearVista devuelve una VistaBarra
//   crearModo devuelve un ModoAuto
`;
const ARMADO = `public abstract class Panel {
    public final ControladorPanel armar(Tanque tanque) {
        VistaTanque vista = crearVista();
        Modo modo = crearModo();
        return new ControladorPanel(tanque, vista, modo);
    }

    protected abstract VistaTanque crearVista();

    protected abstract Modo crearModo();
}
`;
const OPERADOR = `public class PanelOperador extends Panel {
    @Override
    protected VistaTanque crearVista() {
        return new VistaConAlarma(new VistaTexto());
    }

    @Override
    protected Modo crearModo() {
        return new ModoManual();
    }
}
`;
const NOCTURNO = `public class PanelNocturno extends Panel {
    @Override
    protected VistaTanque crearVista() {
        return new VistaBarra();
    }

    @Override
    protected Modo crearModo() {
        return new ModoAuto();
    }
}
`;
const MAIN_4_INI = `public class Main {
    public static void main(String[] args) {
        Tanque tq = new Tanque("TQ-1");
        // 1. Arma el panel de día: Panel deDia = new PanelOperador();  ControladorPanel dia = deDia.armar(tq);
        // 2. Pulsa MARCHA cuatro veces en el panel de día
        // 3. Arma el panel de noche sobre el MISMO tanque y pulsa MARCHA dos veces

    }
}
`;
const MAIN_4 = `public class Main {
    public static void main(String[] args) {
        Tanque tq = new Tanque("TQ-1");
        Panel deDia = new PanelOperador();
        ControladorPanel dia = deDia.armar(tq);
        dia.pulsar("MARCHA");
        dia.pulsar("MARCHA");
        dia.pulsar("MARCHA");
        dia.pulsar("MARCHA");
        Panel deNoche = new PanelNocturno();
        ControladorPanel noche = deNoche.armar(tq);
        noche.pulsar("MARCHA");
        noche.pulsar("MARCHA");
    }
}
`;
const SALIDA_4 = ['TQ-1: nivel 40%, cargas 1', 'TQ-1: nivel 70%, cargas 2', 'TQ-1: nivel 100%, cargas 3', 'Aviso: nivel crítico: 100%', 'Aviso: nivel alto', 'TQ-1: nivel 10%, cargas 3', 'Nivel #', 'TQ-1: nivel 40%, cargas 4', 'Nivel ####', 'TQ-1: nivel 70%, cargas 5', 'Nivel #######'].join('\n');

/* Clases intrusas de los casos ocultos: piezas que el estudiante no conoce */
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
const MODO_PURGA = `public class ModoPurga implements Modo {
    public void marcha(Tanque tanque) {
        tanque.vaciar();
    }
}
`;
const MODO_DOBLE = `public class ModoDoble implements Modo {
    public void marcha(Tanque tanque) {
        tanque.bombear();
        tanque.bombear();
    }
}
`;
const PANEL_PRUEBA = `public class PanelPrueba extends Panel {
    protected VistaTanque crearVista() {
        return new VistaContador();
    }

    protected Modo crearModo() {
        return new ModoAuto();
    }
}
`;
const PANEL_DOBLE = `public class PanelDoble extends Panel {
    protected VistaTanque crearVista() {
        return new VistaConAlarma(new VistaContador());
    }

    protected Modo crearModo() {
        return new ModoDoble();
    }
}
`;

const sellados = (archivos, mapa) => Object.entries(mapa).filter(([a, v]) => NORMAL(archivos[a]) !== NORMAL(v)).map(([a]) => a.replace('.java', ''));
const SELLADOS_4 = { 'Tanque.java': TANQUE, 'VistaTanque.java': VISTA, 'VistaTexto.java': TEXTO, 'VistaBarra.java': BARRA, 'VistaConAlarma.java': ALARMA, 'Modo.java': MODO, 'ModoManual.java': MANUAL, 'ModoAuto.java': AUTO, 'ControladorPanel.java': PANEL_3 };

export const MVC = {
  id: 'mision-mvc',
  titulo: 'El panel de control',
  corto: 'MVC',
  concepto: 'Arquitectura MVC',
  refuerza: 8, // no retoma un mundo: reúne los patrones de este
  recompensa: 'Visor de mando · tus robots muestran su estado en una pantalla',
  equipo: 'visor',
  codice: 'mvc',
  /* MVC no es un patrón suelto: se arma con los otros cinco. El plano y el Códice muestran este reparto. */
  reune: [
    { id: 'mision-observer', papel: 'el tanque avisa a sus indicadores sin conocerlos' },
    { id: 'mision-decorator', papel: 'una alarma envuelve a cualquier indicador' },
    { id: 'mision-strategy', papel: 'el selector MANUAL / AUTO cambia cómo responde el mando' },
    { id: 'mision-factory', papel: 'cada tipo de panel fabrica sus propias piezas' },
    { id: 'mision-plantilla', papel: 'todos los paneles se arman en el mismo orden' },
  ],
  pasos: [
    {
      id: 'mvc-1', titulo: 'El tanque que lo hace todo', concepto: 'MVC: modelo, vista y controlador (con Observer)', escena: ESCENA,
      archivos: ['Tanque.java', 'VistaTanque.java', 'VistaTexto.java', 'ControladorPanel.java', 'Main.java'],
      mentor: 'Último sector de La Forja. Este es el panel HMI del tanque TQ-1, y hoy una sola clase lee el botón, mueve el proceso y dibuja la pantalla. MVC no es un truco nuevo: es la forma de repartir ese trabajo en tres piezas usando los patrones que ya tienes en el Códice. Empezamos por el que las une: Observer.',
      teoria: `<p>Un panel <strong>HMI</strong> (la pantalla con la que un operador vigila y manda una máquina gobernada por un PLC) reparte el trabajo en tres, y ese reparto se llama <strong>MVC</strong>:</p>
<ul><li><strong>Modelo</strong> (<code>Tanque</code>): el proceso, con sus datos y sus reglas. Decide si se puede bombear y, si el nivel ya está alto, lanza una excepción: es el <em>enclavamiento</em> que protege el tanque. No imprime ni sabe qué indicadores existen.</li>
<li><strong>Vista</strong> (<code>VistaTexto</code>): un indicador del panel. Solo muestra lo que le llega; no cambia el proceso.</li>
<li><strong>Controlador</strong> (<code>ControladorPanel</code>): los botones. Recibe lo que hace el operador y lo traduce en llamadas al modelo. Si el modelo se niega, le pasa el aviso a la vista.</li></ul>
<p>¿Cómo se entera un indicador de que el proceso cambió? Igual que el ventilador y la sirena se enteraban de la caldera: con <strong>Observer</strong>. El <code>Tanque</code> es el sujeto, guarda una lista de <code>VistaTanque</code> (los observadores) y las <em>notifica</em> después de cada cambio.</p>
<p>MVC se arma con patrones que ya dominaste. En los cuatro capítulos de este sector aparecen los cinco: Observer aquí, y después Decorator, Strategy, Factory Method y Template Method.</p>`,
      ejemplo: 'private void notificar() {\n    for (VistaTanque v : vistas) {\n        v.mostrar(etiqueta, nivel, cargas);\n    }\n}',
      tareas: ['Declara la interfaz <code>VistaTanque</code> con <code>mostrar(String etiqueta, int nivel, int cargas)</code> y <code>aviso(String mensaje)</code>.', 'Convierte <code>Tanque</code> en un modelo: <code>bombear()</code> (sube 30 y cuenta una carga; lanza <code>IllegalStateException("nivel alto")</code> si el nivel es mayor que 70), <code>vaciar()</code> (deja el nivel en 10), <code>suscribir(VistaTanque)</code>, una lista de vistas, <code>getNivel()</code> y <code>getCargas()</code>. Que no imprima nada.', 'Escribe <code>VistaTexto</code>: imprime <code>TQ-1: nivel 40%, cargas 1</code> y <code>Aviso: …</code>.', 'Escribe <code>ControladorPanel</code> con <code>pulsar(String boton)</code>: suscribe la vista en su constructor y, si el modelo lanza la excepción, llama a <code>vista.aviso(e.getMessage())</code>. Un botón que no sea <code>BOMBEAR</code> ni <code>VACIAR</code> avisa <code>botón sin configurar: …</code>.', 'En <code>Main</code>, crea las tres piezas y pulsa los mismos botones por el controlador.'],
      nota: 'La salida debe ser idéntica a la de antes: lo que cambia es quién hace cada trabajo. La escena es el panel que ve el operador: solo muestra lo que tus vistas reciben del modelo. Cuando el programa termine, <strong>pulsa sus botones</strong>: llaman a <code>pulsar(...)</code> en tu <code>ControladorPanel</code>. El botón <code>MARCHA</code> todavía no está configurado; lo conectas en el capítulo 3.',
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
        { nombre: 'Observer: todas las vistas suscritas se enteran', entrada: 'dos VistaTexto en un Tanque, bombear()', prueba: ({ run }) => {
          const { rt } = run(C => { const t = new C.Tanque('T'); t.suscribir(new C.VistaTexto()); t.suscribir(new C.VistaTexto()); t.bombear(); });
          return caso(rt.salida.length === 2, '2 indicadores actualizados', `${rt.salida.length}`);
        } },
        { nombre: 'La salida del panel', prueba: ({ run }) => {
          const { rt } = run(corrMain);
          return caso(salidaDe(rt) === SALIDA_1, SALIDA_1.replace(/\n/g, ' / '), rt.salida.join(' / ') || '(sin salida)');
        } },
      ],
      exito: 'Cada pieza hace un solo trabajo: el proceso decide, el indicador muestra y los botones traducen lo que pide el operador. Y el pegamento es Observer.',
    },
    {
      id: 'mvc-2', titulo: 'Dos indicadores y una alarma', concepto: 'La vista: Observer + Decorator', escena: ESCENA,
      archivos: ['VistaConAlarma.java', 'Main.java', 'VistaBarra.java', 'Tanque.java', 'VistaTanque.java', 'VistaTexto.java', 'ControladorPanel.java'],
      mentor: 'Los operarios piden dos cosas: una barra de nivel al lado del texto y una alarma cuando el tanque quede alto. La barra ya está escrita; conectarla es suscribirla. La alarma no va dentro de ningún indicador: es una capa que se le pone encima a cualquiera, como los módulos sobre un bot.',
      teoria: `<p>La vista de MVC crece de dos maneras, y cada una es un patrón que ya conoces.</p>
<p><strong>Más indicadores (Observer).</strong> Como el modelo habla con la interfaz <code>VistaTanque</code>, puede tener varias vistas a la vez. <code>VistaBarra</code> entra con una línea en <code>Main</code>; <code>Tanque</code> no cambia.</p>
<p><strong>Indicadores con extras (Decorator).</strong> La alarma podría copiarse dentro de <code>VistaTexto</code> y otra vez dentro de <code>VistaBarra</code>, o podría haber una <code>VistaTextoConAlarma</code>, una <code>VistaBarraConAlarma</code>… En «Capa sobre capa» ya resolviste ese problema: <code>Laser</code> era un <code>Bot</code> que envolvía a otro <code>Bot</code>. Aquí <code>VistaConAlarma</code> <em>es</em> una <code>VistaTanque</code> y <em>guarda</em> otra <code>VistaTanque</code>:</p>
<ul><li>le pasa todo a la vista que envuelve, y</li>
<li>cuando el nivel es mayor que 70, le pide además que muestre un aviso.</li></ul>
<p>El tanque y el controlador no notan la diferencia: para ellos sigue siendo una <code>VistaTanque</code>.</p>`,
      ejemplo: 'VistaTanque pantalla = new VistaConAlarma(new VistaTexto());',
      tareas: ['Escribe <code>VistaConAlarma</code>: implementa <code>VistaTanque</code>, recibe otra <code>VistaTanque</code> en el constructor y la guarda.', 'Su <code>mostrar</code> llama al de la vista interna y, si el nivel es mayor que 70, le pide <code>aviso("nivel crítico: " + nivel + "%")</code>. Su <code>aviso</code> pasa el mensaje a la vista interna.', 'En <code>Main</code>, dale al controlador la <code>VistaTexto</code> envuelta en una <code>VistaConAlarma</code>.', 'En <code>Main</code>, suscribe además una <code>VistaBarra</code> al mismo tanque. No modifiques <code>Tanque</code>.'],
      nota: 'En el panel, el indicador envuelto aparece marcado con <code>+ALARMA</code> y la barra es un segundo indicador. Pulsa <code>BOMBEAR</code> hasta pasar de 70 y mira la franja de avisos.',
      pista: 'El decorador no imprime: todo lo que quiere mostrar se lo pide a <code>interna</code>. Por eso sirve para cualquier indicador.',
      objetivoUML: [['VistaConAlarma', 'VistaTanque', 'realizacion'], ['VistaConAlarma', 'VistaTanque', 'asociacion'], ['VistaBarra', 'VistaTanque', 'realizacion'], ['VistaTexto', 'VistaTanque', 'realizacion'], ['Tanque', 'VistaTanque', 'agregacion']],
      inicial: prev => ({ 'VistaConAlarma.java': ALARMA_INI, 'Main.java': MAIN_2_INI, 'VistaBarra.java': BARRA, 'Tanque.java': prev?.['Tanque.java'] ?? TANQUE, 'VistaTanque.java': prev?.['VistaTanque.java'] ?? VISTA, 'VistaTexto.java': prev?.['VistaTexto.java'] ?? TEXTO, 'ControladorPanel.java': prev?.['ControladorPanel.java'] ?? PANEL }),
      archivoInicial: 'VistaConAlarma.java',
      solucion: { 'VistaConAlarma.java': ALARMA, 'Main.java': MAIN_2, 'VistaBarra.java': BARRA, 'Tanque.java': TANQUE, 'VistaTanque.java': VISTA, 'VistaTexto.java': TEXTO, 'ControladorPanel.java': PANEL },
      previo: m => exigir(m, [{ clase: 'VistaConAlarma', implementa: ['VistaTanque'], ctor: 1, metodos: [['mostrar', 3], ['aviso', 1]] }, { clase: 'VistaBarra', implementa: ['VistaTanque'] }]) || previoMain(m),
      animacion: corrMain,
      pruebas: [
        casoRelacion('VistaConAlarma', 'VistaTanque', 'realizacion', { nombre: 'VistaConAlarma es una VistaTanque (realización)' }),
        { nombre: 'VistaConAlarma guarda la vista que envuelve', prueba: ({ modelo }) => {
          const c = modelo.clases.VistaConAlarma, f = c?.campos.find(x => x.tipo === 'VistaTanque');
          return caso(!!f, 'un atributo de tipo VistaTanque', f ? 'correcto' : c?.campos.length ? `el atributo es ${c.campos[0].tipo}: así solo envuelve ese indicador` : 'no guarda ninguna vista');
        } },
        { nombre: 'La alarma no imprime ni nombra indicadores concretos', prueba: ({ archivos }) => {
          const ok = sinTexto(archivos, 'VistaConAlarma.java', /System\.out|VistaTexto|VistaBarra|\bTanque\b/);
          return caso(ok, 'VistaConAlarma sin println, VistaTexto ni VistaBarra', ok ? 'correcto' : 'el decorador imprime o depende de un indicador concreto');
        } },
        { nombre: 'El modelo no sabe qué indicadores tiene', prueba: ({ archivos }) => {
          const ok = sinTexto(archivos, 'Tanque.java', /VistaBarra|VistaTexto|VistaConAlarma|System\.out/);
          return caso(ok, 'Tanque sin vistas concretas ni println', ok ? 'correcto' : 'Tanque nombra una vista concreta o imprime');
        } },
        { nombre: 'Con nivel normal, la alarma solo deja pasar', entrada: 'new VistaConAlarma(new VistaBarra()).mostrar("X", 40, 0)', prueba: ({ run }) => {
          const { rt } = run(C => { new C.VistaConAlarma(new C.VistaBarra()).mostrar('X', 40, 0); });
          return caso(salidaDe(rt) === 'Nivel ####', 'Nivel ####', rt.salida.join(' / ') || '(sin salida)');
        } },
        { nombre: 'Con nivel alto, avisa por la vista que envuelve', entrada: 'new VistaConAlarma(new VistaTexto()).mostrar("X", 100, 3)', prueba: ({ run }) => {
          const { rt } = run(C => { new C.VistaConAlarma(new C.VistaTexto()).mostrar('X', 100, 3); });
          const esperado = 'X: nivel 100%, cargas 3 / Aviso: nivel crítico: 100%';
          return caso(rt.salida.join(' / ') === esperado, esperado, rt.salida.join(' / ') || '(sin salida)');
        } },
        { nombre: 'Los avisos del controlador siguen llegando', entrada: 'new VistaConAlarma(new VistaTexto()).aviso("prueba")', prueba: ({ run }) => {
          const { rt } = run(C => { new C.VistaConAlarma(new C.VistaTexto()).aviso('prueba'); });
          return caso(salidaDe(rt) === 'Aviso: prueba', 'Aviso: prueba', rt.salida.join(' / ') || '(sin salida)');
        } },
        { nombre: 'Texto con alarma y barra a la vez', prueba: ({ run }) => {
          const { rt } = run(corrMain);
          return caso(salidaDe(rt) === SALIDA_2, SALIDA_2.replace(/\n/g, ' / '), rt.salida.join(' / ') || '(sin salida)');
        } },
        { nombre: 'La alarma envuelve un indicador que no conoce', oculto: true, entrada: 'VistaContador envuelta: mostrar con nivel 40 y con nivel 100', prueba: ({ archivos }) => {
          const h = {};
          const r = conExtra(archivos, { 'VistaContador.java': CONTADOR }, C => {
            const v = new C.VistaConAlarma(new C.VistaContador());
            v.mostrar('X', 40, 1); v.mostrar('X', 100, 3);
            h.v = [C.VistaContador.cambios, C.VistaContador.avisos];
          });
          if (r.error) return caso(false, '2 cambios y 1 aviso', r.error);
          return caso(String(h.v) === '2,1', '2 cambios y 1 aviso', `${h.v?.[0]} cambios y ${h.v?.[1]} avisos`);
        } },
        { nombre: 'Una alarma puede envolver a otra alarma', oculto: true, entrada: 'dos VistaConAlarma apiladas sobre un indicador, nivel 100', prueba: ({ archivos }) => {
          const h = {};
          const r = conExtra(archivos, { 'VistaContador.java': CONTADOR }, C => {
            new C.VistaConAlarma(new C.VistaConAlarma(new C.VistaContador())).mostrar('X', 100, 3);
            h.v = [C.VistaContador.cambios, C.VistaContador.avisos];
          });
          if (r.error) return caso(false, '1 cambio y 2 avisos', r.error);
          return caso(String(h.v) === '1,2', '1 cambio y 2 avisos', `${h.v?.[0]} cambios y ${h.v?.[1]} avisos`);
        } },
      ],
      exito: 'Un indicador nuevo entró suscribiéndose y la alarma se enchufó por fuera: Observer y Decorator trabajando en la vista.',
    },
    {
      id: 'mvc-3', titulo: 'Selector MANUAL / AUTO', concepto: 'El controlador: Strategy', escena: ESCENA,
      archivos: ['Modo.java', 'ModoManual.java', 'ModoAuto.java', 'ControladorPanel.java', 'Main.java', 'Tanque.java', 'VistaTanque.java', 'VistaTexto.java', 'VistaBarra.java', 'VistaConAlarma.java'],
      mentor: 'Falta configurar el botón MARCHA. De día lo pulsa un operador y decide él; de noche nadie vigila, y el mando debe vaciar a tiempo para no disparar el enclavamiento. Podríamos guardar un boolean y poner un if dentro del botón, pero ya sabes cómo termina eso. El gladiador cambiaba de estilo en pleno combate; el panel va a cambiar de modo.',
      teoria: `<p>El mismo botón debe responder distinto según el modo. Un <code>boolean auto</code> con un <code>if</code> funciona hoy, pero cada modo nuevo (purga, mantenimiento, prueba) obliga a abrir el controlador.</p>
<p>Es el problema que resolviste en «Estilos de combate» con <strong>Strategy</strong>: el <code>Gladiador</code> guardaba un <code>Estilo</code> y le delegaba el golpe. Aquí:</p>
<ul><li><code>Modo</code> es la estrategia: una interfaz con <code>marcha(Tanque tanque)</code>.</li>
<li><code>ModoManual</code> bombea y nada más. Si el tanque está alto, el modelo se niega y el controlador avisa.</li>
<li><code>ModoAuto</code> consulta <code>getNivel()</code> y vacía antes de bombear: nunca dispara el enclavamiento.</li>
<li><code>ControladorPanel</code> guarda un <code>Modo</code>, y en <code>MARCHA</code> llama a <code>modo.marcha(modelo)</code>. Con <code>cambiarModo(...)</code> se cambia en plena ejecución.</li></ul>
<p>Fíjate en el reparto: el <strong>modelo</strong> pone la regla (con nivel alto no se bombea), el <strong>modo</strong> decide qué hacer con ella y las <strong>vistas</strong> siguen mostrando todo sin que nadie las toque. Por eso en una planta se pasa de MANUAL a AUTO sin rehacer las pantallas.</p>`,
      ejemplo: '} else if (boton.equals("MARCHA")) {\n    modo.marcha(modelo);\n}',
      tareas: ['Declara la interfaz <code>Modo</code> con <code>void marcha(Tanque tanque)</code>.', 'Escribe <code>ModoManual</code> (bombea) y <code>ModoAuto</code> (si el nivel es mayor que 70, vacía; después bombea).', 'En <code>ControladorPanel</code>: agrega un tercer parámetro <code>Modo modo</code> al constructor y guárdalo; agrega <code>cambiarModo(Modo modo)</code>; y configura el botón <code>MARCHA</code> para que llame a <code>modo.marcha(modelo)</code>.', 'En <code>Main</code>: crea el panel en manual, pulsa <code>MARCHA</code> cuatro veces, cambia a <code>ModoAuto</code> y pulsa <code>MARCHA</code> tres veces más.'],
      nota: 'En el panel, <code>MARCHA</code> ya responde y el botón <code>MODO</code> llama a <code>cambiarModo(...)</code> en tu controlador: alterna entre <code>ModoManual</code> y <code>ModoAuto</code>. Arriba a la derecha se ve el modo vigente.',
      pista: 'El controlador no debe nombrar <code>ModoManual</code> ni <code>ModoAuto</code>: solo conoce la interfaz <code>Modo</code>. El <code>try/catch</code> que ya tienes cubre también a <code>MARCHA</code>.',
      objetivoUML: [['ModoManual', 'Modo', 'realizacion'], ['ModoAuto', 'Modo', 'realizacion'], ['ControladorPanel', 'Modo', 'asociacion'], ['ControladorPanel', 'Tanque', 'asociacion'], ['Tanque', 'VistaTanque', 'agregacion']],
      inicial: prev => ({ 'Modo.java': MODO_INI, 'ModoManual.java': MANUAL_INI, 'ModoAuto.java': AUTO_INI, 'ControladorPanel.java': prev?.['ControladorPanel.java'] ?? PANEL, 'Main.java': MAIN_3_INI, 'Tanque.java': prev?.['Tanque.java'] ?? TANQUE, 'VistaTanque.java': prev?.['VistaTanque.java'] ?? VISTA, 'VistaTexto.java': prev?.['VistaTexto.java'] ?? TEXTO, 'VistaBarra.java': prev?.['VistaBarra.java'] ?? BARRA, 'VistaConAlarma.java': prev?.['VistaConAlarma.java'] ?? ALARMA }),
      archivoInicial: 'Modo.java',
      solucion: { 'Modo.java': MODO, 'ModoManual.java': MANUAL, 'ModoAuto.java': AUTO, 'ControladorPanel.java': PANEL_3, 'Main.java': MAIN_3, 'Tanque.java': TANQUE, 'VistaTanque.java': VISTA, 'VistaTexto.java': TEXTO, 'VistaBarra.java': BARRA, 'VistaConAlarma.java': ALARMA },
      previo: m => exigir(m, [
        { clase: 'Modo', interfaz: true, metodos: [['marcha', 1]] },
        { clase: 'ModoManual', implementa: ['Modo'] },
        { clase: 'ModoAuto', implementa: ['Modo'] },
        { clase: 'ControladorPanel', ctor: 3, metodos: [['pulsar', 1], ['cambiarModo', 1]] },
      ]) || previoMain(m),
      animacion: corrMain,
      pruebas: [
        casoRelacion('ModoAuto', 'Modo', 'realizacion'),
        casoRelacion('ControladorPanel', 'Modo', 'asociacion'),
        { nombre: 'El controlador no nombra modos concretos ni imprime', prueba: ({ archivos }) => {
          const ok = sinTexto(archivos, 'ControladorPanel.java', /ModoManual|ModoAuto|System\.out/);
          return caso(ok, 'ControladorPanel solo conoce la interfaz Modo', ok ? 'correcto' : 'el controlador nombra un modo concreto o imprime');
        } },
        { nombre: 'Los modos no imprimen ni conocen el panel', prueba: ({ archivos }) => {
          const ok = sinTexto(archivos, 'ModoManual.java', /System\.out|Vista|Controlador/) && sinTexto(archivos, 'ModoAuto.java', /System\.out|Vista|Controlador/);
          return caso(ok, 'ModoManual y ModoAuto solo hablan con el Tanque', ok ? 'correcto' : 'un modo imprime o usa una vista o el controlador');
        } },
        { nombre: 'En manual, el enclavamiento se dispara y el panel avisa', entrada: 'panel con ModoManual, MARCHA 4 veces', prueba: ({ run }) => {
          const h = {};
          const { rt } = run(C => { const t = new C.Tanque('T'); const p = new C.ControladorPanel(t, new C.VistaTexto(), new C.ModoManual()); for (let k = 0; k < 4; k++) p.pulsar('MARCHA'); h.c = t.getCargas(); });
          const ultimo = rt.salida.at(-1) || '(sin salida)';
          return caso(h.c === 3 && ultimo === 'Aviso: nivel alto', '3 cargas y «Aviso: nivel alto»', `${h.c} cargas y «${ultimo}»`);
        } },
        { nombre: 'En automático, nunca se dispara', entrada: 'panel con ModoAuto, MARCHA 10 veces', prueba: ({ run }) => {
          const h = {};
          const { rt } = run(C => { const t = new C.Tanque('T'); const p = new C.ControladorPanel(t, new C.VistaTexto(), new C.ModoAuto()); for (let k = 0; k < 10; k++) p.pulsar('MARCHA'); h.c = t.getCargas(); });
          const avisos = rt.salida.filter(x => /^Aviso/.test(x)).length;
          return caso(h.c === 10 && avisos === 0, '10 cargas y 0 avisos', `${h.c} cargas y ${avisos} avisos`);
        } },
        { nombre: 'El modo se cambia en plena ejecución', entrada: 'manual: MARCHA 3 veces · cambiarModo(new ModoAuto()) · MARCHA', prueba: ({ run }) => {
          const h = {};
          run(C => { const t = new C.Tanque('T'); const p = new C.ControladorPanel(t, new C.VistaTexto(), new C.ModoManual()); for (let k = 0; k < 3; k++) p.pulsar('MARCHA'); p.cambiarModo(new C.ModoAuto()); p.pulsar('MARCHA'); h.v = [t.getNivel(), t.getCargas()]; });
          return caso(String(h.v) === '40,4', 'nivel 40 y 4 cargas', `nivel ${h.v?.[0]} y ${h.v?.[1]} cargas`);
        } },
        { nombre: 'De manual a automático', prueba: ({ run }) => {
          const { rt } = run(corrMain);
          return caso(salidaDe(rt) === SALIDA_3, SALIDA_3.replace(/\n/g, ' / '), rt.salida.join(' / ') || '(sin salida)');
        } },
        { nombre: 'Un modo desconocido entra sin tocar el controlador', oculto: true, entrada: 'ModoPurga (vacía el tanque): BOMBEAR 2 veces y MARCHA', prueba: ({ archivos }) => {
          const h = {};
          const r = conExtra(archivos, { 'ModoPurga.java': MODO_PURGA }, C => {
            const t = new C.Tanque('X'); const p = new C.ControladorPanel(t, new C.VistaTexto(), new C.ModoPurga());
            p.pulsar('BOMBEAR'); p.pulsar('BOMBEAR'); p.pulsar('MARCHA');
            h.v = [t.getNivel(), t.getCargas()];
          });
          if (r.error) return caso(false, 'nivel 10 y 2 cargas', r.error);
          return caso(String(h.v) === '10,2', 'nivel 10 y 2 cargas', `nivel ${h.v?.[0]} y ${h.v?.[1]} cargas`);
        } },
        { nombre: 'Los demás botones siguen funcionando', oculto: true, entrada: 'BOMBEAR, VACIAR y un botón sin configurar', prueba: ({ run }) => {
          const { rt } = run(C => { const p = new C.ControladorPanel(new C.Tanque('X'), new C.VistaTexto(), new C.ModoAuto()); p.pulsar('BOMBEAR'); p.pulsar('VACIAR'); p.pulsar('PURGAR'); });
          const esperado = 'X: nivel 40%, cargas 1 / X: nivel 10%, cargas 1 / Aviso: botón sin configurar: PURGAR';
          return caso(rt.salida.join(' / ') === esperado, esperado, rt.salida.join(' / ') || '(sin salida)');
        } },
      ],
      exito: 'El panel cambia de modo sin tocar el proceso ni los indicadores. El controlador de MVC delega en una estrategia.',
    },
    {
      id: 'mvc-4', titulo: 'Mini-jefe: el panel de la planta', corto: 'Mini-jefe', jefe: true, concepto: 'MVC completo: Template Method + Factory Method', escena: ESCENA,
      archivos: ['Panel.java', 'PanelOperador.java', 'PanelNocturno.java', 'Main.java', 'Tanque.java', 'VistaTanque.java', 'VistaTexto.java', 'VistaBarra.java', 'VistaConAlarma.java', 'Modo.java', 'ModoManual.java', 'ModoAuto.java', 'ControladorPanel.java'],
      mentor: 'La planta tiene decenas de tanques y dos turnos. Hasta ahora Main cableaba cada panel a mano: qué vista, con qué alarma, en qué modo. Un cable mal puesto y el turno de noche queda en manual. Queremos un manual de armado, como el de la línea de ensamblaje, donde cada tipo de panel solo diga qué piezas lleva. Todo lo demás está sellado.',
      teoria: `<p>Armar un panel siempre sigue los mismos pasos: conseguir la vista, conseguir el modo y entregar un controlador con las tres piezas conectadas. Lo que cambia de un panel a otro es <em>qué</em> vista y <em>qué</em> modo.</p>
<p>Son dos patrones que ya tienes, trabajando juntos:</p>
<ul><li><strong>Template Method</strong> («El manual de ensamblaje»): <code>Panel.armar(tanque)</code> es el método plantilla. Es <code>final</code>: el orden no se discute.</li>
<li><strong>Factory Method</strong> («La fábrica de unidades»): <code>crearVista()</code> y <code>crearModo()</code> son métodos fábrica <code>protected abstract</code>. Cada subclase decide qué objeto devuelve, igual que cada planta decidía qué unidad producir.</li></ul>
<p><code>PanelOperador</code> entrega un texto con alarma en modo manual; <code>PanelNocturno</code>, una barra en modo automático. <code>Main</code> ya no cablea nada: pide un panel armado.</p>
<p>Con esto el panel reúne los otros cinco patrones de La Forja: el tanque avisa (Observer), la alarma envuelve (Decorator), el modo se intercambia (Strategy) y el armado es una plantilla con fábricas (Template Method y Factory Method). Eso es MVC: un reparto de trabajo sostenido por patrones.</p>`,
      ejemplo: 'public final ControladorPanel armar(Tanque tanque) {\n    VistaTanque vista = crearVista();\n    Modo modo = crearModo();\n    return new ControladorPanel(tanque, vista, modo);\n}',
      tareas: ['Escribe <code>Panel</code>, abstracta, con el método plantilla <code>public final ControladorPanel armar(Tanque tanque)</code> y los métodos fábrica <code>protected abstract VistaTanque crearVista()</code> y <code>protected abstract Modo crearModo()</code>.', 'Escribe <code>PanelOperador</code>: su vista es una <code>VistaTexto</code> envuelta en <code>VistaConAlarma</code> y su modo es <code>ModoManual</code>.', 'Escribe <code>PanelNocturno</code>: su vista es una <code>VistaBarra</code> y su modo es <code>ModoAuto</code>.', 'En <code>Main</code>: arma un panel de día sobre el tanque y pulsa <code>MARCHA</code> cuatro veces; después arma un panel de noche sobre el <strong>mismo</strong> tanque y pulsa <code>MARCHA</code> dos veces.', 'No modifiques el tanque, las vistas, los modos ni el controlador: están sellados.'],
      nota: `Los dos paneles observan el mismo tanque: cuando el de noche lo vacía, el texto del de día también se actualiza. Los botones del panel hablan con el último controlador armado. ${GUIA}`,
      pista: '<code>Panel</code> no debe nombrar ninguna vista ni ningún modo concretos: solo llama a sus dos métodos fábrica y arma el controlador.',
      objetivoUML: [['PanelOperador', 'Panel', 'herencia'], ['PanelNocturno', 'Panel', 'herencia'], ['ControladorPanel', 'Modo', 'asociacion'], ['VistaConAlarma', 'VistaTanque', 'realizacion'], ['Tanque', 'VistaTanque', 'agregacion']],
      inicial: () => ({ 'Panel.java': ARMADO_INI, 'PanelOperador.java': OPERADOR_INI, 'PanelNocturno.java': NOCTURNO_INI, 'Main.java': MAIN_4_INI, ...SELLADOS_4 }),
      archivoInicial: 'Panel.java',
      solucion: { 'Panel.java': ARMADO, 'PanelOperador.java': OPERADOR, 'PanelNocturno.java': NOCTURNO, 'Main.java': MAIN_4, ...SELLADOS_4 },
      previo: m => exigir(m, [
        { clase: 'Panel', metodos: [['armar', 1], ['crearVista', 0], ['crearModo', 0]] },
        { clase: 'PanelOperador', metodos: [['crearVista', 0], ['crearModo', 0]] },
        { clase: 'PanelNocturno', metodos: [['crearVista', 0], ['crearModo', 0]] },
      ]) || previoMain(m),
      animacion: corrMain,
      pruebas: [
        casoRelacion('PanelOperador', 'Panel', 'herencia'),
        casoRelacion('PanelNocturno', 'Panel', 'herencia'),
        { nombre: 'Panel es el manual: armar() final y dos métodos fábrica abstractos', prueba: ({ modelo }) => {
          const p = modelo.clases.Panel, met = n => p?.metodos.find(x => x.nombre === n);
          const a = met('armar'), v = met('crearVista'), o = met('crearModo');
          const falla = !p?.abstracta ? 'Panel no es abstract' : !a?.final ? 'armar() no es final' : !v?.abstracto || !o?.abstracto ? 'crearVista() y crearModo() deben ser abstract en Panel' : v.ret !== 'VistaTanque' ? `crearVista() devuelve ${v.ret}: debe devolver VistaTanque` : o.ret !== 'Modo' ? `crearModo() devuelve ${o.ret}: debe devolver Modo` : '';
          return caso(!falla, 'abstract class Panel con armar() final y dos métodos fábrica abstract', falla || 'correcto');
        } },
        { nombre: 'El manual no nombra piezas concretas', prueba: ({ archivos }) => {
          const ok = sinTexto(archivos, 'Panel.java', /VistaTexto|VistaBarra|VistaConAlarma|ModoManual|ModoAuto|System\.out/);
          return caso(ok, 'Panel sin vistas ni modos concretos', ok ? 'correcto' : 'Panel decide una pieza concreta: eso le toca a la subclase');
        } },
        { nombre: 'Las subclases solo fabrican: no repiten el armado', prueba: ({ archivos }) => {
          const ok = sinTexto(archivos, 'PanelOperador.java', /ControladorPanel|armar/) && sinTexto(archivos, 'PanelNocturno.java', /ControladorPanel|armar/);
          return caso(ok, 'PanelOperador y PanelNocturno sin armar() ni ControladorPanel', ok ? 'correcto' : 'una subclase arma el controlador por su cuenta');
        } },
        { nombre: 'El tanque, las vistas, los modos y el controlador no cambiaron', prueba: ({ archivos }) => {
          const tocados = sellados(archivos, SELLADOS_4);
          return caso(!tocados.length, 'iguales a la versión sellada', tocados.length ? `se modificó ${tocados.join(', ')}` : 'sin cambios');
        } },
        { nombre: 'El panel nocturno nunca dispara el enclavamiento', entrada: 'new PanelNocturno().armar(tanque), MARCHA 10 veces', prueba: ({ run }) => {
          const h = {};
          run(C => { const t = new C.Tanque('T'); const p = new C.PanelNocturno().armar(t); for (let k = 0; k < 10; k++) p.pulsar('MARCHA'); h.c = t.getCargas(); });
          return caso(h.c === 10, '10 cargas', `${h.c} cargas`);
        } },
        { nombre: 'El panel del operador muestra la alarma y el aviso', entrada: 'new PanelOperador().armar(tanque), MARCHA 4 veces', prueba: ({ run }) => {
          const { rt } = run(C => { const p = new C.PanelOperador().armar(new C.Tanque('T')); for (let k = 0; k < 4; k++) p.pulsar('MARCHA'); });
          const fin = rt.salida.slice(-2).join(' / '), esperado = 'Aviso: nivel crítico: 100% / Aviso: nivel alto';
          return caso(fin === esperado, esperado, fin || '(sin salida)');
        } },
        { nombre: 'Dos paneles sobre el mismo tanque', prueba: ({ run }) => {
          const { rt } = run(corrMain);
          return caso(salidaDe(rt) === SALIDA_4, SALIDA_4.replace(/\n/g, ' / '), rt.salida.join(' / ') || '(sin salida)');
        } },
        { nombre: 'Un panel desconocido se arma con el mismo manual', oculto: true, entrada: 'PanelPrueba (VistaContador + ModoAuto), MARCHA 4 veces', prueba: ({ archivos }) => {
          const h = {};
          const r = conExtra(archivos, { 'VistaContador.java': CONTADOR, 'PanelPrueba.java': PANEL_PRUEBA }, C => {
            const p = new C.PanelPrueba().armar(new C.Tanque('X'));
            for (let k = 0; k < 4; k++) p.pulsar('MARCHA');
            h.v = [C.VistaContador.cambios, C.VistaContador.avisos];
          });
          if (r.error) return caso(false, '5 cambios y 0 avisos', r.error);
          return caso(String(h.v) === '5,0', '5 cambios y 0 avisos', `${h.v?.[0]} cambios y ${h.v?.[1]} avisos`);
        } },
        { nombre: 'Piezas nuevas combinadas con las tuyas', oculto: true, entrada: 'PanelDoble (alarma sobre VistaContador + ModoDoble), MARCHA 2 veces', prueba: ({ archivos }) => {
          const h = {};
          const r = conExtra(archivos, { 'VistaContador.java': CONTADOR, 'ModoDoble.java': MODO_DOBLE, 'PanelDoble.java': PANEL_DOBLE }, C => {
            const t = new C.Tanque('X'); const p = new C.PanelDoble().armar(t);
            p.pulsar('MARCHA'); p.pulsar('MARCHA');
            h.v = [t.getCargas(), C.VistaContador.cambios, C.VistaContador.avisos];
          });
          if (r.error) return caso(false, '3 cargas, 3 cambios y 2 avisos', r.error);
          return caso(String(h.v) === '3,3,2', '3 cargas, 3 cambios y 2 avisos', `${h.v?.[0]} cargas, ${h.v?.[1]} cambios y ${h.v?.[2]} avisos`);
        } },
      ],
      exito: '¡Panel de planta en línea! Observer, Decorator, Strategy, Factory Method y Template Method trabajando juntos: eso es MVC. Visor de mando instalado.',
    },
  ],
};
