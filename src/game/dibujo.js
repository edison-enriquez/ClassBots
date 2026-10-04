/* Primitivas de dibujo compartidas por las escenas */
import { P, texto } from './sprites.js';
import { robotRPG, paletaRPG } from './rpg.js';

/* Equipo ganado en las misiones: se ve en todos los robots de las escenas */
let EQUIPO = new Set();
export const ponerEquipo = lista => { EQUIPO = new Set(lista.filter(Boolean)); };

export function dibujarRobot(ctx, cx, piso, r, now, { caminando = false, fantasma = false, paleta = null, sub = null, sinBarra = false, dir = 'abajo', salto = 0 } = {}) {
  if (fantasma) return robotRPG(ctx, cx, piso, { dir, fantasma: true });
  const id = r.id || 1;
  const parpadeo = !r.__off && (Math.floor(now / 120) + id * 7) % 34 === 0;
  const pal = paleta || paletaRPG(r.color, { energia: r.energia, apagado: r.__off, antena: Math.floor(now / 500 + id) % 2 === 0 });
  const paso = caminando ? 1 + (Math.floor(now / 140) % 2) : 0;
  const { x, y } = robotRPG(ctx, cx, piso, { dir, paso, pal, parpadeo, salto });
  if (!r.__off && !fantasma) {
    // Manual de ensamblaje: remache dorado en el pecho
    if (EQUIPO.has('manual') && dir !== 'arriba') { ctx.fillStyle = P.ink; ctx.fillRect(x + 7, y + 10, 3, 3); ctx.fillStyle = P.gold; ctx.fillRect(x + 8, y + 11, 1, 1); }
    // Módulo táctico: gema que cambia de color en la antena
    if (EQUIPO.has('tactico')) { ctx.fillStyle = P.ink; ctx.fillRect(x + 11, y - 1, 4, 4); ctx.fillStyle = Math.floor(now / 400) % 2 ? '#3fe0e0' : '#ff8fc7'; ctx.fillRect(x + 12, y, 2, 2); }
  }
  if (!sinBarra && typeof r.energia === 'number') barra(ctx, x + 2, y - 5, 12, r.energia);
  if (r.nombre != null) texto(ctx, String(r.nombre).slice(0, 10), cx, y - 12, r.__off ? P.smoke : P.white, { centrar: true, sombra: P.ink });
  if (sub) texto(ctx, sub, cx, piso + 3, P.gold, { centrar: true, sombra: P.ink });
  return { x, y };
}

export function barra(ctx, x, y, w, valor, max = 100) {
  const e = Math.max(0, Math.min(max, valor));
  ctx.fillStyle = P.ink; ctx.fillRect(x, y, w + 2, 4);
  ctx.fillStyle = valor > max || valor < 0 ? P.red : e > 40 ? P.green : e > 15 ? P.amber : P.red;
  ctx.fillRect(x + 1, y + 1, Math.round(w * e / max), 2);
}

/* Líneas a nivel de píxel: continua o punteada */
export function linea(ctx, x0, y0, x1, y1, color, { punteada = false, paso = 3 } = {}) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy, k = 0;
  ctx.fillStyle = color;
  for (;;) {
    if (!punteada || k % paso === 0) ctx.fillRect(x0, y0, 1, 1);
    k++;
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}
export function rombo(ctx, cx, cy, color, lleno) {
  cx = Math.round(cx); cy = Math.round(cy);
  const pts = [[0, -3], [-1, -2], [1, -2], [-2, -1], [2, -1], [-3, 0], [3, 0], [-2, 1], [2, 1], [-1, 2], [1, 2], [0, 3]];
  ctx.fillStyle = color;
  for (const [a, b] of pts) ctx.fillRect(cx + a, cy + b, 1, 1);
  if (lleno) for (const [a, b] of [[0, -2], [-1, -1], [0, -1], [1, -1], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [-1, 1], [0, 1], [1, 1], [0, 2]]) ctx.fillRect(cx + a, cy + b, 1, 1);
  else { ctx.fillStyle = P.ink; for (const [a, b] of [[0, -1], [-1, 0], [0, 0], [1, 0], [0, 1]]) ctx.fillRect(cx + a, cy + b, 1, 1); }
}
export function punta(ctx, x0, y0, x1, y1, color) {
  const ang = Math.atan2(y1 - y0, x1 - x0);
  for (const s of [-1, 1]) {
    const a = ang + Math.PI + s * 0.6;
    linea(ctx, x1, y1, x1 + Math.cos(a) * 4, y1 + Math.sin(a) * 4, color);
  }
}
export function rayo(ctx, x0, y0, x1, y1, color, semilla = 0) {
  let px = x0, py = y0;
  for (let k = 1; k <= 6; k++) {
    const t = k / 6, jx = k < 6 ? (((semilla * 13 + k * 7) % 7) - 3) : 0, jy = k < 6 ? (((semilla * 5 + k * 11) % 7) - 3) : 0;
    const nx = x0 + (x1 - x0) * t + jx, ny = y0 + (y1 - y0) * t + jy;
    linea(ctx, px, py, nx, ny, color);
    px = nx; py = ny;
  }
}
export function cartel(ctx, x, y, txt, color = P.gold) {
  const w = String(txt).length * 4 + 5;
  ctx.fillStyle = P.ink; ctx.fillRect(Math.round(x - w / 2), y, w, 9);
  ctx.fillStyle = color; ctx.fillRect(Math.round(x - w / 2) + 1, y + 1, w - 2, 7);
  texto(ctx, txt, x, y + 2, P.ink, { centrar: true });
}
