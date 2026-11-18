/* Escena de la misión Observer · La sala de calderas.
   A la izquierda, una o dos calderas con su termómetro. A la derecha, los robots que escuchan.
   - Con la caldera «cableada» (atributos de cada robot), los cables salen enredados y naranjas.
   - Con Observer, la caldera tiene una antena y una línea por cada suscrito de su lista;
     al notificar, un pulso viaja hasta el robot que está recibiendo el aviso.
   - Quien se desuscribe queda con el cable colgando; una ConcurrentModificationException
     pone la caldera en rojo a mitad del aviso. Todo sale de las fotos del registro de eventos. */
import { P, texto } from './sprites.js';
import { linea } from './dibujo.js';
import { suelo, muro, placa, bocadillo, monitorPared } from './rpg.js';

const X_CALDERA = 36, X_DISP = 133, X_ETI = 150;
const limpio = s => String(s).replace(/[°¡¿]/g, '').replace(/\s+/g, ' ').trim();
const corto = (s, n) => limpio(s).slice(0, n);
const r = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
const colorTemp = t => (t >= 90 ? P.red : t >= 60 ? P.amber : t < 0 ? '#9fe8ff' : '#4aa3ff');

/* Lee de la foto del cuadro actual las calderas, sus suscritos y los dispositivos que escuchan */
function leerSala(objetos) {
  const calderas = [], dispositivos = [];
  for (const o of objetos || []) {
    if (o.cls === 'Caldera') {
      const campos = Object.entries(o.f || {});
      const t = typeof o.f?.temperatura === 'number' ? o.f.temperatura : campos.find(([, v]) => typeof v === 'number')?.[1];
      const lista = campos.find(([, v]) => v && v.lista);
      const subs = lista ? lista[1].lista.filter(x => x && x.ref).map(x => x.ref) : [];
      const cables = campos.filter(([, v]) => v && v.ref).map(([, v]) => v.ref);
      calderas.push({ id: o.id, temp: t, observer: !!lista, subs, cables });
    } else if (o.cls !== 'Main' && dispositivos.length < 4) {
      dispositivos.push({ id: o.id, cls: o.cls });
    }
  }
  return { calderas: calderas.slice(0, 2), dispositivos };
}

/* Historia hasta el cuadro i: último mensaje de cada dispositivo, quién se retiró, qué caldera avisa y si algo explotó */
function historia(frames, i, idsCaldera) {
  const msg = new Map(), retirados = new Set(), activos = new Map();
  let emisora = null, receptor = null, lanza = null;
  for (let k = 0; k <= Math.min(i, frames.length - 1); k++) {
    const f = frames[k];
    if (f.tipo === 'llamada') {
      if (idsCaldera.has(f.quien)) {
        if (f.metodo === 'desuscribir') for (const a of f.argIds || []) if (a) retirados.add(a);
        if (f.metodo === 'suscribir') for (const a of f.argIds || []) if (a) retirados.delete(a);
        if (/^set/.test(f.metodo)) emisora = { id: f.quien, k };
      } else {
        receptor = { id: f.quien, k };
        activos.set(f.quien, k);
      }
    } else if (f.tipo === 'print' && receptor && k - receptor.k <= 3) {
      msg.set(receptor.id, { k, txt: f.cap.replace(/^System\.out\.println → /, '') });
    } else if (f.tipo === 'lanza') {
      lanza = { k, exc: f.exc };
    }
  }
  return { msg, retirados, activos, emisora, receptor, lanza };
}

function fondo(ctx, now) {
  muro(ctx, 30, 'metal');
  suelo(ctx, 'metal', 0, 30, 192, 112);
  placa(ctx, 96, 13, 'SALA DE CALDERAS', '#ffb020');
  monitorPared(ctx, 8, 12, now, '#ffb020');
  monitorPared(ctx, 166, 12, now, '#ff5470');
  // Tuberías en la pared
  r(ctx, P.ink, 0, 26, 192, 4); r(ctx, P.pipe, 0, 27, 192, 2);
  for (let x = 20; x < 192; x += 40) { r(ctx, P.ink, x, 25, 3, 6); r(ctx, P.steelD, x + 1, 26, 1, 4); }
}

