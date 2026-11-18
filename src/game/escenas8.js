/* Escena del patrón Decorator · El taller de módulos.
   Cada bot es un chasis (el robot) envuelto en capas: un anillo y una ficha por módulo.
   En la lista de fichas, la de arriba es la capa de afuera y la de abajo es el chasis.
   Cuando llega una llamada se enciende la capa que la atiende, así que se la ve bajar
   de módulo en módulo hasta el chasis. */
import { W, P, texto, mezclar, colorDe } from './sprites.js';
import { dibujarRobot, cartel } from './dibujo.js';
import { suelo, muro, placa, bocadillo, plataforma, monitorPared, robotRPG } from './rpg.js';

const PISO = 62, FICHAS_Y = 76, MAX_BOTS = 4, MAX_ANILLOS = 4, MAX_FICHAS = 5;
const COLOR_MODULO = { Laser: '#ff5d5d', Escudo: '#3fe0e0', Blindaje: '#c9cee8', Propulsor: '#ff9a3c' };
const OTROS_MODULOS = ['#b58cff', '#ffd23f', '#45d483', '#ff8fc7'];
const COLOR_CHASIS = { BotBasico: 'azul', BotPesado: 'gris' };
const OTROS_CHASIS = ['verde', 'morado', 'amarillo', 'cafe'];
const suma = s => [...s].reduce((a, c) => a + c.charCodeAt(0), 0);
const colorModulo = cls => COLOR_MODULO[cls] || OTROS_MODULOS[suma(cls) % OTROS_MODULOS.length];
const colorChasis = cls => COLOR_CHASIS[cls] || OTROS_CHASIS[suma(cls) % OTROS_CHASIS.length];
const base = t => String(t).replace(/<.*>/, '').trim();

/* Qué clases son piezas del taller (cumplen algún contrato) y cuáles son envoltorios
   (guardan un atributo del mismo contrato que cumplen: eso es un decorador) */
function clasificar(modelo) {
  const piezas = new Set(), envoltorios = new Set();
  for (const c of Object.values(modelo?.clases || {})) {
    const contratos = (c.__interfaces || c.implementa || []).map(base);
    if (c.tipo === 'interface' || !contratos.length) continue;
    piezas.add(c.nombre);
    if ((c.__campos || c.campos || []).some(f => contratos.includes(base(f.tipo)))) envoltorios.add(c.nombre);
  }
  return { piezas, envoltorios };
}

/* Pilas del cuadro actual, cada una de la capa de afuera al chasis, ordenadas por su chasis */
function pilasDe(objetos, { piezas, envoltorios }) {
  const bots = objetos.filter(o => piezas.has(o.cls));
  const porId = new Map(bots.map(o => [o.id, o]));
  const dentro = o => { for (const v of Object.values(o.f)) if (v && v.ref && porId.has(v.ref)) return porId.get(v.ref); return null; };
  const envueltos = new Set(bots.map(dentro).filter(Boolean).map(o => o.id));
  return bots
    // Un módulo recién creado que todavía no recibió su bot no se dibuja suelto
    .filter(o => !envueltos.has(o.id) && (dentro(o) || !envoltorios.has(o.cls)))
    .map(o => { const capas = []; for (let x = o; x && capas.length < 12; x = dentro(x)) capas.push(x); return capas; })
    .sort((a, b) => a.at(-1).id - b.at(-1).id || a[0].id - b[0].id);
}

/* Veredictos de la puerta hasta el cuadro i: bot que cruzó → lo que imprimió la puerta */
function veredictos(frames, i) {
  const v = new Map();
  let pendiente = null, ultimo = null, hayPuerta = false;
  for (let k = 0; k <= Math.min(i, frames.length - 1); k++) {
    const f = frames[k];
    if (f.tipo === 'llamada' && f.metodo === 'cruzar') { hayPuerta = true; pendiente = f.argIds?.[0] || null; }
    else if (f.tipo === 'print' && pendiente) {
      ultimo = /NO PASA/.test(f.cap) ? false : /PASA/.test(f.cap) ? true : null;
      if (ultimo != null) v.set(pendiente, { pasa: ultimo, k });
      pendiente = null;
    }
  }
  return { v, ultimo, hayPuerta, esperando: pendiente };
}

