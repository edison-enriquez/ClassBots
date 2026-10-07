import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as Y from 'yjs';
import { crearClase, abrirClase, clasePublica } from '../src/metricas/cifrado.js';
import { crearInvitacion, invitacionValida, parEfimero, llaveSesion, crearCanal, docDesdeArchivos, archivosDeDoc, reemplazarEnDoc } from '../src/aula/pareja.js';

const espera = ms => new Promise(r => setTimeout(r, ms));

test('la invitación solo vale si la firmó el profesor de la clase, para ese estudiante', async () => {
  const clase = clasePublica(await crearClase({ nombre: 'POO', contrasena: 'clave larga 1', aula: 'x' }));
  const priv = await abrirClase(clase, 'clave larga 1');
  const otra = await crearClase({ nombre: 'Otra', contrasena: 'clave larga 2', aula: 'x' });
  const { mensaje } = await crearInvitacion(clase, priv, 'ana1');
  assert.ok(await invitacionValida(clase, 'ana1', mensaje));
  assert.ok(!(await invitacionValida(clase, 'beto2', mensaje)), 'otro estudiante');
  const falsa = (await crearInvitacion(otra, await abrirClase(otra, 'clave larga 2'), 'ana1')).mensaje;
  assert.ok(!(await invitacionValida(clase, 'ana1', falsa)), 'firmada por otra clase');
  assert.ok(!(await invitacionValida(clase, 'ana1', { ...mensaje, pub: (await parEfimero()).pub })), 'llave cambiada en el camino');
});

test('el código se sincroniza en ambos sentidos, cifrado, y Reiniciar se propaga', async () => {
  const s = 'sesion1';
  const prof = await parEfimero(), est = await parEfimero();
  const [kp, ke] = await Promise.all([llaveSesion(prof.priv, est.pub, s), llaveSesion(est.priv, prof.pub, s)]);
  const visto = [];
  let aProf, aEst;
  const canalE = crearCanal({ llave: ke, sesion: s, enviar: d => { visto.push(JSON.stringify(d)); aProf(d); }, doc: docDesdeArchivos({ 'Robot.java': 'class Robot {}', 'Main.java': '' }), usuario: { name: 'Ana' } });
  const canalP = crearCanal({ llave: kp, sesion: s, enviar: d => { visto.push(JSON.stringify(d)); aEst(d); }, usuario: { name: 'Profe' } });
  aProf = d => canalP.recibir(d); aEst = d => canalE.recibir(d);
  await canalE.enviarTodo();
  await espera(50);
  assert.equal(canalP.doc.getText('Robot.java').toString(), 'class Robot {}');
  canalP.doc.getText('Robot.java').insert(13, ' int energia; ');
  canalE.doc.getText('Main.java').insert(0, 'class Main {}');
  await espera(400);
  assert.deepEqual(archivosDeDoc(canalE.doc, ['Robot.java', 'Main.java']), archivosDeDoc(canalP.doc, ['Robot.java', 'Main.java']));
  assert.equal(canalE.doc.getText('Robot.java').toString(), 'class Robot { int energia; }');
  reemplazarEnDoc(canalE.doc, { 'Robot.java': 'class Robot { }' });
  await espera(300);
  assert.equal(canalP.doc.getText('Robot.java').toString(), 'class Robot { }');
  // El servidor nunca ve el código
  assert.ok(!visto.some(t => /Robot|energia|Main/.test(t)));
  // Otra sesión no puede inyectar cambios
  const intruso = new Y.Doc(); intruso.getText('Robot.java').insert(0, 'HACK');
  await canalE.recibir({ tipo: 'y', s, iv: 'AAAAAAAAAAAAAAAA', d: Buffer.from(Y.encodeStateAsUpdate(intruso)).toString('base64url') });
  assert.ok(!canalE.doc.getText('Robot.java').toString().includes('HACK'));
  canalE.cerrar(); canalP.cerrar();
});
