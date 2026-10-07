import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ordenarTexto, problemasSangria } from '../src/editor/formato.js';
import { diagnosticar } from '../src/editor/diagnostico.js';
import { NIVELES } from '../src/levels/niveles.js';

const DESORDENADO = `public class Robot {
private int x;
  @Override
public String toString() {
if (x > 0) {
\treturn "a" +
       "b";
} else {
return "c";   
}
  }
    void m(int a) {
switch (a) {
case 1:
x++;
break;
}
}
}`;

const ORDENADO = `public class Robot {
    private int x;
    @Override
    public String toString() {
        if (x > 0) {
            return "a" +
                "b";
        } else {
            return "c";
        }
    }
    void m(int a) {
        switch (a) {
            case 1:
                x++;
                break;
        }
    }
}`;

test('ordena la sangría según las llaves, con tabuladores y espacios al final', () => {
  assert.equal(ordenarTexto(DESORDENADO), ORDENADO);
  assert.equal(ordenarTexto(ORDENADO), ORDENADO, 'ordenar dos veces no cambia nada');
  assert.equal(ordenarTexto(DESORDENADO).split('\n').length, DESORDENADO.split('\n').length);
});

test('las líneas mal sangradas son advertencias con su corrección (máximo 3 por archivo)', () => {
  const p = problemasSangria('Robot.java', DESORDENADO);
  assert.equal(p.length, 3);
  assert.equal(p[0].linea, 2);
  assert.equal(p[0].sev, 'warn');
  assert.match(p[0].msg, /van 4 espacios, hay 0/);
  assert.match(p[0].msg, /líneas desordenadas/);
  assert.equal(p[0].fix('private int x;'), '    private int x;');
  assert.deepEqual(problemasSangria('Robot.java', ORDENADO), []);
});

test('no juzga continuaciones de expresiones ni comentarios', () => {
  const src = `class A {\n    int f() {\n        return 1 +\n                  2;\n    }\n    /**\n   * doc\n     */\n}`;
  assert.deepEqual(problemasSangria('A.java', src), []);
});

test('la sangría no tapa un error en la misma línea y no cuenta como error', () => {
  const d = diagnosticar({ 'A.java': 'class A {\nint x\n}' });
  const l2 = d.porArchivo['A.java'].get(2);
  assert.equal(l2.sev, 'err');
  assert.ok(!d.errores.some(e => /Sangría/.test(e.msg)));
});

test('el código inicial y las soluciones de todos los capítulos ya están ordenados', () => {
  for (const nv of NIVELES) for (const [a, t] of Object.entries(nv.solucion || {}))
    assert.deepEqual(problemasSangria(a, t), [], `${nv.id} ${a}`);
});
