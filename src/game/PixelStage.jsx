import { useEffect, useRef, useState } from 'react';
import { escenaBoveda, escenaConexiones, escenaEstacion, alEntrarEscena } from './escenas2.js';
import { W, H, P, ETIQUETA, BALDE, BATERIA, sprite, texto, colorDe } from './sprites.js';
import { suelo, muro, ventana, placa, mesa, cristal, escaleras, plataforma, antorcha, monitorPared, maceta, paletaRPG, R_ABAJO } from './rpg.js';
import { dibujarRobot, linea } from './dibujo.js';

/* Escenario RPG en vista cenital. Dibuja a 192×112 y el CSS lo escala con image-rendering: pixelated.
   Reproduce el registro de eventos que devuelve el motor (o el motor Java real). */

const DUR = { x: 430, energia: 160, llamada: 240, print: 320, crear: 520, set: 110, add: 260 };
const reducido = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const PISO_TALLER = 90;

export default function PixelStage({ nivel, modelo, animacion, token, onCaption }) {
  const canvas = useRef(null);
  const st = useRef({ frames: [], i: 0, p: 1, t0: 0, part: [], flash: 0 });
  const props = useRef({ nivel, modelo });
  props.current = { nivel, modelo };
  const [, force] = useState(0);

  // Reiniciar la reproducción cuando llega una ejecución nueva
  useEffect(() => {
    const s = st.current;
    s.frames = animacion?.frames || [];
    s.part = []; s.flash = 0; s.fx = null;
    if (!s.frames.length) { s.i = 0; s.p = 1; onCaption?.(''); return; }
    if (reducido()) { s.i = s.frames.length - 1; s.p = 1; onCaption?.(s.frames[s.i].cap); return; }
    s.i = 0; s.p = 0; s.t0 = performance.now(); s.viejo = -1;
    force(n => n + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => { const s = st.current; if (!animacion) { s.frames = []; s.i = 0; } }, [nivel.id, animacion]);

  useEffect(() => {
    const cv = canvas.current, ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    let raf;
    const loop = now => { avanzar(now); dibujar(ctx, now); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function avanzar(now) {
    const s = st.current;
    if (!s.frames.length || (s.i >= s.frames.length - 1 && s.p >= 1)) return;
    const factor = s.frames.length > 120 ? 120 / s.frames.length : 1;
    let el = now - s.t0;
    while (s.i < s.frames.length) {
      const d = (DUR[s.frames[s.i].tipo] || 120) * factor;
      if (el < d) { s.p = el / d; break; }
      el -= d; s.t0 += d;
      if (s.i >= s.frames.length - 1) { s.p = 1; break; }
      s.i++; s.p = 0;
    }
    if (s.viejo !== s.i) {
      s.viejo = s.i;
      alEntrar(s.frames[s.i], s.frames[s.i - 1]);
      alEntrarEscena(props.current.nivel.escena, s.frames, s.i, s, now, props.current.modelo);
      onCaption?.(s.frames[s.i].cap);
    }
  }

  function alEntrar(fr, prev) {
    const s = st.current;
    if (fr.tipo === 'llamada' && /\.recargar\(/.test(fr.cap)) s.flash = performance.now();
    if (!['taller', 'pasillo'].includes(props.current.nivel.escena)) return;
    const pos = posiciones(fr);
    for (const r of fr.robots) {
      const antes = prev?.robots.find(q => q.id === r.id);
      const p = pos.get(r.id);
      if (!antes && p) for (let k = 0; k < 18; k++) s.part.push({ x: p.x, y: p.piso - 8, vx: (Math.random() - 0.5) * 1.6, vy: -Math.random() * 1.8, vida: 40 + Math.random() * 20, c: k % 3 ? P.gold : P.white });
      if (r.__off && antes && !antes.__off && p) for (let k = 0; k < 12; k++) s.part.push({ x: p.x + (Math.random() - 0.5) * 8, y: p.piso - 16, vx: (Math.random() - 0.5) * 0.3, vy: -0.25 - Math.random() * 0.3, vida: 90 + Math.random() * 40, c: P.smoke, humo: true });
    }
  }

  function posiciones(fr) {
    const { nivel } = props.current, m = new Map(), rs = fr ? fr.robots : [];
    if (nivel.escena === 'pasillo') {
      const g = geomPasillo(nivel);
      rs.forEach((r, k) => m.set(r.id, { x: g.x0 + (typeof r.x === 'number' ? Math.min(r.x, nivel.largo + 0.6) : 0) * g.cw, piso: g.piso + k * 4 }));
    } else {
      const n = rs.length;
      rs.forEach((r, k) => m.set(r.id, { x: Math.round(W * (k + 1) / (n + 1)), piso: PISO_TALLER }));
    }
    return m;
  }

  function dibujar(ctx, now) {
    const { nivel, modelo } = props.current, s = st.current;
    const fr = s.frames[s.i], prev = s.i > 0 ? s.frames[s.i - 1] : null;
    const datos = { nivel, modelo, fr, prev, s, now };
    if (nivel.escena === 'plano') escenaPlano(ctx, modelo, nivel, now);
    else if (nivel.escena === 'taller') escenaTaller(ctx, fr, prev, s, now);
    else if (nivel.escena === 'boveda') escenaBoveda(ctx, datos);
    else if (nivel.escena === 'conexiones') escenaConexiones(ctx, datos);
    else if (nivel.escena === 'estacion') escenaEstacion(ctx, datos);
    else escenaPasillo(ctx, nivel, fr, prev, s, now);
    s.part = s.part.filter(q => q.vida > 0);
    for (const q of s.part) {
      q.x += q.vx; q.y += q.vy; if (!q.humo) q.vy += 0.06; q.vida--;
      ctx.globalAlpha = q.humo ? Math.min(1, q.vida / 60) * 0.8 : 1;
      ctx.fillStyle = q.c;
      ctx.fillRect(Math.round(q.x), Math.round(q.y), q.humo ? 2 : 1, q.humo ? 2 : 1);
      ctx.globalAlpha = 1;
    }
  }

  /* Taller de ensamble: plataformas donde aparecen los robots */
  function escenaTaller(ctx, fr, prev, s, now) {
    suelo(ctx, 'metal', 0, 30, W, H);
    muro(ctx, 30, 'metal');
    monitorPared(ctx, 14, 9, now); monitorPared(ctx, 160, 9, now, '#7cd4ff');
    placa(ctx, 96, 9, 'LINEA DE ENSAMBLE');
    // Cinta transportadora
    ctx.fillStyle = P.ink; ctx.fillRect(0, 36, W, 10);
    ctx.fillStyle = '#2b2f46'; ctx.fillRect(0, 37, W, 8);
    for (let x = -((now / 40) % 12); x < W; x += 12) { ctx.fillStyle = '#4c5378'; ctx.fillRect(Math.round(x), 38, 6, 6); }
    for (let x = 4; x < W; x += 24) { ctx.fillStyle = '#7a83a8'; ctx.fillRect(x, 46, 2, 2); }
    maceta(ctx, 8, 108); maceta(ctx, 184, 108);
    const rs = fr ? fr.robots : [];
    if (!rs.length) {
      plataforma(ctx, W / 2, PISO_TALLER + 2);
      dibujarRobot(ctx, W / 2, PISO_TALLER, {}, now, { fantasma: true });
      return;
    }
    const pos = posiciones(fr);
    rs.forEach(r => {
      const p = pos.get(r.id), nuevo = prev && !prev.robots.some(q => q.id === r.id) && fr.tipo === 'crear' && s.p < 1;
      plataforma(ctx, p.x, p.piso + 2, nuevo);
      if (nuevo) {
        const a = 1 - s.p;
        ctx.fillStyle = `rgba(255,233,163,${0.55 * a})`; ctx.fillRect(p.x - 7, 30, 14, p.piso - 30);
        ctx.fillStyle = `rgba(255,255,255,${0.7 * a})`; ctx.fillRect(p.x - 2, 30, 4, p.piso - 30);
        if (s.p < 0.35) return;
      }
      dibujarRobot(ctx, p.x, p.piso, r, now);
    });
  }

  /* Mazmorra: camino numerado, cristal de carga y escaleras de salida */
  function escenaPasillo(ctx, nivel, fr, prev, s, now) {
    const g = geomPasillo(nivel);
    suelo(ctx, 'piedra', 0, 30, W, H);
    ctx.fillStyle = 'rgba(10,8,25,.35)'; ctx.fillRect(0, 30, W, H - 30);
    muro(ctx, 30, 'piedra');
    for (const x of [30, 96, 162]) antorcha(ctx, x, 10, now + x * 7);
    // camino iluminado
    for (let i = 0; i <= nivel.largo; i++) {
      const x = Math.round(g.x0 + i * g.cw - g.cw / 2), w = Math.ceil(g.cw);
      ctx.fillStyle = P.ink; ctx.fillRect(x, g.piso - 9, w, 14);
      ctx.fillStyle = i === nivel.estacion ? '#a88a3a' : i % 2 ? '#8b93b0' : '#9aa2c0'; ctx.fillRect(x + 1, g.piso - 8, w - 2, 12);
      ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(x + 1, g.piso - 8, w - 2, 1);
      texto(ctx, String(i), g.x0 + i * g.cw, g.piso + 8, i === nivel.estacion ? P.gold : '#c9cee8', { centrar: true, sombra: P.ink });
    }
    if (nivel.estacion != null) cristal(ctx, Math.round(g.x0 + nivel.estacion * g.cw), g.piso - 12, now, now - s.flash < 600);
    const ex = Math.min(W - 18, Math.round(g.x0 + nivel.largo * g.cw + g.cw * 0.6));
    escaleras(ctx, ex, g.piso - 12, now);
    texto(ctx, 'SALIDA', ex + 8, g.piso - 22, P.green, { centrar: true, sombra: P.ink });
    const rs = fr ? fr.robots : [];
    if (!rs.length) { dibujarRobot(ctx, g.x0, g.piso, {}, now, { fantasma: true, dir: 'der' }); return; }
    rs.forEach((r, k) => {
      const ant = prev?.robots.find(q => q.id === r.id);
      let x = typeof r.x === 'number' ? r.x : 0, camina = false;
      if (ant && typeof ant.x === 'number' && ant.x !== x && fr.tipo === 'x' && s.p < 1) {
        const e = s.p < 0.5 ? 2 * s.p * s.p : 1 - Math.pow(-2 * s.p + 2, 2) / 2;
        x = ant.x + (x - ant.x) * e; camina = true;
      }
      dibujarRobot(ctx, g.x0 + Math.min(x, nivel.largo + 0.6) * g.cw, g.piso + k * 4, r, now, { caminando: camina, dir: 'der' });
    });
  }

  return <canvas ref={canvas} width={W} height={H} className="pixel-canvas" role="img" aria-label={`Escenario: ${nivel.titulo}`} />;
}

function geomPasillo(nivel) {
  const N = nivel.largo, x0 = 16, cw = Math.min(26, (W - 46) / N);
  return { x0, cw, piso: 74 };
}

/* Sala de planos: la clase y sus atributos se ven mientras el estudiante escribe */
function escenaPlano(ctx, modelo, nivel, now) {
  suelo(ctx, 'madera', 0, 30, W, H);
  muro(ctx, 30, 'madera');
  ventana(ctx, 12, 8); ventana(ctx, 162, 8);
  const c = modelo?.clases?.Robot || Object.values(modelo?.clases || {}).find(k => k.nombre.toLowerCase() === 'robot');
  placa(ctx, 96, 10, c ? `CLASS ${c.nombre}` : 'CLASS ???', c ? P.gold : '#9fd8ff');
  // Mesa con el plano
  mesa(ctx, 12, 38, 78, 56);
  ctx.fillStyle = P.paper; ctx.fillRect(16, 42, 70, 48);
  for (let x = 16; x < 86; x += 6) { ctx.fillStyle = P.paperL; ctx.fillRect(x, 42, 1, 48); }
  for (let y = 42; y < 90; y += 6) { ctx.fillStyle = P.paperL; ctx.fillRect(16, y, 70, 1); }
  const campos = c ? c.campos : [];
  const tiene = n => campos.find(f => f.nombre === n);
  const listo = ['nombre', 'color', 'energia'].every(tiene);
  if (c && listo) sprite(ctx, R_ABAJO, 35, 50, { ...paletaRPG('gris', { antena: Math.floor(now / 500) % 2 === 0 }), B: '#7c8aa5', b: '#5d6880', H: '#a3b0c7' }, { escala: 2 });
  else sprite(ctx, R_ABAJO, 35, 50, null, { escala: 2, contorno: c ? P.white : P.line, alfa: c ? 0.9 : 0.45 });
  // Piezas sobre pedestales
  const piezas = [
    { n: 'nombre', t: 'String', y: 44, sp: ETIQUETA, pal: { k: P.ink, w: P.eye } },
    { n: 'color', t: 'String', y: 64, sp: BALDE, pal: { k: P.ink, P: colorDe('naranja'), S: P.steel } },
    { n: 'energia', t: 'int', y: 84, sp: BATERIA, pal: { k: P.ink, G: P.green } },
  ];
  piezas.forEach((pz, k) => {
    const f = tiene(pz.n), ok = f && f.tipo === pz.t;
    const ix = 104, flota = f ? Math.round(Math.sin(now / 300 + k) * 1.5) : 0;
    plataforma(ctx, ix + 6, pz.y + 12, !!ok);
    if (f) sprite(ctx, pz.sp, ix, pz.y + flota, pz.pal);
    else sprite(ctx, pz.sp, ix, pz.y, null, { contorno: P.line, punteado: true, alfa: 0.6 });
    if (f) linea(ctx, ix - 2, pz.y + 4, 70, 58 + k * 8, ok ? P.gold : P.red, { punteada: true });
    texto(ctx, f ? `${pz.n}: ${f.tipo}` : `${pz.n}: ?`, 122, pz.y + 2, f ? (ok ? P.white : P.red) : '#c9cee8', { sombra: P.ink });
    if (f && !ok) texto(ctx, `DEBE SER ${pz.t}`, 122, pz.y + 9, P.red, { sombra: P.ink });
  });
  const extra = campos.filter(f => !['nombre', 'color', 'energia'].includes(f.nombre));
  extra.slice(0, 2).forEach((f, k) => texto(ctx, `+ ${f.nombre}: ${f.tipo}`, 18, 98 + k * 7, P.gold, { sombra: P.ink }));
  if (nivel.id === 'plano' && !c) texto(ctx, '?', 51, 64, P.white, { centrar: true });
}
