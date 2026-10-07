/* Mundo 7 · La Sala de Averías: manejo de errores con excepciones.
   Lanzar (throw), atrapar (try/catch), varios catch y la jerarquía, excepciones propias y comprobadas
   (throws), finally, y un protocolo que atrapa por la clase base para aceptar averías nuevas. */
import { caso, corrMain, previoMain, exigir, casoRelacion } from './util.js';
import { parsePrograma, ejecutar } from '../engine/motor.js';

const NORMAL = s => (s || '').replace(/\/\/.*$/gm, '').replace(/\s+/g, ' ').trim();
const salidaDe = rt => rt.salida.join('\n').trim();
const conRet = (run, f) => { const h = {}; const r = run(C => { h.v = f(C); }); return { ...r, v: h.v }; };
/* Ejecuta f y devuelve la excepción de Java que se lanzó (o null si no se lanzó ninguna) */
function lanzaDe(run, f) {
  const h = { exc: null, msg: null };
  run((C, rt) => {
    try { h.v = f(C); } catch (e) {
      const n = rt.nombreExc(e);
      if (!n) throw e;
      h.exc = n; h.msg = e.__msg ?? null; h.obj = e;
    }
  });
  return h;
}
const describe = h => (h.exc ? `${h.exc}${h.msg != null ? `: ${h.msg}` : ''}` : 'no lanzó nada');
const GUIA = '<p class="guia-link">La jerarquía completa está en la <button type="button" class="enlace" data-guia="relaciones">guía de relaciones</button>: las excepciones también heredan.</p>';

/* ---------- 7.1 Dar la alarma ---------- */
const BATERIA_INI = `public class Bateria {
    private int carga;

    public Bateria(int carga) {
        this.carga = carga;
    }

    public int getCarga() {
        return carga;
    }

    public void cargar(int cantidad) {
        // Hoy, si la cantidad no sirve, la batería la ignora en silencio
        // y nadie se entera del problema. Cámbialo para que dé la alarma:
        //   cantidad <= 0          → throw new IllegalArgumentException("Cantidad inválida: " + cantidad);
        //   carga + cantidad > 100 → throw new IllegalStateException("Sobrecarga: " + (carga + cantidad));
        if (cantidad > 0 && carga + cantidad <= 100) {
            carga = carga + cantidad;
        }
    }
}
`;
const BATERIA = `public class Bateria {
    private int carga;

    public Bateria(int carga) {
        this.carga = carga;
    }

    public int getCarga() {
        return carga;
    }

    public void cargar(int cantidad) {
        if (cantidad <= 0) {
            throw new IllegalArgumentException("Cantidad inválida: " + cantidad);
        }
        if (carga + cantidad > 100) {
            throw new IllegalStateException("Sobrecarga: " + (carga + cantidad));
        }
        carga = carga + cantidad;
    }
}
`;
const MAIN_ALARMA = `public class Main {
    public static void main(String[] args) {
        Bateria b = new Bateria(50);
        b.cargar(30);
        System.out.println("Carga: " + b.getCarga());
        b.cargar(-5);
        System.out.println("Esta línea no debería imprimirse");
    }
}
`;

/* ---------- 7.2 Atrapar la falla ---------- */
const MAIN_CATCH_INI = `import java.util.ArrayList;

public class Main {
    public static void main(String[] args) {
        Bateria b = new Bateria(50);
        ArrayList<Integer> pedidos = new ArrayList<>();
        pedidos.add(30);
        pedidos.add(-5);
        pedidos.add(15);
        pedidos.add(0);
        for (int p : pedidos) {
            // Si un pedido es inválido, cargar lanza una excepción y TODO el programa se detiene.
            // Envuelve estas dos líneas en try { ... } y atrapa IllegalArgumentException:
            // en el catch imprime "Rechazado: " + e.getMessage()
            b.cargar(p);
            System.out.println("Cargado " + p + " → " + b.getCarga());
        }
        System.out.println("Carga final: " + b.getCarga());
    }
}
`;
const MAIN_CATCH = `import java.util.ArrayList;

public class Main {
    public static void main(String[] args) {
        Bateria b = new Bateria(50);
        ArrayList<Integer> pedidos = new ArrayList<>();
        pedidos.add(30);
        pedidos.add(-5);
        pedidos.add(15);
        pedidos.add(0);
        for (int p : pedidos) {
            try {
                b.cargar(p);
                System.out.println("Cargado " + p + " → " + b.getCarga());
            } catch (IllegalArgumentException e) {
                System.out.println("Rechazado: " + e.getMessage());
            }
        }
        System.out.println("Carga final: " + b.getCarga());
    }
}
`;
const SALIDA_CATCH = 'Cargado 30 → 80\nRechazado: Cantidad inválida: -5\nCargado 15 → 95\nRechazado: Cantidad inválida: 0\nCarga final: 95';

