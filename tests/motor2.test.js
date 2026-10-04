import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePrograma, ejecutar, relaciones, plantuml, repasar } from '../src/engine/motor.js';

const RECARGABLE = 'public interface Recargable {\n    void recargar();\n    int nivel();\n}\n';
const LINTERNA = `public class Linterna implements Recargable {
    private int carga;
    public void recargar() { carga = 100; }
    public int nivel() { return carga; }
}
`;

test('interfaces: implementación completa compila y instanceof funciona', () => {
  const m = parsePrograma({ 'Recargable.java': RECARGABLE, 'Linterna.java': LINTERNA,
    'Main.java': 'public class Main {\n    public static void main(String[] args) {\n        Recargable r = new Linterna();\n        r.recargar();\n        System.out.println(r.nivel());\n        System.out.println(r instanceof Recargable);\n    }\n}\n' });
  assert.deepEqual(m.errores, []);
  const r = ejecutar(m, C => C.Main.main([]));
  assert.equal(r.error, undefined);
  assert.deepEqual(r.rt.salida, ['100', 'true']);
});

test('interfaces: falta un método y no se puede hacer new', () => {
  const m = parsePrograma({ 'Recargable.java': RECARGABLE, 'Linterna.java': LINTERNA.replace(/\n    public int nivel\(\) \{ return carga; \}/, ''),
    'Main.java': 'public class Main {\n    public static void main(String[] args) {\n        Recargable r = new Recargable();\n    }\n}\n' });
  const msgs = m.errores.map(e => e.msg).join('\n');
  assert.match(msgs, /le falta el método public int nivel\(\)/);
  assert.match(msgs, /No se pueden crear objetos de una interfaz/);
});

test('interfaces: el método implementado debe ser public', () => {
  const m = parsePrograma({ 'Recargable.java': RECARGABLE, 'Linterna.java': LINTERNA.replace('public void recargar', 'void recargar') });
  assert.match(m.errores[0].msg, /debe ser public/);
});

test('final, static, toString, equals y casting', () => {
  const robot = `public class Robot {
    private static int fabricados = 0;
    private final int serie;
    private String nombre;
    public Robot(String nombre) { this.nombre = nombre; fabricados++; this.serie = fabricados; }
    public int getSerie() { return serie; }
    public String toString() { return "Robot #" + serie + " " + nombre; }
    public boolean equals(Object otro) {
        if (otro == null || getClass() != otro.getClass()) return false;
        Robot r = (Robot) otro;
        return serie == r.serie;
    }
}
`;
  const main = 'public class Main {\n    public static void main(String[] args) {\n        Robot a = new Robot("A");\n        Robot b = new Robot("B");\n        System.out.println(a);\n        System.out.println(b.getSerie());\n        System.out.println(a.equals(b));\n        System.out.println(a.equals(a));\n        System.out.println(a.equals(null));\n    }\n}\n';
  const m = parsePrograma({ 'Robot.java': robot, 'Main.java': main });
  assert.deepEqual(m.errores, []);
  const r = ejecutar(m, C => C.Main.main([]));
  assert.equal(r.error, undefined, r.error);
  assert.deepEqual(r.rt.salida, ['Robot #1 A', '2', 'false', 'true', 'false']);
  const mal = parsePrograma({ 'Robot.java': robot.replace('public int getSerie() { return serie; }', 'public void setSerie(int s) { serie = s; }') });
  assert.match(mal.errores[0].msg, /serie es final/);
});

