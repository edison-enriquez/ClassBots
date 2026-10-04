import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NIVELES } from '../src/levels/niveles.js';
import { evaluarNivel } from '../src/levels/evaluar.js';

globalThis.performance ??= { now: () => Date.now() };

test('los ids de capítulo son únicos', () => {
  const ids = NIVELES.map(n => n.id);
  assert.equal(new Set(ids).size, ids.length);
});

// El código inicial de cada capítulo (a partir de la solución anterior) debe tener todos sus archivos
for (let i = 0; i < NIVELES.length; i++) {
  const n = NIVELES[i];
  test(`M${n.mundo} «${n.titulo}»: la solución pasa todo y el inicio no`, () => {
    const r = evaluarNivel(n, n.solucion, { incluirOcultas: true });
    assert.equal(r.estado, 'ejecutado', JSON.stringify(r.errores?.slice(0, 3) || r.previo));
    for (const c of r.casos) assert.equal(c.estado, 'ok', `${c.nombre}: esperaba ${c.esperado}, obtuvo ${c.obtenido} ${c.error || ''}`);
    const prev = i > 0 ? NIVELES[i - 1].solucion : null;
    const ini = n.inicial(prev);
    for (const a of n.archivos) assert.ok(ini[a] != null, `falta ${a} en el código inicial`);
    const r0 = evaluarNivel(n, ini, { incluirOcultas: true });
    assert.ok(!r0.todosOk, 'el código inicial no debería superar el capítulo');
  });
}
