import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePrograma, ejecutar } from '../src/engine/motor.js';

function correr(files) {
  const m = parsePrograma(files);
  if (m.errores.length) return { errores: m.errores.map(e => e.msg) };
  const r = ejecutar(m, C => C.Main.main([]));
  return { salida: r.rt.salida, error: r.error };
}
const main = cuerpo => ({ 'Main.java': `import java.util.ArrayList;\nimport java.util.Arrays;\npublic class Main {\n${cuerpo}\n}` });
const CAJA = 'public class Caja { private String c; public Caja(String c) { this.c = c; } }';

test('toda clase hereda de Object: toString, equals, hashCode y getClass', () => {
  const r = correr({ 'Caja.java': CAJA, ...main(`public static void main(String[] args) {
    Caja a = new Caja("x"), b = new Caja("x");
    Object o = a;
    System.out.println(o.getClass().getSimpleName() + " " + a.equals(b) + " " + a.equals(o) + " " + (a.hashCode() == o.hashCode()) + " " + (a instanceof Object));
    System.out.println(String.valueOf(a).startsWith("Caja@"));
  }`) });
  assert.deepEqual(r.salida, ['Caja false true true true', 'true']);
});

test('String, Integer, Double y ArrayList también son Object (for-each con Object)', () => {
  const r = correr(main(`public static void main(String[] args) {
    ArrayList<String> l = new ArrayList<>(); l.add("eje");
    Object[] cosas = { "hola", 42, 3.5, l, true };
    for (Object o : cosas) System.out.println(o.getClass().getSimpleName() + ":" + o + ":" + (o instanceof Number) + ":" + (o instanceof String));
  }`));
  assert.deepEqual(r.salida, ['String:hola:false:true', 'Integer:42:true:false', 'Double:3.5:true:false', 'ArrayList:[eje]:false:false', 'Boolean:true:false:false']);
});

test('arreglos: son objetos, se imprimen con el toString de Object y se comparan con Arrays', () => {
  const r = correr(main(`public static void main(String[] args) {
    int[] a = {3, 1, 2}; int[] b = new int[]{3, 1, 2}; String[] s = new String[2]; double[] d = new double[2];
    System.out.println(a.length + " " + s[0] + " " + d[1] + " " + a.equals(b) + " " + Arrays.equals(a, b) + " " + Arrays.toString(a));
    Arrays.sort(a); System.out.println(Arrays.toString(a));
    System.out.println(a.getClass().getSimpleName());
    Object o = s; System.out.println(o instanceof Object);
  }`));
  assert.deepEqual(r.salida.slice(0, 2), ['3 null 0 false true [3, 1, 2]', '[1, 2, 3]']);
  assert.equal(r.salida[2], 'int[]');
  const imp = correr(main('public static void main(String[] args) { int[] a = {1}; System.out.println(a); System.out.println("" + new String[1]); }'));
  assert.match(imp.salida[0], /^\[I@[0-9a-f]+$/);
  assert.match(imp.salida[1], /^\[Ljava\.lang\.String;@[0-9a-f]+$/);
  const campo = correr({ 'Caja.java': 'public class Caja { private int[] medidas = {4, 8}; public int total() { return medidas[0] + medidas[1]; } }', ...main('public static void main(String[] args) { System.out.println(new Caja().total()); }') });
  assert.deepEqual(campo.salida, ['12']);
});

test('equals propio: contains de la lista lo usa', () => {
  const r = correr({
    'Caja.java': `public class Caja { private String c; public Caja(String c) { this.c = c; }
      @Override public boolean equals(Object otro) { if (!(otro instanceof Caja)) return false; return c.equals(((Caja) otro).c); }
      @Override public int hashCode() { return c.hashCode(); } }`,
    ...main(`public static void main(String[] args) {
      ArrayList<Caja> l = new ArrayList<>(); l.add(new Caja("eje"));
      System.out.println(l.contains(new Caja("eje")) + " " + l.indexOf(new Caja("x")) + " " + new Caja("a").equals("a") + " " + new Caja("a").equals(null));
    }`),
  });
  assert.deepEqual(r.salida, ['true -1 false false']);
});

test('errores de compilación sobre Object, equals y envoltorios', () => {
  const r = correr({
    'Caja.java': 'public class Caja { @Override public boolean equals(Caja o) { return true; } @Override String toString() { return ""; } public String hashCode() { return ""; } }',
    ...main('public static void main(String[] args) { ArrayList<int> l = new ArrayList<>(); Object o = "x"; o.length(); }'),
  });
  const t = r.errores.join('\n');
  assert.match(t, /equals de Object recibe un Object/);
  assert.match(t, /toString\(\) viene de Object, donde es public/);
  assert.match(t, /hashCode\(\) viene de Object y debe devolver int/);
  assert.match(t, /<int> no existe: .*Integer/);
  assert.match(t, /o es de tipo Object, y Object solo tiene/);
});
