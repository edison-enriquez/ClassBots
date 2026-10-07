import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { crearServidor, claseValida } from '../servidor.js';
import { crearClase, abrirClase, firmarReto, cifrarParaClase, abrirSobre, clasePublica } from '../../src/metricas/cifrado.js';

let srv, url, clase, priv, otra;
const ident = c => ({ id: c.id, pub: c.pub, firma: c.firma });

before(async () => {
  srv = crearServidor({ puerto: 0, bd: ':memory:', origenes: ['https://classbots.test'] });
  url = `ws://127.0.0.1:${await srv.escuchar()}/aula`;
  clase = clasePublica(await crearClase({ nombre: 'POO G1', contrasena: 'clase secreta 1', aula: url }));
  priv = await abrirClase(clase, 'clase secreta 1');
  otra = clasePublica(await crearClase({ nombre: 'Otra', contrasena: 'otra clase 123' }));
});
after(() => srv.cerrar());

/* Cliente de prueba: guarda los mensajes y permite esperar uno */
function cliente(origen = 'https://classbots.test') {
  const ws = new WebSocket(url, { origin: origen });
  const msgs = [], esperas = [];
  ws.on('message', d => { const m = JSON.parse(d); msgs.push(m); esperas.splice(0).forEach(f => f()); });
  const cerrado = new Promise(r => ws.on('close', code => r(code)));
  const abierto = new Promise((r, x) => { ws.on('open', r); ws.on('error', x); });
  const esperar = (pred, ms = 3000) => new Promise((r, x) => {
    const t0 = Date.now();
    const mirar = () => { const m = msgs.find(pred); if (m) return r(m); if (Date.now() - t0 > ms) return x(new Error('tiempo agotado')); esperas.push(mirar); setTimeout(mirar, 50); };
    mirar();
  });
  return { ws, msgs, esperar, cerrado, abierto, mandar: m => ws.send(JSON.stringify(m)) };
}
async function profesor(c = clase, p = priv) {
  const x = cliente();
  const { reto } = await x.esperar(m => m.t === 'reto');
  x.mandar({ t: 'hola', rol: 'profesor', clase: ident(c), firma: await firmarReto(p, c.id, reto) });
  await x.esperar(m => m.t === 'listo');
  return x;
}
async function estudiante(alumno, c = clase) {
  const x = cliente();
  await x.esperar(m => m.t === 'reto');
  x.mandar({ t: 'hola', rol: 'estudiante', clase: ident(c), alumno });
  await x.esperar(m => m.t === 'listo');
  return x;
}

test('el id de la clase queda ligado a sus llaves públicas', () => {
  assert.ok(claseValida(clase));
  assert.ok(!claseValida({ ...clase, firma: otra.firma }), 'otra llave de firma con el mismo id');
  assert.ok(!claseValida({ ...clase, id: otra.id }));
});

test('sin la contraseña de la clase no se entra como profesor', async () => {
  const x = cliente();
  const { reto } = await x.esperar(m => m.t === 'reto');
  const privOtra = await abrirClase(otra, 'otra clase 123');
  // Firma con la llave de otra clase
  x.mandar({ t: 'hola', rol: 'profesor', clase: ident(clase), firma: await firmarReto({ ...privOtra }, clase.id, reto) });
  assert.equal(await x.cerrado, 4003);
  // Firma de un reto distinto (repetición)
  const y = cliente();
  await y.esperar(m => m.t === 'reto');
  y.mandar({ t: 'hola', rol: 'profesor', clase: ident(clase), firma: await firmarReto(priv, clase.id, 'otro-reto') });
  assert.equal(await y.cerrado, 4003);
});

test('origen no permitido: se rechaza la conexión', async () => {
  const x = cliente('https://otro-sitio.test');
  await assert.rejects(x.abierto);
});

test('el profesor recibe en vivo, el historial y los mensajes llegan al estudiante', async () => {
  const p = await profesor();
  const e = await estudiante('ana123');
  await p.esperar(m => m.t === 'presencia' && m.alumno === 'ana123' && m.conectado);
  const sobre = await cifrarParaClase({ nivel: '1.2', codigo: 'class Robot {}' }, clase);
  e.mandar({ t: 'sobre', clave: 'vivo', sobre, n: 1 });
  await e.esperar(m => m.t === 'ack' && m.n === 1);
  const llegado = await p.esperar(m => m.t === 'sobre' && m.alumno === 'ana123');
  assert.deepEqual(await abrirSobre(llegado.sobre, { clases: { [clase.id]: priv } }), { nivel: '1.2', codigo: 'class Robot {}' });

  // Un sobre de otra clase no se guarda
  e.mandar({ t: 'sobre', clave: 'archivo', sobre: await cifrarParaClase({ x: 1 }, otra), n: 2 });
  e.mandar({ t: 'sobre', clave: 'cualquiera', sobre, n: 3 });

  // Mensaje del profesor
  p.mandar({ t: 'mensaje', para: 'ana123', texto: 'Revisa el constructor' });
  assert.equal((await e.esperar(m => m.t === 'mensaje')).texto, 'Revisa el constructor');
  assert.equal((await p.esperar(m => m.t === 'enviado')).n, 1);

  // Otro profesor (otra pestaña) recibe el historial guardado: solo el sobre válido
  const p2 = await profesor();
  const h = await p2.esperar(m => m.t === 'historial' && m.fin);
  assert.equal(h.filas.length, 1);
  assert.equal(h.filas[0].clave, 'vivo');
  assert.ok(p2.msgs.find(m => m.t === 'listo').presentes.includes('ana123'));

  e.ws.close();
  await p.esperar(m => m.t === 'presencia' && m.alumno === 'ana123' && !m.conectado);
  p.ws.close(); p2.ws.close();
});

test('un estudiante no puede hacerse pasar por profesor ni enviar mensajes', async () => {
  const p = await profesor();
  const e = await estudiante('beto99');
  e.mandar({ t: 'mensaje', para: '*', texto: 'hackeado' });
  const e2 = await estudiante('caro77');
  await new Promise(r => setTimeout(r, 300));
  assert.ok(!e2.msgs.some(m => m.t === 'mensaje'));
  // El servidor nunca reenvía sobres a estudiantes
  e2.mandar({ t: 'sobre', clave: 'vivo', sobre: await cifrarParaClase({ a: 1 }, clase), n: 1 });
  await p.esperar(m => m.t === 'sobre' && m.alumno === 'caro77');
  await new Promise(r => setTimeout(r, 200));
  assert.ok(!e.msgs.some(m => m.t === 'sobre'));
  [p, e, e2].forEach(x => x.ws.close());
});
