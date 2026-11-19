/* Dibujo compartido por las páginas del plano (el complejo y el sector de patrones):
   piso, cintas, máquinas, ruta punteada, anillo de selección y el robot que camina. */
import { sombra, robotRPG, paletaRPG } from '../game/rpg.js';

export const W = 640;
export const H = 400;

export const rect = (ctx, color, x, y, w, h) => {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
};
export const linea = (ctx, color, ancho, a, b) => {
  ctx.strokeStyle = color;
  ctx.lineWidth = ancho;
  ctx.lineCap = 'square';
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
};

/* Piso cuadriculado, marco y rótulo del plano */
export function pisoBase(ctx, titulo) {
  rect(ctx, '#18283a', 0, 0, W, H);
  rect(ctx, '#1e3144', 12, 12, W - 24, H - 24);
  for (let x = 20; x < W; x += 20) {
    linea(ctx, x % 100 === 0 ? '#38536a' : '#293e53', 1, { x, y: 12 }, { x, y: H - 12 });
  }
  for (let y = 20; y < H; y += 20) {
    linea(ctx, y % 100 === 0 ? '#38536a' : '#293e53', 1, { x: 12, y }, { x: W - 12, y });
  }
  rect(ctx, '#516276', 12, 12, W - 24, 5);
  rect(ctx, '#516276', 12, H - 17, W - 24, 5);
  rect(ctx, '#516276', 12, 17, 5, H - 34);
  rect(ctx, '#516276', W - 17, 17, 5, H - 34);
  for (let x = 28; x < W - 24; x += 32) {
    rect(ctx, '#bd9d55', x, 13, 5, 3);
    rect(ctx, '#bd9d55', x, H - 16, 5, 3);
  }
  rect(ctx, '#263b4e', 26, 28, 262, 20);
  rect(ctx, '#314a60', 29, 31, 256, 14);
  ctx.fillStyle = '#7fc8ff';
  ctx.font = 'bold 10px monospace';
  ctx.fillText(titulo, 38, 42);
}

/* Adornos del piso: bancos de montaje y cajas sueltas */
export function banco(ctx, x, y, w, h) {
  rect(ctx, '#101d2c', x, y, w, h);
  rect(ctx, '#34485b', x + 2, y + 2, w - 4, h - 4);
  rect(ctx, '#263a4d', x + 5, y + 5, w - 10, h - 10);
  for (let px = x + 10; px < x + w - 8; px += 22) {
    rect(ctx, '#8091a0', px, y + 8, 11, h - 16);
    rect(ctx, '#516678', px + 2, y + 10, 7, h - 20);
    rect(ctx, '#d1aa4f', px + 4, y + 12, 3, 3);
  }
}
export function caja(ctx, x, y) {
  rect(ctx, '#111e2c', x, y, 12, 12);
  rect(ctx, '#8191a2', x + 2, y + 2, 8, 8);
  rect(ctx, '#31485b', x + 4, y + 4, 4, 4);
}

export function dibujarCinta(ctx, a, b, estado, ahora, discontinua = false) {
  if (discontinua) {
    const pasos = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 12);
    for (let i = 0; i <= pasos; i++) {
      if (i % 2) continue;
      const t = i / pasos;
      rect(ctx, estado ? '#dbab43' : '#536172', a.x + (b.x - a.x) * t - 2, a.y + (b.y - a.y) * t - 2, 5, 5);
    }
    return;
  }
  linea(ctx, '#101923', 17, a, b);
  linea(ctx, estado ? '#a88032' : '#536172', 12, a, b);
  linea(ctx, '#303d48', 7, a, b);
  const pasos = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 18);
  for (let i = 0; i <= pasos; i++) {
    const t = ((i / pasos + (ahora % 1600) / 1600) % 1);
    const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
    rect(ctx, estado ? '#ddc078' : '#77818b', x - 2, y - 2, 4, 4);
  }
}

