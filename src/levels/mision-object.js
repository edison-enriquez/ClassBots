/* Misión especial · «La raíz de todo» (ramal del Mundo 6): la clase Object.
   Toda clase de Java hereda de Object, aunque no lo escriba: de ahí salen toString(), equals(),
   hashCode() y getClass(). También String, las clases envoltorio (Integer, Double…), las listas y
   los arreglos. Por eso una variable Object (o un for (Object o : …)) puede recibir cualquier cosa. */
import { caso, corrMain, exigir, previoMain } from './util.js';
import { parsePrograma, ejecutar } from '../engine/motor.js';

const NORMAL = s => (s || '').replace(/\/\/.*$/gm, '').replace(/\s+/g, ' ').trim();
const salidaDe = rt => rt.salida.join('\n').trim();
const conRet = (run, f) => { const h = {}; const r = run((C, rt) => { h.v = f(C, rt); }); return { ...r, v: h.v }; };
function conExtra(archivos, extra, arnes) {
  const m = parsePrograma({ ...archivos, ...extra });
  if (m.errores.length) return { error: `${m.errores[0].archivo}:${m.errores[0].linea} ${m.errores[0].msg}` };
  const h = {};
  const r = ejecutar(m, (C, rt) => { h.v = arnes(C, rt); });
  return { error: r.error, v: h.v };
}
const GUIA = '<p class="guia-link">Al completar la misión, la ficha de Object queda en el <button type="button" class="enlace" data-guia="patrones">Códice</button>.</p>';
const ARBOL = `<pre class="ejemplo">Object
 ├─ String
 ├─ Number
 │   ├─ Integer
 │   └─ Double
 ├─ Boolean
 ├─ ArrayList
 ├─ int[], String[]…  (los arreglos también)
 └─ Caja, Robot…      (tus clases, aunque no escribas extends)</pre>`;

/* ---------- Paso 1 · Un inspector para todo ---------- */
const CAJA_0 = `public class Caja {
    private String contenido;

    public Caja(String contenido) {
        this.contenido = contenido;
    }

    public String getContenido() {
        return contenido;
    }

    // Redefine toString() (lo heredas de Object) para que devuelva "Caja de " + contenido
}
`;
const CAJA_1 = `public class Caja {
    private String contenido;

    public Caja(String contenido) {
        this.contenido = contenido;
    }

    public String getContenido() {
        return contenido;
    }

    @Override
    public String toString() {
        return "Caja de " + contenido;
    }
}
`;
const INSPECTOR_OLOR = `import java.util.ArrayList;

public class Inspector {
    // Un método casi igual para cada tipo, y cada tipo nuevo obliga a escribir otro.
    // Todos son Object: reemplázalos por UNO solo, public static String describir(Object o),
    // que devuelva o.getClass().getSimpleName() + " → " + o
    public static String describir(Caja c) {
        return "Caja → " + c.toString();
    }

    public static String describir(String s) {
        return "String → " + s;
    }

    public static String describir(Integer n) {
        return "Integer → " + n;
    }

    public static String describir(ArrayList<String> l) {
        return "ArrayList → " + l;
    }
}
`;
const INSPECTOR = `public class Inspector {
    public static String describir(Object o) {
        return o.getClass().getSimpleName() + " → " + o;
    }
}
`;
const MAIN_INSPECTOR_OLOR = `import java.util.ArrayList;

public class Main {
    public static void main(String[] args) {
        ArrayList<String> repuestos = new ArrayList<>();
        repuestos.add("eje");
        repuestos.add("resorte");
        // Una llamada por tipo... y falta el 3.5 porque no hay describir(Double).
        // Ponlos todos en un Object[] cosas = { ... } y recórrelo con for (Object o : cosas)
        System.out.println(Inspector.describir(new Caja("tornillos")));
        System.out.println(Inspector.describir("hola"));
        System.out.println(Inspector.describir(42));
        System.out.println(Inspector.describir(repuestos));
    }
}
`;
const MAIN_INSPECTOR = `import java.util.ArrayList;

public class Main {
    public static void main(String[] args) {
        ArrayList<String> repuestos = new ArrayList<>();
        repuestos.add("eje");
        repuestos.add("resorte");
        Object[] cosas = { new Caja("tornillos"), "hola", 42, 3.5, repuestos };
        for (Object o : cosas) {
            System.out.println(Inspector.describir(o));
        }
    }
}
`;
const SALIDA_INSPECTOR = 'Caja → Caja de tornillos\nString → hola\nInteger → 42\nDouble → 3.5\nArrayList → [eje, resorte]';
const TUERCA = 'public class Tuerca {\n    private int medida = 8;\n}\n';

