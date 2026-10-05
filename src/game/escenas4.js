/* Escena del Mundo 7 · La Sala de Averías: manejo de errores.
   Una baliza en el techo se enciende cuando se lanza una excepción (throw), el catch la apaga con una red
   verde y el finally deja su marca. Si nadie la atrapa, la alarma queda encendida. */
import { W, H, P, sprite, texto, BATERIA } from './sprites.js';
import { dibujarRobot, barra } from './dibujo.js';
import { suelo, muro, sombra, bocadillo, robotRPG, monitorPared } from './rpg.js';
import { esLanzable } from '../engine/motor.js';

const PISO = 90;
const COLORES = ['azul', 'naranja', 'verde', 'morado', 'cian', 'rosado'];
const numero = (o, k) => (typeof o?.f?.[k] === 'number' ? o.f[k] : null);
const nombreDe = o => (o?.f?.nombre != null ? String(o.f.nombre) : null);
const esRobot = o => /robot/i.test(o.cls) || numero(o, 'energia') != null;

/* Estado de la alarma en el cuadro i: la última excepción lanzada y si alguien la atrapó */
function estadoAlarma(frames, i) {
  let lanza = null, atrapa = null, fin = null;
  for (let k = Math.min(i, frames.length - 1); k >= 0 && k >= i - 40; k--) {
    const f = frames[k];
    if (f.tipo === 'finally' && fin == null) fin = k;
    if (f.tipo === 'atrapa' && atrapa == null && lanza == null) atrapa = { k, ...f };
    if (f.tipo === 'lanza') { lanza = { k, ...f }; break; }
  }
  return { lanza, atrapa, fin };
}

function fondo(ctx, now, alarma) {
  muro(ctx, 30, 'metal');
  suelo(ctx, 'metal', 0, 30, W, H);
  // Franja de seguridad amarilla y negra
  for (let x = 0; x < W; x += 8) { ctx.fillStyle = (x / 8) % 2 ? P.ink : '#e8b923'; ctx.fillRect(x, 30, 8, 3); }
  // Placa y monitores
  ctx.fillStyle = P.ink; ctx.fillRect(58, 17, 76, 11); ctx.fillStyle = '#5a2430'; ctx.fillRect(59, 18, 74, 9);
  texto(ctx, 'SALA DE AVERIAS', 96, 20, '#ffb3bd', { centrar: true });
  monitorPared(ctx, 8, 9, now, alarma ? '#ff5470' : '#4ade80');
  monitorPared(ctx, 166, 9, now, alarma ? '#ff5470' : '#7cd4ff');
  // Baliza
  const on = alarma && Math.floor(now / 180) % 2 === 0;
  ctx.fillStyle = P.ink; ctx.fillRect(90, 2, 12, 12);
  ctx.fillStyle = '#4c5378'; ctx.fillRect(91, 10, 10, 3);
  ctx.fillStyle = on ? '#ff3355' : alarma ? '#a3202f' : '#5b3640'; ctx.fillRect(92, 3, 8, 7);
  ctx.fillStyle = on ? '#ffd0d6' : '#7a4a52'; ctx.fillRect(94, 4, 2, 2);
  if (on) {
    // Destellos rojos en la sala
    ctx.fillStyle = 'rgba(255,40,70,.13)'; ctx.fillRect(0, 0, W, H);
    for (const [dx, dy] of [[-10, 2], [12, 2], [-8, 10], [10, 10]]) { ctx.fillStyle = '#ff3355'; ctx.fillRect(96 + dx, 6 + dy, 2, 1); }
  }
}

/* Objetos que no son robots: batería, almacén, hangar, centro… */
function dibujarMaquina(ctx, o, x, now) {
  const piso = PISO;
  sombra(ctx, x, piso, 14);
  if (/bateria/i.test(o.cls)) {
    const c = numero(o, 'carga') ?? 0;
    sprite(ctx, BATERIA, x - 6, piso - 12, { k: P.ink, G: c > 90 ? '#ffb020' : c > 0 ? P.green : '#3b3550' }, { escala: 1 });
    barra(ctx, x - 7, piso - 18, 14, c);
    texto(ctx, String(c), x, piso - 26, P.white, { centrar: true, sombra: P.ink });
  } else if (/hangar|compuerta/i.test(o.cls)) {
    const abierta = o.f.abierta === true;
    ctx.fillStyle = P.ink; ctx.fillRect(x - 13, piso - 26, 26, 26);
    ctx.fillStyle = '#4c5378'; ctx.fillRect(x - 12, piso - 25, 24, 25);
    ctx.fillStyle = '#0e0b1c'; ctx.fillRect(x - 9, piso - 22, 18, 22);
    const alto = abierta ? 4 : 22;
    for (let y = 0; y < alto; y += 3) { ctx.fillStyle = y % 6 ? '#8b93a7' : '#e8b923'; ctx.fillRect(x - 9, piso - 22 + y, 18, 2); }
    ctx.fillStyle = abierta ? P.red : P.green; ctx.fillRect(x - 1, piso - 29, 3, 2);
    texto(ctx, abierta ? 'ABIERTA' : 'CERRADA', x, piso + 9, abierta ? P.red : P.green, { centrar: true, sombra: P.ink });
  } else {
    ctx.fillStyle = P.ink; ctx.fillRect(x - 11, piso - 18, 22, 18);
    ctx.fillStyle = '#59507f'; ctx.fillRect(x - 10, piso - 17, 20, 16);
    ctx.fillStyle = '#2b2546'; ctx.fillRect(x - 8, piso - 15, 16, 7);
    ctx.fillStyle = Math.floor(now / 300) % 2 ? P.green : '#1f6b3c'; ctx.fillRect(x - 6, piso - 13, 3, 3);
    const num = Object.entries(o.f).find(([, v]) => typeof v === 'number');
    if (num) texto(ctx, `${num[0].slice(0, 8)} ${num[1]}`, x, piso - 26, P.white, { centrar: true, sombra: P.ink });
  }
  texto(ctx, o.cls.toUpperCase().slice(0, 9), x, piso + 3, '#c9cee8', { centrar: true, sombra: P.ink });
}

