/* Patrón Factory Method · «La fábrica de unidades» (Mundo 8 · La Forja).
   Los new de cada tipo de unidad están copiados en varias clases que deciden con if sobre un texto.
   Paso 1: se reúnen en una fábrica simple que rechaza los tipos desconocidos con una excepción.
   Paso 2: el patrón Factory Method: cada planta decide qué unidad crea redefiniendo un método,
   y la clase base conserva el control de calidad común.
   Mini-jefe: una planta y una unidad nuevas entran en la central sin tocar lo sellado. */
import { caso, corrMain, exigir, previoMain, casoRelacion, sinTexto } from './util.js';
import { parsePrograma, ejecutar } from '../engine/motor.js';

const NORMAL = s => (s || '').replace(/\/\/.*$/gm, '').replace(/\s+/g, ' ').trim();
const salidaDe = rt => rt.salida.join('\n').trim();
function conExtra(archivos, extra, arnes) {
  const m = parsePrograma({ ...archivos, ...extra });
  if (m.errores.length) return { error: `${m.errores[0].archivo}:${m.errores[0].linea} ${m.errores[0].msg}` };
  const r = ejecutar(m, arnes);
  return { error: r.error, salida: r.rt.salida };
}
const igualSalida = (run, esperado) => {
  const { rt } = run(corrMain);
  return caso(salidaDe(rt) === esperado, esperado.replace(/\n/g, ' / '), rt.salida.join(' / ') || '(sin salida)');
};
const sellados = (archivos, mapa) => Object.entries(mapa).filter(([a, v]) => NORMAL(archivos[a]) !== NORMAL(v)).map(([a]) => a.replace('.java', ''));
/* Clases de archivo que hacen new de alguna unidad concreta */
const conNew = (archivos, nombres, productos) => nombres.filter(n => !sinTexto(archivos, n + '.java', new RegExp(`\\bnew\\s+(${productos.join('|')})\\s*\\(`)));
const GUIA = '<p class="guia-link">Al superar este mini-jefe, el patrón queda registrado en el <button type="button" class="enlace" data-guia="patrones">Códice de patrones</button>.</p>';
const ESCENA = 'fabrica';

/* ---------- Productos ---------- */
const UNIDAD = `public interface Unidad {
    String describir();

    int costo();
}
`;
const DRON = `public class Dron implements Unidad {
    @Override
    public String describir() {
        return "dron de vigilancia";
    }

    @Override
    public int costo() {
        return 120;
    }
}
`;
const TANQUE = `public class Tanque implements Unidad {
    @Override
    public String describir() {
        return "tanque de carga";
    }

    @Override
    public int costo() {
        return 300;
    }
}
`;
const EXPLORADOR = `public class Explorador implements Unidad {
    @Override
    public String describir() {
        return "explorador todoterreno";
    }

    @Override
    public int costo() {
        return 200;
    }
}
`;
/* Unidades que el juez trae por su cuenta en los casos de extensión */
const SUBMARINO = `public class Submarino implements Unidad {
    @Override
    public String describir() {
        return "submarino de rescate";
    }

    @Override
    public int costo() {
        return 450;
    }
}
`;
const PLANTA_SUBMARINA = `public class PlantaSubmarina extends Planta {
    @Override
    protected Unidad crearUnidad() {
        return new Submarino();
    }
}
`;

