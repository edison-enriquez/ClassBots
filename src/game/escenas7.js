/* Escena de la misión Factory Method · La fábrica de unidades.
   Arriba, una prensa por cada clase que hace new de alguna unidad (se lee del código):
   con los new desperdigados hay prensas repetidas en cada cliente; con la fábrica simple queda
   una; con Factory Method, una por planta. Abajo, la cinta: cada unidad creada cae de la prensa
   que la fabricó y avanza. Si hay una clase base con un método final (la Planta), aparece como
   el arco de control de calidad. Un tipo desconocido rechazado con una excepción cae en rojo. */
import { P, texto } from './sprites.js';
import { suelo, muro, placa, bocadillo } from './rpg.js';

const r = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
const CINTA = 84, PRENSA_Y = 38;

/* Del modelo: qué clases son unidades, cuáles las crean (prensas) y si hay una base con control de calidad */
function leerPlanta(modelo) {
  const clases = Object.values(modelo?.clases || {});
  const esUnidad = c => c.tipo !== 'interface' && (c.implementa || []).some(i => /^(Unidad|Producto)/.test(i.replace(/<.*>/, '')));
  const productos = clases.filter(esUnidad).map(c => c.nombre);
  const estaciones = [];
  if (productos.length) {
    const re = new RegExp(`\\bnew\\s+(${productos.join('|')})\\s*\\(`, 'g');
    for (const c of clases) {
      if (c.tipo === 'interface' || productos.includes(c.nombre) || c.nombre === 'Main') continue;
      const hace = [...new Set([...(c.cuerpoClean || '').matchAll(re)].map(m => m[1]))];
      if (hace.length && estaciones.length < 4) estaciones.push({ cls: c.nombre, hace });
    }
  }
  const base = clases.find(c => c.tipo !== 'interface' && c.abstracta && c.metodos.some(m => m.final));
  const repetidos = productos.filter(p => estaciones.filter(e => e.hace.includes(p)).length > 1);
  return { productos, estaciones, base: base?.nombre || null, repetidos };
}

/* Del registro: unidades creadas (con la prensa de donde salieron), rechazos y controles de calidad */
function leerProduccion(frames, i, planta) {
  const unidades = [];
  let rechazo = null, control = null, ultimaLlamada = null;
  const clsDe = (f, id) => f.objetos?.find(o => o.id === id)?.cls;
  for (let k = 0; k <= Math.min(i, frames.length - 1); k++) {
    const f = frames[k];
    if (f.tipo === 'llamada') ultimaLlamada = clsDe(f, f.quien);
    else if (f.tipo === 'crear' && planta.productos.includes(f.cls)) {
      const candidatas = planta.estaciones.filter(e => e.hace.includes(f.cls));
      const e = candidatas.find(x => x.cls === ultimaLlamada) || candidatas[0];
      unidades.push({ id: f.quien, cls: f.cls, k, estacion: e ? planta.estaciones.indexOf(e) : -1 });
    } else if (f.tipo === 'lanza' && /IllegalArgument/.test(f.exc || '')) rechazo = { k, msg: f.msg };
    else if (f.tipo === 'print' && /control/i.test(f.cap)) control = { k };
  }
  return { unidades, rechazo, control };
}

function fondo(ctx, now) {
  muro(ctx, 30, 'metal');
  suelo(ctx, 'metal', 0, 30, 192, 112);
  placa(ctx, 96, 13, 'FABRICA DE UNIDADES', '#ffcc33');
  // Engranajes en la pared
  for (const [x, c] of [[14, '#5b6178'], [178, '#5b6178']]) {
    const g = Math.floor(now / 200) % 2;
    r(ctx, P.ink, x - 5, 9, 11, 11); r(ctx, c, x - 4, 10, 9, 9); r(ctx, P.ink, x - 1, 13, 3, 3);
    r(ctx, c, g ? x - 6 : x - 1, g ? 13 : 7, g ? 13 : 3, g ? 3 : 15);
  }
}

