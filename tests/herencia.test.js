import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePrograma, ejecutar } from '../src/engine/motor.js';

const correr = files => {
  const m = parsePrograma(files);
  assert.deepEqual(m.errores.map(e => e.msg ?? e.mensaje ?? e), []);
  const r = ejecutar(m, C => C.Main.main([]));
  assert.equal(r.error, undefined, r.error);
  return r.rt.salida;
};
const errores = files => parsePrograma(files).errores.map(e => e.msg ?? e.mensaje ?? String(e)).join('\n');
const main = cuerpo => `public class Main { public static void main(String[] args) { ${cuerpo} } }`;

const MAQUINA = `public class Maquina {
    protected String nombre;
    protected int energia = 100;
    public Maquina(String nombre) { this.nombre = nombre; }
    public String describir() { return nombre + " (" + energia + ")"; }
}`;

test('super(...) llama al constructor del padre antes del cuerpo de la hija', () => {
  const salida = correr({
    'Maquina.java': MAQUINA,
    'Dron.java': `public class Dron extends Maquina {
    private int helices = 2;
    public Dron(String nombre, int helices) {
        super(nombre);
        this.helices = helices;
        energia = energia - helices * 10;
    }
    public int getHelices() { return helices; }
}`,
    'Main.java': main('Dron d = new Dron("Zumbi", 4); System.out.println(d.describir()); System.out.println(d.getHelices());'),
  });
  assert.deepEqual(salida, ['Zumbi (60)', '4']);
});

test('super.metodo() reutiliza la versión del padre en una redefinición', () => {
  const salida = correr({
    'Maquina.java': MAQUINA,
    'Robot.java': `public class Robot extends Maquina {
    public Robot(String nombre) { super(nombre); }
    @Override
    public String describir() { return "Robot " + super.describir(); }
}`,
    'Main.java': main('Maquina m = new Robot("Tornillo"); System.out.println(m.describir()); System.out.println(m instanceof Maquina);'),
  });
  assert.deepEqual(salida, ['Robot Tornillo (100)', 'true']);
});

test('sin super explícito se ejecuta el constructor sin parámetros del padre', () => {
  const salida = correr({
    'Base.java': 'public class Base { protected int energia; public Base() { energia = 100; } }',
    'Hija.java': 'public class Hija extends Base { public Hija() { energia = energia - 10; } }',
    'Nieta.java': 'public class Nieta extends Hija { }',
    'Main.java': main('System.out.println(new Hija().energia); System.out.println(new Nieta().energia);'),
  });
  assert.deepEqual(salida, ['90', '90']);
});

test('campos y métodos heredados se usan por su nombre, y lo abstracto se despacha a la hija', () => {
  const salida = correr({
    'Maquina.java': `public abstract class Maquina {
    protected int energia = 50;
    public abstract String sonido();
    public String saludar() { return sonido() + " " + energia; }
    protected void gastar(int n) { energia = energia - n; }
}`,
    'Robot.java': `public class Robot extends Maquina {
    public String sonido() { return "bip"; }
    public void trabajar() { gastar(5); energia = energia + 1; }
}`,
    'Main.java': main('Robot r = new Robot(); r.trabajar(); System.out.println(r.saludar());'),
  });
  assert.deepEqual(salida, ['bip 46']);
});

test('errores de herencia con mensajes claros', () => {
  const privado = errores({
    'Maquina.java': 'public class Maquina { private int energia; public int getEnergia() { return energia; } }',
    'Robot.java': 'public class Robot extends Maquina { public int ver() { return energia; } }',
  });
  assert.match(privado, /energia es private en Maquina/);

  const sinSuper = errores({ 'Maquina.java': MAQUINA, 'Robot.java': 'public class Robot extends Maquina { public Robot() { } }' });
  assert.match(sinSuper, /Maquina no tiene constructor sin parámetros/);

  const argsMal = errores({ 'Maquina.java': MAQUINA, 'Robot.java': 'public class Robot extends Maquina { public Robot() { super("a", 2); } }' });
  assert.match(argsMal, /no tiene un constructor que reciba 2 argumento/);

  const tarde = errores({ 'Maquina.java': MAQUINA, 'Robot.java': 'public class Robot extends Maquina { public Robot() { int x = 1; super("a"); } }' });
  assert.match(tarde, /primera instrucción del constructor/);

  const enMetodo = errores({ 'Maquina.java': MAQUINA, 'Robot.java': 'public class Robot extends Maquina { public Robot() { super("a"); } public void f() { super("b"); } }' });
  assert.match(enMetodo, /solo se usa en la primera línea de un constructor/);

  const local = errores({
    'Maquina.java': 'public class Maquina { private int energia; }',
    'Robot.java': 'public class Robot extends Maquina { public int f(int energia) { return energia; } }',
  });
  assert.doesNotMatch(local, /private/);
});