/* Caldera: cuerpo, termómetro, temperatura y, con Observer, antena de difusión */
function caldera(ctx, cx, cy, c, now, { alarma = false, emite = 0, escala = 1 } = {}) {
  const w = Math.round(22 * escala), h = Math.round(28 * escala), x = cx - w / 2, y = cy - h / 2;
  const t = typeof c.temp === 'number' ? c.temp : 20;
  // Vapor cuando está caliente
  if (t >= 90) for (let k = 0; k < 3; k++) { const fase = ((now / 90 + k * 9) % 24); r(ctx, `rgba(200,200,230,${0.55 - fase / 50})`, x + 4 + k * 6, y - 4 - fase / 2, 3, 3); }
  r(ctx, P.ink, x, y, w, h);
  r(ctx, alarma ? (Math.floor(now / 110) % 2 ? '#ff5470' : '#7a1f33') : '#8d6f52', x + 1, y + 1, w - 2, h - 2);
  r(ctx, alarma ? '#ff8fa0' : '#b08a64', x + 1, y + 1, w - 2, 2);
  for (let k = 0; k < 3; k++) r(ctx, P.ink, x + 2, y + 7 + k * Math.round(7 * escala), w - 4, 1);
  // Remaches
  for (const [a, b] of [[2, 3], [w - 3, 3], [2, h - 3], [w - 3, h - 3]]) r(ctx, '#e0c08a', x + a, y + b, 1, 1);
  // Termómetro
  const th = h - 8, nivel = Math.max(1, Math.min(th - 2, Math.round((Math.max(-20, Math.min(120, t)) + 20) / 140 * (th - 2))));
  r(ctx, P.ink, x + w - 7, y + 4, 5, th); r(ctx, '#1b1a2c', x + w - 6, y + 5, 3, th - 2);
  r(ctx, colorTemp(t), x + w - 6, y + 5 + th - 2 - nivel, 3, nivel);
  // Puerta del hogar con fuego
  r(ctx, P.ink, x + 3, y + h - 9, 8, 6);
  r(ctx, Math.floor(now / 150) % 2 ? '#ff9a3c' : '#ffcc33', x + 4, y + h - 8, 6, 4);
  // Patas
  r(ctx, P.ink, x + 2, y + h, 3, 2); r(ctx, P.ink, x + w - 5, y + h, 3, 2);
  const txt = String(t), ancho = txt.length * 4 - 1, tx = Math.round(x - 5 - ancho), ty = Math.round(cy - 6);
  texto(ctx, txt, tx, ty, colorTemp(t), { sombra: P.ink });
  r(ctx, colorTemp(t), tx + ancho + 1, ty, 2, 1); r(ctx, colorTemp(t), tx + ancho + 1, ty + 2, 2, 1); r(ctx, colorTemp(t), tx + ancho + 1, ty + 1, 1, 1); r(ctx, colorTemp(t), tx + ancho + 2, ty + 1, 1, 1);
  if (c.observer) {
    // Antena de difusión
    const ax = x + 5, ay = y - 1;
    r(ctx, P.ink, ax - 1, ay - 9, 3, 9); r(ctx, P.steel, ax, ay - 8, 1, 8);
    r(ctx, Math.floor(now / 300) % 2 || emite ? P.green : '#1f6b3a', ax - 1, ay - 11, 3, 3);
    if (emite) {
      // Ondas que salen al avisar
      for (let k = 1; k <= 2; k++) {
        const d = Math.round(3 + (k + emite) * 3);
        ctx.fillStyle = `rgba(74,222,128,${0.9 - k * 0.3})`;
        ctx.fillRect(ax - d, ay - 10, 1, 3); ctx.fillRect(ax + d, ay - 10, 1, 3);
      }
    }
  }
  return { x, y, w, h, antena: { x: x + 5, y: y - 10 }, lado: { x: x + w, y: cy } };
}