/* ---------- 7.3 Cada falla en su caja ---------- */
const ALMACEN = `import java.util.ArrayList;

public class Almacen {
    private ArrayList<String> piezas = new ArrayList<>();

    public Almacen() {
        piezas.add("tuerca");
        piezas.add("eje");
        piezas.add("resorte");
    }

    // La orden llega como texto. Puede fallar de dos maneras:
    //   Integer.parseInt("dos") lanza NumberFormatException
    //   piezas.get(7)           lanza IndexOutOfBoundsException
    public String sacar(String orden) {
        int n = Integer.parseInt(orden);
        return piezas.get(n);
    }
}
`;
const MAIN_TIPOS_INI = `import java.util.ArrayList;

public class Main {
    public static void main(String[] args) {
        Almacen almacen = new Almacen();
        ArrayList<String> ordenes = new ArrayList<>();
        ordenes.add("0");
        ordenes.add("dos");
        ordenes.add("7");
        ordenes.add("1");
        for (String o : ordenes) {
            // Atiende cada orden con un try y DOS catch:
            //   NumberFormatException      → "Orden ilegible: " + o
            //   IndexOutOfBoundsException  → "No existe la pieza " + o
            System.out.println("Pieza: " + almacen.sacar(o));
        }
    }
}
`;
const MAIN_TIPOS = `import java.util.ArrayList;

public class Main {
    public static void main(String[] args) {
        Almacen almacen = new Almacen();
        ArrayList<String> ordenes = new ArrayList<>();
        ordenes.add("0");
        ordenes.add("dos");
        ordenes.add("7");
        ordenes.add("1");
        for (String o : ordenes) {
            try {
                System.out.println("Pieza: " + almacen.sacar(o));
            } catch (NumberFormatException e) {
                System.out.println("Orden ilegible: " + o);
            } catch (IndexOutOfBoundsException e) {
                System.out.println("No existe la pieza " + o);
            }
        }
    }
}
`;
const SALIDA_TIPOS = 'Pieza: tuerca\nOrden ilegible: dos\nNo existe la pieza 7\nPieza: eje';

