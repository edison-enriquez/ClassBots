import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarEnvio, prepararFuente, parsearErrores, parsearJUnit, crearApi, PAQUETE, restaurarSlot, crearVigilante, matarRestos } from '../servidor.mjs';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm, appendFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';

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

/* ---------- Aislamiento entre intentos ---------- */
const temporal = () => mkdtemp(path.join(tmpdir(), 'juez-'));
async function escribir(base, archivos) {
  for (const [f, t] of Object.entries(archivos)) { await mkdir(path.dirname(path.join(base, f)), { recursive: true }); await writeFile(path.join(base, f), t); }
}

test('restaurar el slot deshace lo que dejó el intento anterior y conserva las salidas de compilación', async () => {
  const dir = await temporal();
  const plantilla = path.join(dir, 'plantilla'), slot = path.join(dir, 'slot1');
  await escribir(plantilla, { 'gradlew': 'ok', 'gradle.properties': 'limpio', 'app/build.gradle.kts': 'limpio', 'app/src/main/AndroidManifest.xml': 'm', 'app/build/basura': 'no se copia', '.gradle/x': 'no se copia' });
  await restaurarSlot(slot, plantilla);
  assert.ok(!existsSync(path.join(slot, 'app/build/basura')), 'no copia las salidas locales de la plantilla');
  assert.ok(existsSync(path.join(slot, 'tmp')));
  // Lo que podría dejar un estudiante
  await escribir(slot, {
    'gradle.properties': 'org.gradle.jvmargs=-javaagent:/tmp/x.jar', 'app/build.gradle.kts': 'envenenado', 'init.gradle': 'x', 'buildSrc/a.kt': 'x',
    'app/otro.gradle': 'x', 'app/src/main/java/com/classbots/taller/Viejo.kt': 'x', 'app/src/test/resources/x': 'x', 'tmp/libnativa.so': 'x',
    'app/build/salida.class': 'compilado', '.gradle/historial': 'h',
  });
  await restaurarSlot(slot, plantilla);
  assert.equal(await readFile(path.join(slot, 'gradle.properties'), 'utf8'), 'limpio');
  assert.equal(await readFile(path.join(slot, 'app/build.gradle.kts'), 'utf8'), 'limpio');
  for (const f of ['init.gradle', 'buildSrc', 'app/otro.gradle', 'app/src/main/java', 'app/src/test', 'tmp/libnativa.so']) assert.ok(!existsSync(path.join(slot, f)), `debe borrar ${f}`);
  assert.ok(existsSync(path.join(slot, 'app/src/main/AndroidManifest.xml')));
  assert.ok(existsSync(path.join(slot, 'app/build/salida.class')), 'conserva app/build');
  assert.ok(existsSync(path.join(slot, '.gradle/historial')), 'conserva .gradle');
  await rm(dir, { recursive: true, force: true });
});

test('el vigilante detecta jars cambiados y scripts de inicio, y acepta archivos nuevos', async () => {
  const casa = await temporal();
  await escribir(casa, { 'caches/transforms/a/junit.jar': 'original', 'native/lib.so': 'n', 'wrapper/dists/gradle/lib/g.jar': 'g', 'caches/x.lock': 'l' });
  const v = crearVigilante(casa);
  assert.equal(await v.fijar(), 3);
  await escribir(casa, { 'caches/transforms/b/nuevo.jar': 'legítimo', 'caches/x.lock': 'cambia siempre' });
  assert.deepEqual(await v.revisar(), [], 'archivos nuevos y locks no son alarma');
  await appendFile(path.join(casa, 'caches/transforms/a/junit.jar'), 'veneno');
  assert.deepEqual(await v.revisar(), ['cambió caches/transforms/a/junit.jar']);
  const v2 = crearVigilante(casa); await v2.fijar();
  await escribir(casa, { 'init.d/robar.gradle': 'x' });
  assert.deepEqual(await v2.revisar(), ['apareció init.d']);
  // Mismo tamaño y mismo mtime no bastan para esconder un cambio: se mira el ctime
  await rm(path.join(casa, 'init.d'), { recursive: true });
  const v3 = crearVigilante(casa); await v3.fijar();
  await new Promise(r => setTimeout(r, 20));
  await writeFile(path.join(casa, 'native/lib.so'), 'm');
  assert.deepEqual(await v3.revisar(), ['cambió native/lib.so']);
  await rm(casa, { recursive: true, force: true });
});

