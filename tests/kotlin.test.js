import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { KOTLIN, SOLUCIONES, CASOS } from '../src/levels/mision-kotlin.js';
import { traducirResultado } from '../src/levels/remoto.js';
import { misionVisible, misionDisponible } from '../src/levels/misiones.js';

/* La misión de Kotlin se califica en juez-kotlin/: aquí se comprueba que el juego y el juez
   hablan de lo mismo (retos, archivos, soluciones y nombres de los casos). */
const RETOS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'juez-kotlin', 'retos');
const leer = (...p) => readFileSync(path.join(RETOS, ...p), 'utf8');

function casosDelJuez(reto) {
  const out = [];
  for (const f of readdirSync(path.join(RETOS, reto, 'pruebas')).filter(n => n.endsWith('.kt')).sort()) {
    for (const bloque of leer(reto, 'pruebas', f).split('\nclass ').slice(1)) {
      const cls = /^(\w+)/.exec(bloque)[1];
      for (const m of bloque.matchAll(/fun `([^`]+)`/g)) out.push({ nombre: m[1], oculto: cls.endsWith('OcultoTest') });
    }
  }
  return out.sort((a, b) => Number(a.oculto) - Number(b.oculto));
}

for (const p of KOTLIN.pasos) {
  const reto = p.remoto.reto;
  test(`Kotlin · ${p.titulo}: el reto ${reto} existe en el juez y coincide`, () => {
    assert.ok(existsSync(path.join(RETOS, reto, 'pruebas')), `falta juez-kotlin/retos/${reto}/pruebas`);
    assert.equal(p.lenguaje, 'kotlin');
    assert.equal(p.escena, 'android');
    for (const a of p.archivos) assert.match(a, /^[A-Z]\w*\.kt$/);
    assert.deepEqual(Object.keys(p.solucion).sort(), [...p.archivos].sort(), 'la solución trae exactamente los archivos del paso');
    // Las soluciones del juego son las mismas que valida el juez (las selladas vienen de fijos/)
    for (const [n, texto] of Object.entries(SOLUCIONES[reto])) {
      const ruta = existsSync(path.join(RETOS, reto, 'fijos', n)) ? ['fijos', n] : ['solucion', n];
      assert.equal(texto, leer(reto, ...ruta), `${reto}/${n} no coincide con juez-kotlin`);
    }
    assert.deepEqual(CASOS[reto], casosDelJuez(reto), 'los casos que muestra el juego no son los del juez');
    const ini = p.inicial(undefined);
    for (const a of p.archivos) assert.ok(ini[a] != null, `falta ${a} en el código inicial`);
  });
}

test('Kotlin: la misión sigue a la de MVC y cierra con un mini-jefe con casos ocultos', () => {
  assert.equal(KOTLIN.requiereMision, 'mision-mvc');
  // Por ahora solo la ve el profesor
  assert.equal(misionVisible(KOTLIN), false);
  assert.equal(misionVisible(KOTLIN, true), true);
  assert.equal(misionDisponible(KOTLIN, KOTLIN.requiere, false, ['mision-mvc']), false);
  assert.equal(misionDisponible(KOTLIN, [], true), true);
  assert.ok(KOTLIN.pasos.at(-1).jefe);
  assert.ok(KOTLIN.pasos.at(-1).pruebas.some(c => c.oculto));
});

test('traduce la respuesta del juez al formato del juego', () => {
  const nivel = KOTLIN.pasos[1];
  const comp = traducirResultado(nivel, { compilo: false, errores: [{ archivo: 'Robot.kt', linea: 3, columna: 1, msg: 'x' }], casos: [] });
  assert.equal(comp.estado, 'compilacion');
  assert.deepEqual(comp.errores, [{ archivo: 'Robot.kt', linea: 3, msg: 'x' }]);
  const casos = [{ nombre: 'b', oculto: true, ok: true }, { nombre: 'a', oculto: false, ok: false, mensaje: 'falta Posición: 1' }];
  const ej = traducirResultado(nivel, { compilo: true, casos, captura: 'data:image/png;base64,AA' });
  assert.deepEqual(ej.casos.map(c => [c.nombre, c.estado]), [['a', 'falla'], ['b', 'pendiente']]);
  assert.equal(ej.casos[0].obtenido, 'falta Posición: 1');
  assert.equal(ej.captura, 'data:image/png;base64,AA');
  assert.equal(ej.todosOk, false);
  const env = traducirResultado(nivel, { compilo: true, casos: casos.map(c => ({ ...c, ok: true })) }, { incluirOcultas: true });
  assert.equal(env.todosOk, true);
  assert.equal(env.aprobados, 2);
  assert.equal(traducirResultado(nivel, { compilo: true, casos: [], tiempoAgotado: true }).casos[0].estado, 'error');
});