/* ---------- 7.4 Una avería con nombre propio ---------- */
const SIN_ENERGIA_INI = `// SinEnergiaException.java
// Crea aquí tu propia excepción:
//   public class SinEnergiaException extends Exception
//   con un constructor que reciba String mensaje y llame a super(mensaje).
`;
const SIN_ENERGIA = `public class SinEnergiaException extends Exception {
    public SinEnergiaException(String mensaje) {
        super(mensaje);
    }
}
`;
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

    public int getEnergia() {
        return energia;
    }

    // Cada paso cuesta 10 de energía. Si el costo es mayor que la energía,
    // lanza new SinEnergiaException(nombre + " necesita " + costo + " y tiene " + energia)
    // y declara la excepción en la firma: public void avanzar(int pasos) throws SinEnergiaException
    public void avanzar(int pasos) {
        int costo = pasos * 10;
        energia = energia - costo;
        System.out.println(nombre + " avanza " + pasos);
    }
}
`;
const ROBOT = `public class Robot {
    private String nombre;
    private int energia;

    public Robot(String nombre, int energia) {
        this.nombre = nombre;
        this.energia = energia;
    }

    public String getNombre() {
        return nombre;
    }

    public int getEnergia() {
        return energia;
    }

    public void avanzar(int pasos) throws SinEnergiaException {
        int costo = pasos * 10;
        if (costo > energia) {
            throw new SinEnergiaException(nombre + " necesita " + costo + " y tiene " + energia);
        }
        energia = energia - costo;
        System.out.println(nombre + " avanza " + pasos);
    }
}
`;
const MAIN_PROPIA_INI = `public class Main {
    public static void main(String[] args) {
        Robot r = new Robot("Tornillo", 50);
        // Cuando avanzar declare throws SinEnergiaException, el compilador te pedirá
        // atraparla aquí: try { ... } catch (SinEnergiaException e) { ... }
        // En el catch imprime "Avería: " + e.getMessage()
        r.avanzar(2);
        r.avanzar(4);
        r.avanzar(1);
    }
}
`;
const MAIN_PROPIA = `public class Main {
    public static void main(String[] args) {
        Robot r = new Robot("Tornillo", 50);
        try {
            r.avanzar(2);
            r.avanzar(4);
            r.avanzar(1);
        } catch (SinEnergiaException e) {
            System.out.println("Avería: " + e.getMessage());
        }
    }
}
`;

/* ---------- 7.5 Pase lo que pase ---------- */
const HANGAR_INI = `public class Hangar {
    private boolean abierta;

    public void abrir() {
        abierta = true;
        System.out.println("Compuerta abierta");
    }

    public void cerrar() {
        abierta = false;
        System.out.println("Compuerta cerrada");
    }

    public boolean estaAbierta() {
        return abierta;
    }

    // Si avanzar lanza la excepción, cerrar() nunca se ejecuta y la compuerta queda abierta.
    // Usa try { ... } finally { cerrar(); } para que se cierre SIEMPRE.
    // No la atrapes aquí: la avería debe seguir llegando a quien llamó (por eso el throws).
    public void despachar(Robot r, int pasos) throws SinEnergiaException {
        abrir();
        r.avanzar(pasos);
        cerrar();
    }
}
`;
const HANGAR = `public class Hangar {
    private boolean abierta;

    public void abrir() {
        abierta = true;
        System.out.println("Compuerta abierta");
    }

    public void cerrar() {
        abierta = false;
        System.out.println("Compuerta cerrada");
    }

    public boolean estaAbierta() {
        return abierta;
    }

    public void despachar(Robot r, int pasos) throws SinEnergiaException {
        abrir();
        try {
            r.avanzar(pasos);
        } finally {
            cerrar();
        }
    }
}
`;
const MAIN_FINALLY = `public class Main {
    public static void main(String[] args) {
        Hangar h = new Hangar();
        Robot r = new Robot("Tornillo", 50);
        try {
            h.despachar(r, 2);
            h.despachar(r, 9);
        } catch (SinEnergiaException e) {
            System.out.println("Avería: " + e.getMessage());
        }
        System.out.println("¿Compuerta abierta? " + h.estaAbierta());
    }
}
`;
const SALIDA_FINALLY = 'Compuerta abierta\nTornillo avanza 2\nCompuerta cerrada\nCompuerta abierta\nCompuerta cerrada\nAvería: Tornillo necesita 90 y tiene 30\n¿Compuerta abierta? false';

/* ---------- 7.6 Protocolo de emergencia (jefe) ---------- */
const AVERIA_INI = `// AveriaException.java
// La madre de todas las averías: public class AveriaException extends Exception
// con un constructor (String mensaje) que llame a super(mensaje).
`;
const AVERIA = `public class AveriaException extends Exception {
    public AveriaException(String mensaje) {
        super(mensaje);
    }
}
`;
const SIN_ENERGIA_JEFE_INI = `// Ahora SinEnergiaException es un tipo de avería: cambia su clase base a AveriaException.
public class SinEnergiaException extends Exception {
    public SinEnergiaException(String mensaje) {
        super(mensaje);
    }
}
`;
const SIN_ENERGIA_JEFE = `public class SinEnergiaException extends AveriaException {
    public SinEnergiaException(String mensaje) {
        super(mensaje);
    }
}
`;
const PIEZA_ROTA_INI = `// PiezaRotaException.java
// Otra avería: extends AveriaException, con un constructor (String pieza)
// que llame a super("Pieza rota: " + pieza).
`;
const PIEZA_ROTA = `public class PiezaRotaException extends AveriaException {
    public PiezaRotaException(String pieza) {
        super("Pieza rota: " + pieza);
    }
}
`;
const ROBOT_JEFE_INI = `public class Robot {
    private String nombre;
    private int energia;
    private String piezaRota;

    public Robot(String nombre, int energia) {
        this.nombre = nombre;
        this.energia = energia;
    }

    public String getNombre() {
        return nombre;
    }

    public int getEnergia() {
        return energia;
    }

    public void romper(String pieza) {
        piezaRota = pieza;
    }

    // Escribe public void trabajar() throws AveriaException:
    //   si energia < 20       → lanza SinEnergiaException(nombre + " necesita carga")
    //   si piezaRota != null  → lanza PiezaRotaException(piezaRota)
    //   si no, gasta 20 de energía.
}
`;
const ROBOT_JEFE = `public class Robot {
    private String nombre;
    private int energia;
    private String piezaRota;

    public Robot(String nombre, int energia) {
        this.nombre = nombre;
        this.energia = energia;
    }

    public String getNombre() {
        return nombre;
    }

    public int getEnergia() {
        return energia;
    }

    public void romper(String pieza) {
        piezaRota = pieza;
    }

    public void trabajar() throws AveriaException {
        if (energia < 20) {
            throw new SinEnergiaException(nombre + " necesita carga");
        }
        if (piezaRota != null) {
            throw new PiezaRotaException(piezaRota);
        }
        energia = energia - 20;
    }
}
`;
const CENTRO_INI = `public class Centro {
    private int atendidos;
    private int conAveria;

    public int getAtendidos() {
        return atendidos;
    }

    public int getConAveria() {
        return conAveria;
    }

    // Escribe public String atender(Robot r):
    //   try: r.trabajar() y devuelve r.getNombre() + ": listo"
    //   UN SOLO catch (AveriaException e): suma 1 a conAveria y devuelve r.getNombre() + ": " + e.getMessage()
    //   finally: suma 1 a atendidos
}
`;
const CENTRO = `public class Centro {
    private int atendidos;
    private int conAveria;

    public int getAtendidos() {
        return atendidos;
    }

    public int getConAveria() {
        return conAveria;
    }

    public String atender(Robot r) {
        try {
            r.trabajar();
            return r.getNombre() + ": listo";
        } catch (AveriaException e) {
            conAveria = conAveria + 1;
            return r.getNombre() + ": " + e.getMessage();
        } finally {
            atendidos = atendidos + 1;
        }
    }
}
`;
const MAIN_JEFE = `public class Main {
    public static void main(String[] args) {
        Centro centro = new Centro();
        Robot a = new Robot("Tornillo", 80);
        Robot b = new Robot("Pistón", 10);
        Robot c = new Robot("Bulón", 90);
        c.romper("rueda");
        System.out.println(centro.atender(a));
        System.out.println(centro.atender(b));
        System.out.println(centro.atender(c));
        System.out.println("Atendidos: " + centro.getAtendidos() + " · Con avería: " + centro.getConAveria());
    }
}
`;
const SALIDA_JEFE = 'Tornillo: listo\nPistón: Pistón necesita carga\nBulón: Pieza rota: rueda\nAtendidos: 3 · Con avería: 2';
const SOBRECALENTADO = `public class SobrecalentadoException extends AveriaException {
    public SobrecalentadoException(String mensaje) {
        super(mensaje);
    }
}
`;
const ROBOT_TERMICO = `public class RobotTermico extends Robot {
    public RobotTermico(String nombre) {
        super(nombre, 100);
    }

    @Override
    public void trabajar() throws AveriaException {
        throw new SobrecalentadoException("se sobrecalentó");
    }
}
`;

const ESCENA = 'averias';
export const MUNDO7 = [
  {
    id: 'averia-alarma', titulo: 'Dar la alarma', concepto: 'Lanzar excepciones (throw)', escena: ESCENA,
    archivos: ['Bateria.java', 'Main.java'],
    mentor: '¡Bienvenido a la Sala de Averías! Aquí llegan los robots cuando algo sale mal. Lo peor no es que algo falle: es que falle en silencio. Esta batería ignora las cargas inválidas sin avisar a nadie. Vamos a enseñarle a dar la alarma.',
    teoria: `<p>Una <strong>excepción</strong> es un objeto que representa un problema. Cuando un método recibe algo con lo que no puede trabajar, en vez de ignorarlo o devolver un valor raro, <strong>lanza</strong> una excepción con <code>throw</code>:</p>
