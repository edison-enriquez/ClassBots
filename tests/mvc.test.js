import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MVC } from '../src/levels/mision-mvc.js';
import { evaluarNivel } from '../src/levels/evaluar.js';

globalThis.performance ??= { now: () => Date.now() };

const [p1, p2, p3] = MVC.pasos;
const juzgar = (paso, cambios) => evaluarNivel(paso, { ...paso.solucion, ...cambios }, { incluirOcultas: true });
const fallan = r => r.casos.filter(c => c.estado !== 'ok').map(c => c.nombre);
const cambiar = (paso, archivo, de, a) => { const t = paso.solucion[archivo]; assert.ok(t.includes(de), `${archivo} no contiene «${de}»`); return { [archivo]: t.replace(de, a) }; };

test('MVC: el panel que lo hace todo compila y pide primero el contrato de las vistas', () => {
  const r = evaluarNivel(p1, p1.inicial(), { incluirOcultas: true });
  assert.equal(r.estado, 'previo', JSON.stringify(r.errores?.slice(0, 2)));
  assert.match(r.previo, /VistaTanque/);
});

test('MVC 1: un modelo que imprime o un controlador que imprime no pasan', () => {
  const modelo = juzgar(p1, cambiar(p1, 'Tanque.java', '        notificar();\n    }\n\n    public void vaciar()', '        System.out.println("bombeando");\n        notificar();\n    }\n\n    public void vaciar()'));
  assert.ok(fallan(modelo).includes('El modelo no imprime ni conoce el panel'), JSON.stringify(fallan(modelo)));
  const control = juzgar(p1, cambiar(p1, 'ControladorPanel.java', 'vista.aviso(e.getMessage());', 'System.out.println("Aviso: " + e.getMessage());'));
  assert.deepEqual(fallan(control), ['El controlador no imprime']);
});

test('MVC 1: sin enclavamiento el tanque se pasa de nivel', () => {
  const r = juzgar(p1, cambiar(p1, 'Tanque.java', '        if (nivel > 70) {\n            throw new IllegalStateException("nivel alto");\n        }\n', ''));
  assert.ok(fallan(r).includes('El enclavamiento protege el tanque'), JSON.stringify(fallan(r)));
});

test('MVC 2: una barra escrita dentro del modelo no cuenta como vista', () => {
  const r = juzgar(p2, {
    ...cambiar(p2, 'Tanque.java', '    private void notificar() {', '    private void notificar() {\n        new VistaBarra().mostrar(etiqueta, nivel, cargas);'),
    ...cambiar(p2, 'Main.java', '        tq.suscribir(new VistaBarra());\n', ''),
  });
  assert.ok(fallan(r).includes('El modelo no sabe qué indicadores tiene'), JSON.stringify(fallan(r)));
});

test('MVC 3: un automático que bombea sin mirar el nivel dispara el enclavamiento', () => {
  const r = juzgar(p3, cambiar(p3, 'ControladorAuto.java', '            if (modelo.getNivel() > 70) {\n                modelo.vaciar();\n            }\n', ''));
  assert.ok(r.estado !== 'ejecutado' || fallan(r).includes('El automático nunca dispara el enclavamiento'), JSON.stringify(fallan(r)));
});

test('MVC 3: también vale vaciar cuando el nivel llega a 100', () => {
  const r = juzgar(p3, cambiar(p3, 'ControladorAuto.java', 'modelo.getNivel() > 70', 'modelo.getNivel() == 100'));
  assert.equal(r.estado, 'ejecutado');
  assert.deepEqual(fallan(r), []);
});

test('MVC 3: tocar el tanque sellado no pasa', () => {
  const r = juzgar(p3, cambiar(p3, 'Tanque.java', 'if (nivel > 70) {', 'if (nivel > 170) {'));
  assert.ok(fallan(r).includes('El tanque, los indicadores y el panel manual no cambiaron'));
});
