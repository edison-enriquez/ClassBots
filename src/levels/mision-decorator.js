/* Misión especial · «Capa sobre capa» (ramal del Mundo 6): el patrón Decorator.
   Los módulos empiezan soldados al chasis por herencia (Laser extends BotBasico), y un bot con dos
   módulos pediría una clase por combinación. El estudiante los convierte en envoltorios:
   un Modulo ES un Bot y TIENE un Bot, así que se apilan sobre cualquier chasis y en cualquier orden.
   Cierra con un mini-jefe donde entran un chasis y un módulo nuevos sin tocar lo que ya existe. */
import { caso, corrMain, exigir, previoMain, casoRelacion } from './util.js';
import { parsePrograma, ejecutar, relaciones } from '../engine/motor.js';

const NORMAL = s => (s || '').replace(/\/\/.*$/gm, '').replace(/\s+/g, ' ').trim();
const salidaDe = rt => rt.salida.join('\n').trim();
const conRet = (run, f) => { const h = {}; const r = run(C => { h.v = f(C); }); return { ...r, v: h.v }; };
/* Ejecuta el programa del estudiante con archivos extra (chasis y módulos que el estudiante no conoce) */
function conExtra(archivos, extra, f) {
  const m = parsePrograma({ ...archivos, ...extra });
  if (m.errores.length) return { error: `${m.errores[0].archivo}:${m.errores[0].linea} ${m.errores[0].msg}` };
  const h = {};
  const r = ejecutar(m, C => { h.v = f(C); });
  return { error: r.error, v: h.v };
}
/* Pilas que quedaron armadas al terminar: cada una va de la capa de afuera al chasis.
   No depende del nombre del atributo: busca el objeto registrado que guarda cada capa. */
function pilas(rt) {
  const dentro = r => {
    for (const k of Object.keys(r.raw)) {
      const v = r.raw[k], id = !k.startsWith('__') && v && typeof v === 'object' ? rt.idDe(v) : null;
      if (id) return rt.registro[id - 1];
    }
    return null;
  };
  const envueltos = new Set(rt.registro.map(dentro).filter(Boolean).map(r => r.id));
  const bajar = r => { const capas = []; for (let x = r; x && capas.length < 20; x = dentro(x)) capas.push(x); return capas; };
  return { deAfuera: rt.registro.filter(r => !envueltos.has(r.id)).map(bajar), desde: id => bajar(rt.registro[id - 1]) };
}
const forma = capas => capas.map(r => r.cls).join(' → ');
const sellados = (archivos, mapa) => Object.entries(mapa).filter(([a, v]) => NORMAL(archivos[a]) !== NORMAL(v)).map(([a]) => a.replace('.java', ''));
const linea = v => `${v.describir()}: poder ${v.poder()}, defensa ${v.defensa()}`;
const GUIA = '<p class="guia-link">Al completar la misión, el patrón queda registrado en el <button type="button" class="enlace" data-guia="patrones">Códice de patrones</button>.</p>';
const ESCENA = 'modulos';

/* ---------- Piezas del taller ---------- */
const BOT = `public interface Bot {
    int poder();

    int defensa();

    String describir();
}
`;
const BOT_BASICO = `public class BotBasico implements Bot {
    private String nombre;

    public BotBasico(String nombre) {
        this.nombre = nombre;
    }

    @Override
    public int poder() {
        return 10;
    }

    @Override
    public int defensa() {
        return 10;
    }

    @Override
    public String describir() {
        return nombre;
    }
}
`;
const MODULO = `public abstract class Modulo implements Bot {
    protected Bot bot;

    public Modulo(Bot bot) {
        this.bot = bot;
    }

    @Override
    public int poder() {
        return bot.poder();
    }

    @Override
    public int defensa() {
        return bot.defensa();
    }

    @Override
    public String describir() {
        return bot.describir();
    }
}
`;
const LASER = `public class Laser extends Modulo {
    public Laser(Bot bot) {
        super(bot);
    }

    @Override
    public int poder() {
        return bot.poder() + 15;
    }

    @Override
    public String describir() {
        return bot.describir() + " + láser";
    }
}
`;
const ESCUDO = `public class Escudo extends Modulo {
    public Escudo(Bot bot) {
        super(bot);
    }

    @Override
    public int defensa() {
        return bot.defensa() * 2;
    }

    @Override
    public String describir() {
        return bot.describir() + " + escudo";
    }
}
`;
const BLINDAJE = `public class Blindaje extends Modulo {
    public Blindaje(Bot bot) {
        super(bot);
    }

    @Override
    public int defensa() {
        return bot.defensa() + 10;
    }

    @Override
    public String describir() {
        return bot.describir() + " + blindaje";
    }
}
`;
const PROPULSOR = `public class Propulsor extends Modulo {
    public Propulsor(Bot bot) {
        super(bot);
    }

    @Override
    public int poder() {
        return bot.poder() * 2;
    }

    @Override
    public String describir() {
        return bot.describir() + " + propulsor";
    }
}
`;