<p><code>throw new IllegalArgumentException("Cantidad inválida: " + cantidad);</code></p>
<p>En ese instante el método se detiene: las líneas que siguen no se ejecutan, y la excepción «sube» a quien lo llamó. Si nadie la atrapa, el programa entero se detiene y muestra el mensaje.</p>
<ul><li><code>IllegalArgumentException</code>: el argumento que me diste no sirve (cantidad negativa).</li>
<li><code>IllegalStateException</code>: el argumento está bien, pero mi estado no lo permite ahora (la batería ya está casi llena).</li></ul>
<p>El mensaje es para personas: dice qué pasó y con qué valor.</p>`,
    ejemplo: 'if (cantidad <= 0) {\n    throw new IllegalArgumentException("Cantidad inválida: " + cantidad);\n}',
    tareas: ['En <code>cargar</code>, si <code>cantidad &lt;= 0</code>, lanza <code>IllegalArgumentException</code> con el mensaje <code>"Cantidad inválida: " + cantidad</code>.', 'Si <code>carga + cantidad &gt; 100</code>, lanza <code>IllegalStateException</code> con <code>"Sobrecarga: " + (carga + cantidad)</code>.', 'Si todo está bien, suma la cantidad a la carga.'],
    nota: 'Al ejecutar verás «Excepción sin atrapar» y la última línea de Main no se imprime: es lo esperado. Así se ve una alarma que nadie atiende. En el siguiente capítulo la atraparemos.',
    pista: 'Revisa primero los casos malos y lanza la excepción; la suma va al final, cuando ya sabes que todo está bien.',
    objetivoUML: [['Main', 'Bateria', 'dependencia']],
    inicial: () => ({ 'Bateria.java': BATERIA_INI, 'Main.java': MAIN_ALARMA }),
    archivoInicial: 'Bateria.java',
    solucion: { 'Bateria.java': BATERIA, 'Main.java': MAIN_ALARMA },
    previo: m => exigir(m, [{ clase: 'Bateria', metodos: [['cargar', 1], ['getCarga', 0]], ctor: 1 }]) || previoMain(m),
    animacion: corrMain,
    pruebas: [
      { nombre: 'Una carga válida suma', entrada: 'new Bateria(50).cargar(30)', prueba: ({ run }) => {
        const h = lanzaDe(run, C => { const b = new C.Bateria(50); b.cargar(30); return b.getCarga(); });
        return caso(!h.exc && h.v === 80, 'carga 80, sin excepción', h.exc ? describe(h) : `carga ${h.v}`);
      } },
      { nombre: 'Cantidad negativa: IllegalArgumentException', entrada: 'cargar(-5)', prueba: ({ run }) => {
        const h = lanzaDe(run, C => new C.Bateria(50).cargar(-5));
        return caso(h.exc === 'IllegalArgumentException' && h.msg === 'Cantidad inválida: -5', 'IllegalArgumentException: Cantidad inválida: -5', describe(h));
      } },
      { nombre: 'Sobrecarga: IllegalStateException', entrada: 'new Bateria(90).cargar(30)', prueba: ({ run }) => {
        const h = lanzaDe(run, C => new C.Bateria(90).cargar(30));
        return caso(h.exc === 'IllegalStateException' && h.msg === 'Sobrecarga: 120', 'IllegalStateException: Sobrecarga: 120', describe(h));
      } },
      { nombre: 'Cero tampoco es una carga', oculto: true, entrada: 'cargar(0)', prueba: ({ run }) => {
        const h = lanzaDe(run, C => new C.Bateria(10).cargar(0));
        return caso(h.exc === 'IllegalArgumentException', 'IllegalArgumentException', describe(h));
      } },
      { nombre: 'Si falla, la carga no cambia', oculto: true, entrada: 'Bateria(70): cargar(40), luego getCarga()', prueba: ({ run }) => {
        const { v } = conRet(run, C => { const b = new C.Bateria(70); try { b.cargar(40); } catch { /* esperada */ } try { b.cargar(-1); } catch { /* esperada */ } b.cargar(30); return b.getCarga(); });
        return caso(v === 100, '100 (70 + 30; las cargas fallidas no suman)', String(v));
      } },
    ],
    exito: 'Ahora la batería no se calla: si algo está mal, lo dice con un nombre (la clase de la excepción) y un mensaje claro.',
  },
  {
    id: 'averia-catch', titulo: 'Atrapar la falla', concepto: 'try / catch', escena: ESCENA,
    archivos: ['Main.java', 'Bateria.java'],
    mentor: 'La estación de carga recibe una fila de pedidos. Con la alarma del capítulo anterior, el primer pedido malo detiene toda la estación. Necesitamos atender la falla y seguir con el siguiente pedido.',
    teoria: `<p>Para reaccionar a una excepción se envuelve el código que puede fallar en un bloque <code>try</code>, seguido de un <code>catch</code> que dice qué tipo de excepción atiende:</p>
