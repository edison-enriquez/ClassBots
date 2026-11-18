/* Misión especial · «La sala de calderas» (ramal del Mundo 6): el patrón Observer.
   La Caldera llama a mano a cada robot que le interesa su temperatura; cada robot nuevo
   obliga a abrirla. El estudiante la convierte en un sujeto que guarda una lista de
   Observador y los avisa a todos, maneja altas y bajas, descubre la
   ConcurrentModificationException cuando un observador se retira en pleno aviso, y en el
   mini-jefe conecta un termógrafo a dos calderas sin tocar ninguna. */
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
const comparar = (r, esperado) => (r.error
  ? caso(false, esperado.replace(/\n/g, ' / '), r.error)
  : caso(r.salida.join('\n') === esperado, esperado.replace(/\n/g, ' / '), r.salida.join(' / ') || '(sin salida)'));
const GUIA = '<p class="guia-link">Al completar la misión, el patrón queda registrado en el <button type="button" class="enlace" data-guia="patrones">Códice de patrones</button>.</p>';
const ESCENA = 'calderas';
const sellados = (archivos, mapa) => Object.entries(mapa).filter(([a, v]) => NORMAL(archivos[a]) !== NORMAL(v)).map(([a]) => a.replace('.java', ''));

/* Observador que el juez escribe por su cuenta: si la Caldera solo conoce a la interfaz, también lo avisa */
const ESPIA = `public class Espia implements Observador {
    @Override
    public void actualizar(int temperatura) {
        System.out.println("espía: " + temperatura);
    }
}
`;

/* ---------- Paso 1: la caldera cableada ---------- */
const CALDERA_OLOR = `public class Caldera {
    private int temperatura;
    private Ventilador ventilador;
    private Sirena sirena;
    private Panel panel;

    // Cada robot interesado es un cable más: para agregar otro hay que abrir esta clase
    public Caldera(Ventilador ventilador, Sirena sirena, Panel panel) {
        this.temperatura = 20;
        this.ventilador = ventilador;
        this.sirena = sirena;
        this.panel = panel;
    }

    public void setTemperatura(int t) {
        temperatura = t;
        ventilador.girar(t);
        sirena.revisar(t);
        panel.mostrar(t);
    }

    public int getTemperatura() {
        return temperatura;
    }
}
`;
const VENTILADOR_OLOR = `public class Ventilador {
    public void girar(int temperatura) {
        if (temperatura >= 60) {
            System.out.println("ventilador encendido");
        } else {
            System.out.println("ventilador apagado");
        }
    }
}
`;
const SIRENA_OLOR = `public class Sirena {
    public void revisar(int temperatura) {
        if (temperatura >= 90) {
            System.out.println("¡SIRENA! " + temperatura + "°");
        }
    }
}
`;
const PANEL_OLOR = `public class Panel {
    public void mostrar(int temperatura) {
        System.out.println("panel: " + temperatura + "°");
    }
}
`;
const OBSERVADOR_INI = `// Observador.java
// El contrato de todo robot que quiera enterarse de la temperatura.
// Declara public interface Observador con un solo método:
//   void actualizar(int temperatura);
`;
const MAIN_OLOR = `public class Main {
    public static void main(String[] args) {
        Caldera caldera = new Caldera(new Ventilador(), new Sirena(), new Panel());
        caldera.setTemperatura(50);
        caldera.setTemperatura(95);
    }
}
`;
const OBSERVADOR = `public interface Observador {
    void actualizar(int temperatura);
}
`;
const VENTILADOR = `public class Ventilador implements Observador {
    @Override
    public void actualizar(int temperatura) {
        if (temperatura >= 60) {
            System.out.println("ventilador encendido");
        } else {
            System.out.println("ventilador apagado");
        }
    }
}
`;
const SIRENA = `public class Sirena implements Observador {
    @Override
    public void actualizar(int temperatura) {
        if (temperatura >= 90) {
            System.out.println("¡SIRENA! " + temperatura + "°");
        }
    }
}
`;
const PANEL = `public class Panel implements Observador {
    @Override
    public void actualizar(int temperatura) {
        System.out.println("panel: " + temperatura + "°");
    }
}
`;
const CALDERA_1 = `import java.util.ArrayList;

public class Caldera {
    private int temperatura = 20;
    private ArrayList<Observador> observadores = new ArrayList<>();

    public void suscribir(Observador o) {
        observadores.add(o);
    }

    public void setTemperatura(int t) {
        temperatura = t;
        notificar();
    }

    private void notificar() {
        for (Observador o : observadores) {
            o.actualizar(temperatura);
        }
    }

    public int getTemperatura() {
        return temperatura;
    }
}
`;
const MAIN_1 = `public class Main {
    public static void main(String[] args) {
        Caldera caldera = new Caldera();
        caldera.suscribir(new Ventilador());
        caldera.suscribir(new Sirena());
        caldera.suscribir(new Panel());
        caldera.setTemperatura(50);
        caldera.setTemperatura(95);
    }
}
`;
const SALIDA_1 = 'ventilador apagado\npanel: 50°\nventilador encendido\n¡SIRENA! 95°\npanel: 95°';

