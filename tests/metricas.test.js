import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NIVELES } from '../src/levels/niveles.js';
import { evaluarNivel } from '../src/levels/evaluar.js';
import {
  metricasVacias, registrarResultado, registrarTiempo, registrarPista, registrarEscritura, registrarSenales, resumen, exportar, leerArchivo,
  aProgreso, abrirConLlave, fusionar, registrarEvento, cruzarArchivos, nuevoSegmento, contenidoSegmento, csvClase, csvDetalle, categoria, nombreArchivo, analizarEstilo, indiciosNivel,
} from '../src/metricas/metricas.js';
import { generarLlaves, cifrar, descifrar, crearClase, abrirClase, sellarPara, decodificarClase, codificarClase } from '../src/metricas/cifrado.js';

globalThis.performance ??= { now: () => Date.now() };
const n0 = NIVELES[0];
const llaves = await generarLlaves();

test('registra intentos, errores y el primer éxito de un capítulo', () => {
  let m = metricasVacias();
  m = registrarResultado(m, n0.id, evaluarNivel(n0, { 'Robot.java': 'public class Robot {' }, {}), false);
  m = registrarResultado(m, n0.id, evaluarNivel(n0, n0.inicial(), { incluirOcultas: true }), true);
  m = registrarPista(m, n0.id);
  m = registrarTiempo(m, n0.id, 90000);
  m = registrarResultado(m, n0.id, evaluarNivel(n0, n0.solucion, { incluirOcultas: true }), true);
  m = registrarResultado(m, n0.id, evaluarNivel(n0, n0.solucion, { incluirOcultas: true }), true);
  const x = m.niveles[n0.id];
  assert.equal(x.ejecuciones, 1); assert.equal(x.envios, 3); assert.equal(x.enviosFallidos, 1);
  assert.equal(x.compilacion, 1); assert.equal(x.pistas, 1); assert.equal(x.tiempo, 90000);
  assert.equal(x.intentosHastaExito, 3); assert.equal(x.fallidosAntesDeExito, 1);
});

test('clasifica errores por concepto', () => {
  assert.equal(categoria('Parece que falta ; al final de esta línea.'), 'sintaxis');
  assert.equal(categoria('energia es private en Maquina: Robot lo hereda…'), 'encapsulamiento');
  assert.equal(categoria('ClassCastException: el objeto es un Robot…'), 'polimorfismo');
  assert.equal(categoria('NullPointerException: estás usando un objeto que todavía es null.'), 'null');
  assert.equal(categoria('Maquina no tiene constructor sin parámetros: empieza este constructor con super(nombre);'), 'herencia');
});

test('cifrado: solo la llave privada correcta abre el sobre', async () => {
  const sobre = await cifrar({ secreto: 42, texto: 'ñandú' }, llaves.publica);
  assert.ok(!JSON.stringify(sobre).includes('42') || !JSON.stringify(sobre).includes('ñandú'));
  assert.deepEqual(await descifrar(sobre, llaves.privada), { secreto: 42, texto: 'ñandú' });
  const otra = await generarLlaves();
  await assert.rejects(() => descifrar(sobre, otra.privada));
});

test('escritura, rasgos de estilo e indicios de copia', () => {
  let m = metricasVacias();
  m = registrarEscritura(m, n0.id, { tipo: 'teclado', teclas: 10, n: 30 });
  m = registrarEscritura(m, n0.id, { tipo: 'pegado', n: 400, externo: true, trasSalir: true });
  m = registrarEscritura(m, n0.id, { tipo: 'pegado', n: 20, externo: false });
  m = registrarSenales(m, n0.id, analizarEstilo({ 'A.java': '/** Returns the value */\nint calculateTotal = lista.stream().map(x -> x).count();' }, {}));
  const x = m.niveles[n0.id];
  assert.equal(x.tecleados, 30); assert.equal(x.pegados, 2); assert.equal(x.externosChars, 400); assert.equal(x.pegadosTrasSalir, 1); assert.equal(x.pegadoMayor, 400);
  assert.deepEqual(Object.keys(x.senales).sort(), ['identificadores', 'ingles', 'javadoc', 'lambda', 'streams']);
  const ind = indiciosNivel(x);
  assert.ok(ind.length >= 3, ind.join(' | '));
  // El código que venía en el inicio no cuenta como rasgo del estudiante
  assert.deepEqual(analizarEstilo({ 'A.java': 'x -> y' }, { 'A.java': 'x -> y' }), []);
  const r = resumen({ progreso: { hechos: [] }, metricas: m });
  assert.equal(r.indicios.nivel !== 'bajo', true);
});