function cinta(ctx, now) {
  r(ctx, P.ink, 0, CINTA, 192, 12);
  r(ctx, '#2b2f46', 0, CINTA + 1, 192, 10);
  for (let x = -((now / 50) % 12); x < 192; x += 12) r(ctx, '#4c5378', x, CINTA + 3, 6, 6);
  for (let x = 6; x < 192; x += 24) { r(ctx, P.ink, x, CINTA + 12, 4, 4); r(ctx, '#7a83a8', x + 1, CINTA + 13, 2, 2); }
}

/* Prensa: cuerpo, pistón que baja al crear, nombre de la clase y cuántos tipos sabe crear */
function prensa(ctx, cx, e, golpe, repetida, now, maxChars = 11) {
  const x = cx - 11, y = PRENSA_Y;
  r(ctx, P.ink, x, y, 22, 18);
  r(ctx, repetida ? '#8a5a2a' : '#4c5378', x + 1, y + 1, 20, 16);
  r(ctx, repetida ? '#b07c48' : '#5f6890', x + 1, y + 1, 20, 2);
  r(ctx, Math.floor(now / 300) % 2 ? P.green : '#1f6b3a', x + 17, y + 4, 2, 2);
  // Pistón
  const baja = golpe ? 10 : 2;
  r(ctx, P.ink, cx - 2, y + 17, 4, baja); r(ctx, P.steel, cx - 1, y + 17, 2, baja);
  r(ctx, P.ink, cx - 5, y + 17 + baja, 10, 3); r(ctx, golpe ? P.gold : P.steelD, cx - 4, y + 18 + baja, 8, 1);
  // PlantaAerea → AEREA: el prefijo común se omite para que los nombres quepan
  texto(ctx, e.cls.replace(/^Planta(?=[A-Z])/, '').slice(0, maxChars), cx, y - 7, P.white, { centrar: true, sombra: P.ink });
  texto(ctx, `NEW x${e.hace.length}`, cx - 7, y + 6, repetida ? '#ffcc33' : '#9fe8ff');
}

/* Unidades: un sprite pequeño según la clase */
function unidad(ctx, cx, piso, cls, now) {
  const x = Math.round(cx - 5), y = Math.round(piso - 8);
  r(ctx, P.ink, x, y, 11, 8);
  if (/Dron/i.test(cls)) {
    r(ctx, '#4aa3ff', x + 1, y + 3, 9, 4); r(ctx, P.ink, x - 1, y, 13, 1);
    r(ctx, Math.floor(now / 80) % 2 ? '#eef2f7' : '#9fe8ff', x - 1, y, 4, 1); r(ctx, Math.floor(now / 80) % 2 ? '#9fe8ff' : '#eef2f7', x + 8, y, 4, 1);
    r(ctx, P.ink, x + 5, y + 1, 1, 2);
  } else if (/Tanque/i.test(cls)) {
    r(ctx, '#7a8b4a', x + 1, y + 1, 9, 4); r(ctx, '#3a3f2a', x + 1, y + 5, 9, 2); r(ctx, P.ink, x + 6, y + 2, 6, 1);
  } else if (/Explorador/i.test(cls)) {
    r(ctx, '#ff9a3c', x + 1, y + 1, 9, 4); r(ctx, P.ink, x + 1, y + 6, 3, 2); r(ctx, P.ink, x + 7, y + 6, 3, 2); r(ctx, P.green, x + 8, y - 2, 1, 3);
  } else if (/Submarino/i.test(cls)) {
    r(ctx, '#ffd23f', x + 1, y + 2, 9, 5); r(ctx, P.ink, x + 4, y - 1, 1, 3); r(ctx, '#9fe8ff', x + 3, y + 3, 2, 2);
  } else {
    r(ctx, '#a0703c', x + 1, y + 1, 9, 6); r(ctx, '#7a532c', x + 1, y + 4, 9, 1);
  }
}

