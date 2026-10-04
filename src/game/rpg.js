/* Estilo RPG en vista cenital: baldosas de 16×16, personajes chibi en cuatro direcciones y utilería */
import { P, sprite, texto, mezclar, paletaRobot } from './sprites.js';

const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const rect = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };

/* ---------- Suelos ---------- */
export function suelo(ctx, tipo, x0, y0, x1, y1) {
  for (let ty = Math.floor(y0 / 16); ty * 16 < y1; ty++) for (let tx = Math.floor(x0 / 16); tx * 16 < x1; tx++) baldosa(ctx, tipo, tx * 16, ty * 16, hash(tx, ty));
}
function baldosa(ctx, tipo, x, y, r) {
  if (tipo === 'madera') {
    rect(ctx, '#9a6a3a', x, y, 16, 16);
    for (let k = 0; k < 4; k++) { rect(ctx, '#7d532c', x, y + k * 4 + 3, 16, 1); rect(ctx, '#b07c48', x, y + k * 4, 16, 1); }
    rect(ctx, '#7d532c', x + ((r * 13) | 0), y + 4 * ((r * 4) | 0), 1, 3);
  } else if (tipo === 'piedra') {
    rect(ctx, '#5f6680', x, y, 16, 16);
    rect(ctx, '#4a506a', x, y + 7, 16, 1); rect(ctx, '#4a506a', x, y + 15, 16, 1);
    rect(ctx, '#4a506a', x + 7, y, 1, 7); rect(ctx, '#4a506a', x + 3, y + 8, 1, 7); rect(ctx, '#4a506a', x + 12, y + 8, 1, 7);
    rect(ctx, '#717a96', x + 1, y + 1, 5, 1); rect(ctx, '#717a96', x + 9, y + 1, 5, 1); rect(ctx, '#717a96', x + 5, y + 9, 6, 1);
    if (r < 0.15) rect(ctx, '#3b8a4a', x + 2 + ((r * 60) | 0) % 10, y + 12, 2, 1);
  } else if (tipo === 'pasto') {
    rect(ctx, '#4f9a3c', x, y, 16, 16);
    for (let k = 0; k < 5; k++) { const a = hash(x + k, y - k); rect(ctx, a < 0.5 ? '#3f8530' : '#62b24a', x + ((a * 15) | 0), y + ((hash(y + k, x) * 14) | 0), 1, 2); }
    if (r < 0.08) { rect(ctx, '#ffe066', x + 6, y + 6, 1, 1); rect(ctx, '#ff8fc7', x + 10, y + 11, 1, 1); }
  } else if (tipo === 'adoquin') {
    rect(ctx, '#b8a888', x, y, 16, 16);
    rect(ctx, '#9a8b6e', x, y + 7, 16, 1); rect(ctx, '#9a8b6e', x, y + 15, 16, 1);
    rect(ctx, '#9a8b6e', x + 5, y, 1, 7); rect(ctx, '#9a8b6e', x + 11, y + 8, 1, 7);
    rect(ctx, '#cfc0a0', x + 1, y + 1, 3, 1); rect(ctx, '#cfc0a0', x + 7, y + 9, 3, 1);
  } else if (tipo === 'metal') {
    rect(ctx, '#4b526e', x, y, 16, 16);
    rect(ctx, '#3a405a', x, y + 15, 16, 1); rect(ctx, '#3a405a', x + 15, y, 1, 16);
    rect(ctx, '#5d6588', x, y, 16, 1); rect(ctx, '#5d6588', x, y, 1, 16);
    for (const [a, b] of [[2, 2], [13, 2], [2, 13], [13, 13]]) rect(ctx, '#7a83a8', x + a, y + b, 1, 1);
  } else if (tipo === 'laboratorio') {
    rect(ctx, (((x + y) / 16) % 2) ? '#d9e2ef' : '#c3cfe0', x, y, 16, 16);
    rect(ctx, '#a6b4ca', x, y + 15, 16, 1); rect(ctx, '#a6b4ca', x + 15, y, 1, 16);
  } else if (tipo === 'alfombra') {
    rect(ctx, '#8a2d3b', x, y, 16, 16);
    rect(ctx, '#a63a4a', x + 2, y + 2, 12, 12);
    rect(ctx, '#d8b04a', x + 7, y + 7, 2, 2);
  }
}