test('mata los procesos que el intento dejó corriendo dentro del slot', { skip: !existsSync('/proc') }, async () => {
  const slot = await temporal(), afuera = await temporal();
  const resto = spawn('sleep', ['30'], { cwd: path.join(slot), stdio: 'ignore' });
  const vecino = spawn('sleep', ['30'], { cwd: afuera, stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 100));
  const salio = new Promise(r => resto.on('exit', r));
  assert.equal(await matarRestos(slot), 1);
  await salio;
  assert.equal(vecino.exitCode, null, 'no toca procesos de otros slots');
  vecino.kill('SIGKILL');
  await rm(slot, { recursive: true, force: true }); await rm(afuera, { recursive: true, force: true });
});

test('worker: un intento que toca la casa de Gradle se anula y el siguiente arranca de un slot limpio', { skip: process.platform === 'win32' }, async () => {
  const { crearWorker } = await import('../servidor.mjs');
  const dir = await temporal();
  const plantilla = path.join(dir, 'plantilla'), retos = path.join(dir, 'retos'), casa = path.join(dir, 'casa'), base = path.join(dir, 'base');
  // gradlew falso: «compila» y escribe un resultado JUnit. Si el código trae una ruta tras «VENENO:», escribe ahí
  // (como haría un estudiante desde su prueba) y además deja un build.gradle.kts envenenado en el slot.
  await escribir(plantilla, {
    'gradlew': `#!/bin/sh
f=app/src/main/java/com/classbots/taller/Robot.kt
v=$(sed -n 's/.*VENENO:\\([^ ]*\\).*/\\1/p' $f)
if [ -n "$v" ]; then mkdir -p "$v"; echo veneno > app/build.gradle.kts; fi
grep -q veneno app/build.gradle.kts && exit 3
mkdir -p app/build/test-results/testDebugUnitTest
echo '<testsuite><testcase name="pasa" classname="com.classbots.taller.ModeloTest"/></testsuite>' > app/build/test-results/testDebugUnitTest/TEST-a.xml
`,
    'app/build.gradle.kts': 'limpio', 'gradle.properties': 'x',
  });
  await (await import('node:fs/promises')).chmod(path.join(plantilla, 'gradlew'), 0o755);
  await escribir(retos, { 'kotlin-modelo/pruebas/ModeloTest.kt': 'class ModeloTest' });
  await escribir(base, { 'wrapper/dists/g/lib/gradle.jar': 'g' });
  const w = crearWorker({ plantilla, retosDir: retos, trabajo: path.join(dir, 't'), slots: 1, casa, casaBase: base, vigilar: true });
  await w.preparar();
  assert.ok(existsSync(path.join(casa, 'wrapper/dists/g/lib/gradle.jar')), 'copia la casa de la imagen');
  assert.equal(await w.fijarVigilante(), 1);

  const bien = await w.evaluar({ reto: 'kotlin-modelo', archivos: { 'Robot.kt': 'class Robot' } });
  assert.equal(bien.casos.length, 1); assert.equal(w.estado.contaminado, null);

  const malo = await w.evaluar({ reto: 'kotlin-modelo', archivos: { 'Robot.kt': `// VENENO:${casa}/init.d` } });
  assert.match(malo.fallo, /no cuenta/); assert.equal(malo.casos.length, 0);
  assert.deepEqual(w.estado.contaminado, ['apareció init.d']);

  // El build.gradle.kts envenenado no llega al siguiente estudiante
  await rm(path.join(casa, 'init.d'), { recursive: true });
  const otro = await w.evaluar({ reto: 'kotlin-modelo', archivos: { 'Robot.kt': 'class Robot' } });
  assert.equal(otro.casos.length, 1);
  assert.equal(await readFile(path.join(dir, 't/slot1/app/build.gradle.kts'), 'utf8'), 'limpio');
  await rm(dir, { recursive: true, force: true });
});
