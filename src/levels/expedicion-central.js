/* Expedición · «La central de servicios» (ramal oculto del Mundo 4).
   Las Expediciones son niveles de diseño libre: el encargo describe el problema y el estudiante
   decide qué clases e interfaces existen y cómo se llaman. Como el juez no conoce esos nombres,
   el estudiante los declara en Roles.java (el «mapa de roles») y el juez llama C[roles.X].
   El juez revisa cuatro capas: comportamiento, invariantes (filas al azar con semilla fija),
   reglas de diseño (leídas del modelo) y una extensión oculta: una clase intrusa que el juez
   escribe contra el contrato que el estudiante eligió, leyendo sus métodos abstractos del modelo.
   Piloto: solo se ve en modo profesor (oculta: true). */
import { caso, corrMain, previoMain } from './util.js';
import { parsePrograma, ejecutar } from '../engine/motor.js';

/* ---------- Mapa de roles ---------- */
export const ROLES = [
  ['CENTRAL', 'la central de servicios'],
  ['APARATO', 'el tipo de lo que llega en la fila: todo lo que se recarga'],
  ['LAVABLE', 'el tipo de lo que se puede lavar'],
  ['ACTUALIZABLE', 'el tipo de lo que recibe firmware'],
  ['ROBOT', 'tu clase de robot'],
  ['DRON', 'tu clase de dron'],
  ['LINTERNA', 'tu clase de linterna'],
];
const sinComentarios = s => (s || '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
/* Lee de Roles.java el nombre que el estudiante le dio a cada rol: static String CENTRAL = "MiCentral"; */
export function leerRoles(archivos) {
  const t = sinComentarios(archivos['Roles.java']);
  const r = {};
  for (const [rol] of ROLES) {
    const m = new RegExp(`\\b${rol}\\s*=\\s*"([^"]*)"`).exec(t);
    r[rol] = m ? m[1].trim() : '';
  }
  return r;
}

/* ¿El tipo a es (o desciende de) b? Recorre extends e implements, también entre interfaces */
const base = t => (t || '').replace(/<.*>/, '').trim();
export function esSubtipo(modelo, a, b, visto = new Set()) {
  if (!a || !b) return false;
  if (a === b) return true;
  if (visto.has(a)) return false;
  visto.add(a);
  const c = modelo.clases[a];
  if (!c) return false;
  const padres = [c.__padre || (c.tipo === 'clase' ? base(c.hereda) : null), ...(c.implementa || []).map(base)].filter(Boolean);
  return padres.some(p => esSubtipo(modelo, p, b, visto));
}
const esContrato = c => !!c && (c.tipo === 'interface' || c.abstracta);

/* Comprobaciones previas: sin un mapa de roles completo y una ventanilla, el juez no puede entrar */
function previoRoles(m, archivos) {
  const roles = leerRoles(archivos);
  for (const [rol, que] of ROLES) {
    if (!roles[rol]) return `En Roles.java falta el rol ${rol} (${que}). Escribe entre comillas el nombre de tu clase o interfaz.`;
    if (!m.clases[roles[rol]]) return `Roles.java dice que ${rol} es «${roles[rol]}», pero no encuentro ninguna clase o interfaz con ese nombre.`;
  }
  for (const rol of ['ROBOT', 'DRON', 'LINTERNA', 'CENTRAL']) {
    const c = m.clases[roles[rol]];
    if (c.tipo === 'interface' || c.abstracta) return `${roles[rol]} cumple el rol ${rol}: debe ser una clase concreta, porque el juez crea objetos de ella.`;
  }
  for (const rol of ['ROBOT', 'DRON', 'LINTERNA']) {
    const c = m.clases[roles[rol]];
    if (!c.ctors.some(k => k.params.length === 1 && base(k.params[0].tipo) === 'String')) return `El juez construye cada aparato con su nombre: ${roles[rol]} necesita un constructor que reciba un String.`;
  }
  const central = m.clases[roles.CENTRAL];
  if (central.ctors.length && !central.ctors.some(k => k.params.length === 0)) return `El juez crea la central con new ${roles.CENTRAL}(): necesita un constructor sin parámetros (o ninguno).`;
  const todos = central.__metodos || central.metodos;
  if (!todos.some(x => x.nombre === 'atender' && x.params.length === 1)) return `La ventanilla de la central es fija: ${roles.CENTRAL} necesita public void atender(ArrayList<…> fila).`;
  if (!todos.some(x => x.nombre === 'balance' && x.params.length === 0 && x.ret === 'int')) return `La ventanilla de la central es fija: ${roles.CENTRAL} necesita public int balance().`;
  return null;
}

/* ---------- Capa 4: la clase intrusa ----------
   Implementa (o extiende) el tipo APARATO del estudiante. Sus métodos abstractos se leen del modelo
   y se rellenan: los que devuelven String devuelven el nombre del aparato; el resto, un valor neutro. */
const NEUTRO = { void: null, String: 'nombreIntruso', int: '0', long: '0', short: '0', byte: '0', double: '0.0', float: '0.0f', boolean: 'false', char: "'x'" };
function abstractosDe(modelo, tipos) {
  const vistos = new Set(), concretos = new Set(), pendientes = [];
  const firma = x => `${x.nombre}/${x.params.length}`;
  const visitar = n => {
    const c = modelo.clases[n];
    if (!c || vistos.has(n)) return;
    vistos.add(n);
    for (const x of c.metodos) {
      if (x.estatico) continue;
      if (x.abstracto) { if (!pendientes.some(p => firma(p) === firma(x))) pendientes.push(x); } else concretos.add(firma(x));
    }
    if (c.__padre) visitar(c.__padre);
    for (const i of c.implementa || []) visitar(base(i));
  };
  for (const t of [].concat(tipos)) visitar(t);
  return pendientes.filter(x => !concretos.has(firma(x)));
}
/* tipos: el contrato APARATO y, si se quiere una intrusa con capacidades, también LAVABLE, etc.
   Si un tipo ya desciende de otro de la lista, basta el más específico. Como Java no tiene herencia
   múltiple de clases, si quedan dos clases (no interfaces) no se puede escribir la intrusa: null. */
export function claseIntrusa(modelo, tipos, nombreClase = 'PanelSolar') {
  let lista = [...new Set([].concat(tipos))];
  if (lista.some(t => !modelo.clases[t])) return null;
  lista = lista.filter(t => !lista.some(o => o !== t && esSubtipo(modelo, o, t)));
  const clases = lista.filter(t => modelo.clases[t].tipo !== 'interface'), interfaces = lista.filter(t => modelo.clases[t].tipo === 'interface');
  if (clases.length > 1) return null;
  const cab = [clases.length ? `extends ${clases[0]}` : '', interfaces.length ? `implements ${interfaces.join(', ')}` : ''].filter(Boolean).join(' ');
  let llamadaSuper = '';
  const padre = clases.length ? modelo.clases[clases[0]] : null;
  if (padre && padre.ctors.length && !padre.ctors.some(k => k.params.length === 0)) {
    const k = padre.ctors[0];
    const args = k.params.map(p => (base(p.tipo) === 'String' ? 'nombre' : NEUTRO[base(p.tipo)] ?? 'null'));
    llamadaSuper = `        super(${args.join(', ')});\n`;
  }
  const metodos = abstractosDe(modelo, lista).map(x => {
    const r = base(x.ret), v = r in NEUTRO ? NEUTRO[r] : 'null';
    return `    public ${x.ret} ${x.nombre}(${x.params.map(p => `${p.tipo} ${p.nombre}`).join(', ')}) {${r === 'void' ? '' : ` return ${v}; `}}`;
  });
  return `class ${nombreClase} ${cab} {
    private String nombreIntruso;

    public ${nombreClase}(String nombre) {
${llamadaSuper}        this.nombreIntruso = nombre;
    }
${metodos.join('\n')}
}
`;
}

/* ---------- Utilidades del juez ---------- */
const COSTO = { recarga: 5, lavado: 3, firmware: 8 };
const TIPOS = {
  ROBOT: { lava: true, actualiza: true },
  DRON: { lava: false, actualiza: true },
  LINTERNA: { lava: false, actualiza: false },
};
const costoDe = k => COSTO.recarga + (TIPOS[k].lava ? COSTO.lavado : 0) + (TIPOS[k].actualiza ? COSTO.firmware : 0);
const faltasDe = (k, nombre) => [...(TIPOS[k].lava ? [] : [`${nombre}: sin lavado`]), ...(TIPOS[k].actualiza ? [] : [`${nombre}: sin actualización`])];
const NOMBRES = { ROBOT: ['Tornillo', 'Tuerca', 'Biela'], DRON: ['Zumbi', 'Avispa', 'Halcón'], LINTERNA: ['Faro', 'Chispita', 'Lumen'] };

/* Atiende una fila de aparatos [[rol, nombre], …] y devuelve el balance */
const atenderFila = (roles, fila) => C => {
  const l = new C.__lista();
  for (const [rol, nombre] of fila) l.add(new C[roles[rol]](nombre));
  const central = new C[roles.CENTRAL]();
  central.atender(l);
  return central.balance();
};
function correr(run, arnes) {
  const h = {};
  const r = run((C, rt) => { h.v = arnes(C, rt); });
  return { v: h.v, salida: r.rt.salida.map(String) };
}
function conExtra(archivos, extra, arnes) {
  const m = parsePrograma({ ...archivos, ...extra });
  if (m.errores.length) return { error: `${m.errores[0].archivo}:${m.errores[0].linea} ${m.errores[0].msg}` };
  const h = {};
  const r = ejecutar(m, (C, rt) => { h.v = arnes(C, rt); });
  return { error: r.error, v: h.v, salida: r.rt.salida.map(String) };
}
/* Generador pseudoaleatorio con semilla: el caso que falla siempre se puede repetir */
function azar(semilla) {
  let a = semilla >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function filasAlAzar(semilla, cuantas) {
  const r = azar(semilla), tipos = Object.keys(TIPOS), filas = [];
  for (let k = 0; k < cuantas; k++) {
    const n = Math.floor(r() * 7), fila = [];
    for (let j = 0; j < n; j++) { const t = tipos[Math.floor(r() * tipos.length)]; fila.push([t, NOMBRES[t][Math.floor(r() * 3)]]); }
    filas.push(fila);
  }
  return filas;
}
const describir = fila => (fila.length ? fila.map(([, n]) => n).join(', ') : 'fila vacía');
const lineas = xs => xs.join(' / ') || '(nada)';

/* Atributos de las clases del estudiante que no son private (las constantes static final se permiten) */
function camposAbiertos(modelo) {
  const r = [];
  for (const c of Object.values(modelo.clases)) {
    if (c.tipo === 'interface' || c.nombre === 'Roles' || c.nombre === 'Main') continue;
    for (const f of c.campos) if (f.vis !== 'private' && !(f.estatico && f.final)) r.push(`${c.nombre}.${f.nombre}`);
  }
  return r;
}
/* ¿La central menciona por su nombre alguna clase concreta de aparato? */
function centralNombra(modelo, roles) {
  const c = modelo.clases[roles.CENTRAL];
  const cuerpo = sinComentarios(c?.cuerpoClean || '');
  return ['ROBOT', 'DRON', 'LINTERNA'].map(k => roles[k]).filter(n => n && new RegExp(`\\b${n}\\b`).test(cuerpo));
}

/* ---------- Archivos ---------- */
const ROLES_INI = `// Roles.java · el mapa de roles
// El juez no conoce los nombres que elijas. Escribe entre comillas el nombre
// de TU clase o interfaz que cumple cada papel del encargo.
public class Roles {
    static String CENTRAL = "";       // la central de servicios
    static String APARATO = "";       // el tipo de lo que llega en la fila (todo se recarga)
    static String LAVABLE = "";       // el tipo de lo que se puede lavar
    static String ACTUALIZABLE = "";  // el tipo de lo que recibe firmware
    static String ROBOT = "";         // tu clase de robot
    static String DRON = "";          // tu clase de dron
    static String LINTERNA = "";      // tu clase de linterna
}
`;
const CONTRATOS_INI = `// Contratos.java
// Tus interfaces o clases abstractas. Escríbelas sin public:
// así varias pueden vivir en este mismo archivo.
`;
const APARATOS_INI = `// Aparatos.java
// Tus clases de aparatos (sin public). Cada una se construye con su nombre:
// new TuClase("Tornillo")
`;
const CENTRAL_INI = `// Central.java
// Tu central de servicios (sin public). Su ventanilla es fija:
//   public void atender(ArrayList<...> fila)
//   public int balance()
import java.util.ArrayList;
`;
const MAIN_INI = `import java.util.ArrayList;

public class Main {
    public static void main(String[] args) {
        // Prueba aquí tu central con una fila de aparatos

    }
}
`;

/* Solución de referencia (una de muchas posibles) */
const ROLES_SOL = `public class Roles {
    static String CENTRAL = "CentralServicios";
    static String APARATO = "Recargable";
    static String LAVABLE = "Lavable";
    static String ACTUALIZABLE = "Actualizable";
    static String ROBOT = "Robot";
    static String DRON = "Dron";
    static String LINTERNA = "Linterna";
}
`;
const CONTRATOS_SOL = `interface Recargable {
    String getNombre();
    void recargar();
}

interface Lavable {
    void lavar();
}

interface Actualizable {
    void actualizar(String version);
}
`;
const APARATOS_PLANO = `class Robot implements Recargable, Lavable, Actualizable {
    private String nombre;

    public Robot(String nombre) {
        this.nombre = nombre;
    }

    public String getNombre() {
        return nombre;
    }

    public void recargar() { }

    public void lavar() { }

    public void actualizar(String version) { }
}

class Dron implements Recargable, Actualizable {
    private String nombre;

    public Dron(String nombre) {
        this.nombre = nombre;
    }

    public String getNombre() {
        return nombre;
    }

    public void recargar() { }

    public void actualizar(String version) { }
}

class Linterna implements Recargable {
    private String nombre;

    public Linterna(String nombre) {
        this.nombre = nombre;
    }

    public String getNombre() {
        return nombre;
    }

    public void recargar() { }
}
`;
const CENTRAL_PLANO = `import java.util.ArrayList;

class CentralServicios {
    private int creditos;

    public void atender(ArrayList<Recargable> fila) { }

    public int balance() {
        return creditos;
    }
}
`;
const APARATOS_SOL = APARATOS_PLANO
  .replace(/(class Robot[\s\S]*?)private String nombre;/, '$1private String nombre;\n    private int energia;\n    private boolean limpio;\n    private String firmware = "1.0";')
  .replace(/(class Robot[\s\S]*?)public void recargar\(\) \{ \}/, '$1public void recargar() {\n        energia = 100;\n    }')
  .replace(/public void lavar\(\) \{ \}/, 'public void lavar() {\n        limpio = true;\n    }')
  .replace(/(class Robot[\s\S]*?)public void actualizar\(String version\) \{ \}/, '$1public void actualizar(String version) {\n        firmware = version;\n    }');
const CENTRAL_SOL = `import java.util.ArrayList;

class CentralServicios {
    private int creditos;

    public void atender(ArrayList<Recargable> fila) {
        for (Recargable a : fila) {
            a.recargar();
            creditos += 5;
            if (a instanceof Lavable) {
                ((Lavable) a).lavar();
                creditos += 3;
            } else {
                System.out.println(a.getNombre() + ": sin lavado");
            }
            if (a instanceof Actualizable) {
                ((Actualizable) a).actualizar("2.0");
                creditos += 8;
            } else {
                System.out.println(a.getNombre() + ": sin actualización");
            }
        }
    }

    public int balance() {
        return creditos;
    }
}
`;
const MAIN_SOL = `import java.util.ArrayList;

public class Main {
    public static void main(String[] args) {
        ArrayList<Recargable> fila = new ArrayList<>();
        fila.add(new Robot("Tornillo"));
        fila.add(new Dron("Zumbi"));
        fila.add(new Linterna("Faro"));
        CentralServicios central = new CentralServicios();
        central.atender(fila);
        System.out.println("Balance del día: " + central.balance());
    }
}
`;

const ARCHIVOS = ['Roles.java', 'Contratos.java', 'Aparatos.java', 'Central.java', 'Main.java'];
const ESCENA = 'estacion';
const ENCARGO = `<p class="encargo"><strong>El encargo.</strong> La central de servicios atiende aparatos muy distintos: hoy llegan <strong>robots, drones y linternas</strong>. Todos se recargan. Los robots además se lavan y reciben firmware; los drones reciben firmware pero no se lavan (su electrónica va al aire); las linternas solo se recargan.</p>
<p>Cada servicio cobra créditos: <strong>recargar 5</strong>, <strong>lavar 3</strong>, <strong>actualizar firmware 8</strong>. Por cada servicio que un aparato no admite, la central lo informa en una línea, en este orden:</p>
<pre class="ejemplo">Faro: sin lavado
Faro: sin actualización</pre>`;
const REGLAS_TALLER = `<p><strong>Reglas del taller para este piloto.</strong> No hay pestañas nuevas: escribe tus tipos sin <code>public</code> para que varios convivan en un archivo. Un atributo y un método no pueden llamarse igual (usa <code>getNombre()</code>, no <code>nombre()</code> junto a un atributo <code>nombre</code>).</p>`;

export const EXPEDICION_CENTRAL = {
  id: 'expedicion-central',
  titulo: 'La central de servicios',
  corto: 'Central',
  concepto: 'Diseño libre con interfaces',
  mundo: 4,
  expedicion: true,
  oculta: true,
  requiere: ['futuro'],
  requisito: 'Piloto: solo visible en modo profesor',
  requisitoCorto: 'Solo modo profesor',
  recompensa: 'Sello de arquitecto',
  equipo: null,
  codice: null,
  pasos: [
    {
      id: 'central-plano', titulo: 'El plano rasgado', concepto: 'Diseñar desde el encargo', escena: ESCENA,
      archivos: ARCHIVOS,
      mentor: 'Mientras ordenaba la estación universal encontré esto: un plano rasgado. No dice qué clases tiene ni cómo se llaman. Solo dice qué tiene que pasar. Esta vez el diseño es tuyo.',
      teoria: `<p>Esta es una <strong>Expedición</strong>: no hay código inicial ni nombres impuestos. Tú decides qué interfaces, clases abstractas y clases existen, cómo se llaman y cómo se relacionan.</p>
${ENCARGO}
<p>En este primer paso solo dibujas el <strong>plano</strong>: declara tus tipos y sus métodos (los cuerpos pueden quedar vacíos) y mira la pestaña <strong>UML</strong> para revisar tu diseño. El juez revisa la estructura, no el comportamiento.</p>
<p><strong>El mapa de roles.</strong> El juez no sabe cómo llamaste a tus clases. En <code>Roles.java</code> le dices cuál cumple cada papel: <code>static String CENTRAL = "MiCentral";</code></p>
<p><strong>Lo único fijo es la ventanilla:</strong> cada aparato se construye con su nombre (<code>new TuRobot("Tornillo")</code>) y la central se crea sin argumentos y tiene <code>public void atender(ArrayList&lt;…&gt; fila)</code> y <code>public int balance()</code>.</p>
${REGLAS_TALLER}`,
      ejemplo: 'interface Algo {\n    void hacer();\n}\n\nclass Cosa implements Algo {\n    public void hacer() { }\n}',
      tareas: ['Declara los contratos que necesites en <code>Contratos.java</code> (interfaces o clases abstractas).', 'Declara los tres aparatos en <code>Aparatos.java</code>, cada uno con un constructor que reciba su nombre.', 'Declara la central en <code>Central.java</code> con su ventanilla: <code>atender(…)</code> y <code>balance()</code>.', 'Llena <code>Roles.java</code> con tus nombres.'],
      nota: 'Pregunta de diseño: si mañana llega un aparato nuevo, ¿qué tendría que cambiar en tu central? Lo ideal es: nada.',
      pista: 'Que la linterna no se lave no debería depender de un <code>if</code>: si no admite el lavado, que no firme ese contrato.',
      inicial: () => ({ 'Roles.java': ROLES_INI, 'Contratos.java': CONTRATOS_INI, 'Aparatos.java': APARATOS_INI, 'Central.java': CENTRAL_INI, 'Main.java': MAIN_INI }),
      archivoInicial: 'Contratos.java',
      solucion: { 'Roles.java': ROLES_SOL, 'Contratos.java': CONTRATOS_SOL, 'Aparatos.java': APARATOS_PLANO, 'Central.java': CENTRAL_PLANO, 'Main.java': MAIN_INI },
      previo: (m, archivos) => previoRoles(m, archivos) || previoMain(m),
      animacion: corrMain,
      pruebas: [
        { nombre: 'Los contratos son interfaces o clases abstractas', prueba: ({ modelo, archivos }) => {
          const roles = leerRoles(archivos);
          const malos = ['APARATO', 'LAVABLE', 'ACTUALIZABLE'].filter(k => !esContrato(modelo.clases[roles[k]]));
          return caso(!malos.length, 'APARATO, LAVABLE y ACTUALIZABLE son contratos', malos.length ? malos.map(k => `${k} = ${roles[k]} es una clase concreta`).join('; ') : 'correcto');
        } },
        { nombre: 'Robot, dron y linterna son aparatos', prueba: ({ modelo, archivos }) => {
          const roles = leerRoles(archivos);
          const fuera = ['ROBOT', 'DRON', 'LINTERNA'].filter(k => !esSubtipo(modelo, roles[k], roles.APARATO));
          return caso(!fuera.length, `los tres son ${roles.APARATO}`, fuera.length ? fuera.map(k => `${roles[k]} no es ${roles.APARATO}`).join('; ') : 'correcto');
        } },
        { nombre: 'Cada aparato firma solo lo que puede cumplir', prueba: ({ modelo, archivos }) => {
          const roles = leerRoles(archivos), err = [];
          for (const [k, t] of Object.entries(TIPOS)) {
            const lava = esSubtipo(modelo, roles[k], roles.LAVABLE), act = esSubtipo(modelo, roles[k], roles.ACTUALIZABLE);
            if (lava !== t.lava) err.push(`${roles[k]} ${t.lava ? 'debería' : 'no debería'} ser ${roles.LAVABLE}`);
            if (act !== t.actualiza) err.push(`${roles[k]} ${t.actualiza ? 'debería' : 'no debería'} ser ${roles.ACTUALIZABLE}`);
          }
          return caso(!err.length, 'robot: lava y actualiza · dron: actualiza · linterna: nada más', err.join('; ') || 'correcto');
        } },
        { nombre: 'La central conoce contratos, no aparatos', prueba: ({ modelo, archivos }) => {
          const n = centralNombra(modelo, leerRoles(archivos));
          return caso(!n.length, 'la central no menciona ninguna clase de aparato', n.length ? `la central menciona ${n.join(', ')}` : 'correcto');
        } },
        { nombre: 'Los atributos son private', prueba: ({ modelo }) => {
          const a = camposAbiertos(modelo);
          return caso(!a.length, 'todos los atributos private', a.length ? `abiertos: ${a.join(', ')}` : 'correcto');
        } },
      ],
      exito: 'Plano entregado. Ahora haz que funcione: el juez va a probar tu central con filas de aparatos… y con uno que no conoces.',
    },
    {
      id: 'central-construir', titulo: 'La central abre', corto: 'Jefe', jefe: true, concepto: 'Abierto/cerrado sin andamio', escena: ESCENA,
      archivos: ARCHIVOS,
      mentor: 'Tu plano ya está en la mesa. Hora de abrir la central: el juez traerá filas de aparatos al azar y, en algún momento, una máquina que nadie de aquí ha visto. Si tuviste que prever su nombre, el diseño falló.',
      teoria: `${ENCARGO}
<p>El juez revisa <strong>cuatro capas</strong>:</p>
<ul><li><strong>Comportamiento:</strong> filas conocidas, con el balance y las líneas exactas.</li>
<li><strong>Invariantes:</strong> decenas de filas al azar; el balance siempre debe ser la suma exacta de lo prestado.</li>
<li><strong>Reglas de diseño:</strong> atributos <code>private</code> y una central que no nombra robots, drones ni linternas.</li>
<li><strong>Extensión oculta:</strong> el juez escribe una clase nueva contra <em>tu</em> contrato <code>APARATO</code> y la mete en la fila sin tocar tu código.</li></ul>
${REGLAS_TALLER}`,
      ejemplo: 'for (TuContrato a : fila) {\n    a.recargar();\n    creditos += 5;\n}',
      tareas: ['Completa los métodos de tus aparatos.', 'Haz que <code>atender</code> preste a cada aparato solo los servicios que admite, cobre lo justo e informe lo que no pudo dar.', 'Usa <code>Main</code> para probar tu central antes de enviar.'],
      pista: 'Pregúntale a cada aparato qué contratos firmó, no qué clase es: <code>if (a instanceof TuLavable)</code> sigue funcionando cuando llegue algo nuevo; <code>if (a instanceof TuRobot)</code> no.',
      inicial: prev => ({ ...prev }),
      archivoInicial: 'Central.java',
      solucion: { 'Roles.java': ROLES_SOL, 'Contratos.java': CONTRATOS_SOL, 'Aparatos.java': APARATOS_SOL, 'Central.java': CENTRAL_SOL, 'Main.java': MAIN_SOL },
      previo: (m, archivos) => previoRoles(m, archivos) || previoMain(m),
      animacion: corrMain,
      pruebas: [
        { nombre: 'Un robot recibe los tres servicios', entrada: 'fila: robot «Tornillo»', prueba: ({ run, archivos }) => {
          const roles = leerRoles(archivos), fila = [['ROBOT', 'Tornillo']];
          const { v, salida } = correr(run, atenderFila(roles, fila));
          return caso(v === 16 && !salida.length, 'balance 16, sin faltas', `balance ${v}, ${lineas(salida)}`);
        } },
        { nombre: 'La linterna solo se recarga', entrada: 'fila: linterna «Faro»', prueba: ({ run, archivos }) => {
          const roles = leerRoles(archivos), fila = [['LINTERNA', 'Faro']], esp = faltasDe('LINTERNA', 'Faro');
          const { v, salida } = correr(run, atenderFila(roles, fila));
          return caso(v === 5 && lineas(salida) === lineas(esp), `balance 5, ${lineas(esp)}`, `balance ${v}, ${lineas(salida)}`);
        } },
        { nombre: 'Un día completo', entrada: 'fila: Tornillo (robot), Zumbi (dron), Faro (linterna)', prueba: ({ run, archivos }) => {
          const roles = leerRoles(archivos), fila = [['ROBOT', 'Tornillo'], ['DRON', 'Zumbi'], ['LINTERNA', 'Faro']];
          const esp = fila.flatMap(([k, n]) => faltasDe(k, n));
          const { v, salida } = correr(run, atenderFila(roles, fila));
          return caso(v === 34 && lineas(salida) === lineas(esp), `balance 34, ${lineas(esp)}`, `balance ${v}, ${lineas(salida)}`);
        } },
        { nombre: 'Los atributos son private', prueba: ({ modelo }) => {
          const a = camposAbiertos(modelo);
          return caso(!a.length, 'todos los atributos private', a.length ? `abiertos: ${a.join(', ')}` : 'correcto');
        } },
        { nombre: 'La central no nombra robots, drones ni linternas', prueba: ({ modelo, archivos }) => {
          const n = centralNombra(modelo, leerRoles(archivos));
          return caso(!n.length, 'la central solo conoce contratos', n.length ? `la central menciona ${n.join(', ')}` : 'correcto');
        } },
        { nombre: 'El balance siempre cuadra', oculto: true, entrada: '60 filas al azar (semilla 4412)', prueba: ({ run, archivos }) => {
          const roles = leerRoles(archivos);
          const filas = filasAlAzar(4412, 60);
          const { v } = correr(run, C => filas.map(f => atenderFila(roles, f)(C)));
          const k = filas.findIndex((f, i) => v?.[i] !== f.reduce((s, [t]) => s + costoDe(t), 0));
          if (k < 0) return caso(true, 'balance = suma de servicios en las 60 filas', 'correcto');
          const esp = filas[k].reduce((s, [t]) => s + costoDe(t), 0);
          return caso(false, `fila ${k + 1} (${describir(filas[k])}): balance ${esp}`, `balance ${v?.[k]}`);
        } },
        { nombre: 'La central acumula el día', oculto: true, entrada: 'dos filas seguidas en la misma central', prueba: ({ run, archivos }) => {
          const roles = leerRoles(archivos);
          const { v } = correr(run, C => {
            const central = new C[roles.CENTRAL]();
            for (const fila of [[['ROBOT', 'Biela']], [['DRON', 'Avispa'], ['LINTERNA', 'Lumen']]]) {
              const l = new C.__lista();
              for (const [rol, n] of fila) l.add(new C[roles[rol]](n));
              central.atender(l);
            }
            return central.balance();
          });
          return caso(v === 34, 'balance 34 tras las dos filas', `balance ${v}`);
        } },
        { nombre: 'Llega un aparato que nadie conocía', oculto: true, entrada: 'fila: robot «Tornillo» y un aparato nuevo escrito por el juez contra tu APARATO', prueba: ({ modelo, archivos }) => {
          const roles = leerRoles(archivos);
          const fuente = claseIntrusa(modelo, roles.APARATO);
          if (!fuente) return caso(false, 'un aparato nuevo entra a la fila', `no encuentro el tipo ${roles.APARATO}`);
          const r = conExtra(archivos, { 'PanelSolar.java': fuente }, C => {
            const l = new C.__lista();
            l.add(new C[roles.ROBOT]('Tornillo'));
            l.add(new C.PanelSolar('Sol'));
            const central = new C[roles.CENTRAL]();
            central.atender(l);
            return central.balance();
          });
          if (r.error) return caso(false, 'balance 21 y dos faltas del aparato nuevo', r.error);
          const ok = r.v === 21 && r.salida.length === 2 && /: sin lavado$/.test(r.salida[0]) && /: sin actualización$/.test(r.salida[1]);
          return caso(ok, 'balance 21 y dos faltas del aparato nuevo', `balance ${r.v}, ${lineas(r.salida)}`);
        } },
        { nombre: 'Llega un aparato nuevo que también se lava', oculto: true, entrada: 'fila: un aparato nuevo, escrito por el juez, que firma tu APARATO y tu LAVABLE', prueba: ({ modelo, archivos }) => {
          // Una intrusa con capacidades: delata a la central que decide por la clase concreta o por un código de tipo
          const roles = leerRoles(archivos);
          const fuente = claseIntrusa(modelo, [roles.APARATO, roles.LAVABLE], 'Aspiradora');
          if (!fuente) return caso(false, 'un aparato nuevo y lavable entra a la fila', `no puedo escribir una clase que sea ${roles.APARATO} y ${roles.LAVABLE} a la vez`);
          const r = conExtra(archivos, { 'Aspiradora.java': fuente }, C => {
            const l = new C.__lista();
            l.add(new C.Aspiradora('Polvo'));
            const central = new C[roles.CENTRAL]();
            central.atender(l);
            return central.balance();
          });
          if (r.error) return caso(false, 'balance 8 y solo «sin actualización»', r.error);
          const ok = r.v === 8 && r.salida.length === 1 && /: sin actualización$/.test(r.salida[0]);
          return caso(ok, 'balance 8 y solo «sin actualización»', `balance ${r.v}, ${lineas(r.salida)}`);
        } },
      ],
      exito: '¡La central abrió! Atendió filas al azar y un aparato que nunca viste, sin cambiar una línea. Ese diseño es tuyo: Sello de arquitecto.',
    },
  ],
};