export function escenaFabrica(ctx, { modelo, s, now }) {
  fondo(ctx, now);
  cinta(ctx, now);
  const frames = s.frames || [];
  const i = s.i ?? -1;
  const planta = leerPlanta(modelo);
  const prod = leerProduccion(frames, i, planta);
  const n = planta.estaciones.length;
  const xs = planta.estaciones.map((e, k) => Math.round(((k + 1) * (planta.base ? 140 : 192)) / (n + 1)));

  // Arco de control de calidad de la clase base
  if (planta.base) {
    const ax = 164, vivo = prod.control && i - prod.control.k <= 1;
    r(ctx, P.ink, ax - 12, CINTA - 24, 24, 4); r(ctx, P.ink, ax - 12, CINTA - 24, 4, 26); r(ctx, P.ink, ax + 8, CINTA - 24, 4, 26);
    r(ctx, vivo ? P.green : '#5f6890', ax - 11, CINTA - 23, 22, 2); r(ctx, vivo ? P.green : '#5f6890', ax - 11, CINTA - 23, 2, 24); r(ctx, vivo ? P.green : '#5f6890', ax + 9, CINTA - 23, 2, 24);
    texto(ctx, 'QA', ax, CINTA - 18, vivo ? P.green : '#9fe8ff', { centrar: true });
    texto(ctx, planta.base.slice(0, 9), ax, CINTA - 31, '#9fe8ff', { centrar: true, sombra: P.ink });
  }

  // Prensas
  const ultima = prod.unidades[prod.unidades.length - 1];
  planta.estaciones.forEach((e, k) => {
    const golpe = ultima && ultima.estacion === k && i - ultima.k <= 0;
    const sep = n > 1 ? xs[1] - xs[0] : 96;
    prensa(ctx, xs[k], e, golpe, e.hace.some(p => planta.repetidos.includes(p)), now, Math.max(5, Math.floor(sep / 4) - 1));
  });

  // Unidades sobre la cinta: caen de su prensa y avanzan con cada paso de la ejecución
  const t = Math.min(1, s.p ?? 1);
  for (const u of prod.unidades.slice(-8)) {
    const x0 = u.estacion >= 0 ? xs[u.estacion] : 20;
    const avance = (i - u.k) * 9 + (i > u.k ? t * 9 : 0);
    const x = x0 + avance;
    if (x > 200) continue;
    const cae = i === u.k ? Math.round((1 - t) * 12) : 0;
    unidad(ctx, x, CINTA + 1 - cae, u.cls, now);
  }

  // Rechazo de un tipo desconocido
  if (prod.rechazo && i - prod.rechazo.k <= 3) {
    const x = 10, y = CINTA - 10;
    r(ctx, P.ink, x - 5, y, 11, 9); r(ctx, P.red, x - 4, y + 1, 9, 7);
    r(ctx, P.white, x - 2, y + 3, 1, 1); r(ctx, P.white, x + 2, y + 3, 1, 1); r(ctx, P.white, x, y + 4, 1, 1); r(ctx, P.white, x - 2, y + 5, 1, 1); r(ctx, P.white, x + 2, y + 5, 1, 1);
    const msg = String(prod.rechazo.msg || '').replace(/^tipo desconocido:\s*/, '');
    bocadillo(ctx, 50, 66, `RECHAZADO ${msg}`.slice(0, 20), P.red);
  }

  // Avisos de diseño
  if (planta.repetidos.length) texto(ctx, `NEW REPETIDO: ${planta.repetidos.join(' ').toUpperCase()}`.slice(0, 46), 3, 104, '#ffcc33', { sombra: P.ink });
  else if (n) texto(ctx, `PRENSAS ${n} - UNIDADES ${prod.unidades.length}`, 3, 104, P.green, { sombra: P.ink });
  if (!n) bocadillo(ctx, 96, 46, 'NADIE FABRICA UNIDADES', P.white);
  else if (!frames.length) bocadillo(ctx, 96, 66, 'EJECUTA PARA FABRICAR', P.white);
}