/* ---------- Muros (la cara frontal de la pared superior de la sala) ---------- */
export function muro(ctx, alto, estilo = 'piedra') {
  const base = { piedra: ['#3d4260', '#2c3048', '#50567a'], madera: ['#6b4423', '#55361c', '#83552e'], metal: ['#3a3f5c', '#2b2f46', '#4c5378'], laboratorio: ['#8fa3c0', '#7389aa', '#a9bad3'], ladrillo: ['#7a4a3a', '#5e382b', '#935a47'] }[estilo];
  rect(ctx, '#181426', 0, 0, 192, 4);
  rect(ctx, base[0], 0, 4, 192, alto - 4);
  if (estilo === 'madera') for (let x = 0; x < 192; x += 8) { rect(ctx, base[1], x, 4, 1, alto - 4); rect(ctx, base[2], x + 1, 4, 1, alto - 4); }
  else if (estilo === 'metal' || estilo === 'laboratorio') { for (let x = 0; x < 192; x += 32) rect(ctx, base[1], x, 4, 1, alto - 4); rect(ctx, base[2], 0, 10, 192, 1); }
  else for (let y = 4, f = 0; y < alto; y += 6, f++) { rect(ctx, base[1], 0, y + 5, 192, 1); for (let x = (f % 2) * 6; x < 192; x += 12) rect(ctx, base[1], x, y, 1, 5); rect(ctx, base[2], 0, y, 192, 1); }
  rect(ctx, base[1], 0, alto - 2, 192, 2);
  rect(ctx, 'rgba(0,0,0,.28)', 0, alto, 192, 3);
}

export function sombra(ctx, cx, piso, w = 10) {
  ctx.fillStyle = 'rgba(10,6,20,.35)';
  ctx.fillRect(Math.round(cx - w / 2) + 1, piso - 1, w - 2, 1);
  ctx.fillRect(Math.round(cx - w / 2), piso, w, 2);
  ctx.fillRect(Math.round(cx - w / 2) + 1, piso + 2, w - 2, 1);
}

/* ---------- Personajes ---------- */
export const R_ABAJO = [
  '.......aa.......',
  '.......ss.......',
  '....kkkkkkkk....',
  '...kHHHHHHHHk...',
  '...kBBBBBBBBk...',
  '...kBeeBBeeBk...',
  '...kBeoBBeoBk...',
  '...kbBBBBBBbk...',
  '....kkkkkkkk....',
  '...kBBBBBBBBk...',
  '..kHBBkggkBBHk..',
  '..kbBBBBBBBBbk..',
  '...kbbbbbbbbk...',
  '....ksk..ksk....',
  '....kkk..kkk....',
  '................',
];
const R_ARRIBA = R_ABAJO.slice();
R_ARRIBA[5] = '...kBBBBBBBBk...';
R_ARRIBA[6] = '...kBBkkkkBBk...';
R_ARRIBA[10] = '..kHBBBBBBBBHk..';
const R_LADO = [
  '........aa......',
  '........ss......',
  '.....kkkkkkk....',
  '....kHHHHHHHk...',
  '....kBBBBBBBk...',
  '....kBBBBBeek...',
  '....kBBBBBeok...',
  '....kbBBBBBbk...',
  '.....kkkkkkk....',
  '....kBBBBBBk....',
  '...kHBBBBkgk....',
  '...kbBBBBBBk....',
  '....kbbbbbk.....',
  '.....kskksk.....',
  '.....kkkkkk.....',
  '................',
];
const PIERNAS = {
  frente: [['....ksk..ksk....', '....kkk..kkk....'], ['....ksk..kkk....', '....kkk.........'], ['....kkk..ksk....', '.........kkk....']],
  lado: [['.....kskksk.....', '.....kkkkkk.....'], ['....ksk..ksk....', '....kkk..kkk....'], ['.....kskksk.....', '.....kkkkkk.....']],
};
export const PARPADEO_RPG = { 5: '...kBBBBBBBBk...', 6: '...kBkkBBkkBk...' };