test('fusionar segmentos conserva los intentos hasta el primer éxito', () => {
  let a = metricasVacias(), b = metricasVacias();
  a = registrarResultado(a, n0.id, evaluarNivel(n0, n0.inicial(), { incluirOcultas: true }), true);
  a = registrarTiempo(a, n0.id, 60000);
  b = registrarResultado(b, n0.id, evaluarNivel(n0, n0.solucion, { incluirOcultas: true }), true);
  b = registrarTiempo(b, n0.id, 30000);
  const f = fusionar([a, b]).niveles[n0.id];
  assert.equal(f.envios, 2); assert.equal(f.intentosHastaExito, 2); assert.equal(f.fallidosAntesDeExito, 1); assert.equal(f.tiempo, 90000);
});

const progresoBase = () => ({ nivelId: NIVELES[1].id, hechos: [n0.id], pasosHechos: [], misionesHechas: [], codigo: { [n0.id]: { files: n0.solucion, activo: 'Robot.java' } }, perfil: { nombre: 'Ana María Pérez', grupo: 'G1', id: 'abc123' } });

test('exportar: el archivo no deja leer las métricas, pero el profesor sí', async () => {
  let met = registrarTiempo(metricasVacias(), n0.id, 600000);
  met = registrarResultado(met, n0.id, evaluarNivel(n0, n0.solucion, { incluirOcultas: true }), true);
  const prog = { ...progresoBase(), metricas: met, segmentos: [] };
  const sobre = await cifrar(contenidoSegmento(prog, nuevoSegmento([])), llaves.publica);
  const archivo = exportar(prog, [sobre]);
  const texto = JSON.stringify(archivo);
  assert.ok(!/tiempoTotal|intentosHastaExito|tecleados|600000/.test(texto), 'las métricas no deben ir en claro');
  const d = leerArchivo(texto);
  assert.equal(d.integro, true);
  // Otro computador: continúa con los segmentos cifrados
  const p = aProgreso(d, { profe: false });
  assert.deepEqual(p.hechos, [n0.id]); assert.equal(p.segmentos.length, 1); assert.deepEqual(p.metricas.niveles, {});
  // Profesor
  const abierto = await abrirConLlave(d, { rsa: llaves.privada });
  assert.deepEqual(abierto.problemas, []);
  assert.equal(abierto.metricas.niveles[n0.id].tiempo, 600000);
  const r = resumen({ progreso: d.progreso, metricas: abierto.metricas });
  assert.equal(r.capitulos, 1); assert.equal(r.primerEnvio, 100);
  const csv = csvClase([{ ...d, r, problemas: abierto.problemas }]);
  assert.match(csv, /Ana María Pérez;G1;1;/); assert.match(csv, /sin problemas/);
  assert.match(csvDetalle([{ ...d, r }]), /1\.1;/);
  // Llave equivocada y archivo editado a mano
  const otra = await generarLlaves();
  assert.match((await abrirConLlave(d, { rsa: otra.privada })).problemas.join(), /no se pudo descifrar/);
  const editado = leerArchivo(JSON.stringify({ ...archivo, progreso: { ...archivo.progreso, hechos: [n0.id, NIVELES[1].id] } }));
  assert.equal(editado.integro, false);
  const pe = (await abrirConLlave(editado, { rsa: llaves.privada })).problemas.join(' | ');
  assert.match(pe, /editado fuera/); assert.match(pe, /superados sin registro/);
  assert.throws(() => leerArchivo('{"hola":1}'), /no es un avance/);
  assert.equal(nombreArchivo({ nombre: 'Ana María Pérez', grupo: 'G1' }).replace(/_\d{4}-\d\d-\d\d/, ''), 'ClassBots_Ana_Maria_Perez_G1.json');
});