/* ---------- Piezas que solo conoce el juez ---------- */
const BOT_ESPIA = `public class BotEspia implements Bot {
    @Override
    public int poder() {
        return 7;
    }

    @Override
    public int defensa() {
        return 3;
    }

    @Override
    public String describir() {
        return "Espía";
    }
}
`;
const MODULO_LISO = `public class ModuloLiso extends Modulo {
    public ModuloLiso(Bot bot) {
        super(bot);
    }
}
`;
const BOT_ANFIBIO = `public class BotAnfibio implements Bot {
    private String nombre;

    public BotAnfibio(String nombre) {
        this.nombre = nombre;
    }

    @Override
    public int poder() {
        return 8;
    }

    @Override
    public int defensa() {
        return 12;
    }

    @Override
    public String describir() {
        return nombre;
    }
}
`;
const CAMUFLAJE = `public class Camuflaje extends Modulo {
    public Camuflaje(Bot bot) {
        super(bot);
    }

    @Override
    public int defensa() {
        return bot.defensa() + 7;
    }

    @Override
    public String describir() {
        return bot.describir() + " + camuflaje";
    }
}
`;

/* ---------- Paso 1 · Una clase por cada combinación ---------- */
const LASER_OLOR = `// Hoy un bot con láser ES un BotBasico: el láser quedó soldado a ese chasis.
public class Laser extends BotBasico {
    public Laser(String nombre) {
        super(nombre);
    }

    @Override
    public int poder() {
        return super.poder() + 15;
    }

    @Override
    public String describir() {
        return super.describir() + " + láser";
    }
}
`;
const ESCUDO_OLOR = `// Lo mismo con el escudo: otra subclase del chasis.
public class Escudo extends BotBasico {
    public Escudo(String nombre) {
        super(nombre);
    }

    @Override
    public int defensa() {
        return super.defensa() * 2;
    }

    @Override
    public String describir() {
        return super.describir() + " + escudo";
    }
}
`;
const MODULO_INI = `// Modulo.java
// Un módulo es un Bot que lleva otro Bot adentro y le pasa las llamadas.
// 1. Declara public abstract class Modulo implements Bot.
// 2. Guarda el bot envuelto en un atributo: protected Bot bot;
//    y recíbelo en el constructor: public Modulo(Bot bot).
// 3. Escribe poder(), defensa() y describir(): cada uno devuelve
//    lo que responda el bot envuelto.
`;
const MAIN_1_INI = `public class Main {
    public static void main(String[] args) {
        Bot a = new Laser("Tornillo");
        Bot b = new Escudo("Tuerca");
        // Pedido nuevo: «Rayo» necesita láser Y escudo.
        // Con herencia habría que escribir otra clase, LaserEscudo, y una más por cada combinación.
        // Cuando Laser y Escudo sean módulos, arma los bots envolviendo un chasis:
        //   a: new Laser(new BotBasico("Tornillo"))
        //   b: new Escudo(new BotBasico("Tuerca"))
        //   c: un BotBasico "Rayo" con Laser y, por fuera, Escudo. Imprímelo igual que a y b.
        System.out.println(a.describir() + ": poder " + a.poder() + ", defensa " + a.defensa());
        System.out.println(b.describir() + ": poder " + b.poder() + ", defensa " + b.defensa());
    }
}
`;
const MAIN_1 = `public class Main {
    public static void main(String[] args) {
        Bot a = new Laser(new BotBasico("Tornillo"));
        Bot b = new Escudo(new BotBasico("Tuerca"));
        Bot c = new Escudo(new Laser(new BotBasico("Rayo")));
        System.out.println(a.describir() + ": poder " + a.poder() + ", defensa " + a.defensa());
        System.out.println(b.describir() + ": poder " + b.poder() + ", defensa " + b.defensa());
        System.out.println(c.describir() + ": poder " + c.poder() + ", defensa " + c.defensa());
    }
}
`;
const SALIDA_1 = 'Tornillo + láser: poder 25, defensa 10\nTuerca + escudo: poder 10, defensa 20\nRayo + láser + escudo: poder 25, defensa 20';