export function escenaAverias(ctx, { modelo, fr, s, now }) {
  const frames = s.frames || [];
  const { lanza, atrapa, fin } = fr ? estadoAlarma(frames, s.i) : {};
  const alarma = !!lanza && !atrapa;
  fondo(ctx, now, alarma);
  const objs = (fr?.objetos || []).filter(o => o.cls !== 'Main' && !(modelo?.clases && esLanzable(modelo.clases, o.cls)));
  if (!objs.length) {
    robotRPG(ctx, 96, PISO, { fantasma: true });
    bocadillo(ctx, 96, 52, frames.length ? 'TRABAJANDO…' : 'EJECUTA PARA ABRIR LA SALA', P.white);
    return;
  }
  const lista = objs.slice(-6), n = lista.length, paso = Math.min(48, 160 / Math.max(1, n - 1));
  const pos = new Map();
  lista.forEach((o, k) => pos.set(o.id, Math.round(96 + (k - (n - 1) / 2) * paso)));
  let colorK = 0;
  for (const o of lista) {
    const x = pos.get(o.id);
    if (esRobot(o)) {
      const energia = numero(o, 'energia');
      const quien = lanza && lanza.quien === o.id && alarma;
      dibujarRobot(ctx, x, PISO, { id: o.id, nombre: nombreDe(o), color: COLORES[colorK++ % COLORES.length], energia, __off: energia === 0 }, now, { salto: quien ? Math.floor(now / 90) % 2 : 0 });
      texto(ctx, o.cls.toUpperCase().slice(0, 9), x, PISO + 3, '#c9cee8', { centrar: true, sombra: P.ink });
    } else dibujarMaquina(ctx, o, x, now);
  }
  // La excepción: un aviso rojo sobre quien la lanzó (o en el centro)
  if (lanza) {
    const x = pos.get(lanza.quien) ?? 96;
    const atrapada = !!atrapa;
    const txt = (atrapada ? '' : '! ') + lanza.exc.replace(/Exception$/, 'Exc.');
    if (!atrapada) bocadillo(ctx, x, 38, txt.toUpperCase().slice(0, 30), Math.floor(now / 180) % 2 ? P.red : '#ffb3bd');
    // Ticket que cae hacia el catch
    if (atrapada && s.i - atrapa.k < 3) {
      const t = Math.min(1, (now % 900) / 900);
      ctx.fillStyle = P.ink; ctx.fillRect(x - 5, 40 + t * 30, 10, 7);
      ctx.fillStyle = P.red; ctx.fillRect(x - 4, 41 + t * 30, 8, 5);
      ctx.fillStyle = P.white; ctx.fillRect(x, 42 + t * 30, 1, 2); ctx.fillRect(x, 45 + t * 30, 1, 1);
    }
  }
  // La red del catch
  if (atrapa && s.i - atrapa.k < 4) {
    const y = 100;
    for (let x = 30; x < 162; x += 4) { ctx.fillStyle = (x / 4) % 2 ? P.green : '#1f6b3c'; ctx.fillRect(x, y + ((x / 4) % 2), 3, 1); }
    bocadillo(ctx, 96, 101 - 12, `CATCH ${atrapa.como.toUpperCase().replace(/EXCEPTION/g, 'EXC.')}`.slice(0, 34), P.green);
  }
  if (fin != null && s.i - fin < 3) {
    ctx.fillStyle = P.ink; ctx.fillRect(150, 34, 38, 11); ctx.fillStyle = '#1d4b86'; ctx.fillRect(151, 35, 36, 9);
    texto(ctx, 'FINALLY', 169, 37, '#7fd7ff', { centrar: true });
  }
  // Sin atrapar al final de la reproducción
  if (alarma && s.i >= frames.length - 1 && s.p >= 1) {
    ctx.fillStyle = P.ink; ctx.fillRect(48, 102, 96, 10); ctx.fillStyle = '#5a2430'; ctx.fillRect(49, 103, 94, 8);
    texto(ctx, 'SIN ATRAPAR: SE DETUVO', 96, 105, '#ffb3bd', { centrar: true });
  }
}