/* ---------- Paso 2: altas y bajas ---------- */
const MAIN_2 = `public class Main {
    public static void main(String[] args) {
        Caldera caldera = new Caldera();
        Panel panel = new Panel();
        Sirena sirena = new Sirena();
        caldera.suscribir(panel);
        caldera.suscribir(sirena);
        caldera.suscribir(panel);      // repetido: no debe recibir dos avisos
        caldera.setTemperatura(95);
        caldera.setTemperatura(95);    // no cambió: nadie se entera
        caldera.desuscribir(sirena);
        caldera.setTemperatura(99);    // la sirena ya no escucha
    }
}
`;
const CALDERA_2 = `import java.util.ArrayList;

public class Caldera {
    private int temperatura = 20;
    private ArrayList<Observador> observadores = new ArrayList<>();

    public void suscribir(Observador o) {
        if (!observadores.contains(o)) {
            observadores.add(o);
        }
    }

    public void desuscribir(Observador o) {
        observadores.remove(o);
    }

    public void setTemperatura(int t) {
        if (t == temperatura) {
            return;
        }
        temperatura = t;
        notificar();
    }

    private void notificar() {
        for (Observador o : observadores) {
            o.actualizar(temperatura);
        }
    }

    public int getTemperatura() {
        return temperatura;
    }
}
`;
const SALIDA_2 = 'panel: 95°\n¡SIRENA! 95°\npanel: 99°';
const CONTADOR = `public class Contador implements Observador {
    @Override
    public void actualizar(int temperatura) {
        System.out.println("aviso " + temperatura);
    }
}
`;

/* ---------- Paso 3: el extintor que se retira ---------- */
const EXTINTOR = `public class Extintor implements Observador {
    private Caldera caldera;

    public Extintor(Caldera caldera) {
        this.caldera = caldera;
    }

    @Override
    public void actualizar(int temperatura) {
        if (temperatura >= 90) {
            System.out.println("extintor disparado: se retira");
            caldera.desuscribir(this);
        }
    }
}
`;
const MAIN_3 = `public class Main {
    public static void main(String[] args) {
        Caldera caldera = new Caldera();
        caldera.suscribir(new Extintor(caldera));
        caldera.suscribir(new Sirena());
        caldera.suscribir(new Panel());
        caldera.setTemperatura(95);
        caldera.setTemperatura(97);
    }
}
`;
const CALDERA_3 = `import java.util.ArrayList;

public class Caldera {
    private int temperatura = 20;
    private ArrayList<Observador> observadores = new ArrayList<>();

    public void suscribir(Observador o) {
        if (!observadores.contains(o)) {
            observadores.add(o);
        }
    }

    public void desuscribir(Observador o) {
        observadores.remove(o);
    }

    public void setTemperatura(int t) {
        if (t == temperatura) {
            return;
        }
        temperatura = t;
        notificar();
    }

    private void notificar() {
        // Se recorre una copia: si un observador se retira durante el aviso, la lista original puede cambiar
        for (Observador o : new ArrayList<>(observadores)) {
            o.actualizar(temperatura);
        }
    }

    public int getTemperatura() {
        return temperatura;
    }
}
`;
const SALIDA_3 = 'extintor disparado: se retira\n¡SIRENA! 95°\npanel: 95°\n¡SIRENA! 97°\npanel: 97°';

