import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePrograma, ejecutar } from '../src/engine/motor.js';

const main = cuerpo => `public class Main { public static void main(String[] args) { ${cuerpo} } }`;
const BASE = {
  'Maquina.java': 'public abstract class Maquina { protected String nombre; public Maquina(String n) { nombre = n; } public abstract String accion(); }',
  'Robot.java': 'public class Robot extends Maquina { public Robot(String n) { super(n); } public String accion() { return "golpea"; } }',
  'Dron.java': 'public class Dron extends Maquina { public Dron(String n) { super(n); } public String accion() { return "dispara"; } public String volar() { return "vuela"; } }',
};
const msgs = files => parsePrograma(files).errores.map(e => e.msg).join('\n');
const correr = files => { const m = parsePrograma(files); assert.equal(msgs(files), ''); const r = ejecutar(m, C => C.Main.main([])); return r; };

test('el tipo declarado decide qué métodos se pueden llamar', () => {
  const t = msgs({ ...BASE, 'Main.java': main('Maquina m = new Dron("Z"); System.out.println(m.volar());') });
  assert.match(t, /m es de tipo Maquina, y Maquina no tiene volar\(\)/);
  assert.match(t, /\(\(Dron\) m\)\.volar/);
});

test('instanceof + cast funciona y un cast inválido lanza ClassCastException', () => {
  const ok = correr({ ...BASE, 'Main.java': main('Maquina m = new Dron("Z"); if (m instanceof Dron) { Dron d = (Dron) m; System.out.println(d.volar()); }') });
  assert.equal(ok.error, undefined); assert.deepEqual(ok.rt.salida, ['vuela']);
  const malo = correr({ ...BASE, 'Main.java': main('Maquina m = new Robot("R"); Dron d = (Dron) m; System.out.println(d.volar());') });
  assert.match(malo.error, /ClassCastException: el objeto es un Robot y no se puede convertir a Dron/);
});

test('sobrecarga: elige la versión por cantidad y tipo de argumentos', () => {
  const r = correr({
    'Arbitro.java': 'public class Arbitro { public String p(int x) { return "int"; } public String p(double x) { return "double"; } public String p(String s) { return "texto"; } public String p(Maquina m) { return "maquina"; } public String p(int a, int b) { return "dos"; } }',
    ...BASE,
    'Main.java': main('Arbitro a = new Arbitro(); System.out.println(a.p(3)); System.out.println(a.p(2.5)); System.out.println(a.p("x")); System.out.println(a.p(new Robot("R"))); System.out.println(a.p(1, 2));'),
  });
  assert.equal(r.error, undefined, r.error);
  assert.deepEqual(r.rt.salida, ['int', 'double', 'texto', 'maquina', 'dos']);
});

test('firmas repetidas son error y getClass().getSimpleName() funciona', () => {
  assert.match(msgs({ 'A.java': 'public class A { public int f(int x) { return 1; } public int f(int y) { return 2; } }' }), /A ya tiene un método f\(int\)/);
  const r = correr({ ...BASE, 'Main.java': main('Maquina m = new Dron("Z"); System.out.println(m.getClass().getSimpleName());') });
  assert.deepEqual(r.rt.salida, ['Dron']);
});
