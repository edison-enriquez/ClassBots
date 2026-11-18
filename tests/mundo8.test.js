import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MUNDOS, NIVELES, capitulosHechos } from '../src/levels/niveles.js';
import { MUNDO8, PATRONES, patronCompleto, patronDe } from '../src/levels/mundo8.js';
import { MISIONES, PASOS } from '../src/levels/misiones.js';
import { aProgreso, resumen } from '../src/metricas/metricas.js';

test('Mundo 8: los cinco patrones son capítulos de la ruta y el mapa termina ahí', () => {
  assert.deepEqual(MUNDOS.map(m => m.id), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.ok(MUNDOS.every(m => m.niveles?.length), 'no quedan mundos sin capítulos');
  assert.deepEqual(PATRONES.map(p => p.corto), ['Template Method', 'Strategy', 'Observer', 'Decorator', 'Factory Method']);
  assert.equal(MUNDO8.length, 16);
  const del8 = NIVELES.filter(n => n.mundo === 8);
  assert.deepEqual(del8.map(n => n.id), MUNDO8.map(n => n.id));
  assert.deepEqual(del8.map(n => n.enMundo), [...Array(16).keys()]);
  assert.equal(NIVELES.indexOf(del8[0]), NIVELES.findIndex(n => n.id === 'averia-jefe') + 1, 'el Mundo 8 sigue al jefe del Mundo 7');
});

test('Mundo 8: cada patrón es un tramo que cierra con mini-jefe, caso oculto y recompensa', () => {
  for (const p of PATRONES) {
    const tramo = MUNDO8.filter(n => n.patron === p.id);
    assert.equal(tramo.length, p.pasos.length);
    assert.deepEqual(tramo.map(n => n.pasoPatron), tramo.map((_, k) => k));
    assert.deepEqual(tramo.map(n => !!n.cierraPatron), tramo.map((_, k) => k === tramo.length - 1));
    assert.deepEqual(tramo.map(n => !!n.jefe), tramo.map((_, k) => k === tramo.length - 1), `${p.corto}: solo el último paso es mini-jefe`);
    assert.ok(tramo.at(-1).pruebas.some(c => c.oculto), `${p.corto} necesita un caso oculto de extensión`);
    assert.ok(p.equipo && p.codice && p.recompensa, `${p.corto} necesita recompensa, equipo y entrada del Códice`);
    assert.equal(patronDe(tramo[0]).id, p.id);
    assert.equal(patronCompleto(p, tramo.slice(0, -1).map(n => n.id)), false);
    assert.equal(patronCompleto(p, [tramo.at(-1).id]), true);
  }
  assert.equal(patronDe(NIVELES[0]), null);
});

test('Mundo 8: los patrones ya no son misiones-ramal', () => {
  assert.deepEqual(MISIONES.map(m => m.id), ['mision-object', 'mision-mvc', 'mision-kotlin', 'expedicion-central']);
  for (const n of MUNDO8) assert.equal(PASOS.some(p => p.id === n.id), false, `${n.id} sigue siendo paso de misión`);
});

test('Mundo 8: el avance guardado como misión cuenta como capítulos (y no se duplica)', () => {
  const antes = { hechos: ['plano', 'ya-no-existe'], pasosHechos: ['strategy-1', 'strategy-2', 'strategy-3', 'object-1', 'plano'] };
  assert.deepEqual(capitulosHechos(antes.hechos, antes.pasosHechos), ['plano', 'strategy-1', 'strategy-2', 'strategy-3']);
  assert.deepEqual(capitulosHechos(undefined, null), []);
  assert.equal(patronCompleto(PATRONES.find(p => p.id === 'mision-strategy'), capitulosHechos(antes.hechos, antes.pasosHechos)), true);
});

test('Mundo 8: cargar un archivo de avance anterior conserva patrones, misiones y código', () => {
  const archivo = {
    perfil: { id: 'p1', nombre: 'Ana' }, integro: true, exportado: '2026-11-01T00:00:00Z', segmentos: [],
    progreso: {
      nivelId: 'plano', hechos: ['plano'], pasosHechos: ['observer-1', 'object-1', 'decorator-1', 'decorator-2', 'decorator-3'],
      misionesHechas: ['mision-decorator', 'mision-object'], habilitados: ['factory-1', 'mvc-1'], codigo: { 'decorator-1': { files: { 'Main.java': '// mío' } } },
    },
  };
  const p = aProgreso(archivo, {});
  assert.deepEqual(p.hechos, ['plano', 'observer-1', 'decorator-1', 'decorator-2', 'decorator-3']);
  assert.deepEqual(p.pasosHechos, ['object-1']);
  assert.deepEqual(p.misionesHechas, ['mision-object']);
  assert.deepEqual(p.habilitados, ['factory-1', 'mvc-1']);
  assert.equal(p.codigo['decorator-1'].files['Main.java'], '// mío');
});

test('Mundo 8: el panel lee igual los archivos de estudiantes que hicieron los patrones como misión', () => {
  const r = resumen({ progreso: { nivelId: 'plano', hechos: ['plano'], pasosHechos: ['plantilla-1', 'plantilla-2', 'plantilla-3'], misionesHechas: ['mision-plantilla'] } });
  const n = r.niveles.find(x => x.id === 'plantilla-3');
  assert.equal(n.superado, true);
  assert.equal(n.etiqueta, '8.3');
  assert.equal(n.ruta, true);
  assert.equal(r.capitulos, 4);
  assert.equal(r.totalCapitulos, NIVELES.length);
  assert.deepEqual(r.mundos.find(w => w.id === 8), { id: 8, nombre: 'La Forja', superados: 3, total: 16, tiempo: 0 });
});
