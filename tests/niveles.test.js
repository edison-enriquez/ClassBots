import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NIVELES } from '../src/levels/niveles.js';
import { evaluarNivel } from '../src/levels/evaluar.js';
import { plantuml, parsePrograma } from '../src/engine/motor.js';

globalThis.performance ??= { now: () => Date.now() };

for (const n of NIVELES) {
  test(`la solución de «${n.titulo}» pasa todas las pruebas`, () => {
    const r = evaluarNivel(n, n.solucion, { incluirOcultas: true });
    assert.equal(r.estado, 'ejecutado', JSON.stringify(r.errores || r.previo));
    for (const c of r.casos) assert.equal(c.estado, 'ok', `${c.nombre}: ${c.obtenido} ${c.error || ''}`);
    assert.ok(r.todosOk);
  });
}

test('los casos ocultos quedan pendientes en Ejecutar', () => {
  const n = NIVELES[2];
  const r = evaluarNivel(n, n.solucion);
  assert.equal(r.casos.find(c => c.oculto).estado, 'pendiente');
  assert.equal(r.todosOk, false);
});

test('olvidar this deja nombre en null y lo explica', () => {
  const n = NIVELES[2];
  const f = { 'Robot.java': n.solucion['Robot.java'].replace('this.nombre = nombre', 'nombre = nombre') };
  const r = evaluarNivel(n, f);
  const c = r.casos[0];
  assert.equal(c.estado, 'falla');
  assert.match(c.obtenido, /null/);
  assert.ok(r.lista === undefined);
});

test('el jefe detecta que el robot se apaga', () => {
  const n = NIVELES[5];
  const f = { ...n.solucion, 'Main.java': n.solucion['Main.java'].replace(/if \(r\.x == 4\) \{\s*r\.recargar\(\);\s*\}/, '') };
  const r = evaluarNivel(n, f, { incluirOcultas: true });
  const c = r.casos.find(x => /apague/.test(x.nombre));
  assert.equal(c.estado, 'falla');
  assert.match(c.obtenido, /se apagó/);
});

test('errores de compilación detienen la evaluación', () => {
  const r = evaluarNivel(NIVELES[1], { 'Robot.java': 'public class Robot {\n  string nombre\n}' });
  assert.equal(r.estado, 'compilacion');
  assert.ok(r.errores.length >= 1);
});

test('if con = es error con corrección', () => {
  const n = NIVELES[5];
  const r = evaluarNivel(n, { ...n.solucion, 'Main.java': n.solucion['Main.java'].replace('r.x == 4', 'r.x = 4') });
  assert.equal(r.estado, 'compilacion');
  assert.match(r.errores[0].msg, /==/);
});

test('PlantUML incluye visibilidad y relación', () => {
  const src = plantuml(parsePrograma(NIVELES[5].solucion));
  assert.match(src, /\+ \{static\} main/);
  assert.match(src, /Main \.\.> Robot : crea/);
});
