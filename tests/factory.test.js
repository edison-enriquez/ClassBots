import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NIVELES } from '../src/levels/niveles.js';
import { evaluarNivel } from '../src/levels/evaluar.js';
import { parsePrograma, relaciones } from '../src/engine/motor.js';

globalThis.performance ??= { now: () => Date.now() };

const paso = id => NIVELES.find(p => p.id === id);
const evaluar = (p, archivos) => evaluarNivel(p, archivos, { incluirOcultas: true });
const fallan = (p, archivos) => evaluar(p, archivos).casos.filter(c => c.estado !== 'ok').map(c => c.nombre);
const cambiar = (p, archivo, a, b) => {
  assert.ok(p.solucion[archivo].includes(a), `no encuentro «${a}» en ${archivo}`);
  return { ...p.solucion, [archivo]: p.solucion[archivo].replace(a, b) };
};

test('Factory 1: el código desperdigado se puede ejecutar para verlo en la escena', () => {
  const p = paso('factory-1');
  const r = evaluar(p, p.inicial());
  assert.equal(r.estado, 'ejecutado');
  assert.equal(r.errorEjecucion, null);
  assert.match(r.salida.join('\n'), /hangar: explorador todoterreno/); // el «submarino» terminó como explorador
});

test('Factory 1: un cliente que conserva su new no pasa', () => {
  const p = paso('factory-1');
  const f = fallan(p, cambiar(p, 'Hangar.java', 'Unidad u = FabricaUnidades.crear(tipo);', 'Unidad u = tipo.equals("dron") ? new Dron() : FabricaUnidades.crear(tipo);'));
  assert.deepEqual(f, ['Los clientes ya no hacen new de unidades']);
});

test('Factory 1: una fábrica que adivina en vez de rechazar no pasa', () => {
  const p = paso('factory-1');
  const f = fallan(p, cambiar(p, 'FabricaUnidades.java', 'throw new IllegalArgumentException("tipo desconocido: " + tipo);', 'return new Explorador();'));
  assert.ok(f.includes('Un error de tipeo también se rechaza'), f.join(', '));
  assert.ok(f.includes('Hangar y cotizador responden igual, y el submarino se rechaza'), f.join(', '));
});

test('Factory 1: crear() sin static no pasa', () => {
  const p = paso('factory-1');
  const r = evaluar(p, cambiar(p, 'FabricaUnidades.java', 'public static Unidad crear', 'public Unidad crear'));
  // El motor ya lo rechaza al compilar: los clientes llaman FabricaUnidades.crear(...) sin objeto
  assert.notEqual(r.todosOk, true);
});

test('Factory 2: el código con if sobre la especialidad se puede ejecutar', () => {
  const p = paso('factory-2');
  const r = evaluar(p, p.inicial());
  assert.equal(r.estado, 'ejecutado');
  assert.equal(r.errorEjecucion, null);
});

test('Factory 2: un crearUnidad() con cuerpo en la base no es el patrón', () => {
  const p = paso('factory-2');
  const f = fallan(p, cambiar(p, 'Planta.java', 'protected abstract Unidad crearUnidad();', 'protected Unidad crearUnidad() {\n        return new Dron();\n    }'));
  assert.ok(f.includes('Planta es abstracta con su método fábrica'), f.join(', '));
  assert.ok(f.includes('La base no conoce las unidades concretas'), f.join(', '));
});

test('Factory 2: copiar producir() en una hija no pasa', () => {
  const p = paso('factory-2');
  const base = cambiar(p, 'Planta.java', 'public final Unidad producir()', 'public Unidad producir()');
  const archivos = { ...base, 'PlantaAerea.java': base['PlantaAerea.java'].replace('@Override\n    protected Unidad crearUnidad()', 'public Unidad producir() {\n        Unidad u = new Dron();\n        System.out.println("control de calidad #1: " + u.describir());\n        return u;\n    }\n\n    @Override\n    protected Unidad crearUnidad()') };
  assert.ok(fallan(p, archivos).includes('producir() es final y no se redefine'));
});

test('Factory 3: la central que pregunta tipos o hace new no pasa', () => {
  const p = paso('factory-3');
  const conInstanceof = cambiar(p, 'Central.java', 'total = total + p.producir().costo();', 'if (p instanceof PlantaAerea) {\n                total = total + 120;\n                p.producir();\n            } else {\n                total = total + p.producir().costo();\n            }');
  assert.ok(fallan(p, conInstanceof).includes('La central no fabrica ni pregunta tipos'));
});

test('Factory 3: la central agrega plantas en el UML', () => {
  const r = relaciones(parsePrograma(paso('factory-3').solucion)).find(x => x.de === 'Central' && x.a === 'Planta');
  assert.equal(r?.tipo, 'agregacion');
});

test('Factory 3: tocar la planta sellada no pasa', () => {
  const p = paso('factory-3');
  assert.ok(fallan(p, cambiar(p, 'Planta.java', 'private int producidas = 0;', 'protected int producidas = 0;')).includes('Lo sellado sigue igual'));
});
