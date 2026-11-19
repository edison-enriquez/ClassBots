import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MVC } from '../src/levels/patron-mvc.js';
import { evaluarNivel } from '../src/levels/evaluar.js';
import { repasar } from '../src/engine/motor.js';

globalThis.performance ??= { now: () => Date.now() };

const [p1, p2, p3, p4] = MVC.pasos;
const juzgar = (paso, cambios) => evaluarNivel(paso, { ...paso.solucion, ...cambios }, { incluirOcultas: true });
const fallan = r => r.casos.filter(c => c.estado !== 'ok').map(c => c.nombre);
const cambiar = (paso, archivo, de, a) => { const t = paso.solucion[archivo]; assert.ok(t.includes(de), `${archivo} no contiene «${de}»`); return { [archivo]: t.replace(de, a) }; };

test('MVC: las cuatro soluciones pasan todos los casos, también los ocultos', () => {
  for (const p of MVC.pasos) {
    const r = juzgar(p, {});
    assert.equal(r.estado, 'ejecutado', `${p.id}: ${r.previo || r.errorEjecucion || ''}`);
    assert.deepEqual(fallan(r), [], p.id);
  }
});

test('MVC: cada capítulo arranca del anterior y pide primero lo que falta', () => {
  let prev;
  for (const p of MVC.pasos) {
    const ini = p.inicial(prev);
    for (const a of p.archivos) assert.ok(ini[a] != null, `${p.id}: falta ${a} en el código inicial`);
    const r = evaluarNivel(p, ini, { incluirOcultas: true });
    assert.equal(r.estado, 'previo', `${p.id} debería pedir estructura, no ${r.estado}`);
    prev = p.solucion;
  }
});

test('MVC 1 (Observer): un modelo que imprime o un controlador que imprime no pasan', () => {
  const modelo = juzgar(p1, cambiar(p1, 'Tanque.java', '        notificar();\n    }\n\n    public void vaciar()', '        System.out.println("bombeando");\n        notificar();\n    }\n\n    public void vaciar()'));
  assert.ok(fallan(modelo).includes('El modelo no imprime ni conoce el panel'), JSON.stringify(fallan(modelo)));
  const control = juzgar(p1, cambiar(p1, 'ControladorPanel.java', 'vista.aviso(e.getMessage());', 'System.out.println("Aviso: " + e.getMessage());'));
  assert.deepEqual(fallan(control), ['El controlador no imprime']);
});

test('MVC 1: sin enclavamiento el tanque se pasa de nivel', () => {
  const r = juzgar(p1, cambiar(p1, 'Tanque.java', '        if (nivel > 70) {\n            throw new IllegalStateException("nivel alto");\n        }\n', ''));
  assert.ok(fallan(r).includes('El enclavamiento protege el tanque'), JSON.stringify(fallan(r)));
});

test('MVC 1: un tanque que solo avisa a la primera vista no es Observer', () => {
  const r = juzgar(p1, cambiar(p1, 'Tanque.java', '        for (VistaTanque v : vistas) {\n            v.mostrar(etiqueta, nivel, cargas);\n        }', '        vistas.get(0).mostrar(etiqueta, nivel, cargas);'));
  assert.ok(fallan(r).includes('Observer: todas las vistas suscritas se enteran'), JSON.stringify(fallan(r)));
});

test('MVC 2 (Decorator): una alarma atada a VistaTexto no envuelve a cualquier indicador', () => {
  const r = juzgar(p2, { 'VistaConAlarma.java': p2.solucion['VistaConAlarma.java'].replace('private VistaTanque interna;', 'private VistaTexto interna;').replace('VistaConAlarma(VistaTanque interna)', 'VistaConAlarma(VistaTexto interna)') });
  assert.ok(r.estado !== 'ejecutado' || fallan(r).includes('VistaConAlarma guarda la vista que envuelve'), JSON.stringify(fallan(r)));
});

test('MVC 2: una alarma que imprime por su cuenta no pasa', () => {
  const r = juzgar(p2, cambiar(p2, 'VistaConAlarma.java', 'interna.aviso("nivel crítico: " + nivel + "%");', 'System.out.println("Aviso: nivel crítico: " + nivel + "%");'));
  const f = fallan(r);
  assert.ok(f.includes('La alarma no imprime ni nombra indicadores concretos'), JSON.stringify(f));
  // La salida de Main es idéntica: solo el diseño y los casos con otro indicador la delatan
  assert.ok(!f.includes('Texto con alarma y barra a la vez'), JSON.stringify(f));
  assert.ok(f.includes('La alarma envuelve un indicador que no conoce'), JSON.stringify(f));
});

test('MVC 2: una alarma que se traga los avisos del controlador no pasa', () => {
  const r = juzgar(p2, cambiar(p2, 'VistaConAlarma.java', '        interna.aviso(mensaje);', '        // nada'));
  assert.ok(fallan(r).includes('Los avisos del controlador siguen llegando'), JSON.stringify(fallan(r)));
});

test('MVC 3 (Strategy): un controlador que decide el modo con un if no pasa', () => {
  const r = juzgar(p3, cambiar(p3, 'ControladorPanel.java', '                modo.marcha(modelo);', '                if (modo instanceof ModoAuto && modelo.getNivel() > 70) {\n                    modelo.vaciar();\n                }\n                modelo.bombear();'));
  const f = fallan(r);
  assert.ok(f.includes('El controlador no nombra modos concretos ni imprime'), JSON.stringify(f));
  assert.ok(f.includes('Un modo desconocido entra sin tocar el controlador'), JSON.stringify(f));
});