function fondo(ctx, now, puerta) {
  suelo(ctx, 'metal', 0, 22, W, 112);
  muro(ctx, 22, 'metal');
  placa(ctx, 96, 6, 'TALLER DE MODULOS', '#9fe8ff');
  monitorPared(ctx, 8, 6, now, '#7cd4ff');
  if (!puerta) { monitorPared(ctx, 166, 6, now, '#ff9a3c'); return; }
  // Puerta blindada: la luz dice si el último bot pasó
  const luz = puerta.ultimo == null ? (Math.floor(now / 400) % 2 ? P.amber : '#7a5a10') : puerta.ultimo ? P.green : P.red;
  ctx.fillStyle = P.ink; ctx.fillRect(164, 3, 22, 19);
  ctx.fillStyle = '#6d7499'; ctx.fillRect(165, 4, 20, 18);
  ctx.fillStyle = '#4c5378'; ctx.fillRect(167, 6, 16, 16);
  ctx.fillStyle = P.ink; ctx.fillRect(174, 6, 2, 16);
  for (const y of [9, 13, 17]) { ctx.fillStyle = '#8b93b8'; ctx.fillRect(168, y, 5, 1); ctx.fillRect(177, y, 5, 1); }
  ctx.fillStyle = P.ink; ctx.fillRect(157, 8, 5, 5);
  ctx.fillStyle = luz; ctx.fillRect(158, 9, 3, 3);
}

/* Anillo de un módulo alrededor del robot: r = 0 es el más cercano al chasis */
function anillo(ctx, cx, r, color) {
  const x = cx - 11 - 2 * r, y = PISO - 19 - 2 * r, w = 22 + 4 * r, h = 23 + 4 * r;
  ctx.fillStyle = color;
  ctx.fillRect(x + 1, y, w - 2, 1); ctx.fillRect(x + 1, y + h - 1, w - 2, 1);
  ctx.fillRect(x, y + 1, 1, h - 2); ctx.fillRect(x + w - 1, y + 1, 1, h - 2);
}

/* Lo que cada módulo conocido le pone al robot */
function adornos(ctx, cx, modulos, now) {
  let laseres = 0;
  for (const m of [...modulos].reverse()) {
    if (m.cls === 'Laser' && laseres < 2) {
      const izq = laseres++ === 1, x = izq ? cx - 12 : cx + 7;
      ctx.fillStyle = P.ink; ctx.fillRect(x, PISO - 9, 5, 3);
      ctx.fillStyle = '#ff5d5d'; ctx.fillRect(x + 1, PISO - 8, 3, 1);
      if (Math.floor(now / 300) % 2) { ctx.fillStyle = '#ffd0d0'; ctx.fillRect(izq ? x : x + 4, PISO - 8, 1, 1); }
    } else if (m.cls === 'Blindaje') {
      ctx.fillStyle = P.ink; ctx.fillRect(cx - 7, PISO - 8, 4, 4); ctx.fillRect(cx + 3, PISO - 8, 4, 4);
      ctx.fillStyle = '#c9cee8'; ctx.fillRect(cx - 6, PISO - 7, 2, 2); ctx.fillRect(cx + 4, PISO - 7, 2, 2);
    } else if (m.cls === 'Propulsor') {
      const alto = 2 + (Math.floor(now / 120) % 2);
      ctx.fillStyle = '#ff9a3c'; ctx.fillRect(cx - 6, PISO, 2, alto); ctx.fillRect(cx + 4, PISO, 2, alto);
      ctx.fillStyle = '#fff3a8'; ctx.fillRect(cx - 6, PISO, 2, 1); ctx.fillRect(cx + 4, PISO, 2, 1);
    }
  }
}

