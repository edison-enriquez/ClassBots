import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PASOS } from '../src/levels/misiones.js';
import { evaluarNivel } from '../src/levels/evaluar.js';
import { parsePrograma, ejecutar, relaciones } from '../src/engine/motor.js';

globalThis.performance ??= { now: () => Date.now() };

const paso = id => PASOS.find(p => p.id === id);
const fallan = (p, archivos) => evaluarNivel(p, archivos, { incluirOcultas: true }).casos.filter(c => c.estado !== 'ok').map(c => c.nombre);
const correr = (files, cuerpo) => {
  const m = parsePrograma({ ...files, 'Main.java': `import java.util.ArrayList;\npublic class Main { public static void main(String[] args) { ${cuerpo} } }` });
  assert.deepEqual(m.errores.map(e => e.msg), []);
  const r = ejecutar(m, C => C.Main.main([]));
  return { error: r.error, salida: r.rt.salida };
};

/* ---------- Motor: ArrayList como en Java ---------- */
test('for-each falla rápido si la lista cambia mientras se recorre (ConcurrentModificationException)', () => {
  const r = correr({}, 'ArrayList<String> a = new ArrayList<>(); a.add("x"); a.add("y"); a.add("z"); for (String s : a) { if (s.equals("x")) { a.remove(s); } }');
  assert.match(r.error, /ConcurrentModificationException/);
});

test('quitar el penúltimo durante el for-each no lanza nada y se salta el último, como en Java', () => {
  const r = correr({}, 'ArrayList<String> a = new ArrayList<>(); a.add("x"); a.add("y"); for (String s : a) { System.out.println(s); if (s.equals("x")) { a.remove(s); } } System.out.println(a);');
  assert.equal(r.error, undefined);
  assert.deepEqual(r.salida, ['x', '[y]']);
});

test('ConcurrentModificationException se atrapa como RuntimeException', () => {
  const r = correr({}, 'ArrayList<String> a = new ArrayList<>(); a.add("x"); a.add("y"); a.add("z"); try { for (String s : a) { a.add("w"); } } catch (RuntimeException e) { System.out.println("atrapada"); }');
  assert.deepEqual(r.salida, ['atrapada']);
});

test('new ArrayList<>(otra) copia, y recorrer la copia permite modificar la original', () => {
  const r = correr({}, 'ArrayList<String> a = new ArrayList<>(); a.add("x"); a.add("y"); ArrayList<String> b = new ArrayList<>(a); for (String s : b) { a.remove(s); } System.out.println(a.size() + " " + b.size());');
  assert.deepEqual(r.salida, ['0 2']);
});

test('remove(objeto) devuelve boolean y no quita nada si el objeto no está', () => {
  const r = correr({}, 'ArrayList<String> a = new ArrayList<>(); a.add("x"); a.add("y"); System.out.println(a.remove("q")); System.out.println(a.remove("x")); System.out.println(a);');
  assert.deepEqual(r.salida, ['false', 'true', '[y]']);
});

test('remove(posición) fuera de rango lanza IndexOutOfBoundsException', () => {
  const r = correr({}, 'ArrayList<String> a = new ArrayList<>(); a.add("x"); a.remove(3);');
  assert.match(r.error, /IndexOutOfBoundsException/);
});

/* ---------- Misión Observer: el juez detecta los errores típicos ---------- */
test('Observer 1: la caldera que sigue nombrando robots concretos no pasa', () => {
  const p = paso('observer-1');
  const conCable = { ...p.solucion, 'Caldera.java': p.solucion['Caldera.java'].replace('public int getTemperatura()', 'public Panel panel() { return null; }\n\n    public int getTemperatura()') };
  assert.deepEqual(fallan(p, conCable), ['La caldera no conoce a ningún robot concreto']);
});

test('Observer 1: la caldera queda como agregación de Observador en el UML', () => {
  const r = relaciones(parsePrograma(paso('observer-1').solucion)).find(x => x.de === 'Caldera' && x.a === 'Observador');
  assert.equal(r?.tipo, 'agregacion');
});

test('Observer 2: suscribir sin contains duplica avisos', () => {
  const p = paso('observer-2');
  const sinContains = { ...p.solucion, 'Caldera.java': p.solucion['Caldera.java'].replace('if (!observadores.contains(o)) {\n            observadores.add(o);\n        }', 'observadores.add(o);') };
  const f = fallan(p, sinContains);
  assert.ok(f.includes('Suscribirse dos veces no duplica los avisos'), f.join(', '));
});

test('Observer 3: recorrer la lista original revienta con ConcurrentModificationException', () => {
  const p = paso('observer-3');
  const ingenua = { ...p.solucion, 'Caldera.java': p.solucion['Caldera.java'].replace('new ArrayList<>(observadores)', 'observadores') };
  const r = evaluarNivel(p, ingenua, { incluirOcultas: true });
  const principal = r.casos.find(c => c.nombre === 'El aviso llega completo aunque el extintor se retire');
  assert.equal(principal.estado, 'error');
  assert.match(principal.error, /ConcurrentModificationException/);
  assert.match(r.errorEjecucion, /ConcurrentModificationException/); // también en la consola del estudiante
  // Con solo dos observadores no hay excepción: el panel se queda sin aviso en silencio
  assert.equal(r.casos.find(c => c.nombre === 'Nadie se queda sin aviso (el error silencioso)').estado, 'falla');
});

test('Observer 3: «arreglarlo» quitando el desuscribir del extintor no vale', () => {
  const p = paso('observer-3');
  const trampa = { ...p.inicial(paso('observer-2').solucion), 'Extintor.java': p.solucion['Extintor.java'].replace('caldera.desuscribir(this);', '') };
  assert.ok(fallan(p, trampa).includes('Extintor.java no cambió'));
});

test('Observer 4: la máxima que empieza en 0 falla la cámara frigorífica', () => {
  const p = paso('observer-4');
  const cero = { ...p.solucion, 'Termografo.java': p.solucion['Termografo.java'].replace('int maxima = lecturas.get(0);', 'int maxima = 0;') };
  assert.deepEqual(fallan(p, cero), ['La cámara frigorífica (todo bajo cero)']);
});

test('Observer 4: tocar la caldera sellada no pasa', () => {
  const p = paso('observer-4');
  const tocada = { ...p.solucion, 'Caldera.java': p.solucion['Caldera.java'].replace('private int temperatura = 20;', 'private int temperatura = 0;') };
  assert.ok(fallan(p, tocada).includes('Caldera y Observador siguen sellados'));
});