/* ---------- Paso 2 · El orden importa ---------- */
const BLINDAJE_INI = `// Blindaje.java
// Un módulo nuevo: suma 10 a la defensa del bot que envuelve
// y agrega " + blindaje" a su descripción. El poder no lo toca.
`;
const MAIN_2_INI = `public class Main {
    public static void main(String[] args) {
        // Los mismos dos módulos en distinto orden. Antes de ejecutar, calcula a mano cada defensa.
        // 1. coloso: un BotBasico "Coloso" con Blindaje y, por fuera, Escudo.
        // 2. muro:   un BotBasico "Muro" con Escudo y, por fuera, Blindaje.
        // 3. furia:  un BotBasico "Furia" con dos Laser, uno sobre otro.
        // Imprime de coloso y de muro:  describir() + ": defensa " + defensa()
        // y de furia:                   describir() + ": poder " + poder()
    }
}
`;
const MAIN_2 = `public class Main {
    public static void main(String[] args) {
        Bot coloso = new Escudo(new Blindaje(new BotBasico("Coloso")));
        Bot muro = new Blindaje(new Escudo(new BotBasico("Muro")));
        Bot furia = new Laser(new Laser(new BotBasico("Furia")));
        System.out.println(coloso.describir() + ": defensa " + coloso.defensa());
        System.out.println(muro.describir() + ": defensa " + muro.defensa());
        System.out.println(furia.describir() + ": poder " + furia.poder());
    }
}
`;
const SALIDA_2 = 'Coloso + blindaje + escudo: defensa 40\nMuro + escudo + blindaje: defensa 30\nFuria + láser + láser: poder 40';

/* ---------- Paso 3 · Mini-jefe: la puerta blindada ---------- */
const BOT_PESADO = `// Un chasis nuevo. Está sellado: no lo modifiques.
public class BotPesado implements Bot {
    private String nombre;

    public BotPesado(String nombre) {
        this.nombre = nombre;
    }

    @Override
    public int poder() {
        return 5;
    }

    @Override
    public int defensa() {
        return 20;
    }

    @Override
    public String describir() {
        return nombre;
    }
}
`;
const PUERTA = `// Puerta está sellada: no la modifiques. Le sirve cualquier Bot.
public class Puerta {
    public boolean cruzar(Bot b) {
        boolean pasa = b.poder() >= 40 && b.defensa() >= 30;
        if (pasa) {
            System.out.println(b.describir() + ": PASA");
        } else {
            System.out.println(b.describir() + ": NO PASA (poder " + b.poder() + ", defensa " + b.defensa() + ")");
        }
        return pasa;
    }
}
`;
const PROPULSOR_INI = `// Propulsor.java
// Un módulo nuevo: duplica el poder del bot que envuelve
// y agrega " + propulsor" a su descripción. La defensa no la toca.
`;
const MAIN_3_INI = `public class Main {
    public static void main(String[] args) {
        Puerta puerta = new Puerta();
        // La puerta solo deja pasar bots con poder >= 40 y defensa >= 30.
        // Módulos del taller: Laser (+15 poder), Propulsor (poder x2),
        //                     Blindaje (+10 defensa), Escudo (defensa x2).
        // 1. Arma a «Titán» sobre un BotPesado (poder 5, defensa 20) con 3 módulos como máximo.
        // 2. Arma a «Rayo» sobre un BotBasico (poder 10, defensa 10) con 4 módulos como máximo.
        // 3. Haz que los dos crucen: puerta.cruzar(titan); puerta.cruzar(rayo);
    }
}
`;
const MAIN_3 = `public class Main {
    public static void main(String[] args) {
        Puerta puerta = new Puerta();
        Bot titan = new Propulsor(new Laser(new Blindaje(new BotPesado("Titán"))));
        Bot rayo = new Propulsor(new Laser(new Escudo(new Blindaje(new BotBasico("Rayo")))));
        puerta.cruzar(titan);
        puerta.cruzar(rayo);
    }
}
`;
const SELLADOS_3 = { 'Bot.java': BOT, 'BotBasico.java': BOT_BASICO, 'BotPesado.java': BOT_PESADO, 'Modulo.java': MODULO, 'Laser.java': LASER, 'Escudo.java': ESCUDO, 'Blindaje.java': BLINDAJE, 'Puerta.java': PUERTA };
/* Lo que cruzó la puerta en la ejecución de Main: un bot con su pila, su poder y su defensa */
function cruces(rt) {
  const p = pilas(rt);
  return rt.log.filter(e => e.t === 'llamada' && e.metodo === 'cruzar' && e.argIds?.[0]).map(e => {
    const capas = p.desde(e.argIds[0]), bot = capas[0].raw;
    return { chasis: capas.at(-1).cls, modulos: capas.length - 1, poder: bot.poder(), defensa: bot.defensa() };
  });
}
function casoCruce(run, chasis, max) {
  const esperado = `un ${chasis} con ${max} módulos o menos, poder ≥ 40 y defensa ≥ 30`;
  const lista = cruces(run(corrMain).rt).filter(c => c.chasis === chasis);
  if (!lista.length) return caso(false, esperado, `ningún ${chasis} llegó a puerta.cruzar(...)`);
  const pasa = c => c.modulos <= max && c.poder >= 40 && c.defensa >= 30;
  const c = lista.find(pasa) || lista.at(-1);
  return caso(pasa(c), esperado, `${c.modulos} módulo${c.modulos === 1 ? '' : 's'}, poder ${c.poder}, defensa ${c.defensa}`);
}