/* ---------- Paso 1: los new desperdigados → fábrica simple ---------- */
const HANGAR_OLOR = `import java.util.ArrayList;

public class Hangar {
    private ArrayList<Unidad> unidades = new ArrayList<>();

    public void recibir(String tipo) {
        Unidad u;
        if (tipo.equals("dron")) {
            u = new Dron();
        } else if (tipo.equals("tanque")) {
            u = new Tanque();
        } else {
            u = new Explorador();   // cualquier otro texto termina como explorador
        }
        unidades.add(u);
        System.out.println("hangar: " + u.describir());
    }

    public int cantidad() {
        return unidades.size();
    }
}
`;
const COTIZADOR_OLOR = `public class Cotizador {
    // La misma cadena de if que en Hangar, copiada (y con otro caso por defecto)
    public int cotizar(String tipo) {
        if (tipo.equals("dron")) {
            return new Dron().costo();
        } else if (tipo.equals("tanque")) {
            return new Tanque().costo();
        }
        return new Explorador().costo();
    }
}
`;
const FABRICA_INI = `// FabricaUnidades.java
// El único lugar donde se decide qué clase crear a partir de un texto.
// Escribe public static Unidad crear(String tipo):
//   "dron" → Dron, "tanque" → Tanque, "explorador" → Explorador
//   cualquier otro texto → throw new IllegalArgumentException("tipo desconocido: " + tipo);
`;
const MAIN_1 = `public class Main {
    public static void main(String[] args) {
        Hangar hangar = new Hangar();
        hangar.recibir("dron");
        hangar.recibir("tanque");
        Cotizador cotizador = new Cotizador();
        System.out.println("cotización: " + cotizador.cotizar("explorador"));
        try {
            hangar.recibir("submarino");
        } catch (IllegalArgumentException e) {
            System.out.println("rechazado: " + e.getMessage());
        }
        System.out.println("en el hangar: " + hangar.cantidad());
    }
}
`;
const FABRICA = `public class FabricaUnidades {
    public static Unidad crear(String tipo) {
        if (tipo.equals("dron")) {
            return new Dron();
        }
        if (tipo.equals("tanque")) {
            return new Tanque();
        }
        if (tipo.equals("explorador")) {
            return new Explorador();
        }
        throw new IllegalArgumentException("tipo desconocido: " + tipo);
    }
}
`;
const HANGAR = `import java.util.ArrayList;

public class Hangar {
    private ArrayList<Unidad> unidades = new ArrayList<>();

    public void recibir(String tipo) {
        Unidad u = FabricaUnidades.crear(tipo);
        unidades.add(u);
        System.out.println("hangar: " + u.describir());
    }

    public int cantidad() {
        return unidades.size();
    }
}
`;
const COTIZADOR = `public class Cotizador {
    public int cotizar(String tipo) {
        return FabricaUnidades.crear(tipo).costo();
    }
}
`;
const SALIDA_1 = 'hangar: dron de vigilancia\nhangar: tanque de carga\ncotización: 200\nrechazado: tipo desconocido: submarino\nen el hangar: 2';

/* ---------- Paso 2: Factory Method ---------- */
const PLANTA_OLOR = `public class Planta {
    private String especialidad;
    private int producidas = 0;

    public Planta(String especialidad) {
        this.especialidad = especialidad;
    }

    public Unidad producir() {
        Unidad u;
        if (especialidad.equals("aerea")) {
            u = new Dron();
        } else {
            u = new Tanque();
        }
        producidas++;
        System.out.println("control de calidad #" + producidas + ": " + u.describir());
        return u;
    }
}
`;
const AEREA_INI = `// PlantaAerea.java
// Extiende Planta y redefine crearUnidad(): devuelve un Dron.
`;
const TERRESTRE_INI = `// PlantaTerrestre.java
// Extiende Planta y redefine crearUnidad(): devuelve un Tanque.
`;
const MAIN_2_OLOR = `public class Main {
    public static void main(String[] args) {
        Planta aerea = new Planta("aerea");
        Planta terrestre = new Planta("terrestre");
        aerea.producir();
        terrestre.producir();
        aerea.producir();
    }
}
`;
const PLANTA = `public abstract class Planta {
    private int producidas = 0;

    // El esqueleto común: crear, contar y pasar el control de calidad
    public final Unidad producir() {
        Unidad u = crearUnidad();
        producidas++;
        System.out.println("control de calidad #" + producidas + ": " + u.describir());
        return u;
    }

    // El método fábrica: cada planta decide qué unidad crea
    protected abstract Unidad crearUnidad();
}
`;
const AEREA = `public class PlantaAerea extends Planta {
    @Override
    protected Unidad crearUnidad() {
        return new Dron();
    }
}
`;
const TERRESTRE = `public class PlantaTerrestre extends Planta {
    @Override
    protected Unidad crearUnidad() {
        return new Tanque();
    }
}
`;
const MAIN_2 = `public class Main {
    public static void main(String[] args) {
        Planta aerea = new PlantaAerea();
        Planta terrestre = new PlantaTerrestre();
        aerea.producir();
        terrestre.producir();
        aerea.producir();
    }
}
`;
const SALIDA_2 = 'control de calidad #1: dron de vigilancia\ncontrol de calidad #1: tanque de carga\ncontrol de calidad #2: dron de vigilancia';