/* Icono de cada robot según su clase */
function dispositivo(ctx, x, y, cls, encendido, now, atenuado) {
  ctx.globalAlpha = atenuado ? 0.45 : 1;
  r(ctx, P.ink, x, y, 14, 14);
  r(ctx, '#3a3358', x + 1, y + 1, 12, 12);
  const parpadeo = Math.floor(now / 140) % 2;
  if (/Ventilador/i.test(cls)) {
    r(ctx, '#2a2147', x + 2, y + 2, 10, 10);
    const gira = encendido && parpadeo;
    r(ctx, '#9fe8ff', x + 6, y + 6, 2, 2);
    if (gira) { r(ctx, '#9fe8ff', x + 3, y + 3, 2, 2); r(ctx, '#9fe8ff', x + 9, y + 3, 2, 2); r(ctx, '#9fe8ff', x + 3, y + 9, 2, 2); r(ctx, '#9fe8ff', x + 9, y + 9, 2, 2); }
    else { r(ctx, '#9fe8ff', x + 6, y + 2, 2, 3); r(ctx, '#9fe8ff', x + 6, y + 9, 2, 3); r(ctx, '#9fe8ff', x + 2, y + 6, 3, 2); r(ctx, '#9fe8ff', x + 9, y + 6, 3, 2); }
  } else if (/Sirena/i.test(cls)) {
    r(ctx, P.ink, x + 3, y + 4, 8, 7);
    r(ctx, encendido && parpadeo ? '#ff5470' : '#7a1f33', x + 4, y + 5, 6, 5);
    r(ctx, '#ffd6dd', x + 5, y + 6, 1, 2);
    r(ctx, P.steelD, x + 2, y + 11, 10, 2);
    if (encendido) { r(ctx, '#ff5470', x - 2, y + 6, 1, 3); r(ctx, '#ff5470', x + 15, y + 6, 1, 3); }
  } else if (/Panel|Pantalla|Monitor/i.test(cls)) {
    r(ctx, '#0e1a12', x + 2, y + 3, 10, 7);
    if (encendido) for (let k = 0; k < 2; k++) r(ctx, P.green, x + 3, y + 4 + k * 3, 3 + ((now / 120 + k * 3) % 6), 1);
    r(ctx, P.steelD, x + 5, y + 11, 4, 2);
  } else if (/Extintor/i.test(cls)) {
    r(ctx, P.ink, x + 4, y + 2, 6, 11);
    r(ctx, '#e0303a', x + 5, y + 4, 4, 8);
    r(ctx, '#ff8a8a', x + 5, y + 4, 1, 6);
    r(ctx, P.steel, x + 5, y + 2, 4, 2); r(ctx, P.steel, x + 9, y + 2, 3, 1);
    if (encendido) for (let k = 0; k < 4; k++) r(ctx, '#eef2f7', x + 12 + k, y + 1 + ((now / 80 + k) % 3), 1, 1);
  } else if (/Termo|Registr/i.test(cls)) {
    r(ctx, '#0e1a12', x + 2, y + 2, 10, 10);
    const pts = [8, 6, 7, 3, 5];
    pts.forEach((h, k) => r(ctx, encendido ? P.amber : '#7a5a20', x + 3 + k * 2, y + 2 + h, 2, 1));
  } else {
    // Observador genérico: un ojo
    r(ctx, '#eef2f7', x + 3, y + 5, 8, 4);
    r(ctx, encendido ? P.green : P.ink, x + 6, y + 5, 2, 4);
  }
  ctx.globalAlpha = 1;
}

