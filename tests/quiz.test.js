import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QUIZ_REPASO, QUIZZES } from '../src/quiz/repaso.js';
import { codificarEstado, decodificarEstado, estadoValido, respuestaValida, anotar, resumen, recomendacion, csvQuiz, textoFirmaQuiz } from '../src/quiz/logica.js';
import { crearClase, abrirClase, firmarTexto, verificarTexto, cifrarParaClase, abrirSobre, clasePublica } from '../src/metricas/cifrado.js';

test('banco: solo mundos 1 a 6, cuatro opciones y una correcta válida', () => {
  assert.ok(QUIZZES[QUIZ_REPASO.id]);
  const ids = new Set();
  for (const p of QUIZ_REPASO.preguntas) {
    assert.ok(p.mundo >= 1 && p.mundo <= 6, p.id);
    assert.equal(p.opciones.length, 4, p.id);
    assert.ok(Number.isInteger(p.correcta) && p.correcta >= 0 && p.correcta < 4, p.id);
    assert.equal(new Set(p.opciones).size, 4, `${p.id}: opciones repetidas`);
    assert.ok(p.enunciado && p.explicacion, p.id);
    assert.ok(!ids.has(p.id)); ids.add(p.id);
  }
  // Cubre los seis mundos
  assert.deepEqual([...new Set(QUIZ_REPASO.preguntas.map(p => p.mundo))].sort(), [1, 2, 3, 4, 5, 6]);
});

test('estado: se codifica, se decodifica y rechaza lo inválido', () => {
  const p = { q: QUIZ_REPASO.id, n: 2, f: 'votando', r: 1, t: Date.now() };
  const json = JSON.stringify(p);
  const d = decodificarEstado(codificarEstado(json, 'FIRMA_b64u-x'));
  assert.equal(d.firma, 'FIRMA_b64u-x');
  assert.equal(d.json, json);
  assert.deepEqual(d.p, p);
  assert.equal(decodificarEstado('hola profe'), null);
  assert.equal(decodificarEstado(codificarEstado(JSON.stringify({ ...p, n: 99 }), 'x')), null);
  assert.equal(decodificarEstado(codificarEstado(JSON.stringify({ ...p, q: 'otro' }), 'x')), null);
  assert.equal(decodificarEstado(codificarEstado(JSON.stringify({ ...p, r: 3 }), 'x')), null);
  assert.ok(estadoValido({ q: QUIZ_REPASO.id, f: 'fin', t: 1 }));
  // Cabe en un mensaje del aula (el servidor corta en 500 caracteres)
  assert.ok(codificarEstado(json, 'x'.repeat(86)).length < 300);
});

test('firma del profesor y respuesta cifrada para la clase, de punta a punta', async () => {
  const c = await crearClase({ nombre: 'POO', contrasena: 'una clave larga', aula: 'api.ejemplo.com' });
  const pub = clasePublica(c);
  const priv = await abrirClase(pub, 'una clave larga');
  const json = JSON.stringify({ q: QUIZ_REPASO.id, n: 0, f: 'votando', r: 1, t: Date.now() });
  const firma = await firmarTexto(priv, textoFirmaQuiz(pub.id, json));
  const d = decodificarEstado(codificarEstado(json, firma));
  assert.ok(await verificarTexto(pub, textoFirmaQuiz(pub.id, d.json), d.firma));
  // Un estado alterado no verifica
  const falso = json.replace('"n":0', '"n":1');
  assert.ok(!(await verificarTexto(pub, textoFirmaQuiz(pub.id, falso), d.firma)));
  // La respuesta viaja cifrada y solo el profesor la abre
  const x = { q: QUIZ_REPASO.id, n: 0, r: 1, o: 2, ms: 4200, t: Date.now() };
  const sobre = await cifrarParaClase(x, pub);
  assert.ok(!JSON.stringify(sobre).includes('"o":2'));
  const abierto = await abrirSobre(sobre, { clases: { [pub.id]: priv } });
  assert.deepEqual(abierto, x);
  assert.ok(respuestaValida(abierto, QUIZ_REPASO));
  assert.ok(!respuestaValida({ ...x, o: 7 }, QUIZ_REPASO));
  assert.ok(!respuestaValida({ ...x, n: 50 }, QUIZ_REPASO));
});

test('resumen por pregunta, por mundo y por estudiante; la última respuesta cuenta', () => {
  const q = QUIZ_REPASO, ok0 = q.preguntas[0].correcta, mal0 = (ok0 + 1) % 4;
  let r = {};
  r = anotar(r, 'ana', { n: 0, r: 1, o: mal0, ms: 1000 });
  r = anotar(r, 'ana', { n: 0, r: 1, o: ok0, ms: 3000 }); // cambió su voto
  r = anotar(r, 'luis', { n: 0, r: 1, o: mal0, ms: 2000 });
  r = anotar(r, 'luis', { n: 0, r: 2, o: ok0, ms: 2000 });
  const s = resumen(q, r);
  assert.deepEqual([s.preguntas[0].r1.total, s.preguntas[0].r1.correctas, s.preguntas[0].r1.pct], [2, 1, 50]);
  assert.deepEqual([s.preguntas[0].r2.total, s.preguntas[0].r2.pct], [1, 100]);
  assert.equal(s.preguntas[1].r1.pct, null);
  assert.equal(s.mundos.find(m => m.mundo === 1).pct, 50);
  const ana = s.alumnos.find(a => a.id === 'ana'), luis = s.alumnos.find(a => a.id === 'luis');
  assert.deepEqual([ana.r1, ana.r1ok, luis.r1ok, luis.r2ok], [1, 1, 0, 1]);
  const csv = csvQuiz(q, r, id => (id === 'ana' ? 'Ana; Pérez' : 'Luis'));
  const filas = csv.split('\n');
  assert.equal(filas.length, 4);
  assert.ok(filas[1].includes('"Ana; Pérez"'));
  assert.match(recomendacion(20), /explicar/);
  assert.match(recomendacion(50), /ronda 2/);
  assert.match(recomendacion(90), /sigue/);
});