/* ---------- Paso 3 (mini-jefe): la central de producción ---------- */
const EXPLORADOR_INI = `// Explorador.java
// Una unidad nueva: implements Unidad.
//   describir() → "explorador todoterreno"
//   costo()     → 200
`;
const PLANTA_EXP_INI = `// PlantaExploradores.java
// Una planta nueva que fabrica exploradores. No toques Planta.java.
`;
const CENTRAL_INI = `import java.util.ArrayList;

public class Central {
    private ArrayList<Planta> plantas = new ArrayList<>();

    public void agregar(Planta p) {
        plantas.add(p);
    }

    // Escribe public int producirLote(): cada planta produce UNA unidad, en orden,
    // y el método devuelve la suma de sus costos.
    // La central no sabe qué fabrica cada planta: no hace new de unidades ni pregunta tipos.
}
`;
const CENTRAL = `import java.util.ArrayList;

public class Central {
    private ArrayList<Planta> plantas = new ArrayList<>();

    public void agregar(Planta p) {
        plantas.add(p);
    }

    public int producirLote() {
        int total = 0;
        for (Planta p : plantas) {
            total = total + p.producir().costo();
        }
        return total;
    }
}
`;
const PLANTA_EXP = `public class PlantaExploradores extends Planta {
    @Override
    protected Unidad crearUnidad() {
        return new Explorador();
    }
}
`;
const MAIN_3 = `public class Main {
    public static void main(String[] args) {
        Central central = new Central();
        central.agregar(new PlantaAerea());
        central.agregar(new PlantaExploradores());
        System.out.println("lote 1: $" + central.producirLote());
        System.out.println("lote 2: $" + central.producirLote());
    }
}
`;
const SALIDA_3 = 'control de calidad #1: dron de vigilancia\ncontrol de calidad #1: explorador todoterreno\nlote 1: $320\ncontrol de calidad #2: dron de vigilancia\ncontrol de calidad #2: explorador todoterreno\nlote 2: $320';

