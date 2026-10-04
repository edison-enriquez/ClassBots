import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MISIONES, misionDisponible } from '../src/levels/misiones.js';
import { NIVELES } from '../src/levels/niveles.js';
import { evaluarNivel } from '../src/levels/evaluar.js';

globalThis.performance ??= { now: () => Date.now() };

test('Strategy es una misión opcional separada de la ruta principal', () => {
  const [mision] = MISIONES;
  assert.equal(mision.mision, true);
  assert.equal(NIVELES.some(n => n.id === mision.id), false);
  assert.equal(misionDisponible(mision, []), false);
  assert.equal(misionDisponible(mision, ['futuro']), true);
  assert.equal(misionDisponible(mision, [], true), true);
});

test('la solución de Strategy demuestra el cambio de comportamiento y deja la ruta intacta', () => {
  const [mision] = MISIONES;
  const resultado = evaluarNivel(mision, mision.solucion, { incluirOcultas: true });
  assert.equal(resultado.estado, 'ejecutado');
  assert.equal(resultado.todosOk, true, JSON.stringify(resultado.casos));
  assert.equal(resultado.salida.join('\n'), 'camina\nsalta');

  const inicial = evaluarNivel(mision, mision.inicial(), { incluirOcultas: true });
  assert.notEqual(inicial.todosOk, true);
  for (const archivo of mision.archivos) assert.ok(mision.inicial()[archivo] != null, `falta ${archivo}`);
});