test('relaciones: composición, agregación, asociación, dependencia y realización', () => {
  const files = {
    'Recargable.java': RECARGABLE,
    'Bateria.java': 'public class Bateria {\n    private int carga = 100;\n    public int getCarga() { return carga; }\n}\n',
    'Operario.java': 'public class Operario {\n    private String nombre;\n    public Operario(String nombre) { this.nombre = nombre; }\n}\n',
    'Herramienta.java': 'public class Herramienta {\n    public int potencia() { return 5; }\n}\n',
    'Robot.java': `public class Robot implements Recargable {
    private Bateria bateria;
    private Operario responsable;
    public Robot() { this.bateria = new Bateria(); }
    public void asignar(Operario o) { this.responsable = o; }
    public void reparar(Herramienta h) { h.potencia(); }
    public void recargar() { }
    public int nivel() { return bateria.getCarga(); }
}
`,
    'Cuadrilla.java': 'import java.util.ArrayList;\npublic class Cuadrilla {\n    private ArrayList<Robot> miembros = new ArrayList<>();\n    public void agregar(Robot r) { miembros.add(r); }\n}\n',
  };
  const m = parsePrograma(files);
  assert.deepEqual(m.errores, []);
  const tipos = Object.fromEntries(relaciones(m).map(r => [`${r.de}->${r.a}`, r.tipo]));
  assert.equal(tipos['Robot->Bateria'], 'composicion');
  assert.equal(tipos['Robot->Operario'], 'asociacion');
  assert.equal(tipos['Robot->Herramienta'], 'dependencia');
  assert.equal(tipos['Robot->Recargable'], 'realizacion');
  assert.equal(tipos['Cuadrilla->Robot'], 'agregacion');
  const src = plantuml(m);
  assert.match(src, /Robot \*-- "1" Bateria : bateria/);
  assert.match(src, /Cuadrilla o-- "0\.\.\*" Robot : miembros/);
  assert.match(src, /Robot \.\.\|> Recargable/);
  assert.match(src, /interface Recargable \{/);
});

test('la foto de objetos sigue referencias y agregados', () => {
  const files = {
    'Robot.java': 'public class Robot {\n    private String nombre;\n    public Robot(String n) { nombre = n; }\n}\n',
    'Cuadrilla.java': 'public class Cuadrilla {\n    private ArrayList<Robot> miembros = new ArrayList<>();\n    public void agregar(Robot r) { miembros.add(r); }\n}\n',
  };
  const m = parsePrograma(files);
  const r = ejecutar(m, C => { const c = new C.Cuadrilla(); c.agregar(new C.Robot('A')); c.agregar(new C.Robot('B')); });
  assert.equal(r.error, undefined, r.error);
  const rep = repasar(r.rt.log);
  const ultimo = rep.frames.at(-1);
  const cu = ultimo.objetos.find(o => o.cls === 'Cuadrilla');
  assert.deepEqual(cu.f.miembros.lista.map(x => x.ref), [2, 3]);
  assert.ok(rep.frames.some(f => f.tipo === 'add'));
});

test('private se resuelve por tipo del receptor', () => {
  const m = parsePrograma({
    'Robot.java': 'public class Robot {\n    private String nombre;\n}\n',
    'Operario.java': 'public class Operario {\n    public String nombre;\n}\n',
    'Main.java': 'public class Main {\n    public static void main(String[] args) {\n        Operario o = new Operario();\n        System.out.println(o.nombre);\n        Robot r = new Robot();\n        System.out.println(r.nombre);\n    }\n}\n',
  });
  assert.equal(m.errores.length, 1);
  assert.equal(m.errores[0].linea, 6);
});

test('división entera como en Java', () => {
  const m = parsePrograma({ 'Calc.java': 'public class Calc {\n    public static int promedio(int a, int b) {\n        int s = (a + b) / 2;\n        return s;\n    }\n    public static int mitad(int a) {\n        return a / 2;\n    }\n    public static double real(int a) {\n        return a / 2.0;\n    }\n}\n' });
  const r = ejecutar(m, C => { globalThis.__v = [C.Calc.promedio(30, 15), C.Calc.mitad(7), C.Calc.real(7)]; });
  assert.equal(r.error, undefined, r.error);
  assert.deepEqual(globalThis.__v, [22, 3, 3.5]);
});