/* ---------- Paso 4 (mini-jefe): la sala de control ---------- */
const TERMOGRAFO_INI = `// Termografo.java
// Un registrador que puede escuchar varias calderas a la vez.
// - implements Observador
// - guarda cada temperatura que recibe en un ArrayList<Integer>
// - public String reporte() devuelve, por ejemplo:  "3 lecturas, máxima 85°"
//   y si todavía no recibió nada:                   "sin lecturas"
// No necesita saber de qué caldera viene cada aviso.
`;
const MAIN_4 = `public class Main {
    public static void main(String[] args) {
        Caldera norte = new Caldera();
        Caldera sur = new Caldera();
        Termografo termografo = new Termografo();
        // Conecta el termógrafo a las dos calderas y el panel solo a la del norte

        norte.setTemperatura(70);
        sur.setTemperatura(85);
        norte.setTemperatura(60);
        System.out.println(termografo.reporte());
    }
}
`;
const TERMOGRAFO = `import java.util.ArrayList;

public class Termografo implements Observador {
    private ArrayList<Integer> lecturas = new ArrayList<>();

    @Override
    public void actualizar(int temperatura) {
        lecturas.add(temperatura);
    }

    public String reporte() {
        if (lecturas.isEmpty()) {
            return "sin lecturas";
        }
        int maxima = lecturas.get(0);
        for (int t : lecturas) {
            if (t > maxima) {
                maxima = t;
            }
        }
        return lecturas.size() + " lecturas, máxima " + maxima + "°";
    }
}
`;
const MAIN_4_SOL = `public class Main {
    public static void main(String[] args) {
        Caldera norte = new Caldera();
        Caldera sur = new Caldera();
        Termografo termografo = new Termografo();
        norte.suscribir(termografo);
        sur.suscribir(termografo);
        norte.suscribir(new Panel());

        norte.setTemperatura(70);
        sur.setTemperatura(85);
        norte.setTemperatura(60);
        System.out.println(termografo.reporte());
    }
}
`;
const SALIDA_4 = 'panel: 70°\npanel: 60°\n3 lecturas, máxima 85°';
const BITACORA = `public class Bitacora implements Observador {
    @Override
    public void actualizar(int temperatura) {
        System.out.println("bitácora: " + temperatura + "°");
    }
}
`;