/* ---------- Paso 2 · Iguales por dentro ---------- */
const CAJA_2_COMENTARIO = `
    // equals() de Object compara identidad: solo es true si es EL MISMO objeto.
    // Redefine public boolean equals(Object otro): dos cajas son iguales si tienen el mismo contenido.
    //   1. Si otro no es una Caja (instanceof), devuelve false.
    //   2. Haz el cast: Caja c = (Caja) otro;
    //   3. Compara los contenidos con equals (son String).
    // Y redefine también public int hashCode(): devuelve contenido.hashCode()
}
`;
const CAJA_2 = `public class Caja {
    private String contenido;

    public Caja(String contenido) {
        this.contenido = contenido;
    }

    public String getContenido() {
        return contenido;
    }

    @Override
    public String toString() {
        return "Caja de " + contenido;
    }

    @Override
    public boolean equals(Object otro) {
        if (!(otro instanceof Caja)) {
            return false;
        }
        Caja c = (Caja) otro;
        return contenido.equals(c.contenido);
    }

    @Override
    public int hashCode() {
        return contenido.hashCode();
    }
}
`;
const MAIN_IGUALES = `import java.util.ArrayList;

public class Main {
    public static void main(String[] args) {
        Caja a = new Caja("tornillos");
        Caja b = new Caja("tornillos");
        System.out.println("a == b: " + (a == b));
        System.out.println("a.equals(b): " + a.equals(b));
        System.out.println("Textos iguales: " + "eje".equals("eje"));
        ArrayList<Caja> bodega = new ArrayList<>();
        bodega.add(a);
        System.out.println("¿Hay una caja de tornillos? " + bodega.contains(new Caja("tornillos")));
        System.out.println("¿Mismo hashCode? " + (a.hashCode() == b.hashCode()));
    }
}
`;
const SALIDA_IGUALES = 'a == b: false\na.equals(b): true\nTextos iguales: true\n¿Hay una caja de tornillos? true\n¿Mismo hashCode? true';