export const DECORATOR = {
  id: 'mision-decorator',
  titulo: 'Capa sobre capa',
  corto: 'Decorator',
  concepto: 'Patrón Decorator',
  mundo: 6,
  requiere: ['arena-torneo'],
  recompensa: 'Arnés modular · módulos que se apilan sobre cualquier bot',
  equipo: 'arnes',
  codice: 'decorator',
  pasos: [
    {
      id: 'decorator-1', titulo: 'Una clase por cada combinación', concepto: 'Decorator: envolver en vez de heredar', escena: ESCENA,
      archivos: ['Modulo.java', 'Laser.java', 'Escudo.java', 'Main.java', 'Bot.java', 'BotBasico.java'],
      mentor: 'Me pidieron un bot con láser y escudo. Hoy cada módulo es una subclase del chasis, así que tocaría escribir LaserEscudo… y mañana LaserPropulsor, EscudoPropulsor y los que falten. Mejor hagamos módulos que se pongan sobre cualquier bot, uno encima de otro.',
      teoria: `<p>Hoy cada módulo es una subclase del chasis: <code>Laser extends BotBasico</code>. Un bot con láser <em>y</em> escudo necesitaría otra clase, <code>LaserEscudo</code>. Con 3 módulos ya son 2³ = 8 clases, una por combinación; con 4 son 16, y todo se repite por cada chasis nuevo. Es la <strong>explosión de subclases</strong>.</p>
<p>El patrón <strong>Decorator (Decorador)</strong> le da la vuelta: un módulo deja de <em>ser</em> un chasis y pasa a <em>envolver</em> a un bot cualquiera.</p>
<ul><li>El <strong>componente</strong> (<code>Bot</code>) es el contrato que todos cumplen.</li>
<li>El <strong>componente concreto</strong> (<code>BotBasico</code>) es el chasis: el que responde de verdad.</li>
<li>El <strong>decorador base</strong> (<code>Modulo</code>) <em>es</em> un <code>Bot</code> y a la vez <em>tiene</em> un <code>Bot</code>: le pasa cada llamada al que lleva adentro.</li>
<li>Los <strong>decoradores concretos</strong> (<code>Laser</code>, <code>Escudo</code>) redefinen solo lo que cambian: toman la respuesta del bot envuelto y le agregan lo suyo.</li></ul>
<p>Como un módulo también es un <code>Bot</code>, otro módulo lo puede envolver: <code>new Escudo(new Laser(new BotBasico("Rayo")))</code>. Aquí se juntan las interfaces (Mundo 4), las clases abstractas (Mundo 5) y el polimorfismo (Mundo 6).</p>`,
      ejemplo: '// En Modulo: pasar la llamada\npublic int poder() {\n    return bot.poder();\n}\n\n// En Laser: lo del bot envuelto, más lo mío\npublic int poder() {\n    return bot.poder() + 15;\n}',
      tareas: ['Crea <code>Modulo</code>: una clase abstracta que <code>implements Bot</code>, guarda un <code>protected Bot bot</code> que recibe en el constructor y, en <code>poder()</code>, <code>defensa()</code> y <code>describir()</code>, devuelve lo que responda ese bot.', 'Convierte <code>Laser</code> y <code>Escudo</code> en módulos: <code>extends Modulo</code> y constructor <code>(Bot bot)</code> con <code>super(bot)</code>. El láser suma 15 al poder, el escudo duplica la defensa y cada uno agrega su nombre a <code>describir()</code>.', 'En <code>Main</code>, arma los tres bots envolviendo un <code>BotBasico</code>. Rayo lleva láser y, por fuera, escudo. Imprime los tres.'],
      nota: 'Tornillo y Tuerca deben imprimir lo mismo que antes; la línea nueva es <code>Rayo + láser + escudo: poder 25, defensa 20</code>. En la escena, cada módulo es una capa alrededor del robot, y la llamada baja capa por capa hasta el chasis.',
      pista: 'El atributo de <code>Modulo</code> es de tipo <code>Bot</code> (la interfaz), no <code>BotBasico</code>: por eso un módulo puede envolver a otro módulo. En <code>Escudo</code>: <code>return bot.defensa() * 2;</code>',
      objetivoUML: [['Modulo', 'Bot', 'realizacion'], ['Modulo', 'Bot', 'asociacion'], ['Laser', 'Modulo', 'herencia'], ['Escudo', 'Modulo', 'herencia'], ['BotBasico', 'Bot', 'realizacion']],
      inicial: () => ({ 'Modulo.java': MODULO_INI, 'Laser.java': LASER_OLOR, 'Escudo.java': ESCUDO_OLOR, 'Main.java': MAIN_1_INI, 'Bot.java': BOT, 'BotBasico.java': BOT_BASICO }),
      archivoInicial: 'Modulo.java',
      solucion: { 'Modulo.java': MODULO, 'Laser.java': LASER, 'Escudo.java': ESCUDO, 'Main.java': MAIN_1, 'Bot.java': BOT, 'BotBasico.java': BOT_BASICO },
      previo: m => exigir(m, [{ clase: 'Bot', interfaz: true, metodos: [['poder', 0], ['defensa', 0], ['describir', 0]] }, { clase: 'BotBasico', implementa: ['Bot'], ctor: 1 }, { clase: 'Modulo', ctor: 1 }, { clase: 'Laser', ctor: 1 }, { clase: 'Escudo', ctor: 1 }]) || previoMain(m),
      animacion: corrMain,
      pruebas: [
        casoRelacion('Modulo', 'Bot', 'realizacion', { nombre: 'Un módulo ES un Bot (realización)' }),
        { nombre: 'Un módulo TIENE un Bot (asociación)', prueba: ({ modelo }) => {
          const c = modelo.clases.Modulo, f = c?.campos.find(x => modelo.clases[x.tipo]);
          const ok = f?.tipo === 'Bot' && relaciones(modelo).some(r => r.de === 'Modulo' && r.a === 'Bot' && r.tipo === 'asociacion');
          return caso(ok && c.abstracta, 'clase abstract con un atributo de tipo Bot que recibe en el constructor', !f ? 'Modulo no guarda ningún bot' : f.tipo !== 'Bot' ? `el atributo es ${f.tipo}: así solo envuelve ese chasis` : !ok ? 'el constructor no guarda el bot que recibe' : c.abstracta ? 'correcto' : 'Modulo no es abstract');
        } },
        { nombre: 'Laser y Escudo son módulos, no chasis', prueba: ({ modelo }) => {
          const padres = ['Laser', 'Escudo'].map(n => `${n} extends ${modelo.clases[n]?.__padre || 'nada'}`);
          const hijas = Object.values(modelo.clases).filter(c => c.__padre === 'BotBasico').map(c => c.nombre);
          const ok = ['Laser', 'Escudo'].every(n => modelo.clases[n]?.__padre === 'Modulo') && !hijas.length;
          return caso(ok, 'Laser extends Modulo, Escudo extends Modulo y nadie hereda de BotBasico', hijas.length ? `${hijas.join(' y ')} todavía ${hijas.length > 1 ? 'heredan' : 'hereda'} de BotBasico` : padres.join(', '));
        } },
        { nombre: 'Modulo pasa las tres llamadas al bot envuelto', entrada: 'un módulo sin efectos sobre un BotEspia (poder 7, defensa 3)', prueba: ({ archivos }) => {
          const r = conExtra(archivos, { 'BotEspia.java': BOT_ESPIA, 'ModuloLiso.java': MODULO_LISO }, C => linea(new C.ModuloLiso(new C.BotEspia())));
          return caso(!r.error && r.v === 'Espía: poder 7, defensa 3', 'Espía: poder 7, defensa 3', r.error || r.v);
        } },
        { nombre: 'Cada módulo agrega solo lo suyo', entrada: 'new Laser(espía) y new Escudo(espía)', prueba: ({ archivos }) => {
          const r = conExtra(archivos, { 'BotEspia.java': BOT_ESPIA }, C => [linea(new C.Laser(new C.BotEspia())), linea(new C.Escudo(new C.BotEspia()))].join(' / '));
          const esperado = 'Espía + láser: poder 22, defensa 3 / Espía + escudo: poder 7, defensa 6';
          return caso(!r.error && r.v === esperado, esperado, r.error || r.v);
        } },
        { nombre: 'Rayo lleva dos módulos apilados', prueba: ({ run }) => {
          const formas = pilas(run(corrMain).rt).deAfuera.map(forma);
          return caso(formas.includes('Escudo → Laser → BotBasico'), 'Escudo → Laser → BotBasico', formas.join(' | ') || 'ningún bot');
        } },
        { nombre: 'La salida de Main', prueba: ({ run }) => {
          const { rt } = run(corrMain);
          return caso(salidaDe(rt) === SALIDA_1, SALIDA_1.replace(/\n/g, ' / '), rt.salida.join(' / ') || '(sin salida)');
        } },
        { nombre: 'Un módulo sobre otro módulo igual', oculto: true, entrada: 'dos Laser y dos Escudo sobre el espía', prueba: ({ archivos }) => {
          const r = conExtra(archivos, { 'BotEspia.java': BOT_ESPIA }, C => linea(new C.Escudo(new C.Escudo(new C.Laser(new C.Laser(new C.BotEspia()))))));
          const esperado = 'Espía + láser + láser + escudo + escudo: poder 37, defensa 12';
          return caso(!r.error && r.v === esperado, esperado, r.error || r.v);
        } },
      ],
      exito: 'Rayo salió con dos módulos y sin ninguna clase nueva para la combinación: los módulos envuelven, no heredan.',
    },
    {
      id: 'decorator-2', titulo: 'El orden importa', concepto: 'Decorator: apilar módulos', escena: ESCENA,
      archivos: ['Blindaje.java', 'Main.java', 'Modulo.java', 'Laser.java', 'Escudo.java', 'Bot.java', 'BotBasico.java'],
      mentor: 'Dos clientes pidieron lo mismo, escudo y blindaje, y sus bots salieron con defensas distintas. No es una avería: depende de qué módulo queda por fuera. Compruébalo.',
      teoria: `<p>Cada módulo recibe la respuesta del bot que envuelve y la transforma. Por eso una pila de módulos se lee <strong>de adentro hacia afuera</strong>: primero responde el chasis y cada capa modifica lo que le llega.</p>
<ul><li><code>new Escudo(new Blindaje(bot))</code>: el blindaje suma (10 + 10 = 20) y después el escudo duplica (20 × 2 = <strong>40</strong>).</li>
<li><code>new Blindaje(new Escudo(bot))</code>: el escudo duplica (10 × 2 = 20) y después el blindaje suma (20 + 10 = <strong>30</strong>).</li></ul>
<p>Son los mismos módulos sobre el mismo chasis, y resultan dos bots distintos. La herencia no puede expresarlo: una clase tiene un solo padre, fijo desde que se compila. Con Decorator la combinación se decide al crear el objeto, y hasta puedes poner <em>el mismo</em> módulo dos veces.</p>
<p>Otra diferencia: envolver no modifica al bot de adentro. El chasis sigue respondiendo 10; lo que cambia es quién recibe la llamada primero.</p>`,
      ejemplo: 'Bot b = new Blindaje(new Escudo(new BotBasico("Bulón")));\n// defensa: 10 * 2 = 20, y luego 20 + 10 = 30',
      tareas: ['Crea <code>Blindaje extends Modulo</code>: suma 10 a la defensa y agrega <code>" + blindaje"</code> a <code>describir()</code>.', 'En <code>Main</code>, arma a <code>coloso</code> (blindaje adentro, escudo afuera) y a <code>muro</code> (escudo adentro, blindaje afuera). Imprime de cada uno <code>describir() + ": defensa " + defensa()</code>.', 'Arma a <code>furia</code> con dos láseres, uno sobre otro, e imprime <code>describir() + ": poder " + poder()</code>.'],
      nota: 'Antes de ejecutar, calcula a mano las tres cifras y compáralas con la consola. En la escena, la lista bajo cada robot muestra sus capas: la de arriba es la de afuera.',
      pista: 'El módulo que escribes más a la izquierda es el de afuera, y es el último en aplicar su efecto. Salida esperada: <code>Coloso + blindaje + escudo: defensa 40</code>, <code>Muro + escudo + blindaje: defensa 30</code> y <code>Furia + láser + láser: poder 40</code>.',
      objetivoUML: [['Blindaje', 'Modulo', 'herencia'], ['Modulo', 'Bot', 'realizacion'], ['Modulo', 'Bot', 'asociacion']],
      inicial: prev => ({ 'Blindaje.java': BLINDAJE_INI, 'Main.java': MAIN_2_INI, 'Modulo.java': prev?.['Modulo.java'] ?? MODULO, 'Laser.java': prev?.['Laser.java'] ?? LASER, 'Escudo.java': prev?.['Escudo.java'] ?? ESCUDO, 'Bot.java': BOT, 'BotBasico.java': BOT_BASICO }),
      archivoInicial: 'Blindaje.java',
      solucion: { 'Blindaje.java': BLINDAJE, 'Main.java': MAIN_2, 'Modulo.java': MODULO, 'Laser.java': LASER, 'Escudo.java': ESCUDO, 'Bot.java': BOT, 'BotBasico.java': BOT_BASICO },
      previo: m => exigir(m, [{ clase: 'Modulo', ctor: 1 }, { clase: 'Laser', ctor: 1 }, { clase: 'Escudo', ctor: 1 }, { clase: 'Blindaje', ctor: 1 }]) || previoMain(m),
      animacion: corrMain,
      pruebas: [
        casoRelacion('Blindaje', 'Modulo', 'herencia'),
        { nombre: 'Blindaje suma 10 de defensa y nada más', entrada: 'new Blindaje(new BotBasico("B"))', prueba: ({ run }) => {
          const { v } = conRet(run, C => linea(new C.Blindaje(new C.BotBasico('B'))));
          return caso(v === 'B + blindaje: poder 10, defensa 20', 'B + blindaje: poder 10, defensa 20', String(v));
        } },
        { nombre: 'El mismo par de módulos da dos defensas', entrada: 'Escudo(Blindaje(bot)) y Blindaje(Escudo(bot))', prueba: ({ run }) => {
          const { v } = conRet(run, C => [new C.Escudo(new C.Blindaje(new C.BotBasico('X'))).defensa(), new C.Blindaje(new C.Escudo(new C.BotBasico('X'))).defensa()]);
          return caso(String(v) === '40,30', '40 y 30', (v || []).join(' y '));
        } },
        { nombre: 'Envolver no cambia al bot de adentro', entrada: 'defensa() dos veces al bot armado y una al chasis', prueba: ({ run }) => {
          const { v } = conRet(run, C => { const base = new C.BotBasico('X'); const b = new C.Escudo(new C.Blindaje(base)); return [b.defensa(), b.defensa(), base.defensa(), base.describir()]; });
          return caso(String(v) === '40,40,10,X', 'el bot armado responde 40 las dos veces; el chasis sigue en 10', `armado ${v?.[0]} y luego ${v?.[1]}; chasis ${v?.[2]} «${v?.[3]}»`);
        } },
        { nombre: 'Main arma las tres pilas', prueba: ({ run }) => {
          const formas = pilas(run(corrMain).rt).deAfuera.map(forma);
          const esperadas = ['Escudo → Blindaje → BotBasico', 'Blindaje → Escudo → BotBasico', 'Laser → Laser → BotBasico'];
          return caso(esperadas.every(f => formas.includes(f)), esperadas.join(' | '), formas.join(' | ') || 'ningún bot');
        } },
        { nombre: 'La salida de Main', prueba: ({ run }) => {
          const { rt } = run(corrMain);
          return caso(salidaDe(rt) === SALIDA_2, SALIDA_2.replace(/\n/g, ' / '), rt.salida.join(' / ') || '(sin salida)');
        } },
        { nombre: 'Blindaje sobre un bot que no conoces', oculto: true, entrada: 'Blindaje y Escudo, en los dos órdenes, sobre el espía (defensa 3)', prueba: ({ archivos }) => {
          const r = conExtra(archivos, { 'BotEspia.java': BOT_ESPIA }, C => [linea(new C.Escudo(new C.Blindaje(new C.BotEspia()))), linea(new C.Blindaje(new C.Escudo(new C.BotEspia())))].join(' / '));
          const esperado = 'Espía + blindaje + escudo: poder 7, defensa 26 / Espía + escudo + blindaje: poder 7, defensa 16';
          return caso(!r.error && r.v === esperado, esperado, r.error || r.v);
        } },
      ],
      exito: 'Mismos módulos, distinto orden, distinto bot. Y un láser sobre otro láser: con herencia eso no existe.',
    },
    {
      id: 'decorator-3', titulo: 'Mini-jefe: la puerta blindada', corto: 'Mini-jefe', jefe: true, concepto: 'Decorator: combinar sin tocar lo existente', escena: ESCENA,
      archivos: ['Propulsor.java', 'Main.java', 'Puerta.java', 'BotPesado.java', 'Modulo.java', 'Laser.java', 'Escudo.java', 'Blindaje.java', 'Bot.java', 'BotBasico.java'],
      mentor: 'La puerta blindada del almacén solo se abre para bots fuertes y bien protegidos. Llegaron un chasis pesado y un módulo nuevo, el propulsor. Las piezas del taller están selladas: si el diseño es bueno, bastará con una clase nueva y con saber apilar.',
      teoria: `<p>La prueba de un buen Decorator: llegan un chasis nuevo y un módulo nuevo, y <em>no hay que tocar nada</em> de lo que ya existe.</p>
<ul><li><code>BotPesado</code> es otro componente concreto (poder 5, defensa 20). Todos los módulos le sirven, porque envuelven un <code>Bot</code> y no un chasis en particular.</li>
<li><code>Propulsor</code> es otro decorador concreto: duplica el poder. Se combina con los demás sin que ninguno lo conozca.</li></ul>
<p>Con herencia, cubrir todas las combinaciones de 2 chasis y 4 módulos pediría 2 × 2⁴ = 32 clases, y eso sin distinguir el orden. Con Decorator son 2 chasis + 4 módulos, más el <code>Modulo</code> base.</p>
<p>La <code>Puerta</code> deja pasar a un bot solo si su poder es al menos 40 y su defensa al menos 30. Cada arnés tiene pocas ranuras, así que tendrás que decidir qué módulos usar y <strong>en qué orden</strong>.</p>`,
      ejemplo: 'Bot b = new Laser(new Propulsor(new BotBasico("Bulón")));\n// poder: 10 * 2 = 20, y luego 20 + 15 = 35',
      tareas: ['Crea <code>Propulsor extends Modulo</code>: duplica el poder y agrega <code>" + propulsor"</code> a <code>describir()</code>.', 'En <code>Main</code>, arma a «Titán» sobre un <code>BotPesado</code> con <strong>3 módulos como máximo</strong> y haz que cruce con <code>puerta.cruzar(...)</code>.', 'Arma a «Rayo» sobre un <code>BotBasico</code> con <strong>4 módulos como máximo</strong> y haz que cruce también.', 'No crees clases para las combinaciones ni modifiques las piezas selladas. Un caso oculto traerá un chasis y un módulo que no conoces.'],
      nota: GUIA,
      pista: 'Para Titán la clave es el orden del poder: sumar 15 y <em>después</em> duplicar da más que duplicar y después sumar. Cuando un bot no pasa, la puerta imprime su poder y su defensa: úsala para probar.',
      objetivoUML: [['Propulsor', 'Modulo', 'herencia'], ['BotPesado', 'Bot', 'realizacion'], ['Modulo', 'Bot', 'realizacion'], ['Modulo', 'Bot', 'asociacion']],
      inicial: () => ({ 'Propulsor.java': PROPULSOR_INI, 'Main.java': MAIN_3_INI, 'Puerta.java': PUERTA, 'BotPesado.java': BOT_PESADO, 'Modulo.java': MODULO, 'Laser.java': LASER, 'Escudo.java': ESCUDO, 'Blindaje.java': BLINDAJE, 'Bot.java': BOT, 'BotBasico.java': BOT_BASICO }),
      archivoInicial: 'Propulsor.java',
      solucion: { 'Propulsor.java': PROPULSOR, 'Main.java': MAIN_3, 'Puerta.java': PUERTA, 'BotPesado.java': BOT_PESADO, 'Modulo.java': MODULO, 'Laser.java': LASER, 'Escudo.java': ESCUDO, 'Blindaje.java': BLINDAJE, 'Bot.java': BOT, 'BotBasico.java': BOT_BASICO },
      previo: m => exigir(m, [{ clase: 'Propulsor', ctor: 1 }, { clase: 'Puerta', metodos: [['cruzar', 1]] }, { clase: 'BotPesado', ctor: 1 }, { clase: 'Modulo', ctor: 1 }]) || previoMain(m),
      animacion: corrMain,
      pruebas: [
        { nombre: 'Las piezas selladas no cambiaron', prueba: ({ archivos }) => {
          const mal = sellados(archivos, SELLADOS_3);
          return caso(!mal.length, 'iguales a la versión sellada', mal.length ? `se modificó ${mal.join(', ')}` : 'sin cambios');
        } },
        casoRelacion('Propulsor', 'Modulo', 'herencia'),
        { nombre: 'Propulsor duplica el poder y nada más', entrada: 'new Propulsor(new BotPesado("P"))', prueba: ({ run }) => {
          const { v } = conRet(run, C => linea(new C.Propulsor(new C.BotPesado('P'))));
          return caso(v === 'P + propulsor: poder 10, defensa 20', 'P + propulsor: poder 10, defensa 20', String(v));
        } },
        { nombre: 'Sin clases para las combinaciones', prueba: ({ modelo }) => {
          const cs = Object.values(modelo.clases).filter(c => c.tipo !== 'interface');
          const directos = cs.filter(c => c.implementa.some(i => i === 'Bot')).map(c => c.nombre).sort();
          const modulos = cs.filter(c => c.__padre === 'Modulo').map(c => c.nombre).sort();
          const otras = cs.filter(c => c.__padre && c.__padre !== 'Modulo').map(c => c.nombre);
          const ok = String(directos) === 'BotBasico,BotPesado,Modulo' && String(modulos) === 'Blindaje,Escudo,Laser,Propulsor' && !otras.length;
          return caso(ok, '2 chasis y 4 módulos (Blindaje, Escudo, Laser, Propulsor)', ok ? 'correcto' : `chasis: ${directos.filter(n => n !== 'Modulo').join(', ') || 'ninguno'}; módulos: ${modulos.join(', ') || 'ninguno'}${otras.length ? `; de más: ${otras.join(', ')}` : ''}`);
        } },
        { nombre: 'Titán cruza con 3 módulos o menos', prueba: ({ run }) => casoCruce(run, 'BotPesado', 3) },
        { nombre: 'Rayo cruza con 4 módulos o menos', prueba: ({ run }) => casoCruce(run, 'BotBasico', 4) },
        { nombre: 'Un chasis y un módulo desconocidos entran al taller', oculto: true, entrada: 'BotAnfibio (poder 8, defensa 12) y Camuflaje (+7 defensa), mezclados con tus módulos', prueba: ({ archivos }) => {
          const r = conExtra(archivos, { 'BotAnfibio.java': BOT_ANFIBIO, 'Camuflaje.java': CAMUFLAJE }, C => [
            linea(new C.Camuflaje(new C.Propulsor(new C.Laser(new C.BotAnfibio('Rana'))))),
            linea(new C.Propulsor(new C.Camuflaje(new C.BotAnfibio('Sapo')))),
          ].join(' / '));
          const esperado = 'Rana + láser + propulsor + camuflaje: poder 46, defensa 19 / Sapo + camuflaje + propulsor: poder 16, defensa 19';
          return caso(!r.error && r.v === esperado, esperado, r.error || r.v);
        } },
      ],
      exito: '¡Los dos cruzaron! Seis piezas, decenas de combinaciones y ninguna clase tocada. Arnés modular instalado.',
    },
  ],
};