/** Robot en vista cenital. piso = y de los pies. dir: abajo | arriba | izq | der. paso: 0 quieto, 1 y 2 caminando. */
export function robotRPG(ctx, cx, piso, { dir = 'abajo', paso = 0, pal, fantasma = false, alfa = 1, parpadeo = false, salto = 0 } = {}) {
  const x = Math.round(cx - 8), y = Math.round(piso - 15 - salto);
  const lado = dir === 'izq' || dir === 'der';
  const base = lado ? R_LADO : dir === 'arriba' ? R_ARRIBA : R_ABAJO;
  const filas = base.slice();
  const pies = (lado ? PIERNAS.lado : PIERNAS.frente)[paso % 3];
  filas[13] = pies[0]; filas[14] = pies[1];
  if (parpadeo && dir === 'abajo') { filas[5] = PARPADEO_RPG[5]; filas[6] = PARPADEO_RPG[6]; }
  if (!fantasma) sombra(ctx, cx, piso, 12);
  if (fantasma) sprite(ctx, base, x, y, null, { contorno: P.line, alfa: 0.55, espejo: dir === 'izq' });
  else sprite(ctx, base, x, y, pal, { filas, espejo: dir === 'izq', alfa });
  return { x, y };
}
export function paletaRPG(color, { energia = 100, apagado = false, antena = true } = {}) {
  const p = paletaRobot({ color, energia, apagado, antena });
  return { ...p, e: apagado ? P.off : '#bff4ff', o: apagado ? P.off : '#1b6b8a' };
}
export const PALETA_OXIDO = now => ({ k: P.ink, s: '#7a5a48', B: '#b5651d', b: '#7a3e12', H: '#d98c4a', a: Math.floor(now / 250) % 2 ? P.red : '#7a1020', e: '#ff4040', o: '#ffd0d0', p: '#3a2010', g: P.red });

const OPERARIA = [
  '.....kkkkkk.....',
  '....kYYYYYYk....',
  '...kYYYYYYYYk...',
  '...kkkkkkkkkk...',
  '....kssssssk....',
  '....ksessesk....',
  '....kssssssk....',
  '.....kkkkkk.....',
  '....kBBBBBBk....',
  '...kBBBBBBBBk...',
  '..ksBBBBBBBBsk..',
  '..kkBBBBBBBBkk..',
  '....kDDDDDDk....',
  '....kDDkkDDk....',
  '....kkk..kkk....',
  '................',
];
export function operaria(ctx, cx, piso, now) {
  sombra(ctx, cx, piso, 12);
  sprite(ctx, OPERARIA, Math.round(cx - 8), Math.round(piso - 15 - (Math.floor(now / 600) % 2)), { k: P.ink, Y: '#ffcc33', s: '#e7b98f', e: P.ink, B: '#3f78d0', D: '#2b3f6b' });
}