/* ---------- Paso 3 · El inventario universal (mini-jefe) ---------- */
const INVENTARIO_OLOR = `import java.util.ArrayList;
import java.util.Arrays;

public class Inventario {
    // Cuenta números, textos y otros. Solo reconoce Integer: 2.5 (Double) cae en «otros».
    // Integer y Double son hijas de Number: usa instanceof Number y instanceof String.
    public static String contar(Object[] cosas) {
        int numeros = 0;
        int textos = 0;
        int otros = 0;
        for (Object o : cosas) {
            if (o.getClass().getSimpleName().equals("Integer")) {
                numeros = numeros + 1;
            } else if (o.getClass().getSimpleName().equals("String")) {
                textos = textos + 1;
            } else {
                otros = otros + 1;
            }
        }
        return "números: " + numeros + " · textos: " + textos + " · otros: " + otros;
    }

    // Suma las medidas. Ojo con el tipo de la lista: ¿puede una lista guardar int?
    public static int sumar(ArrayList<int> medidas) {
        int suma = 0;
        for (int m : medidas) {
            suma = suma + m;
        }
        return suma;
    }

    // Un arreglo es un objeto, pero no redefine toString(): "" + medidas muestra algo como [I@1b6d…
    // Devuelve su contenido con Arrays.toString(medidas)
    public static String mostrar(int[] medidas) {
        return "" + medidas;
    }

    // equals de un arreglo es el de Object (identidad). ¿Tienen el mismo contenido? Arrays.equals(a, b)
    public static boolean mismas(int[] a, int[] b) {
        return a.equals(b);
    }
}
`;
const INVENTARIO = `import java.util.ArrayList;
import java.util.Arrays;

public class Inventario {
    public static String contar(Object[] cosas) {
        int numeros = 0;
        int textos = 0;
        int otros = 0;
        for (Object o : cosas) {
            if (o instanceof Number) {
                numeros = numeros + 1;
            } else if (o instanceof String) {
                textos = textos + 1;
            } else {
                otros = otros + 1;
            }
        }
        return "números: " + numeros + " · textos: " + textos + " · otros: " + otros;
    }

    public static int sumar(ArrayList<Integer> medidas) {
        int suma = 0;
        for (int m : medidas) {
            suma = suma + m;
        }
        return suma;
    }

    public static String mostrar(int[] medidas) {
        return Arrays.toString(medidas);
    }

    public static boolean mismas(int[] a, int[] b) {
        return Arrays.equals(a, b);
    }
}
`;
const MAIN_INVENTARIO = `import java.util.ArrayList;

public class Main {
    public static void main(String[] args) {
        Object[] cosas = { 7, 2.5, "eje", new Caja("tornillos"), 10, "resorte" };
        System.out.println(Inventario.contar(cosas));

        ArrayList<Integer> lista = new ArrayList<>();
        lista.add(4);
        lista.add(8);
        lista.add(15);
        System.out.println("Suma: " + Inventario.sumar(lista));

        int[] a = {4, 8, 15};
        int[] b = {4, 8, 15};
        System.out.println("Medidas: " + Inventario.mostrar(a));
        System.out.println("¿Mismas? " + Inventario.mismas(a, b));
    }
}
`;
const SALIDA_INVENTARIO = 'números: 3 · textos: 2 · otros: 1\nSuma: 27\nMedidas: [4, 8, 15]\n¿Mismas? true';