<p><code>try { b.cargar(p); ... } catch (IllegalArgumentException e) { ... }</code></p>
<ul><li>Si nada falla, el <code>catch</code> se salta.</li>
<li>Si <code>cargar</code> lanza la excepción, el resto del <code>try</code> se salta y se ejecuta el <code>catch</code>. Después el programa <strong>continúa</strong> normalmente.</li>
<li><code>e</code> es el objeto excepción: <code>e.getMessage()</code> devuelve el mensaje con el que se lanzó.</li></ul>
<p>Atrapar no es esconder: el <code>catch</code> debe hacer algo útil, como avisar o elegir otro camino.</p>`,
    ejemplo: 'try {\n    b.cargar(p);\n} catch (IllegalArgumentException e) {\n    System.out.println("Rechazado: " + e.getMessage());\n}',
    tareas: ['Envuelve <code>b.cargar(p)</code> y el mensaje de «Cargado» en un <code>try</code>.', 'Agrega <code>catch (IllegalArgumentException e)</code> que imprima <code>"Rechazado: " + e.getMessage()</code>.', 'Comprueba que la estación atiende los cuatro pedidos y llega a «Carga final».'],
    nota: 'Mira la escena: la alarma suena con cada pedido malo y el catch la apaga. La estación sigue trabajando.',
    pista: 'El <code>System.out.println("Cargado …")</code> va dentro del <code>try</code>: si la carga falla, no debe imprimirse.',
    objetivoUML: [['Main', 'Bateria', 'dependencia']],
    inicial: prev => ({ 'Main.java': MAIN_CATCH_INI, 'Bateria.java': prev?.['Bateria.java'] || BATERIA }),
    archivoInicial: 'Main.java',
    solucion: { 'Main.java': MAIN_CATCH, 'Bateria.java': BATERIA },
    previo: m => exigir(m, [{ clase: 'Bateria', metodos: [['cargar', 1]] }]) || previoMain(m),
    animacion: corrMain,
    pruebas: [
      { nombre: 'Atiende todos los pedidos', prueba: ({ run }) => {
        const { rt } = run(corrMain);
        return caso(salidaDe(rt) === SALIDA_CATCH, SALIDA_CATCH.replace(/\n/g, ' / '), rt.salida.join(' / ') || '(sin salida)');
      } },
      { nombre: 'Usa try y catch (IllegalArgumentException e)', prueba: ({ archivos }) => {
        const t = NORMAL(archivos['Main.java']);
        const ok = /\btry\s*\{/.test(t) && /catch\s*\(\s*IllegalArgumentException\s+\w+\s*\)/.test(t);
        return caso(ok, 'try { … } catch (IllegalArgumentException e)', ok ? 'correcto' : /catch\s*\(\s*(Exception|RuntimeException)\b/.test(t) ? 'atrapas una excepción demasiado general' : 'falta el try/catch');
      } },
      { nombre: 'La batería sigue lanzando la excepción', oculto: true, prueba: ({ run }) => {
        const h = lanzaDe(run, C => new C.Bateria(50).cargar(-1));
        return caso(h.exc === 'IllegalArgumentException', 'IllegalArgumentException', describe(h));
      } },
    ],
    exito: 'Una falla ya no tumba la estación: el catch la atiende y el programa sigue con el siguiente pedido.',
  },
  {
    id: 'averia-tipos', titulo: 'Cada falla en su caja', concepto: 'Varios catch y jerarquía de excepciones', escena: ESCENA,
    archivos: ['Main.java', 'Almacen.java'],
    mentor: 'El almacén de repuestos recibe órdenes escritas a mano. Algunas son ilegibles y otras piden piezas que no existen. Son fallas distintas y merecen respuestas distintas.',
    teoria: `<p>Un mismo <code>try</code> puede tener <strong>varios <code>catch</code></strong>, uno por tipo de falla. Java prueba los <code>catch</code> en orden y entra al <em>primero</em> cuyo tipo coincide.</p>
<p>Las excepciones son clases y forman una <strong>jerarquía</strong>, como en el Mundo 5:</p>
<pre class="ejemplo">Exception
 └─ RuntimeException
     ├─ IllegalArgumentException
     │   └─ NumberFormatException
     ├─ IllegalStateException
     └─ IndexOutOfBoundsException</pre>
<p>Un <code>catch (RuntimeException e)</code> atrapa a todas sus hijas (polimorfismo otra vez). Por eso el orden importa: los <code>catch</code> <strong>más específicos van primero</strong>. Si pones uno general antes, el compilador te avisa que el de abajo nunca se usaría.</p>${GUIA}`,
    ejemplo: 'try {\n    ...\n} catch (NumberFormatException e) {\n    ...\n} catch (IndexOutOfBoundsException e) {\n    ...\n}',
    tareas: ['Envuelve la línea de <code>almacen.sacar(o)</code> en un <code>try</code>.', '<code>catch (NumberFormatException e)</code>: imprime <code>"Orden ilegible: " + o</code>.', '<code>catch (IndexOutOfBoundsException e)</code>: imprime <code>"No existe la pieza " + o</code>.'],
    nota: 'Prueba a poner primero un <code>catch (RuntimeException e)</code>: el compilador te explicará por qué los demás sobran.',
    pista: 'Puedes usar <code>o</code> dentro de los <code>catch</code>, porque está declarada en el <code>for</code>, fuera del <code>try</code>.',
    objetivoUML: [['Main', 'Almacen', 'dependencia']],
    inicial: () => ({ 'Main.java': MAIN_TIPOS_INI, 'Almacen.java': ALMACEN }),
    archivoInicial: 'Main.java',
    solucion: { 'Main.java': MAIN_TIPOS, 'Almacen.java': ALMACEN },
    previo: m => exigir(m, [{ clase: 'Almacen', metodos: [['sacar', 1]] }]) || previoMain(m),
    animacion: corrMain,
    pruebas: [
      { nombre: 'Cada orden recibe su respuesta', prueba: ({ run }) => {
        const { rt } = run(corrMain);
        return caso(salidaDe(rt) === SALIDA_TIPOS, SALIDA_TIPOS.replace(/\n/g, ' / '), rt.salida.join(' / ') || '(sin salida)');
      } },
      { nombre: 'Un catch para cada tipo de falla', prueba: ({ archivos }) => {
        const t = NORMAL(archivos['Main.java']);
        const a = /catch\s*\(\s*NumberFormatException\s+\w+\s*\)/.test(t), b = /catch\s*\(\s*IndexOutOfBoundsException\s+\w+\s*\)/.test(t);
        return caso(a && b, 'catch (NumberFormatException …) y catch (IndexOutOfBoundsException …)', a && b ? 'correcto' : a ? 'falta el de IndexOutOfBoundsException' : b ? 'falta el de NumberFormatException' : 'faltan los dos catch');
      } },
      { nombre: 'No atrapa todo a ciegas', oculto: true, prueba: ({ archivos }) => {
        const ok = !/catch\s*\(\s*(Exception|RuntimeException|Throwable)\s+\w+\s*\)/.test(NORMAL(archivos['Main.java']));
        return caso(ok, 'sin catch (Exception e) genérico', ok ? 'correcto' : 'un catch genérico mezcla fallas distintas');
      } },
    ],
    exito: 'Cada falla tiene su caja: Java elige el primer catch que coincide con la clase de la excepción.',
  },
  {
    id: 'averia-propia', titulo: 'Una avería con nombre propio', concepto: 'Excepciones propias y comprobadas (throws)', escena: ESCENA,
    archivos: ['SinEnergiaException.java', 'Robot.java', 'Main.java'],
    mentor: 'A los robots se les acaba la energía en mitad del camino. Ninguna excepción de Java describe bien eso, así que vamos a crear la nuestra. Y como es algo que puede pasar en cualquier viaje, quien llame a avanzar estará obligado a tenerlo en cuenta.',
    teoria: `<p>Una excepción propia es una clase que hereda de <code>Exception</code>. Su constructor recibe el mensaje y lo pasa al padre con <code>super(mensaje)</code>; <code>getMessage()</code> se hereda.</p>
