import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearClase, abrirClase, idDeClase, firmarReto, textoReto, clasePublica, tieneAula, codificarClase, decodificarClase, deB64u } from '../src/metricas/cifrado.js';
import { urlAula, comprimir, descomprimir } from '../src/aula/conexion.js';

test('clase con aula: llave de firma, id derivado y enlace que conserva todo', async () => {
  const c = await crearClase({ nombre: 'POO', contrasena: 'una clave larga', aula: 'api.ejemplo.com' });
  assert.equal(c.id, await idDeClase(c.pub, c.firma));
  assert.ok(tieneAula(c));
  const d = decodificarClase('https://x/?clase=' + codificarClase(c));
  assert.deepEqual(d, clasePublica(c));
  const priv = await abrirClase(d, 'una clave larga');
  assert.ok(priv.firma?.d);
  const firma = await firmarReto(priv, c.id, 'reto123');
  const k = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', ...c.firma }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  assert.ok(await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, k, deB64u(firma), new TextEncoder().encode(textoReto(c.id, 'reto123'))));
  await assert.rejects(abrirClase(d, 'otra clave larga'), /Contraseña incorrecta/);
});

test('clases sin servidor o antiguas: sin aula en vivo', async () => {
  const c = await crearClase({ nombre: 'Sin aula', contrasena: 'una clave larga', aula: '' });
  assert.ok(!tieneAula(c));
  assert.ok(!('aula' in clasePublica(c)));
  const vieja = { ...clasePublica(c), firma: undefined, aula: 'api.x' };
  assert.ok(!tieneAula(vieja));
});

test('url del aula y compresión del archivo', () => {
  assert.equal(urlAula('api.ejemplo.com'), 'wss://api.ejemplo.com/aula');
  assert.equal(urlAula('https://api.ejemplo.com/'), 'wss://api.ejemplo.com/aula');
  assert.equal(urlAula('ws://127.0.0.1:8787'), 'ws://127.0.0.1:8787/aula');
  assert.equal(urlAula('wss://a.b/aula'), 'wss://a.b/aula');
  const o = { perfil: { nombre: 'Ana Pérez' }, codigo: 'class Robot { }'.repeat(200) };
  const z = comprimir(o);
  assert.ok(z.z.length < JSON.stringify(o).length / 5);
  assert.deepEqual(descomprimir(z), o);
});