const ESCENA = 'conexiones';
export const OBJECT = {
  id: 'mision-object',
  titulo: 'La raíz de todo',
  corto: 'Object',
  concepto: 'La clase Object',
  mundo: 6,
  requiere: ['arena-tostring'],
  requisito: 'Superar «Cada quien se presenta» (6.4)',
  requisitoCorto: 'Supera el capítulo 6.4',
  recompensa: 'Raíz de Object · tus robots reconocen cualquier pieza',
  equipo: 'raiz',
  codice: 'object',
  pasos: [
    {
      id: 'object-1', titulo: 'Un inspector para todo', concepto: 'Toda clase hereda de Object', escena: ESCENA,
      archivos: ['Inspector.java', 'Caja.java', 'Main.java'],
      mentor: 'El inspector del almacén tiene un método describir para cada tipo de pieza, y cada pieza nueva lo obliga a escribir otro. ¡Pero si todas las piezas tienen algo en común! Te cuento un secreto de Java.',
      teoria: `<p>En Java <strong>toda clase hereda de <code>Object</code></strong>, aunque no escriba <code>extends</code>: <code>public class Caja</code> significa <code>public class Caja extends Object</code>. Es la raíz del árbol del Mundo 5.</p>
${ARBOL}
<p>De Object vienen los métodos que todos los objetos tienen: <code>toString()</code>, <code>equals()</code>, <code>hashCode()</code> y <code>getClass()</code>. Por eso pudiste redefinir <code>toString()</code> en la Arena sin tener padre.</p>
<p>Como todo <em>es un</em> Object, una variable, un parámetro o un <code>for (Object o : cosas)</code> de tipo <code>Object</code> recibe cualquier cosa. Al llamar <code>o.toString()</code> o <code>o.getClass()</code> responde el <strong>objeto real</strong>: polimorfismo. Los números <code>42</code> y <code>3.5</code> se guardan como objetos <code>Integer</code> y <code>Double</code> (<em>autoboxing</em>).</p>
<p>La otra cara: con una variable <code>Object</code> solo puedes llamar los métodos de Object. Para usar algo específico, como <code>length()</code> de un String, hay que comprobar con <code>instanceof</code> y hacer un cast.</p>${GUIA}`,
      ejemplo: 'public static String describir(Object o) {\n    return o.getClass().getSimpleName() + " → " + o;\n}',
      tareas: ['En <code>Inspector</code>, reemplaza los cuatro <code>describir</code> por uno solo: <code>public static String describir(Object o)</code>.', 'En <code>Caja</code>, redefine <code>toString()</code> para que devuelva <code>"Caja de " + contenido</code>.', 'En <code>Main</code>, pon todo en un <code>Object[] cosas = { … }</code> (incluido <code>3.5</code>) y recórrelo con <code>for (Object o : cosas)</code>.'],
      nota: 'Concatenar un objeto con un texto (<code>" → " + o</code>) llama a su <code>toString()</code>. Prueba antes de redefinirlo en Caja: verás algo como <code>Caja@1e31</code>, que es el <code>toString()</code> que viene de Object.',
      pista: 'El orden del arreglo es el de la salida esperada: <code>new Caja("tornillos")</code>, <code>"hola"</code>, <code>42</code>, <code>3.5</code> y <code>repuestos</code>.',
      objetivoUML: [['Main', 'Inspector', 'dependencia'], ['Main', 'Caja', 'dependencia']],
      inicial: () => ({ 'Inspector.java': INSPECTOR_OLOR, 'Caja.java': CAJA_0, 'Main.java': MAIN_INSPECTOR_OLOR }),
      archivoInicial: 'Inspector.java',
      solucion: { 'Inspector.java': INSPECTOR, 'Caja.java': CAJA_1, 'Main.java': MAIN_INSPECTOR },
      previo: m => exigir(m, [{ clase: 'Inspector', metodos: [['describir', 1]] }, { clase: 'Caja', ctor: 1 }]) || previoMain(m),
      animacion: corrMain,
      pruebas: [
        { nombre: 'Un solo describir para todo', prueba: ({ modelo }) => {
          const ms = (modelo.clases.Inspector?.metodos || []).filter(x => x.nombre === 'describir');
          const ok = ms.length === 1 && ms[0].params[0]?.tipo === 'Object';
          return caso(ok, 'describir(Object o), uno solo', ms.map(x => `describir(${x.params.map(p => p.tipo).join(', ')})`).join(', ') || 'ninguno');
        } },
        { nombre: 'Cada cosa se describe con su clase real', prueba: ({ run }) => {
          const { rt } = run(corrMain);
          return caso(salidaDe(rt) === SALIDA_INSPECTOR, SALIDA_INSPECTOR.replace(/\n/g, ' / '), rt.salida.join(' / ') || '(sin salida)');
        } },
        { nombre: 'Main recorre un Object[] con for-each', prueba: ({ archivos }) => {
          const t = NORMAL(archivos['Main.java']);
          const ok = /Object\s*\[\s*\]\s*\w+\s*=/.test(t) && /for\s*\(\s*Object\s+\w+\s*:/.test(t);
          return caso(ok, 'Object[] cosas y for (Object o : cosas)', ok ? 'correcto' : 'falta el Object[] o el for (Object …)');
        } },
        { nombre: 'Una pieza que el inspector nunca vio', oculto: true, entrada: 'describir(new Tuerca()) — Tuerca no redefine toString()', prueba: ({ archivos }) => {
          const r = conExtra(archivos, { 'Tuerca.java': TUERCA }, C => C.Inspector.describir(new C.Tuerca()));
          if (r.error) return caso(false, 'Tuerca → Tuerca@…', r.error);
          return caso(/^Tuerca → Tuerca@[0-9a-f]+$/.test(String(r.v)), 'Tuerca → Tuerca@… (el toString de Object)', String(r.v));
        } },
        { nombre: 'Hasta un arreglo es un Object', oculto: true, entrada: 'describir(new int[]{1, 2})', prueba: ({ run }) => {
          const { v } = conRet(run, (C, rt) => C.Inspector.describir(rt.arreglo('int', [1, 2])));
          return caso(/^int\[\] → \[I@[0-9a-f]+$/.test(String(v)), 'int[] → [I@…', String(v));
        } },
      ],
      exito: 'Un solo método atiende cualquier pieza, presente o futura: todas son Object, y cada una responde con su propia clase y su propio toString().',
    },
    {
      id: 'object-2', titulo: 'Iguales por dentro', concepto: 'equals() y hashCode() de Object', escena: ESCENA,
      archivos: ['Caja.java', 'Main.java'],
      mentor: 'En la bodega preguntan «¿hay una caja de tornillos?» y la lista contesta que no… aunque está ahí. Para Java, dos cajas distintas nunca son iguales, a menos que le enseñemos qué significa «iguales».',
      teoria: `<p><code>==</code> compara <strong>referencias</strong>: si son el mismo objeto. El <code>equals()</code> que viene de Object hace lo mismo. Por eso dos <code>new Caja("tornillos")</code> no son iguales.</p>
<p><code>String</code>, <code>Integer</code> y <code>ArrayList</code> <strong>redefinen</strong> <code>equals()</code> para comparar el contenido. Por eso con textos usas <code>.equals</code> y no <code>==</code>. Tu clase también puede hacerlo:</p>
<ul><li>La firma es <code>public boolean equals(Object otro)</code>. Si escribes <code>equals(Caja otro)</code> estás <em>sobrecargando</em>, no redefiniendo, y la lista seguirá usando el de Object.</li>
<li>Primero compruebas con <code>instanceof</code> y luego haces el cast.</li>
<li>Si redefines <code>equals</code>, redefine también <code>hashCode()</code>: dos objetos iguales deben dar el mismo número (lo usan <code>HashMap</code> y <code>HashSet</code>).</li></ul>
<p>Muchos métodos de Java usan <code>equals</code> por dentro, como <code>contains</code>, <code>indexOf</code> y <code>remove</code> de una lista.</p>`,
      ejemplo: '@Override\npublic boolean equals(Object otro) {\n    if (!(otro instanceof Caja)) {\n        return false;\n    }\n    Caja c = (Caja) otro;\n    return contenido.equals(c.contenido);\n}',
      tareas: ['Ejecuta primero: mira qué responden <code>equals</code>, <code>contains</code> y <code>hashCode</code> con lo que hereda de Object.', 'Redefine <code>public boolean equals(Object otro)</code> en <code>Caja</code>: iguales si tienen el mismo contenido.', 'Redefine <code>public int hashCode()</code> devolviendo <code>contenido.hashCode()</code>.'],
      nota: 'Prueba a escribir <code>@Override public boolean equals(Caja otro)</code>: el compilador te explicará por qué eso no redefine nada.',
      pista: '<code>a == b</code> sigue siendo <code>false</code> al final: son dos objetos. Lo que cambia es <code>equals</code>.',
      objetivoUML: [['Main', 'Caja', 'dependencia']],
      inicial: prev => ({ 'Caja.java': (prev?.['Caja.java'] || CAJA_1).replace(/\}\s*$/, CAJA_2_COMENTARIO), 'Main.java': MAIN_IGUALES }),
      archivoInicial: 'Caja.java',
      solucion: { 'Caja.java': CAJA_2, 'Main.java': MAIN_IGUALES },
      previo: m => exigir(m, [{ clase: 'Caja', ctor: 1 }]) || previoMain(m),
      animacion: corrMain,
      pruebas: [
        { nombre: 'equals redefine el de Object', prueba: ({ modelo }) => {
          const ms = (modelo.clases.Caja?.metodos || []).filter(x => x.nombre === 'equals');
          const ok = ms.some(x => x.params.length === 1 && x.params[0].tipo === 'Object' && x.ret === 'boolean');
          return caso(ok, 'public boolean equals(Object otro)', ms.map(x => `equals(${x.params.map(p => p.tipo).join(', ')})`).join(', ') || 'no lo redefine');
        } },
        { nombre: 'Iguales por contenido, también en la lista', prueba: ({ run }) => {
          const { rt } = run(corrMain);
          return caso(salidaDe(rt) === SALIDA_IGUALES, SALIDA_IGUALES.replace(/\n/g, ' / '), rt.salida.join(' / ') || '(sin salida)');
        } },
        { nombre: 'Distinto contenido, distinta caja', entrada: 'new Caja("eje").equals(new Caja("resorte"))', prueba: ({ run }) => {
          const { v } = conRet(run, C => new C.Caja('eje').equals(new C.Caja('resorte')));
          return caso(v === false, 'false', String(v));
        } },
        { nombre: 'Con algo que no es una Caja responde false', oculto: true, entrada: 'caja.equals("tornillos") y caja.equals(null)', prueba: ({ run }) => {
          let v;
          try { v = conRet(run, C => { const c = new C.Caja('tornillos'); return [c.equals('tornillos'), c.equals(null)]; }).v; } catch (e) { return caso(false, 'false, false', e.message); }
          return caso(String(v) === 'false,false', 'false, false (sin errores)', String(v));
        } },
        { nombre: 'hashCode coherente con equals', oculto: true, entrada: 'dos cajas de "resorte"', prueba: ({ run }) => {
          const { v } = conRet(run, C => new C.Caja('resorte').hashCode() === new C.Caja('resorte').hashCode());
          return caso(v === true, 'el mismo hashCode', v ? 'el mismo' : 'distintos');
        } },
      ],
      exito: 'Ahora «igual» significa lo que tiene sentido para una caja. contains() lo usa sin que tengas que tocar la lista.',
    },
    {
      id: 'object-3', titulo: 'El inventario universal', concepto: 'Clases envoltorio y arreglos como objetos', escena: ESCENA, jefe: true,
      archivos: ['Inventario.java', 'Main.java', 'Caja.java'],
      mentor: 'Prueba final de la misión: el inventario mezcla números, textos, cajas, listas y arreglos. Tiene cuatro errores que vienen de no saber qué hereda cada cosa de Object. Encuéntralos.',
      teoria: `<p>Los tipos primitivos (<code>int</code>, <code>double</code>, <code>boolean</code>, <code>char</code>) <strong>no son objetos</strong>. Cada uno tiene una <strong>clase envoltorio</strong> que sí lo es: <code>Integer</code>, <code>Double</code>, <code>Boolean</code>, <code>Character</code>. Java convierte solo entre uno y otro (<em>autoboxing</em> y <em>unboxing</em>).</p>
<ul><li>Las colecciones guardan objetos: <code>ArrayList&lt;int&gt;</code> no existe, se escribe <code>ArrayList&lt;Integer&gt;</code>.</li>
<li><code>Integer</code> y <code>Double</code> heredan de <code>Number</code>: <code>o instanceof Number</code> reconoce a los dos. Es mejor que comparar el nombre de la clase con <code>getClass()</code>.</li></ul>
<p>Los <strong>arreglos también son objetos</strong> y heredan de Object, pero <em>no redefinen</em> <code>toString()</code> ni <code>equals()</code>:</p>
<ul><li>Imprimir un arreglo muestra algo como <code>[I@1b6d3586</code> (<code>[I</code> significa «arreglo de int», seguido de su hashCode): es el <code>toString()</code> de Object.</li>
<li><code>a.equals(b)</code> compara identidad, como <code>==</code>.</li>
<li>Para eso está la clase <code>Arrays</code>: <code>Arrays.toString(a)</code> y <code>Arrays.equals(a, b)</code>.</li></ul>
<p><strong>Ojo:</strong> hay una prueba oculta con cosas que el inventario nunca ha visto.</p>`,
      ejemplo: 'if (o instanceof Number) { ... }\nArrayList<Integer> lista = new ArrayList<>();\nArrays.toString(medidas);\nArrays.equals(a, b);',
      tareas: ['Corrige <code>sumar</code>: la lista debe ser <code>ArrayList&lt;Integer&gt;</code>.', 'En <code>contar</code>, usa <code>instanceof Number</code> y <code>instanceof String</code> para que <code>2.5</code> cuente como número.', 'En <code>mostrar</code>, devuelve <code>Arrays.toString(medidas)</code>.', 'En <code>mismas</code>, compara con <code>Arrays.equals(a, b)</code>.'],
      nota: 'Ejecuta antes de corregir <code>mostrar</code> y <code>mismas</code> para ver qué heredan los arreglos de Object.',
      pista: 'Salida esperada: <code>números: 3 · textos: 2 · otros: 1</code>, <code>Suma: 27</code>, <code>Medidas: [4, 8, 15]</code> y <code>¿Mismas? true</code>.',
      objetivoUML: [['Main', 'Inventario', 'dependencia']],
      inicial: prev => ({ 'Inventario.java': INVENTARIO_OLOR, 'Main.java': MAIN_INVENTARIO, 'Caja.java': prev?.['Caja.java'] || CAJA_2 }),
      archivoInicial: 'Inventario.java',
      solucion: { 'Inventario.java': INVENTARIO, 'Main.java': MAIN_INVENTARIO, 'Caja.java': CAJA_2 },
      previo: m => exigir(m, [{ clase: 'Inventario', metodos: [['contar', 1], ['sumar', 1], ['mostrar', 1], ['mismas', 2]] }]) || previoMain(m),
      animacion: corrMain,
      pruebas: [
        { nombre: 'El inventario completo', prueba: ({ run }) => {
          const { rt } = run(corrMain);
          return caso(salidaDe(rt) === SALIDA_INVENTARIO, SALIDA_INVENTARIO.replace(/\n/g, ' / '), rt.salida.join(' / ') || '(sin salida)');
        } },
        { nombre: 'Usa instanceof Number, no el nombre de la clase', prueba: ({ archivos }) => {
          const t = NORMAL(archivos['Inventario.java']);
          const ok = /instanceof\s+Number/.test(t) && !/getSimpleName\s*\(\s*\)\s*\.\s*equals/.test(t);
          return caso(ok, 'o instanceof Number', ok ? 'correcto' : 'compara nombres de clase');
        } },
        { nombre: 'Arreglos con Arrays', entrada: 'mostrar(new int[]{}) y mismas({1, 2}, {1, 2})', prueba: ({ run }) => {
          const { v } = conRet(run, (C, rt) => [C.Inventario.mostrar(rt.arreglo('int', [])), C.Inventario.mismas(rt.arreglo('int', [1, 2]), rt.arreglo('int', [1, 2]))]);
          return caso(String(v) === '[],true', '"[]" y true', (v || []).map(String).join(' y '));
        } },
        { nombre: 'Cosas que el inventario nunca vio', oculto: true, entrada: 'contar({ new Tuerca(), new int[]{1}, 1.5, "a", new ArrayList<>() })', prueba: ({ archivos }) => {
          const r = conExtra(archivos, { 'Tuerca.java': TUERCA }, (C, rt) => {
            const l = new C.__lista();
            return C.Inventario.contar(rt.arreglo('Object', [new C.Tuerca(), rt.arreglo('int', [1]), 1.5, 'a', l]));
          });
          if (r.error) return caso(false, 'números: 1 · textos: 1 · otros: 3', r.error);
          return caso(r.v === 'números: 1 · textos: 1 · otros: 3', 'números: 1 · textos: 1 · otros: 3', String(r.v));
        } },
        { nombre: 'Distinto orden, distintas medidas', oculto: true, entrada: 'mismas({1, 2}, {2, 1})', prueba: ({ run }) => {
          const { v } = conRet(run, (C, rt) => C.Inventario.mismas(rt.arreglo('int', [1, 2]), rt.arreglo('int', [2, 1])));
          return caso(v === false, 'false', String(v));
        } },
      ],
      exito: '¡Misión cumplida! Textos, números, listas, arreglos y tus propias clases cuelgan de la misma raíz: Object. Ahora sabes qué hereda cada uno y qué no.',
    },
  ],
};
