import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarEnvio, prepararFuente, parsearErrores, parsearJUnit, crearApi, PAQUETE } from '../servidor.mjs';

const RETOS = ['kotlin-modelo', 'kotlin-pantalla'];

test('valida reto, nombres y tamaños', () => {
  assert.equal(validarEnvio({ reto: 'kotlin-modelo', archivos: { 'Robot.kt': 'class Robot' } }, RETOS), null);
  assert.match(validarEnvio({ reto: 'otro', archivos: { 'Robot.kt': '' } }, RETOS), /Reto/);
  assert.match(validarEnvio({ reto: 'kotlin-modelo', archivos: { '../x.kt': '' } }, RETOS), /no permitido/);
  assert.match(validarEnvio({ reto: 'kotlin-modelo', archivos: { 'build.gradle.kts': '' } }, RETOS), /no permitido/);
  assert.match(validarEnvio({ reto: 'kotlin-modelo', archivos: { 'Robot.kt': 'x'.repeat(40_000) } }, RETOS), /grande/);
  assert.match(validarEnvio({ reto: 'kotlin-modelo', archivos: {} }, RETOS), /entre 1/);
});

test('agrega el paquete si falta y rechaza otro paquete', () => {
  assert.deepEqual(prepararFuente('class A'), { texto: `package ${PAQUETE}\nclass A`, desfase: 1 });
  assert.equal(prepararFuente(`// hola\npackage ${PAQUETE}\nclass A`).desfase, 0);
  assert.match(prepararFuente('package otro.paquete\nclass A').error, /paquete/);
});

test('lee los errores del compilador y corrige la línea', () => {
  const salida = 'e: file:///trabajo/slot1/app/src/main/java/com/classbots/taller/Robot.kt:20:21 Unresolved reference \'treinta\'.\nw: algo\n';
  assert.deepEqual(parsearErrores(salida, { 'Robot.kt': 1 }), [{ archivo: 'Robot.kt', linea: 19, columna: 21, msg: "Unresolved reference 'treinta'." }]);
});

test('lee los casos de JUnit y marca los ocultos', () => {
  const xml = `<testsuite><testcase name="Avanzar mueve al robot" classname="com.classbots.taller.PantallaTest" time="1.2"/>
<testcase name="La Activity no hace las cuentas" classname="com.classbots.taller.EstructuraTest" time="0">
<failure message="java.lang.AssertionError: MainActivity cambia la energía &amp; la posición" type="x">trace</failure></testcase>
<testcase name="Sesión larga" classname="com.classbots.taller.PantallaOcultoTest" time="1"/></testsuite>`;
  const c = parsearJUnit(xml);
  assert.equal(c.length, 3);
  assert.deepEqual(c.map(x => [x.ok, x.oculto]), [[true, false], [false, false], [true, true]]);
  assert.equal(c[1].mensaje, 'MainActivity cambia la energía & la posición');
});

async function conApi(opts, f) {
  const { servidor } = crearApi({ retos: RETOS, origenes: ['https://classbots.eehub.ing'], ...opts });
  await new Promise(r => servidor.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${servidor.address().port}`;
  try { await f(base); } finally { servidor.close(); }
}
const ORIGEN = { origin: 'https://classbots.eehub.ing', 'content-type': 'application/json' };

test('la API encola, responde con CORS y entrega el resultado', async () => {
  await conApi({ evaluar: async e => ({ estado: 'listo', compilo: true, casos: [{ nombre: e.reto, ok: true }] }) }, async base => {
    const r = await fetch(`${base}/kotlin/evaluar`, { method: 'POST', headers: ORIGEN, body: JSON.stringify({ reto: 'kotlin-modelo', archivos: { 'Robot.kt': 'class Robot' } }) });
    assert.equal(r.status, 202);
    assert.equal(r.headers.get('access-control-allow-origin'), 'https://classbots.eehub.ing');
    const { id } = await r.json();
    let e;
    for (let k = 0; k < 20; k++) { e = await (await fetch(`${base}/kotlin/estado/${id}`, { headers: ORIGEN })).json(); if (e.estado === 'listo') break; await new Promise(z => setTimeout(z, 10)); }
    assert.equal(e.estado, 'listo');
    assert.equal(e.resultado.casos[0].nombre, 'kotlin-modelo');
  });
});

test('rechaza otros orígenes y deja un solo intento activo por estudiante', async () => {
  let soltar; const bloqueo = new Promise(r => { soltar = r; });
  await conApi({ evaluar: () => bloqueo.then(() => ({ estado: 'listo', casos: [] })) }, async base => {
    const malo = await fetch(`${base}/kotlin/evaluar`, { method: 'POST', headers: { ...ORIGEN, origin: 'https://otro.sitio' }, body: '{}' });
    assert.equal(malo.status, 403);
    const envio = { method: 'POST', headers: ORIGEN, body: JSON.stringify({ reto: 'kotlin-modelo', alumno: 'ana', archivos: { 'Robot.kt': 'x' } }) };
    const a = await (await fetch(`${base}/kotlin/evaluar`, envio)).json();
    const b = await (await fetch(`${base}/kotlin/evaluar`, envio)).json();
    assert.equal(b.id, a.id);
    assert.equal(b.repetido, true);
    soltar();
  });
});
