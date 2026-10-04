/* Escena del Mundo 6 · La Arena: un coliseo visto desde arriba.
   Cada luchador muestra, al responder una llamada, de qué clase es la versión que se ejecutó (despacho dinámico). */
import { W, H, P, sprite, texto, mezclar, colorDe, DRON } from './sprites.js';
import { dibujarRobot, barra, rayo } from './dibujo.js';
import { muro, sombra, antorcha, operaria, bocadillo, paletaRPG, robotRPG } from './rpg.js';

const REFEREES = new Set(['Arbitro', 'Torneo', 'Arena']);
const COLOR_CLASE = { Robot: 'azul', Dron: 'verde', Tanque: 'gris', Sanador: 'rosado', Ninja: 'morado', Torreta: 'naranja' };
const OTROS = ['amarillo', 'cian', 'rojo', 'cafe', 'blanco'];
const colorClase = cls => COLOR_CLASE[cls] || OTROS[[...cls].reduce((a, c) => a + c.charCodeAt(0), 0) % OTROS.length];
const numero = (o, k) => (typeof o?.f?.[k] === 'number' ? o.f[k] : null);
const nombreDe = o => (o?.f?.nombre != null ? String(o.f.nombre) : null);
/* Clase cuya versión del método se ejecuta para un objeto de la clase cls */
function claseDeVersion(modelo, cls, metodo) {
  let c = modelo?.clases?.[cls];
  while (c) {
    if (c.metodos.some(m => m.nombre === metodo && !m.abstracto)) return c.nombre;
    c = c.__padre && modelo.clases[c.__padre];
  }
  return null;
}

/* Efectos al entrar a un cuadro de la reproducción */
export function alEntrarArena(frames, i, s, now) {
  const fr = frames[i], prev = frames[i - 1];
  if (!fr) return;
  if (fr.tipo === 'crear') (s.nacidos ||= {})[fr.quien] = i;
  if (fr.tipo === 'llamada' && fr.quien) {
    s.fx = { tipo: 'accion', id: fr.quien, metodo: fr.metodo, t0: now };
    if (fr.metodo === 'golpe') s.atacante = fr.quien;
    if (fr.metodo === 'recibir' && s.atacante && s.atacante !== fr.quien) s.golpe = { de: s.atacante, a: fr.quien, t0: now };
  }
  if ((fr.tipo === 'energia' || fr.tipo === 'set') && fr.campo === 'energia' && typeof fr.valor === 'number') {
    const antes = prev?.objetos?.find(o => o.id === fr.quien)?.f?.energia;
    // Los valores que pone el constructor no son daño ni curación
    const recien = s.nacidos && s.nacidos[fr.quien] != null && i - s.nacidos[fr.quien] <= 4;
    if (typeof antes === 'number' && antes !== fr.valor && !recien) (s.numeros ||= []).push({ id: fr.quien, d: fr.valor - antes, t0: now });
  }
}

function fondo(ctx, now) {
  // Gradas: muro de piedra con público animado
  muro(ctx, 30, 'piedra');
  const tonos = ['#ff8fc7', '#ffd23f', '#4aa3ff', '#45d483', '#ff9a3c', '#eef2f7', '#b58cff'];
  for (let fila = 0; fila < 3; fila++) {
    for (let x = 4 + (fila % 2) * 3; x < W - 2; x += 6) {
      const k = (x * 7 + fila * 13) % tonos.length, salta = (Math.floor(now / 220) + x + fila) % 9 === 0 ? 1 : 0;
      ctx.fillStyle = mezclar(tonos[k], -0.15); ctx.fillRect(x, 7 + fila * 6 - salta, 3, 3);
      ctx.fillStyle = '#e0b48a'; ctx.fillRect(x + 1, 6 + fila * 6 - salta, 1, 1);
    }
  }
  ctx.fillStyle = '#2c3048'; ctx.fillRect(0, 25, W, 3);
  // Estandartes y antorchas
  for (const [x, c] of [[20, '#c0392b'], [172, '#3f78d0']]) {
    ctx.fillStyle = P.ink; ctx.fillRect(x - 5, 0, 11, 24);
    ctx.fillStyle = c; ctx.fillRect(x - 4, 0, 9, 21);
    ctx.fillStyle = P.gold; ctx.fillRect(x - 1, 8, 3, 3);
    ctx.fillStyle = c; ctx.fillRect(x - 4, 21, 3, 2); ctx.fillRect(x + 2, 21, 3, 2);
  }
  antorcha(ctx, 44, 14, now); antorcha(ctx, 144, 14, now);
  // Arena de combate: arena clara con muro bajo
  ctx.fillStyle = '#b8955c'; ctx.fillRect(0, 30, W, H - 30);
  for (let k = 0; k < 140; k++) {
    const x = (k * 53) % W, y = 32 + ((k * 31) % (H - 34));
    ctx.fillStyle = k % 3 ? '#a8854e' : '#cfae74'; ctx.fillRect(x, y, 1, 1);
  }
  // Círculo del ring
  const cx = 96, cy = 74, rx = 78, ry = 27;
  for (let a = 0; a < Math.PI * 2; a += 0.02) {
    const x = Math.round(cx + Math.cos(a) * rx), y = Math.round(cy + Math.sin(a) * ry);
    ctx.fillStyle = '#7a5a32'; ctx.fillRect(x, y, 2, 1);
  }
  ctx.fillStyle = '#c9a66b';
  for (let a = 0; a < Math.PI * 2; a += 0.05) ctx.fillRect(Math.round(cx + Math.cos(a) * (rx - 6)), Math.round(cy + Math.sin(a) * (ry - 3)), 1, 1);
}