<p>Java distingue dos familias:</p>
<ul><li><strong>No comprobadas</strong> (<em>unchecked</em>): heredan de <code>RuntimeException</code>. Suelen ser errores de programación (un argumento inválido) y el compilador no obliga a atraparlas.</li>
<li><strong>Comprobadas</strong> (<em>checked</em>): heredan de <code>Exception</code> pero no de <code>RuntimeException</code>. Son situaciones esperables (quedarse sin energía) y el compilador <strong>exige</strong> que cada método las atrape con <code>try/catch</code> o las declare con <code>throws</code> en su firma.</li></ul>
<p><code>public void avanzar(int pasos) throws SinEnergiaException</code> avisa a todos: «esto puede fallar así; prepárate».</p>`,
    ejemplo: 'public class SinEnergiaException extends Exception {\n    public SinEnergiaException(String mensaje) {\n        super(mensaje);\n    }\n}',
    tareas: ['Crea <code>SinEnergiaException extends Exception</code> con un constructor <code>(String mensaje)</code> que llame a <code>super(mensaje)</code>.', 'En <code>Robot.avanzar</code>, si el costo supera la energía, lanza <code>SinEnergiaException</code> con <code>nombre + " necesita " + costo + " y tiene " + energia</code>, sin gastar energía. Declara <code>throws SinEnergiaException</code>.', 'En <code>Main</code>, atrápala e imprime <code>"Avería: " + e.getMessage()</code>.'],
    nota: 'Haz los pasos en orden y lee al compilador: cuando avanzar declare throws, te dirá exactamente qué falta en Main.',
    pista: 'La salida esperada es <code>Tornillo avanza 2</code> y luego <code>Avería: Tornillo necesita 40 y tiene 30</code>. El tercer avanzar ni se intenta: el try se interrumpe en el segundo.',
    objetivoUML: [['SinEnergiaException', 'Exception', 'herencia'], ['Robot', 'SinEnergiaException', 'dependencia']],
    inicial: () => ({ 'SinEnergiaException.java': SIN_ENERGIA_INI, 'Robot.java': ROBOT_INI, 'Main.java': MAIN_PROPIA_INI }),
    archivoInicial: 'SinEnergiaException.java',
    solucion: { 'SinEnergiaException.java': SIN_ENERGIA, 'Robot.java': ROBOT, 'Main.java': MAIN_PROPIA },
    previo: m => exigir(m, [{ clase: 'SinEnergiaException', ctor: 1 }, { clase: 'Robot', metodos: [['avanzar', 1]] }]) || previoMain(m),
    animacion: corrMain,
    pruebas: [
      { nombre: 'SinEnergiaException es comprobada', prueba: ({ modelo }) => {
        const c = modelo.clases.SinEnergiaException;
        return caso(c?.hereda === 'Exception', 'extends Exception', c?.hereda ? `extends ${c.hereda}` : 'no extiende ninguna excepción');
      } },
      { nombre: 'avanzar declara throws SinEnergiaException', prueba: ({ modelo }) => {
        const mt = modelo.clases.Robot?.metodos.find(x => x.nombre === 'avanzar');
        const ok = (mt?.lanza || []).includes('SinEnergiaException');
        return caso(ok, 'throws SinEnergiaException', mt?.lanza?.length ? `throws ${mt.lanza.join(', ')}` : 'sin throws');
      } },
      { nombre: 'Sin energía suficiente, lanza la avería', entrada: 'Robot("Tornillo", 50).avanzar(10)', prueba: ({ run }) => {
        const h = lanzaDe(run, C => { const r = new C.Robot('Tornillo', 50); r.avanzar(10); });
        return caso(h.exc === 'SinEnergiaException' && h.msg === 'Tornillo necesita 100 y tiene 50', 'SinEnergiaException: Tornillo necesita 100 y tiene 50', describe(h));
      } },
      { nombre: 'Main avisa la avería', prueba: ({ run }) => {
        const { rt } = run(corrMain);
        const esperado = 'Tornillo avanza 2\nAvería: Tornillo necesita 40 y tiene 30';
        return caso(salidaDe(rt) === esperado, esperado.replace(/\n/g, ' / '), rt.salida.join(' / ') || '(sin salida)');
      } },
      { nombre: 'Si falla, no gasta energía', oculto: true, entrada: 'Robot("Bulón", 35): avanzar(4) y luego avanzar(3)', prueba: ({ run }) => {
        const h = lanzaDe(run, C => { const r = new C.Robot('Bulón', 35); try { r.avanzar(4); } catch { /* esperada */ } r.avanzar(3); return r.getEnergia(); });
        return caso(!h.exc && h.v === 5, 'energía 5', h.exc ? describe(h) : `energía ${h.v}`);
      } },
    ],
    exito: 'Tu avería tiene nombre y el compilador obliga a todos a tenerla en cuenta. Eso es una excepción comprobada.',
  },
  {
    id: 'averia-finally', titulo: 'Pase lo que pase', concepto: 'finally', escena: ESCENA,
    archivos: ['Hangar.java', 'Main.java', 'Robot.java', 'SinEnergiaException.java'],
    mentor: 'El hangar abre su compuerta para despachar a cada robot. Pero cuando un robot se queda sin energía, la compuerta queda abierta toda la noche. Hay cosas que se deben hacer siempre, falle o no falle.',
    teoria: `<p>El bloque <code>finally</code> va después del <code>try</code> (y de los <code>catch</code>, si hay) y se ejecuta <strong>siempre</strong>:</p>
