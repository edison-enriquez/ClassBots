import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DECORATOR } from '../src/levels/patron-decorator.js';
import { evaluarNivel } from '../src/levels/evaluar.js';

globalThis.performance ??= { now: () => Date.now() };

const [p1, p2, p3] = DECORATOR.pasos;
const juzgar = (paso, cambios) => evaluarNivel(paso, { ...paso.solucion, ...cambios }, { incluirOcultas: true });
const fallan = r => r.casos.filter(c => c.estado !== 'ok').map(c => c.nombre);
const todoBien = r => { assert.equal(r.estado, 'ejecutado', JSON.stringify(r.errores?.slice(0, 2) || r.previo)); assert.deepEqual(fallan(r), []); };
const cambiar = (paso, archivo, de, a) => { const t = paso.solucion[archivo]; assert.ok(t.includes(de), `${archivo} no contiene «${de}»`); return { [archivo]: t.replace(de, a) }; };

test('Decorator 1: el código inicial compila y pide primero la clase Modulo', () => {
  const r = evaluarNivel(p1, p1.inicial(), { incluirOcultas: true });
  assert.equal(r.estado, 'previo', JSON.stringify(r.errores?.slice(0, 2)));
  assert.match(r.previo, /Modulo/);
});

test('Decorator 1: vale guardar el bot en privado y delegar con super', () => {
  todoBien(juzgar(p1, {
    'Modulo.java': p1.solucion['Modulo.java'].replace('protected Bot bot;', 'private Bot envuelto;').replace('this.bot = bot;', 'this.envuelto = bot;').replaceAll('bot.', 'envuelto.'),
    'Laser.java': p1.solucion['Laser.java'].replaceAll('bot.', 'super.'),
    'Escudo.java': p1.solucion['Escudo.java'].replaceAll('bot.', 'super.'),
  }));
});

test('Decorator 1: un Modulo que solo envuelve BotBasico no es un decorador', () => {
  const r = juzgar(p1, { 'Modulo.java': p1.solucion['Modulo.java'].replace('protected Bot bot;', 'protected BotBasico bot;').replace('public Modulo(Bot bot)', 'public Modulo(BotBasico bot)') });
  assert.deepEqual(fallan(r), ['Un módulo TIENE un Bot (asociación)']);
  assert.match(r.casos.find(c => c.estado !== 'ok').obtenido, /BotBasico/);
});

test('Decorator 1: un Modulo que no pasa la llamada se detecta con un bot desconocido', () => {
  const r = juzgar(p1, cambiar(p1, 'Modulo.java', 'return bot.defensa();', 'return 10;'));
  assert.ok(fallan(r).includes('Modulo pasa las tres llamadas al bot envuelto'), JSON.stringify(fallan(r)));
  // Con BotBasico da el mismo número, así que la salida de Main no lo delata
  assert.ok(!fallan(r).includes('La salida de Main'));
});

test('Decorator 1: un módulo con el resultado escrito a mano falla', () => {
  const r = juzgar(p1, cambiar(p1, 'Laser.java', 'return bot.poder() + 15;', 'return 25;'));
  assert.deepEqual(fallan(r), ['Cada módulo agrega solo lo suyo', 'Un módulo sobre otro módulo igual']);
});

test('Decorator 1: una clase para la combinación no supera el paso', () => {
  const combo = `public class LaserEscudo extends Modulo {
    public LaserEscudo(Bot bot) {
        super(bot);
    }

    @Override
    public int poder() {
        return bot.poder() + 15;
    }

    @Override
    public int defensa() {
        return bot.defensa() * 2;
    }

    @Override
    public String describir() {
        return bot.describir() + " + láser + escudo";
    }
}
`;
  const r = juzgar(p1, {
    'Escudo.java': p1.solucion['Escudo.java'] + '\n' + combo.replace('public class', 'class'),
    ...cambiar(p1, 'Main.java', 'new Escudo(new Laser(new BotBasico("Rayo")))', 'new LaserEscudo(new BotBasico("Rayo"))'),
  });
  assert.deepEqual(fallan(r), ['Rayo lleva dos módulos apilados']);
});