export function escenaCalderas(ctx, { fr, s, now }) {
  fondo(ctx, now);
  const frames = s.frames || [];
  const i = s.i ?? -1;
  const { calderas, dispositivos } = leerSala(fr?.objetos);
  const idsCaldera = new Set(calderas.map(c => c.id));
  const h = historia(frames, i, idsCaldera);
  const finExc = h.lanza && (i - h.lanza.k <= 2 || i >= frames.length - 1);

  if (!calderas.length) {
    caldera(ctx, X_CALDERA, 66, { temp: 20, observer: false }, now);
    bocadillo(ctx, 96, 40, frames.length ? 'NO HAY CALDERA' : 'EJECUTA PARA ENCENDER', P.white);
    return;
  }

  // Posiciones: una caldera al centro, dos apiladas
  const dos = calderas.length > 1;
  const geo = new Map(calderas.map((c, k) => {
    const cy = dos ? 52 + k * 38 : 70;
    const alarma = finExc && (h.emisora?.id === c.id || !h.emisora);
    const emite = h.emisora?.id === c.id && h.receptor && h.receptor.k > h.emisora.k && i - h.receptor.k <= 1 ? 1 + Math.floor(now / 120) % 2 : 0;
    return [c.id, { c, g: caldera(ctx, X_CALDERA, cy, c, now, { alarma, emite, escala: dos ? 0.8 : 1 }) }];
  }));
  if (dos) calderas.forEach((c, k) => texto(ctx, k ? 'B' : 'A', X_CALDERA - 12, 52 + k * 38 + 2, P.steel, { sombra: P.ink }));

  // Dispositivos en columna
  const n = Math.max(1, dispositivos.length), paso = n > 3 ? 18 : 22, y0 = 64 - ((n - 1) * paso) / 2;
  dispositivos.forEach((d, k) => {
    const y = Math.round(y0 + k * paso) - 7;
    const conectadoA = calderas.filter(c => c.subs.includes(d.id) || c.cables.includes(d.id));
    const recibe = h.receptor?.id === d.id && i - h.receptor.k <= 1;
    const m = h.msg.get(d.id);

    // Cables
    for (const c of conectadoA) {
      const { g } = geo.get(c.id);
      const destino = { x: X_DISP - 1, y: y + 7 };
      if (c.observer) {
        const desde = g.antena;
        const vivo = recibe && h.emisora?.id === c.id;
        linea(ctx, desde.x, desde.y, destino.x, destino.y, vivo ? P.green : '#5d6690', { punteada: !vivo, paso: 2 });
        if (vivo) {
          const t = Math.min(1, s.p ?? 1);
          r(ctx, P.white, desde.x + (destino.x - desde.x) * t - 1, desde.y + (destino.y - desde.y) * t - 1, 3, 3);
        }
      } else {
        // Cableado a mano: un cable naranja con codos por cada robot
        const desde = { x: g.lado.x, y: g.lado.y - 6 + k * 3 };
        const mx = 70 + k * 12, color = recibe ? P.gold : '#c26a2a';
        linea(ctx, desde.x, desde.y, mx, desde.y, color);
        linea(ctx, mx, desde.y, mx + 10, destino.y + (k % 2 ? 4 : -4), color);
        linea(ctx, mx + 10, destino.y + (k % 2 ? 4 : -4), destino.x, destino.y, color);
      }
    }
    // Quien se desuscribió queda con el cable colgando
    const retirado = h.retirados.has(d.id) && !conectadoA.length;
    if (retirado) {
      linea(ctx, X_DISP - 1, y + 7, X_DISP - 10, y + 12, '#7a83a8');
      r(ctx, P.ink, X_DISP - 13, y + 11, 4, 3); r(ctx, P.steel, X_DISP - 12, y + 12, 2, 1);
    }

    const encendido = recibe || (m && i - m.k <= 4 && !/apagado/.test(m.txt));
    dispositivo(ctx, X_DISP, y, d.cls, encendido, now, !conectadoA.length && calderas.some(c => c.observer));
    if (m && i - m.k <= 3) texto(ctx, corto(m.txt, 10), X_ETI, y + 5, P.gold, { sombra: P.ink });
    else texto(ctx, corto(d.cls, 10), X_ETI, y + 5, retirado ? P.smoke : P.white, { sombra: P.ink });
  });

  // Contador de suscritos
  const obs = calderas.filter(c => c.observer);
  if (obs.length) texto(ctx, `SUSCRITOS ${obs.map(c => c.subs.length).join('+')}`, 4, 104, P.green, { sombra: P.ink });
  else if (calderas[0].cables.length) texto(ctx, `CABLES ${calderas[0].cables.length}`, 4, 104, '#ff9a3c', { sombra: P.ink });

  if (finExc) {
    const nombre = h.lanza.exc === 'ConcurrentModificationException' ? 'CONCURRENT MOD!' : corto(h.lanza.exc || 'ERROR', 15);
    bocadillo(ctx, 92, 96, nombre, P.red);
  }
  if (!frames.length) bocadillo(ctx, 96, 34, 'EJECUTA PARA ENCENDER', P.white);
}
