import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearClase, abrirClase, actualizarClase, clasePublica, tieneAula, idDeClase, decodificarClase, codificarClase } from '../src/metricas/cifrado.js';
import { abrirConAnteriores } from '../src/metricas/clasesLocales.js';

/* Una clase como las de antes del aula en vivo: sin llave de firma, con id aleatorio */
async function claseAntigua(pass) {
  const c = await crearClase({ nombre: 'POO 2026-1', docente: 'Edison', contrasena: pass, aula: '' });
  const { f, fiv, ...llave } = c.llave;
  const { firma, ...resto } = c;
  return { ...resto, id: 'viejaAB1', llave };
}

test('una clase antigua se actualiza: nueva clase con aula que la reemplaza, misma contraseña', async () => {
  const vieja = await claseAntigua('clave del curso');
  assert.ok(!tieneAula(vieja));
  await assert.rejects(actualizarClase(vieja, 'otra clave', 'wss://aula.x/aula'), /Contraseña incorrecta/);
  const nueva = await actualizarClase(vieja, 'clave del curso', 'wss://aula.x/aula');
  assert.ok(tieneAula(nueva));
  assert.equal(nueva.reemplaza, vieja.id);
  assert.equal(nueva.nombre, vieja.nombre);
  assert.equal(nueva.id, await idDeClase(nueva.pub, nueva.firma));
  // El enlace conserva «reemplaza»
  assert.equal(decodificarClase('https://x/?clase=' + codificarClase(nueva)).reemplaza, vieja.id);
  // Con la contraseña se abren las dos
  const llaves = await abrirConAnteriores(nueva, 'clave del curso', [vieja, nueva]);
  assert.deepEqual(Object.keys(llaves).sort(), [nueva.id, vieja.id].sort());
});

test('una clase nueva sin servidor solo recibe el aula (mismo id)', async () => {
  const c = clasePublica(await crearClase({ nombre: 'G2', contrasena: 'clave del curso', aula: '' }));
  const n = await actualizarClase(c, 'clave del curso', 'wss://aula.x/aula');
  assert.equal(n.id, c.id);
  assert.equal(n.aula, 'wss://aula.x/aula');
  assert.ok(!n.reemplaza);
  assert.ok((await abrirClase(n, 'clave del curso')).firma);
});