test('MVC 3: un automático que bombea sin mirar el nivel dispara el enclavamiento', () => {
  const r = juzgar(p3, cambiar(p3, 'ModoAuto.java', '        if (tanque.getNivel() > 70) {\n            tanque.vaciar();\n        }\n', ''));
  assert.ok(fallan(r).includes('En automático, nunca se dispara'), JSON.stringify(fallan(r)));
});

test('MVC 3: también vale vaciar cuando el nivel llega a 100', () => {
  const r = juzgar(p3, cambiar(p3, 'ModoAuto.java', 'tanque.getNivel() > 70', 'tanque.getNivel() == 100'));
  assert.equal(r.estado, 'ejecutado');
  assert.deepEqual(fallan(r), []);
});

test('MVC 3: un cambiarModo que no guarda el modo nuevo no pasa', () => {
  const r = juzgar(p3, cambiar(p3, 'ControladorPanel.java', '    public void cambiarModo(Modo modo) {\n        this.modo = modo;', '    public void cambiarModo(Modo modo) {\n        modo = this.modo;'));
  assert.ok(fallan(r).includes('El modo se cambia en plena ejecución'), JSON.stringify(fallan(r)));
});

test('MVC 4 (Template Method + Factory Method): un manual que elige las piezas no pasa', () => {
  const r = juzgar(p4, cambiar(p4, 'Panel.java', '        VistaTanque vista = crearVista();', '        VistaTanque vista = new VistaTexto();'));
  const f = fallan(r);
  assert.ok(f.includes('El manual no nombra piezas concretas'), JSON.stringify(f));
  assert.ok(f.includes('Un panel desconocido se arma con el mismo manual'), JSON.stringify(f));
});

test('MVC 4: armar() debe ser final y las fábricas abstractas', () => {
  const r = juzgar(p4, cambiar(p4, 'Panel.java', 'public final ControladorPanel armar', 'public ControladorPanel armar'));
  assert.deepEqual(fallan(r), ['Panel es el manual: armar() final y dos métodos fábrica abstractos']);
});

test('MVC 4: un panel nocturno en manual dispara el enclavamiento', () => {
  const r = juzgar(p4, cambiar(p4, 'PanelNocturno.java', 'return new ModoAuto();', 'return new ModoManual();'));
  assert.ok(fallan(r).includes('El panel nocturno nunca dispara el enclavamiento'), JSON.stringify(fallan(r)));
});

test('MVC 4: tocar una pieza sellada no pasa', () => {
  const r = juzgar(p4, cambiar(p4, 'Tanque.java', 'if (nivel > 70) {', 'if (nivel > 170) {'));
  assert.ok(fallan(r).includes('El tanque, las vistas, los modos y el controlador no cambiaron'));
});

test('MVC: el programa sigue vivo después de Main y el panel puede pulsar sus botones', () => {
  const r = evaluarNivel(p1, p1.solucion);
  const an = r.animacion, antes = { eventos: an.log.length, cuadros: an.frames.length, lineas: r.salida.length };
  const panel = an.registro.find(x => x.cls === 'ControladorPanel');
  assert.equal(typeof panel.proxy.pulsar, 'function');
  // Main dejó el tanque en 10 %: tres bombeos lo llenan y el cuarto dispara el enclavamiento, que el controlador atrapa
  for (let k = 0; k < 4; k++) panel.proxy.pulsar('BOMBEAR');
  assert.deepEqual(r.salida.slice(antes.lineas), ['TQ-1: nivel 40%, cargas 4', 'TQ-1: nivel 70%, cargas 5', 'TQ-1: nivel 100%, cargas 6', 'Aviso: nivel alto']);
  assert.ok(an.log.length > antes.eventos);
  const cuadros = repasar(an.log).frames;
  assert.ok(cuadros.length > antes.cuadros);
  assert.ok(cuadros.slice(antes.cuadros).some(f => f.tipo === 'llamada' && f.metodo === 'pulsar'), 'la pulsación queda en el registro de eventos');
});

test('MVC: el botón MODO puede crear un modo nuevo en el programa vivo y dárselo al controlador', () => {
  const r = evaluarNivel(p3, p3.solucion);
  const an = r.animacion, lineas = r.salida.length;
  assert.equal(typeof an.clases.ModoManual, 'function');
  const panel = an.registro.filter(x => x.cls === 'ControladorPanel').at(-1);
  // Main terminó en automático con el tanque en 100 %: en manual, MARCHA choca con el enclavamiento
  panel.proxy.cambiarModo(new an.clases.ModoManual());
  panel.proxy.pulsar('MARCHA');
  assert.deepEqual(r.salida.slice(lineas), ['Aviso: nivel alto']);
  panel.proxy.cambiarModo(new an.clases.ModoAuto());
  panel.proxy.pulsar('MARCHA');
  assert.deepEqual(r.salida.slice(lineas + 1), ['TQ-1: nivel 10%, cargas 6', 'TQ-1: nivel 40%, cargas 7']);
});
