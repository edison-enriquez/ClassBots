import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePrograma, ejecutar, repasar } from '../src/engine/motor.js';

function correr(files) {
  const m = parsePrograma(files);
  if (m.errores.length) return { errores: m.errores.map(e => e.msg) };
  const r = ejecutar(m, C => C.Main.main([]));
  return { salida: r.rt.salida, error: r.error, eventos: repasar(r.rt.log).frames.filter(f => ['lanza', 'atrapa', 'finally'].includes(f.tipo)).map(f => f.tipo) };
}
const main = cuerpo => ({ 'Main.java': `import java.util.ArrayList;\npublic class Main {\n${cuerpo}\n}` });
const SIN_ENERGIA = 'public class SinEnergiaException extends Exception { public SinEnergiaException(String m) { super(m); } }';

test('throw, catch con getMessage y finally; el programa sigue', () => {
  const r = correr(main(`static void cargar(int c) { if (c < 0) { throw new IllegalArgumentException("negativa: " + c); } System.out.println("ok " + c); }
  public static void main(String[] args) {
    try { cargar(5); cargar(-2); System.out.println("no llega"); }
    catch (IllegalArgumentException e) { System.out.println("Error: " + e.getMessage()); }
    finally { System.out.println("fin"); }
    System.out.println("sigue");
  }`));
  assert.deepEqual(r.salida, ['ok 5', 'Error: negativa: -2', 'fin', 'sigue']);
  assert.deepEqual(r.eventos, ['lanza', 'atrapa', 'finally']);
});

test('errores del taller como excepciones de Java: parseInt, get, división entre cero, null', () => {
  const r = correr(main(`public static void main(String[] args) {
    ArrayList<String> p = new ArrayList<>(); p.add("a");
    try { Integer.parseInt("x"); } catch (NumberFormatException e) { System.out.println(e.getMessage()); }
    try { p.get(3); } catch (IndexOutOfBoundsException | IllegalStateException e) { System.out.println("fuera"); }
    try { int a = 1; int b = 0; int c = a / b; } catch (ArithmeticException e) { System.out.println(e); }
    try { String s = null; s.length(); } catch (RuntimeException e) { System.out.println(e instanceof NullPointerException); }
  }`));
  assert.deepEqual(r.salida, ['For input string: "x"', 'fuera', 'ArithmeticException: / by zero', 'true']);
});

test('un catch de la clase base atrapa a las hijas; el orden de los catch importa', () => {
  const r = correr(main(`public static void main(String[] args) {
    try { Integer.parseInt("x"); } catch (IllegalArgumentException e) { System.out.println("base"); }
  }`));
  assert.deepEqual(r.salida, ['base']);
  const mal = correr(main(`public static void main(String[] args) {
    try { Integer.parseInt("x"); } catch (RuntimeException e) { } catch (NumberFormatException e) { }
  }`));
  assert.match(mal.errores[0], /ya la atrapa el catch \(RuntimeException\)/);
});

test('excepción propia comprobada: extends Exception, throws y atributos propios', () => {
  const r = correr({
    'AveriaException.java': 'public class AveriaException extends Exception { private int codigo; public AveriaException(String m, int codigo) { super(m); this.codigo = codigo; } public int getCodigo() { return codigo; } }',
    ...main(`static void f() throws AveriaException { throw new AveriaException("rota", 7); }
    public static void main(String[] args) {
      try { f(); } catch (AveriaException e) { System.out.println(e.getMessage() + " " + e.getCodigo() + " | " + e + " | " + (e instanceof Exception) + " " + (e instanceof RuntimeException)); }
    }`),
  });
  assert.deepEqual(r.salida, ['rota 7 | AveriaException: rota | true false']);
});

test('comprobadas: hay que atraparlas o declararlas', () => {
  const r = correr({
    'SinEnergiaException.java': SIN_ENERGIA,
    'Robot.java': 'public class Robot { public void a() { throw new SinEnergiaException("x"); } public void b() throws SinEnergiaException { throw new SinEnergiaException("y"); } }',
    ...main(`public static void main(String[] args) { Robot r = new Robot(); r.b(); }`),
  });
  assert.equal(r.errores.length, 2);
  assert.ok(r.errores.some(e => /excepción comprobada \(checked\).*throws SinEnergiaException.*en a\(\)/.test(e)));
  assert.ok(r.errores.some(e => /b\(\) puede lanzar SinEnergiaException/.test(e)));
  // Declararla en main o atraparla compila
  const ok1 = correr({ 'SinEnergiaException.java': SIN_ENERGIA, ...main('static void b() throws SinEnergiaException { } public static void main(String[] args) throws SinEnergiaException { b(); }') });
  const ok2 = correr({ 'SinEnergiaException.java': SIN_ENERGIA, ...main('static void b() throws SinEnergiaException { } public static void main(String[] args) { try { b(); } catch (Exception e) { } }') });
  assert.ok(!ok1.errores && !ok2.errores);
});

test('errores de compilación propios de las excepciones', () => {
  const r = correr({
    'Robot.java': 'public class Robot { }',
    ...main(`public static void main(String[] args) {
      try { } 
      try { } catch (Robot e) { }
      throw new Robot();
    }`),
  });
  assert.ok(r.errores.some(e => /Un try necesita al menos un catch/.test(e)));
  assert.ok(r.errores.some(e => /Robot no es una excepción/.test(e)));
  assert.ok(r.errores.some(e => /Con throw solo se lanzan excepciones/.test(e)));
});

test('sin atrapar: el programa se detiene y lo explica; finally corre aunque la excepción suba', () => {
  const r = correr({ 'SinEnergiaException.java': SIN_ENERGIA, ...main(`static void a() throws SinEnergiaException { try { throw new SinEnergiaException("x"); } finally { System.out.println("cierra"); } }
    public static void main(String[] args) throws Exception { a(); System.out.println("no llega"); }`) });
  assert.deepEqual(r.salida, ['cierra']);
  assert.match(r.error, /Excepción sin atrapar: SinEnergiaException: x/);
});

test('una excepción no atrapada por el catch sigue subiendo, y el bucle infinito no se puede atrapar', () => {
  const r = correr(main(`public static void main(String[] args) {
    try { try { throw new IllegalStateException("s"); } catch (IllegalArgumentException e) { System.out.println("no"); } } catch (IllegalStateException e) { System.out.println("afuera"); }
    try { while (true) { } } catch (Exception e) { System.out.println("tragada"); }
  }`));
  assert.deepEqual(r.salida, ['afuera']);
  assert.match(r.error, /demasiados pasos/);
});