test('Decorator 2: con los módulos en el otro orden la salida no coincide', () => {
  const r = juzgar(p2, cambiar(p2, 'Main.java', 'new Escudo(new Blindaje(new BotBasico("Coloso")))', 'new Blindaje(new Escudo(new BotBasico("Coloso")))'));
  assert.deepEqual(fallan(r), ['Main arma las tres pilas', 'La salida de Main']);
});

test('Decorator 2: un módulo que responde distinto cada vez se detecta', () => {
  // Suma bien la primera vez, pero acumula en un atributo propio
  const blindaje = `public class Blindaje extends Modulo {
    private int extra = 0;

    public Blindaje(Bot bot) {
        super(bot);
    }

    @Override
    public int defensa() {
        extra = extra + 10;
        return bot.defensa() + extra;
    }

    @Override
    public String describir() {
        return bot.describir() + " + blindaje";
    }
}
`;
  const r = juzgar(p2, { 'Blindaje.java': blindaje });
  assert.deepEqual(fallan(r), ['Envolver no cambia al bot de adentro']);
});

test('Decorator 3: otras combinaciones válidas también cruzan la puerta', () => {
  todoBien(juzgar(p3, {
    'Main.java': `public class Main {
    public static void main(String[] args) {
        Puerta puerta = new Puerta();
        Bot titan = new Escudo(new Propulsor(new Laser(new BotPesado("Titán"))));
        Bot rayo = new Blindaje(new Blindaje(new Laser(new Laser(new BotBasico("Rayo")))));
        puerta.cruzar(rayo);
        puerta.cruzar(titan);
    }
}
`,
    'Propulsor.java': p3.solucion['Propulsor.java'].replaceAll('bot.', 'super.'),
  }));
});

test('Decorator 3: el orden equivocado o un módulo de más no cruzan', () => {
  const orden = juzgar(p3, cambiar(p3, 'Main.java', 'new Propulsor(new Laser(new Blindaje(new BotPesado("Titán"))))', 'new Laser(new Propulsor(new Blindaje(new BotPesado("Titán"))))'));
  assert.deepEqual(fallan(orden), ['Titán cruza con 3 módulos o menos']);
  assert.match(orden.casos.find(c => c.nombre === 'Titán cruza con 3 módulos o menos').obtenido, /3 módulos, poder 25, defensa 30/);
  const deMas = juzgar(p3, cambiar(p3, 'Main.java', 'new Propulsor(new Laser(new Blindaje(new BotPesado("Titán"))))', 'new Propulsor(new Propulsor(new Propulsor(new Blindaje(new BotPesado("Titán")))))'));
  assert.deepEqual(fallan(deMas), ['Titán cruza con 3 módulos o menos']);
  const sinCruzar = juzgar(p3, cambiar(p3, 'Main.java', '        puerta.cruzar(rayo);\n', ''));
  assert.deepEqual(fallan(sinCruzar), ['Rayo cruza con 4 módulos o menos']);
});

test('Decorator 3: no se pasa tocando una pieza sellada ni con un módulo inventado', () => {
  const sellada = juzgar(p3, cambiar(p3, 'BotPesado.java', 'return 5;', 'return 50;'));
  assert.ok(fallan(sellada).includes('Las piezas selladas no cambiaron'));
  const mega = `
class Mega extends Modulo {
    public Mega(Bot bot) {
        super(bot);
    }

    @Override
    public int poder() {
        return 99;
    }

    @Override
    public int defensa() {
        return 99;
    }
}
`;
  const r = juzgar(p3, {
    'Propulsor.java': p3.solucion['Propulsor.java'] + mega,
    ...cambiar(p3, 'Main.java', 'new Propulsor(new Laser(new Blindaje(new BotPesado("Titán"))))', 'new Mega(new BotPesado("Titán"))'),
  });
  assert.deepEqual(fallan(r), ['Sin clases para las combinaciones']);
});
