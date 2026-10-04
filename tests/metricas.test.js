import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NIVELES } from '../src/levels/niveles.js';
import { evaluarNivel } from '../src/levels/evaluar.js';
import { metricasVacias, registrarResultado, registrarTiempo, registrarPista, resumen, exportar, leerArchivo, aProgreso, csvClase, csvDetalle, categoria, nombreArchivo } from '../src/metricas/metricas.js';

globalThis.performance ??= { now: () => Date.now() };
const n0 = NIVELES[0];

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
  assert.ok(x.primerExito);
  assert.equal(m.tiempoTotal, 90000);
});

test('clasifica errores por concepto', () => {
  assert.equal(categoria('Parece que falta ; al final de esta línea.'), 'sintaxis');
  assert.equal(categoria('energia es private en Maquina: Robot lo hereda…'), 'encapsulamiento');
  assert.equal(categoria('ClassCastException: el objeto es un Robot…'), 'polimorfismo');
  assert.equal(categoria('NullPointerException: estás usando un objeto que todavía es null.'), 'null');
  assert.equal(categoria('Maquina no tiene constructor sin parámetros: empieza este constructor con super(nombre);'), 'herencia');
});

const prog = () => {
  let met = registrarTiempo(metricasVacias(), n0.id, 600000);
  met = registrarResultado(met, n0.id, evaluarNivel(n0, n0.solucion, { incluirOcultas: true }), true);
  return { nivelId: NIVELES[1].id, hechos: [n0.id], pasosHechos: [], misionesHechas: [], codigo: { [n0.id]: { files: n0.solucion, activo: 'Robot.java' } }, perfil: { nombre: 'Ana María Pérez', grupo: 'G1', id: 'abc123' }, metricas: met };
};

test('exportar y volver a cargar conserva todo y valida la firma', () => {
  const archivo = exportar(prog());
  const d = leerArchivo(JSON.stringify(archivo));
  assert.equal(d.integro, true);
  assert.equal(d.resumen.capitulos, 1);
  const p = aProgreso(d, { profe: false, asistente: 'basico' });
  assert.deepEqual(p.hechos, [n0.id]);
  assert.equal(p.perfil.alterado, false);
  assert.equal(p.metricas.niveles[n0.id].tiempo, 600000);
  // Un archivo editado a mano se detecta y queda marcado
  const editado = { ...archivo, progreso: { ...archivo.progreso, hechos: NIVELES.map(n => n.id) } };
  const d2 = leerArchivo(JSON.stringify(editado));
  assert.equal(d2.integro, false);
  assert.equal(aProgreso(d2, {}).perfil.alterado, true);
  assert.throws(() => leerArchivo('{"hola":1}'), /no es un avance/);
});

test('resumen y CSV para el profesor', () => {
  const d = leerArchivo(JSON.stringify(exportar(prog())));
  const r = resumen(d);
  assert.equal(r.capitulos, 1); assert.equal(r.primerEnvio, 100); assert.equal(r.intentosPromedio, 1);
  const est = [{ ...d, r }];
  const csv = csvClase(est), det = csvDetalle(est);
  assert.match(csv, /Ana María Pérez;G1;1;/);
  assert.match(csv, /;sí\s*$/);
  assert.match(det, /1\.1;/);
  assert.equal(nombreArchivo({ nombre: 'Ana María Pérez', grupo: 'G1' }).replace(/_\d{4}-\d\d-\d\d/, ''), 'ClassBots_Ana_Maria_Perez_G1.json');
});
