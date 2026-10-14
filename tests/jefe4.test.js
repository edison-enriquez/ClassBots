import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NIVELES } from '../src/levels/niveles.js';
import { evaluarNivel } from '../src/levels/evaluar.js';

const jefe = NIVELES.find(n => n.id === 'futuro');

const maquina = (nombre, cuerpo) => `public class ${nombre} implements Recargable {
    private int carga;
${cuerpo}
    @Override
    public void recargar() { carga = 100; }

    @Override
    public int nivel() { return carga; }
}
`;

const conMaquinas = (aspiradora, grua) => ({ ...jefe.solucion, 'Aspiradora.java': aspiradora, 'Grua.java': grua });
const oculta = r => r.casos.find(c => c.oculto);

test('jefe 4: la solución de referencia pasa todo, incluida la oculta', () => {
  const r = evaluarNivel(jefe, jefe.solucion, { incluirOcultas: true });
  assert.equal(r.todosOk, true, JSON.stringify(r.casos.filter(c => !c.ok)));
});

test('jefe 4: una máquina con constructor vacío y otro con parámetros cuenta para la oculta', () => {
  const cuerpo = `
    public %N() { this.carga = 20; }
    public %N(int carga) { this.carga = carga; }
`;
  const files = conMaquinas(
    maquina('Aspiradora', cuerpo.replaceAll('%N', 'Aspiradora')),
    maquina('Grua', cuerpo.replaceAll('%N', 'Grua')),
  );
  const r = evaluarNivel(jefe, files, { incluirOcultas: true });
  assert.equal(oculta(r).estado, 'ok', oculta(r).obtenido);
});

test('jefe 4: si solo hay constructor con parámetros, la oculta lo explica', () => {
  const cuerpo = n => `
    public ${n}(int carga) { this.carga = carga; }
`;
  const files = conMaquinas(maquina('Aspiradora', cuerpo('Aspiradora')), maquina('Grua', cuerpo('Grua')));
  files['Main.java'] = files['Main.java'].replace('new Aspiradora()', 'new Aspiradora(15)').replace('new Grua()', 'new Grua(40)');
  const r = evaluarNivel(jefe, files, { incluirOcultas: true });
  assert.equal(oculta(r).estado, 'falla');
  assert.match(String(oculta(r).obtenido), /sin parámetros/);
});