/* ---------- Utilería ---------- */
export function antorcha(ctx, x, y, now) {
  rect(ctx, '#5a3a1a', x + 1, y + 4, 2, 6); rect(ctx, P.ink, x, y + 3, 4, 1);
  const f = Math.floor(now / 120) % 3;
  rect(ctx, '#ff7a1a', x, y + 1 - (f === 1 ? 1 : 0), 4, 3); rect(ctx, '#ffd23f', x + 1, y + (f === 2 ? 1 : 0), 2, 2);
  ctx.fillStyle = 'rgba(255,170,60,.08)'; ctx.fillRect(x - 8, y - 4, 20, 20);
}
export function ventana(ctx, x, y) {
  rect(ctx, P.ink, x, y, 18, 14); rect(ctx, '#7fc8ff', x + 1, y + 1, 16, 12); rect(ctx, '#bfe6ff', x + 2, y + 2, 5, 4);
  rect(ctx, '#5a3a1a', x + 8, y + 1, 2, 12); rect(ctx, '#5a3a1a', x + 1, y + 6, 16, 2);
}
export function placa(ctx, cx, y, txt, color = P.gold) {
  const w = String(txt).length * 4 + 7;
  rect(ctx, P.ink, Math.round(cx - w / 2), y, w, 11); rect(ctx, '#6b4423', Math.round(cx - w / 2) + 1, y + 1, w - 2, 9);
  texto(ctx, txt, cx, y + 3, color, { centrar: true });
}
export function mesa(ctx, x, y, w, h, tapa = '#a06a38') {
  rect(ctx, P.ink, x, y, w, h + 4); rect(ctx, tapa, x + 1, y + 1, w - 2, h - 2); rect(ctx, mezclar(tapa, 0.2), x + 1, y + 1, w - 2, 1);
  rect(ctx, mezclar(tapa, -0.35), x + 1, y + h - 1, w - 2, 4);
  rect(ctx, P.ink, x + 2, y + h + 3, 2, 3); rect(ctx, P.ink, x + w - 4, y + h + 3, 2, 3);
}
export function cristal(ctx, cx, piso, now, brillo = false) {
  sombra(ctx, cx, piso, 14);
  rect(ctx, P.ink, cx - 7, piso - 6, 14, 6); rect(ctx, '#6d7499', cx - 6, piso - 5, 12, 4); rect(ctx, '#8b93b8', cx - 6, piso - 5, 12, 1);
  const flota = Math.round(Math.sin(now / 300) * 1.5);
  const c = brillo ? '#fff6b0' : Math.floor(now / 400) % 2 ? '#ffcc33' : '#e0a800';
  const y = piso - 20 + flota;
  for (let k = 0; k < 6; k++) rect(ctx, c, cx - k + 0, y + k, k * 2 + 1, 1);
  for (let k = 0; k < 6; k++) rect(ctx, mezclar(c, -0.25), cx - 5 + k, y + 6 + k, 11 - k * 2, 1);
  rect(ctx, '#ffffff', cx - 1, y + 2, 1, 2);
  if (brillo) { ctx.fillStyle = 'rgba(255,240,150,.35)'; ctx.fillRect(cx - 12, y - 6, 24, 30); }
}
export function escaleras(ctx, x, y, now) {
  rect(ctx, P.ink, x, y, 16, 16);
  for (let k = 0; k < 4; k++) { rect(ctx, mezclar('#5f6680', -k * 0.18), x + 1, y + 1 + k * 4, 14, 3); rect(ctx, '#2a2e44', x + 1, y + 4 + k * 4, 14, 1); }
  if (Math.floor(now / 500) % 2) rect(ctx, P.green, x + 7, y - 4, 2, 2);
}
export function plataforma(ctx, cx, piso, activa = false) {
  for (let k = -1; k <= 1; k++) rect(ctx, P.ink, cx - 9 + Math.abs(k), piso - 3 + k * 2 + 2, 18 - Math.abs(k) * 2, 2);
  rect(ctx, activa ? '#ffcc33' : '#7a83a8', cx - 8, piso - 2, 16, 3);
  rect(ctx, activa ? '#fff3a8' : '#a3abcc', cx - 6, piso - 2, 12, 1);
}
export function estante(ctx, x, y, w) {
  rect(ctx, P.ink, x, y, w, 10); rect(ctx, '#7a4f2a', x + 1, y + 1, w - 2, 8); rect(ctx, '#5c3a1e', x + 1, y + 5, w - 2, 1);
}
export function maceta(ctx, cx, piso) {
  sombra(ctx, cx, piso, 8);
  rect(ctx, P.ink, cx - 4, piso - 5, 8, 5); rect(ctx, '#b5651d', cx - 3, piso - 4, 6, 4);
  for (const [a, b] of [[-3, -9], [0, -11], [3, -9], [-1, -7], [2, -7]]) rect(ctx, '#3f8530', cx + a - 1, piso + b, 3, 3);
}
export function monitorPared(ctx, x, y, now, color = '#4ade80') {
  rect(ctx, P.ink, x, y, 18, 12); rect(ctx, '#0e1a12', x + 1, y + 1, 16, 9);
  for (let k = 0; k < 3; k++) rect(ctx, color, x + 2, y + 2 + k * 3, 4 + ((now / 200 + k * 3) % 10), 1);
}
export function bocadillo(ctx, cx, y, txt, color = P.white, fondo = P.ink) {
  const w = String(txt).length * 4 + 5;
  const x = Math.round(Math.max(1, Math.min(191 - w, cx - w / 2)));
  rect(ctx, fondo, x, y, w, 9); rect(ctx, fondo, Math.round(cx) - 1, y + 9, 3, 2);
  rect(ctx, color, x, y, w, 1); rect(ctx, color, x, y + 8, w, 1); rect(ctx, color, x, y, 1, 9); rect(ctx, color, x + w - 1, y, 1, 9);
  texto(ctx, txt, x + w / 2, y + 2, color, { centrar: true });
}
export function numeroFlotante(ctx, cx, y, txt, color, t) {
  const sube = Math.round(t * 10);
  texto(ctx, txt, cx, y - sube, color, { centrar: true, sombra: P.ink });
}