<ul><li>si el <code>try</code> termina bien,</li>
<li>si se lanza una excepción y un <code>catch</code> la atiende,</li>
<li>y también si la excepción sigue subiendo porque nadie aquí la atrapa.</li></ul>
<p>Sirve para dejar todo en orden: cerrar compuertas, archivos o conexiones. Un <code>try</code> puede llevar solo <code>finally</code>, sin <code>catch</code>: así el método limpia lo suyo y deja que la excepción llegue a quien sabe qué hacer con ella.</p>`,
    ejemplo: 'abrir();\ntry {\n    r.avanzar(pasos);\n} finally {\n    cerrar();\n}',
    tareas: ['En <code>Hangar.despachar</code>, envuelve <code>r.avanzar(pasos)</code> en un <code>try</code>.', 'Mueve <code>cerrar()</code> a un bloque <code>finally</code>.', 'No agregues <code>catch</code> en <code>despachar</code>: la avería debe seguir llegando a <code>Main</code>.'],
    nota: 'En la escena, la palabra FINALLY aparece cuando el bloque se ejecuta, incluso justo antes de que la avería salga del método.',
    pista: 'Al final debe imprimirse <code>¿Compuerta abierta? false</code>, y antes <code>Avería: Tornillo necesita 90 y tiene 30</code>.',
    objetivoUML: [['Hangar', 'Robot', 'dependencia'], ['SinEnergiaException', 'Exception', 'herencia']],
    inicial: prev => ({ 'Hangar.java': HANGAR_INI, 'Main.java': MAIN_FINALLY, 'Robot.java': prev?.['Robot.java'] || ROBOT, 'SinEnergiaException.java': prev?.['SinEnergiaException.java'] || SIN_ENERGIA }),
    archivoInicial: 'Hangar.java',
    solucion: { 'Hangar.java': HANGAR, 'Main.java': MAIN_FINALLY, 'Robot.java': ROBOT, 'SinEnergiaException.java': SIN_ENERGIA },
    previo: m => exigir(m, [{ clase: 'Hangar', metodos: [['despachar', 2], ['estaAbierta', 0]] }, { clase: 'Robot', metodos: [['avanzar', 1]] }]) || previoMain(m),
    animacion: corrMain,
    pruebas: [
      { nombre: 'La compuerta queda cerrada', prueba: ({ run }) => {
        const { rt } = run(corrMain);
        return caso(salidaDe(rt) === SALIDA_FINALLY, SALIDA_FINALLY.replace(/\n/g, ' / '), rt.salida.join(' / ') || '(sin salida)');
      } },
      { nombre: 'Usa finally', prueba: ({ archivos }) => {
        const ok = /finally\s*\{[^}]*cerrar\s*\(\s*\)/.test(NORMAL(archivos['Hangar.java']));
        return caso(ok, 'finally { cerrar(); }', ok ? 'correcto' : 'cerrar() no está en un finally');
      } },
      { nombre: 'La avería sigue llegando a quien llamó', entrada: 'despachar(robot con 20, 5)', prueba: ({ run }) => {
        const h2 = {};
        const h = lanzaDe(run, C => { const hg = new C.Hangar(); try { hg.despachar(new C.Robot('Zumbi', 20), 5); } finally { h2.abierta = hg.estaAbierta(); } });
        return caso(h.exc === 'SinEnergiaException' && h2.abierta === false, 'SinEnergiaException y compuerta cerrada', `${describe(h)} · compuerta ${h2.abierta ? 'abierta' : 'cerrada'}`);
      } },
      { nombre: 'Un despacho exitoso también cierra', oculto: true, prueba: ({ run }) => {
        const { v } = conRet(run, C => { const hg = new C.Hangar(); hg.despachar(new C.Robot('Avispa', 100), 1); return hg.estaAbierta(); });
        return caso(v === false, 'cerrada', v ? 'abierta' : 'cerrada');
      } },
    ],
    exito: 'Pase lo que pase, la compuerta se cierra. finally es la última palabra de un try.',
  },
  {
    id: 'averia-jefe', titulo: 'Protocolo de emergencia', concepto: 'Jerarquía de excepciones propias', escena: ESCENA, jefe: true,
    archivos: ['Centro.java', 'AveriaException.java', 'SinEnergiaException.java', 'PiezaRotaException.java', 'Robot.java', 'Main.java'],
    mentor: 'Prueba final: el Centro de Reparación atiende robots con averías de todo tipo, y cada semana aparecen averías nuevas. Diseña un protocolo que no haya que reescribir cada vez que se invente una avería.',
    teoria: `<p>Las excepciones propias también pueden formar una <strong>jerarquía</strong>: una clase base <code>AveriaException</code> y varias hijas. Así un solo <code>catch (AveriaException e)</code> atiende a todas, incluso a las que se creen después (polimorfismo, como en la Arena).</p>