function fichas(ctx, cx, ancho, capas, activo, nuevo, now) {
  const filas = capas.length > MAX_FICHAS ? [...capas.slice(0, MAX_FICHAS - 2), { resto: capas.length - (MAX_FICHAS - 1) }, capas.at(-1)] : capas;
  const letras = Math.floor((ancho - 3) / 4);
  const x = Math.round(cx - ancho / 2);
  ctx.fillStyle = P.ink; ctx.fillRect(x - 1, FICHAS_Y - 1, ancho + 2, filas.length * 7 + 1);
  filas.forEach((o, k) => {
    const y = FICHAS_Y + k * 7, chasis = k === filas.length - 1;
    if (o.resto) { ctx.fillStyle = '#3a405a'; ctx.fillRect(x, y, ancho, 6); texto(ctx, `+${o.resto} MAS`, cx, y + 1, '#c9cee8', { centrar: true }); return; }
    const c = chasis ? colorDe(colorChasis(o.cls)) : colorModulo(o.cls);
    const enciende = o.id === activo || (o.id === nuevo && Math.floor(now / 90) % 2);
    ctx.fillStyle = enciende ? P.white : chasis ? mezclar(c, -0.35) : c; ctx.fillRect(x, y, ancho, 6);
    texto(ctx, o.cls.slice(0, letras), cx, y + 1, enciende || !chasis ? P.ink : P.white, { centrar: true });
    if (o.id === activo) { ctx.fillStyle = P.gold; ctx.fillRect(x - 4, y + 1, 1, 4); ctx.fillRect(x - 3, y + 2, 1, 2); }
  });
}

export function escenaModulos(ctx, { modelo, fr, s, now }) {
  const frames = s.frames || [];
  const puerta = veredictos(frames, s.i ?? 0);
  fondo(ctx, now, puerta.hayPuerta || (fr?.objetos || []).some(o => o.cls === 'Puerta') ? puerta : null);
  const clases = clasificar(modelo);
  const pilas = pilasDe(fr?.objetos || [], clases).slice(0, MAX_BOTS);
  if (!pilas.length) {
    plataforma(ctx, 96, PISO + 2);
    robotRPG(ctx, 96, PISO, { fantasma: true });
    bocadillo(ctx, 96, 84, frames.length ? 'ARMANDO LOS BOTS…' : 'EJECUTA PARA ARMAR LOS BOTS', P.white);
    return;
  }
  // Las columnas se reparten según cuántos bots habrá al final, para que no salten al crear cada uno
  const total = Math.max(pilas.length, Math.min(MAX_BOTS, pilasDe(frames.at(-1)?.objetos || [], clases).length));
  const paso = Math.min(62, 184 / total), ancho = Math.min(41, Math.floor(paso) - 6);
  const activo = fr?.tipo === 'llamada' ? fr.quien : null;
  const nuevo = fr && (fr.tipo === 'crear' || fr.tipo === 'set') ? fr.quien : null;
  pilas.forEach((capas, k) => {
    const cx = Math.round(96 + (k - (total - 1) / 2) * paso);
    const chasis = capas.at(-1), modulos = capas.slice(0, -1);
    const anillos = modulos.slice(-MAX_ANILLOS);
    plataforma(ctx, cx, PISO + 2, activo === chasis.id);
    // Los anillos se dibujan de afuera hacia adentro: el último módulo de la lista es el más cercano al chasis
    anillos.forEach((m, j) => {
      const r = anillos.length - 1 - j, c = colorModulo(m.cls);
      anillo(ctx, cx, r, m.id === activo || (m.id === nuevo && Math.floor(now / 90) % 2) ? P.white : c);
    });
    const salto = activo === chasis.id ? 1 + (Math.floor(now / 90) % 2) : 0;
    dibujarRobot(ctx, cx, PISO, { id: chasis.id, color: colorChasis(chasis.cls) }, now, { sinBarra: true, salto });
    adornos(ctx, cx, modulos, now);
    const yNombre = PISO - 27 - 2 * anillos.length;
    const nombre = chasis.f?.nombre != null ? String(chasis.f.nombre) : chasis.cls;
    const veredicto = puerta.v.get(capas[0].id);
    // Después de cruzar la puerta, el nombre lleva el veredicto
    if (veredicto) cartel(ctx, cx, yNombre - 3, `${paso >= 56 ? nombre.slice(0, 6) + ' ' : ''}${veredicto.pasa ? 'PASA' : 'NO PASA'}`, veredicto.pasa ? P.green : P.red);
    else texto(ctx, nombre.slice(0, 10), cx, yNombre, P.white, { centrar: true, sombra: P.ink });
    fichas(ctx, cx, ancho, capas, activo, nuevo, now);
  });
}