export function dibujarMaquina(ctx, lugar, bloqueado, ahora) {
  const { x, y, techo } = lugar;
  const c = bloqueado ? '#606a79' : techo;
  sombra(ctx, x, y + 8, 54);
  rect(ctx, '#101a25', x - 28, y - 21, 56, 39);
  rect(ctx, '#697888', x - 25, y - 18, 50, 34);
  rect(ctx, bloqueado ? '#596371' : '#35495b', x - 22, y - 15, 44, 28);
  rect(ctx, c, x - 19, y - 12, 38, 21);
  rect(ctx, '#192a39', x - 15, y - 8, 30, 17);
  rect(ctx, bloqueado ? '#66707d' : '#607a89', x - 12, y - 6, 24, 12);
  rect(ctx, bloqueado ? '#3a424c' : '#98b6c4', x - 10, y - 4, 20, 7);
  rect(ctx, '#25384a', x - 4, y - 18, 8, 4);
  rect(ctx, ahora % 1200 < 600 && !bloqueado ? '#ffc94f' : '#4d5864', x - 2, y - 17, 4, 2);
  rect(ctx, '#111c27', x - 24, y + 12, 9, 5);
  rect(ctx, '#111c27', x + 15, y + 12, 9, 5);
  for (const dx of [-23, 21]) {
    rect(ctx, '#84909b', x + dx, y - 16, 3, 4);
    rect(ctx, '#84909b', x + dx, y + 5, 3, 4);
  }
  if (lugar.forma === 'fabrica') {
    rect(ctx, '#101a25', x + 14, y - 34, 10, 17);
    rect(ctx, '#71808e', x + 16, y - 32, 6, 15);
    if (!bloqueado && Math.floor(ahora / 500) % 2 === 0) rect(ctx, '#c4d2dc', x + 17, y - 39, 4, 5);
  } else if (lugar.forma === 'averias') {
    // Baliza de alarma y cruz de reparación
    const on = !bloqueado && Math.floor(ahora / 350) % 2 === 0;
    rect(ctx, '#101a25', x - 5, y - 30, 10, 12);
    rect(ctx, on ? '#ff3355' : bloqueado ? '#6d6f7a' : '#8a2a3a', x - 4, y - 29, 8, 8);
    if (on) { rect(ctx, '#ff3355', x - 10, y - 27, 3, 1); rect(ctx, '#ff3355', x + 7, y - 27, 3, 1); }
    rect(ctx, '#f1eef5', x - 2, y - 7, 4, 12);
    rect(ctx, '#f1eef5', x - 6, y - 3, 12, 4);
    rect(ctx, bloqueado ? '#777' : '#e0606e', x - 1, y - 6, 2, 10);
    rect(ctx, bloqueado ? '#777' : '#e0606e', x - 5, y - 2, 10, 2);
  } else if (lugar.forma === 'boveda') {
    rect(ctx, '#101a25', x - 8, y - 10, 16, 15);
    rect(ctx, '#bbc4c8', x - 5, y - 7, 10, 9);
    rect(ctx, bloqueado ? '#777' : '#e3b94f', x - 1, y - 4, 3, 4);
  } else if (lugar.forma === 'arena') {
    rect(ctx, '#b4a98f', x - 15, y - 10, 30, 5);
    rect(ctx, '#b4a98f', x - 15, y + 10, 30, 5);
    rect(ctx, '#b4a98f', x - 15, y - 5, 4, 15);
    rect(ctx, '#b4a98f', x + 11, y - 5, 4, 15);
  } else if (lugar.forma === 'estacion') {
    rect(ctx, '#d4e9f2', x - 5, y - 8, 10, 16);
    rect(ctx, '#35495b', x - 2, y - 5, 4, 3);
    rect(ctx, '#35495b', x - 2, y + 1, 4, 4);
  } else if (lugar.forma === 'arbol') {
    rect(ctx, '#4c703e', x - 18, y - 15, 8, 7);
    rect(ctx, '#5b814b', x + 10, y - 15, 8, 7);
    rect(ctx, '#5b814b', x - 18, y + 10, 8, 5);
    rect(ctx, '#4c703e', x + 10, y + 10, 8, 5);
  } else if (lugar.forma === 'panel') {
    // Pantalla de mando: un tanque y dos indicadores
    rect(ctx, '#101a25', x - 13, y - 10, 26, 17);
    rect(ctx, bloqueado ? '#4d5864' : '#0e2a3a', x - 11, y - 8, 22, 13);
    rect(ctx, bloqueado ? '#777' : '#3aa7e0', x - 9, y - 2, 5, 6);
    rect(ctx, bloqueado ? '#888' : '#7ed6a0', x - 2, y - 6, 10, 2);
    rect(ctx, bloqueado ? '#888' : '#ffcc33', x - 2, y - 2, 7, 2);
  } else if (lugar.forma === 'taller' || lugar.forma === 'mesa') {
    rect(ctx, '#e3bc69', x - 14, y - 12, 28, 5);
    rect(ctx, '#946e39', x - 11, y - 7, 3, 10);
    rect(ctx, '#946e39', x + 8, y - 7, 3, 10);
  }
  ctx.fillStyle = bloqueado ? '#8993a0' : '#d7e3e8';
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(lugar.zona, x, y + 34);
  ctx.textAlign = 'start';
}