export const FACTORY = {
  id: 'mision-factory',
  titulo: 'La fábrica de unidades',
  corto: 'Factory Method',
  rotulo: 'Factory', // rótulo corto en el plano
  concepto: 'Patrón Factory Method',
  refuerza: 7, // mundo cuyo concepto retoma
  recompensa: 'Troquel de fábrica',
  equipo: 'troquel',
  codice: 'factory',
  pasos: [
    {
      id: 'factory-1', titulo: 'Los new desperdigados', concepto: 'Fábrica simple: un solo lugar para crear', escena: ESCENA,
      archivos: ['FabricaUnidades.java', 'Hangar.java', 'Cotizador.java', 'Main.java', 'Unidad.java', 'Dron.java', 'Tanque.java', 'Explorador.java'],
      mentor: 'El hangar y el cotizador deciden cada uno, con su propia cadena de if, qué unidad crear a partir de un texto. Ya no coinciden: un pedido de «submarino» termina convertido en explorador. Pongamos una sola prensa en la fábrica.',
      teoria: `<p>Cuando varias clases repiten la misma decisión de <em>qué clase crear</em> («si dice dron, <code>new Dron()</code>…»), cada copia puede quedar distinta y agregar un tipo obliga a buscar todos los <code>new</code>.</p>
<p>La <strong>fábrica simple</strong> reúne esa decisión en un único método, normalmente <code>static</code>, que devuelve el tipo general (<code>Unidad</code>):</p>
<ul><li>Los clientes piden por nombre y reciben una <code>Unidad</code>: no saben qué clase concreta les llegó.</li>
<li>Un texto desconocido no se adivina: se rechaza con <code>IllegalArgumentException</code>, como aprendiste en el Mundo 7.</li></ul>
<p>Todavía no es el patrón Factory Method (eso viene en el paso 2), pero es su punto de partida más común.</p>`,
      ejemplo: 'public static Unidad crear(String tipo) {\n    if (tipo.equals("dron")) {\n        return new Dron();\n    }\n    // ...\n    throw new IllegalArgumentException("tipo desconocido: " + tipo);\n}',
      tareas: ['Ejecuta el código tal como está: mira en la escena cuántas prensas hay y qué pasa con el «submarino».', 'Escribe <code>FabricaUnidades</code> con <code>public static Unidad crear(String tipo)</code>, que lanza <code>IllegalArgumentException("tipo desconocido: " + tipo)</code> si no conoce el tipo.', 'Haz que <code>Hangar</code> y <code>Cotizador</code> le pidan las unidades a la fábrica: ninguno de los dos debe hacer <code>new Dron</code>, <code>new Tanque</code> ni <code>new Explorador</code>.'],
      nota: 'Mira la escena: con el código inicial hay una prensa en cada cliente; al terminar debe quedar una sola, en la fábrica.',
      pista: 'Un método <code>static</code> se llama con el nombre de la clase: <code>FabricaUnidades.crear(tipo)</code>.',
      objetivoUML: [['Dron', 'Unidad', 'realizacion'], ['Tanque', 'Unidad', 'realizacion'], ['Explorador', 'Unidad', 'realizacion']],
      inicial: () => ({ 'FabricaUnidades.java': FABRICA_INI, 'Hangar.java': HANGAR_OLOR, 'Cotizador.java': COTIZADOR_OLOR, 'Main.java': MAIN_1, 'Unidad.java': UNIDAD, 'Dron.java': DRON, 'Tanque.java': TANQUE, 'Explorador.java': EXPLORADOR }),
      archivoInicial: 'FabricaUnidades.java',
      solucion: { 'FabricaUnidades.java': FABRICA, 'Hangar.java': HANGAR, 'Cotizador.java': COTIZADOR, 'Main.java': MAIN_1, 'Unidad.java': UNIDAD, 'Dron.java': DRON, 'Tanque.java': TANQUE, 'Explorador.java': EXPLORADOR },
      // Sin exigir la fábrica: así se puede ejecutar primero el código desperdigado y verlo en la escena
      previo: m => previoMain(m),
      animacion: corrMain,
      pruebas: [
        { nombre: 'Existe la fábrica con crear(String) estático', prueba: ({ modelo }) => {
          const c = modelo.clases.FabricaUnidades?.metodos.find(x => x.nombre === 'crear' && x.params.length === 1);
          const ok = c && c.estatico && c.ret === 'Unidad';
          return caso(ok, 'public static Unidad crear(String tipo)', !c ? 'falta FabricaUnidades.crear(String)' : !c.estatico ? 'crear no es static' : c.ret !== 'Unidad' ? `devuelve ${c.ret}: debe devolver Unidad` : 'correcto');
        } },
        { nombre: 'Los clientes ya no hacen new de unidades', prueba: ({ archivos }) => {
          const malas = conNew(archivos, ['Hangar', 'Cotizador'], ['Dron', 'Tanque', 'Explorador']);
          return caso(!malas.length, 'solo FabricaUnidades crea unidades', malas.length ? `${malas.join(' y ')} todavía hace new` : 'correcto');
        } },
        { nombre: 'Hangar y cotizador responden igual, y el submarino se rechaza', prueba: ({ run }) => igualSalida(run, SALIDA_1) },
        { nombre: 'Un error de tipeo también se rechaza', oculto: true, entrada: 'new Cotizador().cotizar("drone")', prueba: ({ archivos }) => {
          const r = conExtra(archivos, {}, C => { new C.Cotizador().cotizar('drone'); });
          const ok = /IllegalArgumentException/.test(r.error || '') && /drone/.test(r.error || '');
          return caso(ok, 'IllegalArgumentException: tipo desconocido: drone', r.error || 'no lanzó nada: el cotizador adivinó un tipo');
        } },
        { nombre: 'La fábrica devuelve un objeto nuevo en cada pedido', oculto: true, entrada: 'crear("dron") dos veces', prueba: ({ archivos }) => {
          const h = {};
          const r = conExtra(archivos, {}, C => { const a = C.FabricaUnidades.crear('dron'), b = C.FabricaUnidades.crear('dron'); h.v = a !== b && a.describir() === 'dron de vigilancia'; });
          return caso(!r.error && h.v, 'dos drones distintos', r.error || (h.v ? 'correcto' : 'devolvió el mismo objeto'));
        } },
      ],
      exito: 'Una sola prensa decide qué se fabrica, y lo desconocido se rechaza en vez de adivinarse.',
    },
    {
      id: 'factory-2', titulo: 'Cada planta fabrica lo suyo', concepto: 'Factory Method: la subclase decide', escena: ESCENA,
      archivos: ['Planta.java', 'PlantaAerea.java', 'PlantaTerrestre.java', 'Main.java', 'Unidad.java', 'Dron.java', 'Tanque.java'],
      mentor: 'La fábrica creció: ahora hay plantas especializadas y todas comparten el mismo control de calidad. Pero la planta decide con un if sobre un texto qué fabricar. Que cada planta sepa lo suyo y la base conserve lo común.',
      teoria: `<p>El patrón <strong>Factory Method (Método fábrica)</strong> deja que <em>una subclase decida qué objeto crear</em>:</p>
<ul><li>La clase base (<code>Planta</code>) tiene el trabajo común en <code>producir()</code>, que es <code>final</code>, y en el punto donde necesita una unidad llama a un método abstracto: <code>crearUnidad()</code>.</li>
<li>Cada subclase (<code>PlantaAerea</code>, <code>PlantaTerrestre</code>) redefine <code>crearUnidad()</code> y devuelve su producto.</li>
<li><code>producir()</code> trabaja con <code>Unidad</code> y nunca sabe qué clase concreta recibió.</li></ul>
<p>¿Te suena? Es un Template Method cuyo paso variable es <em>crear un objeto</em>. Y lo usas sin saberlo: <code>lista.iterator()</code>, el que hace funcionar el for-each, es un método fábrica: cada colección crea su propio iterador.</p>
<p>Diferencia con el paso 1: la fábrica simple decide con un <code>if</code> dentro de un método; Factory Method decide con <em>herencia</em>, y agregar un producto no obliga a tocar ningún <code>if</code>.</p>`,
      ejemplo: 'public final Unidad producir() {\n    Unidad u = crearUnidad();   // lo decide la subclase\n    // ... control de calidad común\n    return u;\n}\n\nprotected abstract Unidad crearUnidad();',
      tareas: ['Haz <code>Planta</code> abstracta: quita el atributo <code>especialidad</code> y el constructor.', 'Declara el método fábrica <code>protected abstract Unidad crearUnidad();</code> y haz que <code>producir()</code> sea <code>final</code> y lo llame.', 'Crea <code>PlantaAerea</code> (crea un <code>Dron</code>) y <code>PlantaTerrestre</code> (crea un <code>Tanque</code>).', 'En <code>Main</code>, crea las plantas con sus clases nuevas.'],
      nota: 'Cada planta lleva su propio contador: por eso la planta aérea va por el #2 cuando la terrestre va por el #1.',
      pista: 'En <code>Planta.java</code> no debe quedar ningún <code>new Dron</code> ni <code>new Tanque</code>.',
      objetivoUML: [['PlantaAerea', 'Planta', 'herencia'], ['PlantaTerrestre', 'Planta', 'herencia'], ['Dron', 'Unidad', 'realizacion'], ['Tanque', 'Unidad', 'realizacion']],
      inicial: () => ({ 'Planta.java': PLANTA_OLOR, 'PlantaAerea.java': AEREA_INI, 'PlantaTerrestre.java': TERRESTRE_INI, 'Main.java': MAIN_2_OLOR, 'Unidad.java': UNIDAD, 'Dron.java': DRON, 'Tanque.java': TANQUE }),
      archivoInicial: 'Planta.java',
      solucion: { 'Planta.java': PLANTA, 'PlantaAerea.java': AEREA, 'PlantaTerrestre.java': TERRESTRE, 'Main.java': MAIN_2, 'Unidad.java': UNIDAD, 'Dron.java': DRON, 'Tanque.java': TANQUE },
      previo: m => previoMain(m),
      animacion: corrMain,
      pruebas: [
        { nombre: 'Planta es abstracta con su método fábrica', prueba: ({ modelo }) => {
          const p = modelo.clases.Planta, f = p?.metodos.find(x => x.nombre === 'crearUnidad' && x.params.length === 0);
          const ok = p?.abstracta && f?.abstracto && f.ret === 'Unidad';
          return caso(ok, 'abstract class Planta con protected abstract Unidad crearUnidad()', !p ? 'falta Planta' : !p.abstracta ? 'Planta no es abstract' : !f ? 'falta crearUnidad()' : !f.abstracto ? 'crearUnidad() debe ser abstract en Planta' : f.ret !== 'Unidad' ? `crearUnidad() devuelve ${f.ret}: debe devolver Unidad` : 'correcto');
        } },
        { nombre: 'producir() es final y no se redefine', prueba: ({ modelo }) => {
          const p = modelo.clases.Planta?.metodos.find(x => x.nombre === 'producir');
          const hijas = ['PlantaAerea', 'PlantaTerrestre'].filter(n => modelo.clases[n]?.metodos.some(x => x.nombre === 'producir'));
          return caso(p?.final && !hijas.length, 'final en Planta, sin copia en las hijas', !p ? 'falta producir()' : !p.final ? 'producir() no es final' : hijas.length ? `${hijas.join(', ')} redefine producir()` : 'correcto');
        } },
        casoRelacion('PlantaAerea', 'Planta', 'herencia'),
        casoRelacion('PlantaTerrestre', 'Planta', 'herencia'),
        { nombre: 'La base no conoce las unidades concretas', prueba: ({ archivos }) => {
          const ok = sinTexto(archivos, 'Planta.java', /\b(Dron|Tanque)\b|especialidad/);
          return caso(ok, 'Planta solo habla de Unidad', ok ? 'correcto' : 'Planta todavía menciona Dron, Tanque o la especialidad');
        } },
        { nombre: 'Las plantas producen y llevan su propio conteo', prueba: ({ run }) => igualSalida(run, SALIDA_2) },
        { nombre: 'Una planta que no conoces pasa el mismo control', oculto: true, entrada: 'PlantaSubmarina extends Planta, crea un Submarino', prueba: ({ archivos }) => {
          const r = conExtra(archivos, { 'Submarino.java': SUBMARINO, 'PlantaSubmarina.java': PLANTA_SUBMARINA }, C => { const p = new C.PlantaSubmarina(); p.producir(); p.producir(); });
          const esperado = 'control de calidad #1: submarino de rescate\ncontrol de calidad #2: submarino de rescate';
          return r.error ? caso(false, esperado.replace(/\n/g, ' / '), r.error) : caso(r.salida.join('\n') === esperado, esperado.replace(/\n/g, ' / '), r.salida.join(' / '));
        } },
      ],
      exito: 'Cada planta decide qué fabrica y la base garantiza el control de calidad para todas.',
    },
    {
      id: 'factory-3', titulo: 'Mini-jefe: la central de producción', corto: 'Mini-jefe', jefe: true, concepto: 'Factory Method + polimorfismo', escena: ESCENA,
      archivos: ['Explorador.java', 'PlantaExploradores.java', 'Central.java', 'Main.java', 'Planta.java', 'PlantaAerea.java', 'Unidad.java', 'Dron.java'],
      mentor: 'La central coordina todas las plantas y paga cada lote. Llegó un pedido de exploradores y no existe ni la unidad ni la planta. Planta, Unidad y las plantas viejas están selladas: si el patrón quedó bien, todo entra sin tocarlas.',
      teoria: `<p>La prueba de un buen Factory Method: <strong>un producto nuevo entra con dos clases nuevas</strong> (la unidad y su planta) y nada de lo existente cambia.</p>
<p>La <code>Central</code> recorre una <code>ArrayList&lt;Planta&gt;</code> y le pide a cada una <code>producir()</code>. Es el polimorfismo del Mundo 6 aplicado a la creación: la central no hace <code>new</code> de ninguna unidad ni pregunta de qué clase es cada planta.</p>
<p><strong>¿Fábrica simple o Factory Method?</strong> Si los tipos llegan como texto desde afuera (un formulario, un archivo), la fábrica simple es lo práctico. Si cada variante trae su propia lógica y quieres agregar variantes sin tocar lo existente, Factory Method.</p>`,
      ejemplo: 'int total = 0;\nfor (Planta p : plantas) {\n    total = total + p.producir().costo();\n}',
      tareas: ['Crea la unidad <code>Explorador</code> (<code>"explorador todoterreno"</code>, costo 200).', 'Crea <code>PlantaExploradores extends Planta</code>, que crea exploradores.', 'En <code>Central</code>, escribe <code>public int producirLote()</code>: cada planta produce una unidad, en orden, y devuelve la suma de los costos.', 'No modifiques <code>Planta</code>, <code>Unidad</code>, <code>Dron</code> ni <code>PlantaAerea</code>. Un caso oculto traerá una planta que no conoces.'],
      nota: GUIA,
      pista: '<code>p.producir()</code> devuelve la <code>Unidad</code> fabricada: le puedes pedir su <code>costo()</code> en la misma línea.',
      objetivoUML: [['Explorador', 'Unidad', 'realizacion'], ['PlantaExploradores', 'Planta', 'herencia'], ['PlantaAerea', 'Planta', 'herencia'], ['Central', 'Planta', 'agregacion']],
      inicial: () => ({ 'Explorador.java': EXPLORADOR_INI, 'PlantaExploradores.java': PLANTA_EXP_INI, 'Central.java': CENTRAL_INI, 'Main.java': MAIN_3, 'Planta.java': PLANTA, 'PlantaAerea.java': AEREA, 'Unidad.java': UNIDAD, 'Dron.java': DRON }),
      archivoInicial: 'Explorador.java',
      solucion: { 'Explorador.java': EXPLORADOR, 'PlantaExploradores.java': PLANTA_EXP, 'Central.java': CENTRAL, 'Main.java': MAIN_3, 'Planta.java': PLANTA, 'PlantaAerea.java': AEREA, 'Unidad.java': UNIDAD, 'Dron.java': DRON },
      previo: m => exigir(m, [{ clase: 'Explorador', implementa: ['Unidad'] }, { clase: 'PlantaExploradores', metodos: [['crearUnidad', 0]] }, { clase: 'Central', metodos: [['producirLote', 0]] }]) || previoMain(m),
      animacion: corrMain,
      pruebas: [
        casoRelacion('Explorador', 'Unidad', 'realizacion'),
        casoRelacion('PlantaExploradores', 'Planta', 'herencia'),
        { nombre: 'Lo sellado sigue igual', prueba: ({ archivos }) => {
          const tocados = sellados(archivos, { 'Planta.java': PLANTA, 'PlantaAerea.java': AEREA, 'Unidad.java': UNIDAD, 'Dron.java': DRON });
          return caso(!tocados.length, 'iguales a la versión sellada', tocados.length ? `se modificó ${tocados.join(', ')}` : 'sin cambios');
        } },
        { nombre: 'La central no fabrica ni pregunta tipos', prueba: ({ archivos }) => {
          const ok = sinTexto(archivos, 'Central.java', /\bnew\s+(Dron|Explorador|Tanque)\s*\(|\binstanceof\b|getClass\s*\(/);
          return caso(ok, 'solo llama producir()', ok ? 'correcto' : 'Central hace new de unidades o pregunta de qué clase es cada planta');
        } },
        { nombre: 'Dos lotes de la central', prueba: ({ run }) => igualSalida(run, SALIDA_3) },
        { nombre: 'Una central sin plantas', oculto: true, entrada: 'new Central().producirLote()', prueba: ({ archivos }) => {
          const h = {};
          const r = conExtra(archivos, {}, C => { h.v = new C.Central().producirLote(); });
          return caso(!r.error && h.v === 0, '0', r.error || String(h.v));
        } },
        { nombre: 'Una planta que no conoces entra a la central', oculto: true, entrada: 'PlantaSubmarina + Submarino ($450) junto a la planta de exploradores', prueba: ({ archivos }) => {
          const h = {};
          const r = conExtra(archivos, { 'Submarino.java': SUBMARINO, 'PlantaSubmarina.java': PLANTA_SUBMARINA }, C => { const c = new C.Central(); c.agregar(new C.PlantaExploradores()); c.agregar(new C.PlantaSubmarina()); h.v = c.producirLote(); });
          const esperado = 'control de calidad #1: explorador todoterreno / control de calidad #1: submarino de rescate · 650';
          const obtenido = r.error || `${r.salida.join(' / ')} · ${h.v}`;
          return caso(obtenido === esperado, esperado, obtenido);
        } },
      ],
      exito: 'Una unidad y una planta nuevas entraron a la central sin tocar nada sellado. ¡Troquel de fábrica obtenido!',
    },
  ],
};
