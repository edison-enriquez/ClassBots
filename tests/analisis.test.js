import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sugerenciaLocal, sugerencias, firmaEn, contexto } from '../src/editor/analisis.js';
import { clasesPorArchivo } from '../src/editor/diagnostico.js';

const ROBOT = `public class Robot {
    String nombre;
    String color;
    int energia;

    public Robot(String nombre, String color) {
        |
    }
}`;
const clases = files => Object.assign({}, ...Object.values(clasesPorArchivo(files)));
const en = src => { const pos = src.indexOf('|'); return { txt: src.replace('|', ''), pos }; };

test('en el constructor sugiere guardar el primer parámetro', () => {
  const { txt, pos } = en(ROBOT);
  assert.equal(sugerenciaLocal(txt, pos, clases({ 'Robot.java': txt })).texto, 'this.nombre = nombre;');
});

test('después de this. sugiere el atributo pendiente', () => {
  const { txt, pos } = en(ROBOT.replace('|', 'this.nombre = nombre;\n        this.|'));
  assert.equal(sugerenciaLocal(txt, pos, clases({ 'Robot.java': txt })).texto, 'color = color;');
});

test('miembros de un objeto Robot desde Main', () => {
  const robot = ROBOT.replace('|', 'this.nombre = nombre;');
  const { txt, pos } = en('public class Main {\n    public static void main(String[] args) {\n        Robot r = new Robot("a", "b");\n        r.|\n    }\n}');
  const r = sugerencias(txt, pos, clases({ 'Robot.java': robot, 'Main.java': txt }), false);
  assert.deepEqual(r.items.map(i => i.label).sort(), ['color', 'energia', 'nombre']);
});

test('no muestra privados fuera de la clase', () => {
  const robot = ROBOT.replace('String color;', 'private String color;').replace('|', '');
  const { txt, pos } = en('public class Main {\n    public static void main(String[] args) {\n        Robot r = new Robot("a", "b");\n        r.|\n    }\n}');
  const r = sugerencias(txt, pos, clases({ 'Robot.java': robot, 'Main.java': txt }), false);
  assert.ok(!r.items.some(i => i.label === 'color'));
});

test('ayuda de parámetros dentro de new Robot(', () => {
  const robot = ROBOT.replace('|', '');
  const { txt, pos } = en('public class Main {\n    public static void main(String[] args) {\n        Robot r = new Robot("Tornillo", |);\n    }\n}');
  const f = firmaEn(txt, pos, clases({ 'Robot.java': robot, 'Main.java': txt }));
  assert.equal(f.titulo, 'Robot');
  assert.equal(f.activo, 1);
});

test('contexto reconoce zonas', () => {
  const { txt, pos } = en(ROBOT);
  const c = contexto(txt, pos);
  assert.equal(c.zona, 'metodo');
  assert.equal(c.metodo.tipo, 'ctor');
});

test('sugiere el método que falta de la interfaz', () => {
  const rec = 'public interface Recargable {\n    void recargar();\n    int nivel();\n}\n';
  const src = 'public class Linterna implements Recargable {\n    private int pila;\n\n    @Override\n    public void recargar() {\n        pila = 100;\n    }\n\n    |\n}\n';
  const { txt, pos } = en(src);
  const s = sugerenciaLocal(txt, pos, clases({ 'Recargable.java': rec, 'Linterna.java': txt }));
  assert.match(s.texto, /public int nivel\(\) \{\n {8}return 0;\n {4}\}/);
  assert.equal(s.atras, 4 + 2);
});

test('después de implements sugiere interfaces', () => {
  const rec = 'public interface Recargable {\n    void recargar();\n}\n';
  const { txt, pos } = en('public class Linterna implements Re|');
  const r = sugerencias(txt, pos, clases({ 'Recargable.java': rec }), false);
  assert.ok(r.items.some(i => i.label === 'Recargable'));
});