test('clases: el profesor lee las métricas solo con su contraseña y el historial registra cambios de nombre', async () => {
  const clase = await crearClase({ nombre: 'POO G1', docente: 'Edison', contrasena: 'una frase larga' });
  const enLink = decodificarClase('https://x.test/?clase=' + codificarClase(clase));
  assert.equal(enLink.id, clase.id);
  let met = registrarEvento(metricasVacias(), { tipo: 'alta', nombre: 'Ana', perfilId: 'p1' });
  met = registrarEvento(met, { tipo: 'perfil', de: 'Ana', a: 'Luis' });
  met = registrarResultado(met, n0.id, evaluarNivel(n0, n0.solucion, { incluirOcultas: true }), true);
  const prog = { ...progresoBase(), perfil: { nombre: 'Luis', id: 'p1' }, clase: enLink, metricas: met, segmentos: [] };
  const sobre = await sellarPara(contenidoSegmento(prog, nuevoSegmento([])), prog.clase);
  const d = leerArchivo(JSON.stringify(exportar(prog, [sobre])));
  assert.equal(d.integro, true); assert.equal(d.clase.id, clase.id);
  const sin = await abrirConLlave(d, {});
  assert.equal(sin.leidos, 0); assert.deepEqual(sin.faltan, [clase.id]);
  await assert.rejects(() => abrirClase(d.clase, 'otra cosa'), /Contraseña incorrecta/);
  const priv = await abrirClase(d.clase, 'una frase larga');
  const x = await abrirConLlave(d, { clases: { [clase.id]: priv } });
  assert.equal(x.metricas.niveles[n0.id].envios, 1);
  assert.match(x.problemas.join(' | '), /cambió su nombre 1 vez/);
  assert.deepEqual(x.metricas.eventos.map(e => e.tipo), ['alta', 'perfil']);
  // Al cargarlo en otro equipo queda anotado
  const p2 = aProgreso(d, { perfil: { nombre: 'Otro' } });
  assert.equal(p2.clase.id, clase.id); assert.equal(p2.pendientes[0].tipo, 'carga');
});

test('cruces: mismo perfil con dos nombres, sesiones compartidas y código idéntico', () => {
  const codigo = { files: { 'Robot.java': 'public class Robot {\n  // escrito por el estudiante\n' + '  private int x = 1;\n'.repeat(12) + '}' } };
  const base = (nombre, id, sesiones, iv) => ({ perfil: { nombre, id }, segmentos: [{ iv }], sesiones, dispositivos: ['pc1'], progreso: { codigo: { [n0.id]: codigo } } });
  const a = base('Ana', 'p1', ['s1'], 'iv1'), b = base('Luis', 'p1', ['s1'], 'iv1'), c = base('Carla', 'p2', ['s1'], 'iv9'), dd = base('Dani', 'p3', ['s7'], 'iv7');
  const cr = cruzarArchivos([a, b, c, dd]);
  const txt = e => cr.get(e).map(x => x.txt).join(' | ');
  assert.match(txt(a), /mismo perfil que «Luis»/);
  assert.match(txt(c), /comparte 1 sesión\(es\) de trabajo con «Ana»/);
  assert.match(txt(dd), /código idéntico a «Ana» en 1\.1/);
  assert.match(txt(dd), /mismo computador/);
  const e1 = { perfil: { nombre: 'Eva', id: 'p8' }, segmentos: [], progreso: { codigo: { [n0.id]: { files: { 'Robot.java': 'public class Robot {\n  // este robot lo programé yo solita en la noche\n}' } } } } };
  const e2 = { perfil: { nombre: 'Flor', id: 'p9' }, segmentos: [], progreso: { codigo: { [n0.id]: { files: { 'Robot.java': 'public class Robot{\n// Este robot lo programé yo solita en la noche\n}' } } } } };
  assert.match(cruzarArchivos([e1, e2]).get(e1).map(x => x.txt).join(), /comentarios idénticos/);
});