function dibujarLuchador(ctx, o, x, piso, dir, now, { actua, modelo }) {
  const cls = o.cls, color = colorClase(cls), energia = numero(o, 'energia');
  const salto = actua ? 2 + (Math.floor(now / 90) % 2) : 0;
  if (cls === 'Dron' || /^Dron/.test(cls)) {
    const y = piso - 20 + Math.round(Math.sin(now / 220 + o.id) * 2) - salto;
    sombra(ctx, x, piso, 10);
    sprite(ctx, DRON, x - 8, y, { k: P.ink, B: colorDe(color), e: P.white });
    if (energia != null) barra(ctx, x - 6, y - 6, 12, energia);
    if (nombreDe(o)) texto(ctx, nombreDe(o).slice(0, 9), x, y - 13, P.white, { centrar: true, sombra: P.ink });
  } else if (cls === 'Torreta') {
    sombra(ctx, x, piso, 14);
    ctx.fillStyle = P.ink; ctx.fillRect(x - 7, piso - 9 - salto, 14, 9);
    ctx.fillStyle = '#8b93a7'; ctx.fillRect(x - 6, piso - 8 - salto, 12, 7);
    ctx.fillStyle = P.ink; ctx.fillRect(x - 4, piso - 15 - salto, 8, 7);
    ctx.fillStyle = colorDe(color); ctx.fillRect(x - 3, piso - 14 - salto, 6, 5);
    ctx.fillStyle = P.ink; ctx.fillRect(dir === 'izq' ? x - 10 : x + 3, piso - 13 - salto, 7, 2);
  } else {
    const r = { id: o.id, nombre: nombreDe(o), color, energia, __off: energia === 0 };
    dibujarRobot(ctx, x, piso, r, now, { dir, salto, sinBarra: energia == null });
    if (cls === 'Tanque') { ctx.fillStyle = P.ink; ctx.fillRect(dir === 'izq' ? x - 10 : x + 5, piso - 12 - salto, 5, 10); ctx.fillStyle = '#c9cee8'; ctx.fillRect(dir === 'izq' ? x - 9 : x + 6, piso - 11 - salto, 3, 8); }
    if (cls === 'Sanador') { ctx.fillStyle = P.white; ctx.fillRect(x - 1, piso - 9 - salto, 3, 1); ctx.fillRect(x, piso - 10 - salto, 1, 3); }
  }
  // Etiqueta de clase bajo los pies
  texto(ctx, cls.slice(0, 8).toUpperCase(), x, piso + 3, mezclar(colorDe(color), 0.35), { centrar: true, sombra: P.ink });
  if (actua) {
    const de = claseDeVersion(modelo, cls, actua.metodo);
    const txt = de ? `${actua.metodo}() DE ${de.toUpperCase()}` : `${actua.metodo}()`;
    bocadillo(ctx, x, Math.max(1, piso - (/^Dron/.test(cls) ? 52 : 44)), txt.slice(0, 26), P.gold);
  }
}

export function escenaArena(ctx, { modelo, fr, s, now }) {
  fondo(ctx, now);
  const objs = (fr?.objetos || []).filter(o => o.cls !== 'Main');
  const arbitros = objs.filter(o => REFEREES.has(o.cls));
  const luchadores = objs.filter(o => !REFEREES.has(o.cls)).slice(0, 6);
  if (arbitros.length || fr) {
    // La árbitra mira desde el borde izquierdo del ring
    operaria(ctx, 12, 62, now);
    texto(ctx, (arbitros[0]?.cls || 'Arbitra').toUpperCase().slice(0, 7), 14, 64, P.gold, { centrar: true, sombra: P.ink });
  }
  if (!luchadores.length) {
    robotRPG(ctx, 96, 84, { fantasma: true });
    bocadillo(ctx, 96, 56, 'EJECUTA PARA LLENAR LA ARENA', P.white);
    return;
  }
  const n = luchadores.length, paso = Math.min(46, 150 / Math.max(1, n - 1));
  const pos = new Map();
  luchadores.forEach((o, k) => {
    const x = Math.round(100 + (k - (n - 1) / 2) * paso);
    const piso = 84 + (n > 3 ? (k % 2) * 8 - 4 : 0);
    pos.set(o.id, { x, piso, dir: n === 1 ? 'abajo' : x < 100 ? 'der' : x > 100 ? 'izq' : 'abajo' });
  });
  // Golpe entre dos luchadores
  const g = s.golpe && now - s.golpe.t0 < 650 ? s.golpe : null;
  if (g && pos.get(g.de) && pos.get(g.a)) {
    const a = pos.get(g.de), b = pos.get(g.a);
    rayo(ctx, a.x, a.piso - 10, b.x, b.piso - 10, P.amber, Math.floor(now / 60));
  }
  const fx = s.fx && s.fx.tipo === 'accion' && now - s.fx.t0 < 900 ? s.fx : null;
  // Dibujar de atrás hacia adelante
  [...luchadores].sort((a, b) => pos.get(a.id).piso - pos.get(b.id).piso).forEach(o => {
    const p = pos.get(o.id);
    dibujarLuchador(ctx, o, p.x, p.piso, p.dir, now, { actua: fx && fx.id === o.id ? fx : null, modelo });
  });
  // Números de daño o curación que suben
  s.numeros = (s.numeros || []).filter(q => now - q.t0 < 900);
  for (const q of s.numeros) {
    const p = pos.get(q.id); if (!p) continue;
    const t = (now - q.t0) / 900;
    texto(ctx, (q.d > 0 ? '+' : '') + q.d, p.x + 10, Math.round(p.piso - 26 - t * 10), q.d > 0 ? P.green : P.red, { centrar: true, sombra: P.ink });
  }
}