<p>El método que puede fallar declara la familia completa: <code>public void trabajar() throws AveriaException</code>. Por dentro puede lanzar cualquier hija.</p>
<p>Y <code>finally</code> se ejecuta aunque el <code>try</code> o el <code>catch</code> terminen con <code>return</code>: es el lugar perfecto para llevar la cuenta de los robots atendidos.</p>
<p><strong>Ojo:</strong> hay una prueba oculta con una avería que todavía no existe.</p>`,
    ejemplo: 'try {\n    r.trabajar();\n    return ...;\n} catch (AveriaException e) {\n    return ... + e.getMessage();\n} finally {\n    atendidos = atendidos + 1;\n}',
    tareas: ['Crea <code>AveriaException extends Exception</code> con constructor <code>(String mensaje)</code>.', 'Haz que <code>SinEnergiaException</code> herede de <code>AveriaException</code>, y crea <code>PiezaRotaException</code> con el mensaje <code>"Pieza rota: " + pieza</code>.', 'Escribe <code>Robot.trabajar() throws AveriaException</code> según el comentario.', 'Escribe <code>Centro.atender(Robot r)</code> con un solo <code>catch (AveriaException e)</code> y un <code>finally</code> que cuente los atendidos.'],
    nota: 'Si atrapas cada avería por separado, el compilador te recordará que trabajar() puede lanzar cualquier AveriaException.',
    pista: 'Salida esperada: <code>Tornillo: listo</code>, <code>Pistón: Pistón necesita carga</code>, <code>Bulón: Pieza rota: rueda</code> y <code>Atendidos: 3 · Con avería: 2</code>.',
    objetivoUML: [['SinEnergiaException', 'AveriaException', 'herencia'], ['PiezaRotaException', 'AveriaException', 'herencia'], ['AveriaException', 'Exception', 'herencia'], ['Centro', 'Robot', 'dependencia']],
    inicial: () => ({ 'Centro.java': CENTRO_INI, 'AveriaException.java': AVERIA_INI, 'SinEnergiaException.java': SIN_ENERGIA_JEFE_INI, 'PiezaRotaException.java': PIEZA_ROTA_INI, 'Robot.java': ROBOT_JEFE_INI, 'Main.java': MAIN_JEFE }),
    archivoInicial: 'AveriaException.java',
    solucion: { 'Centro.java': CENTRO, 'AveriaException.java': AVERIA, 'SinEnergiaException.java': SIN_ENERGIA_JEFE, 'PiezaRotaException.java': PIEZA_ROTA, 'Robot.java': ROBOT_JEFE, 'Main.java': MAIN_JEFE },
    previo: m => exigir(m, [{ clase: 'AveriaException', ctor: 1 }, { clase: 'PiezaRotaException', ctor: 1 }, { clase: 'Robot', metodos: [['trabajar', 0]] }, { clase: 'Centro', metodos: [['atender', 1]] }]) || previoMain(m),
    animacion: corrMain,
    pruebas: [
      casoRelacion('SinEnergiaException', 'AveriaException', 'herencia'),
      casoRelacion('PiezaRotaException', 'AveriaException', 'herencia'),
      { nombre: 'El centro atiende a los tres robots', prueba: ({ run }) => {
        const { rt } = run(corrMain);
        return caso(salidaDe(rt) === SALIDA_JEFE, SALIDA_JEFE.replace(/\n/g, ' / '), rt.salida.join(' / ') || '(sin salida)');
      } },
      { nombre: 'trabajar declara la familia completa', prueba: ({ modelo }) => {
        const mt = modelo.clases.Robot?.metodos.find(x => x.nombre === 'trabajar');
        const ok = (mt?.lanza || []).includes('AveriaException');
        return caso(ok, 'throws AveriaException', mt?.lanza?.length ? `throws ${mt.lanza.join(', ')}` : 'sin throws');
      } },
      { nombre: 'Una avería que todavía no existía', oculto: true, entrada: 'RobotTermico lanza SobrecalentadoException extends AveriaException', prueba: ({ archivos }) => {
        const m = parsePrograma({ ...archivos, 'SobrecalentadoException.java': SOBRECALENTADO, 'RobotTermico.java': ROBOT_TERMICO });
        if (m.errores.length) return caso(false, 'compila con las clases nuevas', m.errores[0].msg);
        const h = {};
        const r = ejecutar(m, C => { const c = new C.Centro(); h.v = [c.atender(new C.RobotTermico('Horno')), c.getAtendidos(), c.getConAveria()]; });
        if (r.error) return caso(false, 'Horno: se sobrecalentó', r.error);
        return caso(String(h.v) === 'Horno: se sobrecalentó,1,1', 'Horno: se sobrecalentó · 1 atendido · 1 con avería', (h.v || []).join(' · '));
      } },
      { nombre: 'Los atendidos se cuentan aunque haya avería', oculto: true, prueba: ({ run }) => {
        const { v } = conRet(run, C => { const c = new C.Centro(); const r = new C.Robot('Bulón', 5); c.atender(r); c.atender(r); return [c.getAtendidos(), c.getConAveria()]; });
        return caso(String(v) === '2,2', '2 atendidos, 2 con avería', (v || []).join(', '));
      } },
    ],
    exito: '¡Protocolo aprobado! Un catch por la clase base atiende todas las averías, hasta las que aún no se han inventado. Has completado la Sala de Averías.',
  },
];