export const OBSERVER = {
  id: 'mision-observer',
  titulo: 'La sala de calderas',
  corto: 'Observer',
  concepto: 'Patrón Observer',
  mundo: 6,
  requiere: ['arena-torneo'],
  recompensa: 'Antena de difusión',
  equipo: 'difusion',
  codice: 'observer',
  pasos: [
    {
      id: 'observer-1', titulo: 'La caldera cableada', concepto: 'Observer: sujeto y observadores', escena: ESCENA,
      archivos: ['Observador.java', 'Caldera.java', 'Ventilador.java', 'Sirena.java', 'Panel.java', 'Main.java'],
      mentor: 'La caldera tiene un cable directo a cada robot que quiere saber su temperatura. Mañana llega un extintor y habrá que abrirla otra vez para soldarle otro cable. Cambiemos los cables por una antena: la caldera avisa y escucha quien quiera.',
      teoria: `<p>Cuando un objeto cambia y otros necesitan enterarse, el patrón <strong>Observer (Observador)</strong> separa a quien cambia de quienes reaccionan:</p>
<ul><li>El <strong>sujeto</strong> (<code>Caldera</code>) guarda una lista de observadores y, cada vez que cambia, los <em>notifica</em> a todos.</li>
<li>Los <strong>observadores</strong> cumplen un contrato común (<code>Observador</code>) con un método <code>actualizar(...)</code>.</li>
<li>El sujeto solo conoce la interfaz: no sabe si avisa a un ventilador, a una sirena o a algo que todavía no existe.</li></ul>
<p>Es el polimorfismo con interfaces del Mundo 6, con una idea más: <em>la lista se arma en ejecución</em>. Quien quiera escuchar se suscribe.</p>`,
      ejemplo: 'private ArrayList<Observador> observadores = new ArrayList<>();\n\npublic void suscribir(Observador o) {\n    observadores.add(o);\n}\n\nprivate void notificar() {\n    for (Observador o : observadores) {\n        o.actualizar(temperatura);\n    }\n}',
      tareas: ['Ejecuta primero el código tal como está y mira los cables en la escena.', 'Declara <code>public interface Observador</code> con <code>void actualizar(int temperatura);</code>.', 'Haz que <code>Ventilador</code>, <code>Sirena</code> y <code>Panel</code> implementen <code>Observador</code>: su método pasa a llamarse <code>actualizar</code>.', 'En <code>Caldera</code>, cambia los tres atributos por un <code>ArrayList&lt;Observador&gt;</code>, agrega <code>suscribir(Observador o)</code> y haz que <code>setTemperatura</code> llame a <code>notificar()</code>. El constructor queda sin parámetros.', 'En <code>Main</code>, crea la caldera vacía y suscribe los tres robots en el mismo orden.'],
      nota: 'La salida debe ser la misma de antes. Mira la escena: los cables enredados se convierten en una antena.',
      pista: 'En <code>Caldera.java</code> no debe quedar ni una mención a <code>Ventilador</code>, <code>Sirena</code> o <code>Panel</code>. Recuerda <code>import java.util.ArrayList;</code>.',
      objetivoUML: [['Ventilador', 'Observador', 'realizacion'], ['Sirena', 'Observador', 'realizacion'], ['Panel', 'Observador', 'realizacion'], ['Caldera', 'Observador', 'agregacion']],
      inicial: () => ({ 'Observador.java': OBSERVADOR_INI, 'Caldera.java': CALDERA_OLOR, 'Ventilador.java': VENTILADOR_OLOR, 'Sirena.java': SIRENA_OLOR, 'Panel.java': PANEL_OLOR, 'Main.java': MAIN_OLOR }),
      archivoInicial: 'Observador.java',
      solucion: { 'Observador.java': OBSERVADOR, 'Caldera.java': CALDERA_1, 'Ventilador.java': VENTILADOR, 'Sirena.java': SIRENA, 'Panel.java': PANEL, 'Main.java': MAIN_1 },
      // Sin exigir la interfaz: así el estudiante puede ejecutar primero la caldera cableada y ver el enredo en la escena
      previo: m => (m.clases.Observador && m.clases.Observador.tipo !== 'interface' ? 'Observador debe ser una interfaz: public interface Observador { ... }' : null) || previoMain(m),
      animacion: corrMain,
      pruebas: [
        { nombre: 'Existe el contrato Observador', prueba: ({ modelo }) => {
          const falta = exigir(modelo, [{ clase: 'Observador', interfaz: true, metodos: [['actualizar', 1]] }, { clase: 'Caldera', metodos: [['suscribir', 1]] }]);
          return caso(!falta, 'interface Observador con actualizar(int) y Caldera.suscribir(Observador)', falta || 'correcto');
        } },
        casoRelacion('Ventilador', 'Observador', 'realizacion'),
        casoRelacion('Sirena', 'Observador', 'realizacion'),
        casoRelacion('Panel', 'Observador', 'realizacion'),
        { nombre: 'La caldera no conoce a ningún robot concreto', prueba: ({ archivos }) => {
          const nombres = ['Ventilador', 'Sirena', 'Panel'].filter(n => !sinTexto(archivos, 'Caldera.java', new RegExp(`\\b${n}\\b`)));
          return caso(!nombres.length, 'Caldera solo habla con Observador', nombres.length ? `Caldera todavía menciona ${nombres.join(', ')}` : 'correcto');
        } },
        { nombre: 'La caldera guarda una lista de Observador', prueba: ({ modelo }) => {
          const f = modelo.clases.Caldera?.campos.find(x => /^(ArrayList|List)\s*<\s*Observador\s*>$/.test(x.tipo.replace(/\s+/g, '')));
          return caso(!!f, 'ArrayList<Observador>', f ? `${f.tipo} ${f.nombre}` : 'no encuentro el atributo de la lista');
        } },
        { nombre: 'La salida no cambió', prueba: ({ run }) => {
          const { rt } = run(corrMain);
          return caso(salidaDe(rt) === SALIDA_1, SALIDA_1.replace(/\n/g, ' / '), rt.salida.join(' / ') || '(sin salida)');
        } },
        { nombre: 'Un observador que la caldera no conoce también recibe el aviso', entrada: 'Espia implements Observador, suscrito; setTemperatura(70)', prueba: ({ archivos }) => {
          const r = conExtra(archivos, { 'Espia.java': ESPIA }, C => { const c = new C.Caldera(); c.suscribir(new C.Espia()); c.setTemperatura(70); });
          return comparar(r, 'espía: 70');
        } },
      ],
      exito: 'La caldera ya no tiene cables: anuncia el cambio y responde quien esté suscrito.',
    },
    {
      id: 'observer-2', titulo: 'Altas y bajas', concepto: 'Suscribir y desuscribir', escena: ESCENA,
      archivos: ['Caldera.java', 'Main.java', 'Observador.java', 'Ventilador.java', 'Sirena.java', 'Panel.java'],
      mentor: 'Ahora los robots entran y salen de la sala. La sirena se va a mantenimiento, el panel se suscribió dos veces por error y la caldera grita aunque la temperatura no haya cambiado. Pongamos orden en la lista.',
      teoria: `<p>La lista de observadores cambia durante la ejecución, así que el sujeto necesita dos operaciones:</p>
<ul><li><code>suscribir(o)</code>: lo agrega, pero <em>una sola vez</em>. Si ya estaba, no se repite (<code>contains</code>).</li>
<li><code>desuscribir(o)</code>: lo quita de la lista (<code>remove</code>). Desde ese momento ya no recibe avisos.</li></ul>
<p>Un buen sujeto además avisa solo cuando de verdad hubo un cambio: si la temperatura nueva es igual a la actual, nadie necesita enterarse. Así los observadores no reaccionan dos veces a lo mismo.</p>`,
      ejemplo: 'public void suscribir(Observador o) {\n    if (!observadores.contains(o)) {\n        observadores.add(o);\n    }\n}\n\npublic void desuscribir(Observador o) {\n    observadores.remove(o);\n}',
      tareas: ['Haz que <code>suscribir</code> ignore a un observador que ya está en la lista.', 'Agrega <code>public void desuscribir(Observador o)</code>, que lo saca de la lista.', 'En <code>setTemperatura</code>, si la temperatura nueva es igual a la actual, no notifiques.'],
      nota: 'Mira la escena: el panel solo tiene un cable aunque se suscribió dos veces, y el cable de la sirena queda colgando cuando se desuscribe.',
      pista: 'Para salir antes de un método <code>void</code> usa <code>return;</code> dentro de un <code>if</code>.',
      objetivoUML: [['Caldera', 'Observador', 'agregacion'], ['Panel', 'Observador', 'realizacion'], ['Sirena', 'Observador', 'realizacion']],
      inicial: prev => ({ 'Caldera.java': prev?.['Caldera.java'] ?? CALDERA_1, 'Main.java': MAIN_2, 'Observador.java': prev?.['Observador.java'] ?? OBSERVADOR, 'Ventilador.java': prev?.['Ventilador.java'] ?? VENTILADOR, 'Sirena.java': prev?.['Sirena.java'] ?? SIRENA, 'Panel.java': prev?.['Panel.java'] ?? PANEL }),
      archivoInicial: 'Caldera.java',
      solucion: { 'Caldera.java': CALDERA_2, 'Main.java': MAIN_2, 'Observador.java': OBSERVADOR, 'Ventilador.java': VENTILADOR, 'Sirena.java': SIRENA, 'Panel.java': PANEL },
      previo: m => exigir(m, [{ clase: 'Observador', interfaz: true, metodos: [['actualizar', 1]] }, { clase: 'Caldera', metodos: [['suscribir', 1], ['desuscribir', 1], ['setTemperatura', 1]] }]) || previoMain(m),
      animacion: corrMain,
      pruebas: [
        { nombre: 'La sala responde como se espera', prueba: ({ run }) => {
          const { rt } = run(corrMain);
          return caso(salidaDe(rt) === SALIDA_2, SALIDA_2.replace(/\n/g, ' / '), rt.salida.join(' / ') || '(sin salida)');
        } },
        { nombre: 'Suscribirse dos veces no duplica los avisos', entrada: 'suscribir(k) dos veces; setTemperatura(40)', prueba: ({ archivos }) => {
          const r = conExtra(archivos, { 'Contador.java': CONTADOR }, C => { const c = new C.Caldera(); const k = new C.Contador(); c.suscribir(k); c.suscribir(k); c.setTemperatura(40); });
          return comparar(r, 'aviso 40');
        } },
        { nombre: 'Sin cambio de temperatura no hay aviso', entrada: 'setTemperatura(40) dos veces y luego 41', prueba: ({ archivos }) => {
          const r = conExtra(archivos, { 'Contador.java': CONTADOR }, C => { const c = new C.Caldera(); c.suscribir(new C.Contador()); c.setTemperatura(40); c.setTemperatura(40); c.setTemperatura(41); });
          return comparar(r, 'aviso 40\naviso 41');
        } },
        { nombre: 'Desuscribir a quien no está no afecta a los demás', oculto: true, entrada: 'desuscribir un Contador que nunca se suscribió', prueba: ({ archivos }) => {
          const r = conExtra(archivos, { 'Contador.java': CONTADOR, 'Espia.java': ESPIA }, C => { const c = new C.Caldera(); c.suscribir(new C.Espia()); c.desuscribir(new C.Contador()); c.setTemperatura(55); });
          return comparar(r, 'espía: 55');
        } },
        { nombre: 'La caldera sigue sin conocer robots concretos', prueba: ({ archivos }) => {
          const ok = sinTexto(archivos, 'Caldera.java', /\b(Ventilador|Sirena|Panel)\b/);
          return caso(ok, 'solo Observador', ok ? 'correcto' : 'Caldera menciona un robot concreto');
        } },
      ],
      exito: 'La lista se mantiene limpia: cada robot entra una vez, sale cuando quiere y solo escucha cambios reales.',
    },
    {
      id: 'observer-3', titulo: 'El extintor que se retira', concepto: 'Modificar la lista durante el aviso', escena: ESCENA,
      archivos: ['Caldera.java', 'Extintor.java', 'Main.java', 'Observador.java', 'Sirena.java', 'Panel.java'],
      mentor: 'Llegó el extintor: cuando la caldera pasa de 90°, se dispara y se desuscribe solo. Ejecuta el programa tal como está y mira qué le pasa a la sala. El extintor está bien escrito; el problema está en la caldera.',
      teoria: `<p>Un <code>for (Observador o : observadores)</code> recorre la lista con un <em>iterador</em>. Si durante el recorrido alguien la modifica (aquí, el extintor llama a <code>desuscribir(this)</code>), Java lo detecta y lanza <code>ConcurrentModificationException</code>: el iterador ya no sabe por dónde iba.</p>
<p>Peor aún: si el que se retira es el penúltimo, Java <em>no</em> lanza nada y simplemente se salta al siguiente, que se queda sin aviso. Es un error silencioso.</p>
<p>La solución habitual en Observer es <strong>avisar sobre una copia</strong> de la lista. La copia no cambia aunque la original sí: todos los que estaban suscritos al empezar el aviso lo reciben, y los cambios valen para el siguiente.</p>`,
      ejemplo: 'for (Observador o : new ArrayList<>(observadores)) {\n    o.actualizar(temperatura);\n}',
      tareas: ['Ejecuta primero el código tal como está y lee la excepción en la consola.', 'Corrige <code>notificar()</code> en <code>Caldera</code> para que recorra una copia de la lista.', 'No cambies <code>Extintor.java</code>: retirarse en pleno aviso es un derecho del observador.'],
      nota: 'Mira la escena: con el error, la caldera se pone roja a mitad del aviso. Con la copia, la sirena y el panel reciben las dos temperaturas.',
      pista: '<code>new ArrayList&lt;&gt;(otraLista)</code> crea una lista nueva con los mismos elementos.',
      objetivoUML: [['Extintor', 'Observador', 'realizacion'], ['Caldera', 'Observador', 'agregacion']],
      inicial: prev => ({ 'Caldera.java': prev?.['Caldera.java'] ?? CALDERA_2, 'Extintor.java': EXTINTOR, 'Main.java': MAIN_3, 'Observador.java': prev?.['Observador.java'] ?? OBSERVADOR, 'Sirena.java': prev?.['Sirena.java'] ?? SIRENA, 'Panel.java': prev?.['Panel.java'] ?? PANEL }),
      archivoInicial: 'Caldera.java',
      solucion: { 'Caldera.java': CALDERA_3, 'Extintor.java': EXTINTOR, 'Main.java': MAIN_3, 'Observador.java': OBSERVADOR, 'Sirena.java': SIRENA, 'Panel.java': PANEL },
      previo: m => exigir(m, [{ clase: 'Caldera', metodos: [['suscribir', 1], ['desuscribir', 1], ['setTemperatura', 1]] }, { clase: 'Extintor', implementa: ['Observador'] }]) || previoMain(m),
      animacion: corrMain,
      pruebas: [
        { nombre: 'El aviso llega completo aunque el extintor se retire', prueba: ({ run }) => {
          const { rt } = run(corrMain);
          return caso(salidaDe(rt) === SALIDA_3, SALIDA_3.replace(/\n/g, ' / '), rt.salida.join(' / ') || '(sin salida)');
        } },
        { nombre: 'Extintor.java no cambió', prueba: ({ archivos }) => {
          const ok = NORMAL(archivos['Extintor.java']) === NORMAL(EXTINTOR);
          return caso(ok, 'igual al original', ok ? 'sin cambios' : 'se modificó el extintor: la corrección va en la caldera');
        } },
        { nombre: 'Nadie se queda sin aviso (el error silencioso)', oculto: true, entrada: 'Extintor y Panel; setTemperatura(92)', prueba: ({ archivos }) => {
          const r = conExtra(archivos, {}, C => { const c = new C.Caldera(); c.suscribir(new C.Extintor(c)); c.suscribir(new C.Panel()); c.setTemperatura(92); });
          return comparar(r, 'extintor disparado: se retira\npanel: 92°');
        } },
        { nombre: 'El extintor ya no recibe avisos después de retirarse', oculto: true, entrada: 'Extintor y Espia; setTemperatura(95) y luego 30', prueba: ({ archivos }) => {
          const r = conExtra(archivos, { 'Espia.java': ESPIA }, C => { const c = new C.Caldera(); c.suscribir(new C.Extintor(c)); c.suscribir(new C.Espia()); c.setTemperatura(95); c.setTemperatura(96); });
          return comparar(r, 'extintor disparado: se retira\nespía: 95\nespía: 96');
        } },
      ],
      exito: 'La caldera avisa sobre una copia: los observadores pueden irse en pleno aviso sin romper nada.',
    },
    {
      id: 'observer-4', titulo: 'Mini-jefe: la sala de control', corto: 'Mini-jefe', jefe: true, concepto: 'Un observador, varios sujetos', escena: ESCENA,
      archivos: ['Termografo.java', 'Main.java', 'Caldera.java', 'Observador.java', 'Panel.java'],
      mentor: 'La planta abrió una segunda caldera. Necesito un termógrafo que escuche a las dos y me diga cuántas lecturas tomó y cuál fue la máxima. Las calderas están selladas: si el patrón quedó bien, basta con un observador nuevo.',
      teoria: `<p>La relación entre sujetos y observadores es de <strong>muchos a muchos</strong>: una caldera avisa a varios observadores y un mismo observador puede suscribirse a varias calderas.</p>
<p>Aquí la caldera <em>empuja</em> el dato en <code>actualizar(int temperatura)</code> (modelo <em>push</em>), así que el termógrafo no necesita saber de dónde viene cada lectura: solo la guarda. Agregar el termógrafo no obliga a tocar ninguna caldera.</p>
<p>Cuidado con la máxima: si empiezas en <code>0</code>, ¿qué pasa con una cámara frigorífica que solo marca temperaturas bajo cero?</p>`,
      ejemplo: 'norte.suscribir(termografo);\nsur.suscribir(termografo);   // el mismo objeto escucha a las dos',
      tareas: ['Crea <code>Termografo implements Observador</code>, que guarda cada lectura en un <code>ArrayList&lt;Integer&gt;</code>.', 'Escribe <code>public String reporte()</code>: <code>"3 lecturas, máxima 85°"</code>, o <code>"sin lecturas"</code> si no ha recibido ninguna.', 'En <code>Main</code>, suscribe el termógrafo a las dos calderas y un <code>Panel</code> solo a la del norte.', 'No modifiques <code>Caldera.java</code> ni <code>Observador.java</code>. Un caso oculto conectará un observador que no conoces.'],
      nota: GUIA,
      pista: 'Para la máxima, empieza con la primera lectura (<code>lecturas.get(0)</code>), no con <code>0</code>.',
      objetivoUML: [['Termografo', 'Observador', 'realizacion'], ['Panel', 'Observador', 'realizacion'], ['Caldera', 'Observador', 'agregacion']],
      inicial: () => ({ 'Termografo.java': TERMOGRAFO_INI, 'Main.java': MAIN_4, 'Caldera.java': CALDERA_3, 'Observador.java': OBSERVADOR, 'Panel.java': PANEL }),
      archivoInicial: 'Termografo.java',
      solucion: { 'Termografo.java': TERMOGRAFO, 'Main.java': MAIN_4_SOL, 'Caldera.java': CALDERA_3, 'Observador.java': OBSERVADOR, 'Panel.java': PANEL },
      previo: m => exigir(m, [{ clase: 'Termografo', implementa: ['Observador'], metodos: [['actualizar', 1], ['reporte', 0]] }]) || previoMain(m),
      animacion: corrMain,
      pruebas: [
        casoRelacion('Termografo', 'Observador', 'realizacion'),
        { nombre: 'Caldera y Observador siguen sellados', prueba: ({ archivos }) => {
          const tocados = sellados(archivos, { 'Caldera.java': CALDERA_3, 'Observador.java': OBSERVADOR });
          return caso(!tocados.length, 'iguales a la versión sellada', tocados.length ? `se modificó ${tocados.join(', ')}` : 'sin cambios');
        } },
        { nombre: 'El termógrafo no depende de la Caldera', prueba: ({ archivos }) => {
          const ok = sinTexto(archivos, 'Termografo.java', /\bCaldera\b/);
          return caso(ok, 'solo recibe temperaturas', ok ? 'correcto' : 'Termografo menciona a Caldera');
        } },
        { nombre: 'La sala de control reporta bien', prueba: ({ run }) => {
          const { rt } = run(corrMain);
          return caso(salidaDe(rt) === SALIDA_4, SALIDA_4.replace(/\n/g, ' / '), rt.salida.join(' / ') || '(sin salida)');
        } },
        { nombre: 'Un termógrafo recién instalado', oculto: true, entrada: 'new Termografo().reporte()', prueba: ({ archivos }) => {
          const h = {};
          const r = conExtra(archivos, {}, C => { h.v = new C.Termografo().reporte(); });
          return caso(!r.error && h.v === 'sin lecturas', '"sin lecturas"', r.error || JSON.stringify(h.v));
        } },
        { nombre: 'La cámara frigorífica (todo bajo cero)', oculto: true, entrada: 'lecturas -12 y -5', prueba: ({ archivos }) => {
          const h = {};
          const r = conExtra(archivos, {}, C => { const c = new C.Caldera(); const t = new C.Termografo(); c.suscribir(t); c.setTemperatura(-12); c.setTemperatura(-5); h.v = t.reporte(); });
          return caso(!r.error && h.v === '2 lecturas, máxima -5°', '"2 lecturas, máxima -5°"', r.error || JSON.stringify(h.v));
        } },
        { nombre: 'Un observador desconocido comparte la sala', oculto: true, entrada: 'Bitacora implements Observador junto al termógrafo; setTemperatura(75) y 80', prueba: ({ archivos }) => {
          const h = {};
          const r = conExtra(archivos, { 'Bitacora.java': BITACORA }, C => { const c = new C.Caldera(); const t = new C.Termografo(); c.suscribir(t); c.suscribir(new C.Bitacora()); c.setTemperatura(75); c.setTemperatura(80); h.v = t.reporte(); });
          const ok = !r.error && r.salida.join('\n') === 'bitácora: 75°\nbitácora: 80°' && h.v === '2 lecturas, máxima 80°';
          return caso(ok, 'bitácora: 75° / bitácora: 80° y "2 lecturas, máxima 80°"', r.error || `${r.salida.join(' / ')} · ${JSON.stringify(h.v)}`);
        } },
      ],
      exito: 'Un solo termógrafo escucha dos calderas y nadie tuvo que abrirlas. ¡Antena de difusión obtenida!',
    },
  ],
};