export const largo = pts => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p.x - pts[i].x, p.y - pts[i].y), 0);
export function puntoEn(pts, d) {
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], l = Math.hypot(b.x - a.x, b.y - a.y);
    if (d <= l || i === pts.length - 1) { const t = l ? Math.min(1, d / l) : 1; return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, dx: b.x - a.x, dy: b.y - a.y }; }
    d -= l;
  }
  return { ...pts[0], dx: 0, dy: 1 };
}
export const direccion = (dx, dy) => (Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'der' : 'izq') : dy > 0 ? 'abajo' : 'arriba');
export function dibujarRuta(ctx, pts, ahora) {
  const total = largo(pts);
  for (let d = (ahora / 40) % 14; d < total; d += 14) {
    const p = puntoEn(pts, d);
    rect(ctx, '#101923', p.x - 4, p.y - 4, 8, 8);
    rect(ctx, '#ffd84a', p.x - 3, p.y - 3, 6, 6);
  }
}
export function anillo(ctx, p, ahora, color, base = 34) {
  const r = base + (Math.floor(ahora / 160) % 4) * 2;
  ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.setLineDash([6, 5]); ctx.lineDashOffset = -ahora / 60;
  ctx.strokeRect(Math.round(p.x - r), Math.round(p.y - r * 0.72), r * 2, Math.round(r * 1.44));
  ctx.setLineDash([]);
}

export const reducido = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/* El robot se dibuja a doble escala en un lienzo auxiliar para que se lea bien en el plano.
   cache es un objeto donde se guarda ese lienzo entre cuadros. */
export function dibujarRobotPlano(ctx, cache, pos, { dir = 'abajo', paso = 0, enViaje = false, ahora = 0, ox: dx = 30, oy: dy = 14 } = {}) {
  const mini = cache.lienzo || (cache.lienzo = Object.assign(document.createElement('canvas'), { width: 20, height: 20 }));
  const mc = mini.getContext('2d');
  mc.clearRect(0, 0, 20, 20);
  robotRPG(mc, 10, 18, { pal: paletaRPG('azul', { energia: 100 }), dir, paso, salto: enViaje ? 0 : Math.floor(ahora / 300) % 2 });
  const ox = enViaje ? 0 : dx, oy = enViaje ? 6 : dy;
  ctx.fillStyle = 'rgba(5,8,14,.45)'; ctx.fillRect(Math.round(pos.x + ox - 12), Math.round(pos.y + oy - 1), 24, 5);
  ctx.drawImage(mini, Math.round(pos.x + ox - 20), Math.round(pos.y + oy - 36), 40, 40);
}
