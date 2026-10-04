import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MISIONES, PASOS, misionDisponible, misionCompletada, pasoAbierto } from '../src/levels/misiones.js';
import { NIVELES } from '../src/levels/niveles.js';
import { evaluarNivel } from '../src/levels/evaluar.js';

globalThis.performance ??= { now: () => Date.now() };

test('las misiones son ramales opcionales separados de la ruta principal', () => {
  const ids = PASOS.map(p => p.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.equal(NIVELES.some(n => n.id === id), false, `${id} choca con un capítulo`);
  for (const m of MISIONES) {
    assert.ok(m.requiere.every(r => NIVELES.some(n => n.id === r)), `${m.id} requiere un capítulo inexistente`);
    assert.equal(misionDisponible(m, []), false);
    assert.equal(misionDisponible(m, m.requiere), true);
    assert.equal(misionDisponible(m, [], true), true);
    assert.ok(m.pasos.at(-1).jefe, `${m.id} debe cerrar con un mini-jefe`);
    assert.ok(m.pasos.some(p => p.pruebas.some(c => c.oculto)), `${m.id} necesita un caso oculto de extensión`);
  }
});

test('los pasos se abren en orden y la misión se completa con todos', () => {
  const [m] = MISIONES, [a, b, c] = PASOS.filter(p => p.misionId === m.id);
  assert.equal(pasoAbierto(a, []), true);
  assert.equal(pasoAbierto(b, []), false);
  assert.equal(pasoAbierto(b, [a.id]), true);
  assert.equal(misionCompletada(m, [a.id, b.id]), false);
  assert.equal(misionCompletada(m, [a.id, b.id, c.id]), true);
  assert.equal(misionCompletada(m, [], [m.id]), true);
});

for (let i = 0; i < PASOS.length; i++) {
  const p = PASOS[i];
  test(`Misión ${MISIONES.find(m => m.id === p.misionId).corto} · paso ${p.enMundo + 1} «${p.titulo}»: la solución pasa todo y el inicio no`, () => {
    const r = evaluarNivel(p, p.solucion, { incluirOcultas: true });
    assert.equal(r.estado, 'ejecutado', JSON.stringify(r.errores?.slice(0, 3) || r.previo));
    for (const c of r.casos) assert.equal(c.estado, 'ok', `${c.nombre}: esperaba ${c.esperado}, obtuvo ${c.obtenido} ${c.error || ''}`);
    const prev = p.enMundo > 0 ? PASOS[i - 1].solucion : undefined;
    const ini = p.inicial(prev);
    for (const a of p.archivos) assert.ok(ini[a] != null, `falta ${a} en el código inicial`);
    const r0 = evaluarNivel(p, ini, { incluirOcultas: true });
    assert.ok(!r0.todosOk, 'el código inicial no debería superar el paso');
  });
}
