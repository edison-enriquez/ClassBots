import { useEffect, useMemo, useRef, useState } from 'react';
import { sombra, robotRPG, paletaRPG } from '../game/rpg.js';

const W = 640;
const H = 400;
const LUGARES = [
  { x: 72, y: 318, zona: 'PLANOS', techo: '#d89648', forma: 'mesa' },
  { x: 154, y: 250, zona: 'BÓVEDA', techo: '#8f9bb5', forma: 'boveda' },
  { x: 238, y: 306, zona: 'CONEXIONES', techo: '#ce7654', forma: 'taller' },
  { x: 282, y: 205, zona: 'CONTRATOS', techo: '#6fa8d8', forma: 'estacion' },
  { x: 390, y: 246, zona: 'ÁRBOL', techo: '#83bd68', forma: 'arbol' },
  { x: 462, y: 146, zona: 'ARENA', techo: '#d97869', forma: 'arena' },
  { x: 540, y: 318, zona: 'AVERÍAS', techo: '#e0606e', forma: 'averias' },
  { x: 548, y: 229, zona: 'FÁBRICA', techo: '#d7a85f', forma: 'fabrica' },
  { x: 572, y: 93, zona: 'CIUDAD', techo: '#91a5c9', forma: 'ciudad' },
  { x: 467, y: 54, zona: 'CONTROL', techo: '#b87591', forma: 'torre' },
];
/* Ramales de misión: cada uno sale del sector cuyo concepto refuerza */
const RAMALES = {
  'mision-plantilla': { x: 318, y: 350, etiqueta: 'abajo' },
  'mision-strategy': { x: 360, y: 104, etiqueta: 'arriba' },
  'mision-object': { x: 205, y: 160, etiqueta: 'arriba' },
};
const PUNTO_OTRO = { x: 330, y: 150, etiqueta: 'arriba' };
const puntoRamal = id => RAMALES[id] || PUNTO_OTRO;
const TRAYECTO = LUGARES.slice(0, -1).map((l, i) => [l, LUGARES[i + 1]]);

const rect = (ctx, color, x, y, w, h) => {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
};
const linea = (ctx, color, ancho, a, b) => {
  ctx.strokeStyle = color;
  ctx.lineWidth = ancho;
  ctx.lineCap = 'square';
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
};

function dibujarPiso(ctx) {
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
  ctx.fillText('CLASSBOTS // COMPLEJO DE ENSAMBLAJE', 38, 42);

  // Bancos de montaje secundarios y siluetas de maquinaria.
  for (const [x, y, w, h] of [[42, 76, 110, 40], [190, 74, 110, 38], [40, 174, 54, 82]]) {
    rect(ctx, '#101d2c', x, y, w, h);
    rect(ctx, '#34485b', x + 2, y + 2, w - 4, h - 4);
    rect(ctx, '#263a4d', x + 5, y + 5, w - 10, h - 10);
    for (let px = x + 10; px < x + w - 8; px += 22) {
      rect(ctx, '#8091a0', px, y + 8, 11, h - 16);
      rect(ctx, '#516678', px + 2, y + 10, 7, h - 20);
      rect(ctx, '#d1aa4f', px + 4, y + 12, 3, 3);
    }
  }
  for (const [x, y] of [[28, 128], [610, 266], [606, 68], [324, 370], [414, 80]]) {
    rect(ctx, '#111e2c', x, y, 12, 12);
    rect(ctx, '#8191a2', x + 2, y + 2, 8, 8);
    rect(ctx, '#31485b', x + 4, y + 4, 4, 4);
  }
}

function dibujarCinta(ctx, a, b, estado, ahora, discontinua = false) {
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

function dibujarMaquina(ctx, lugar, bloqueado, ahora) {
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
  if (lugar.forma === 'fabrica' || lugar.forma === 'torre') {
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

function dibujarMision(ctx, mision, disponible, completada, ahora) {
  const { x, y, etiqueta } = puntoRamal(mision.id), base = completada ? '#7ed6a0' : disponible ? '#f1c653' : '#788493';
  sombra(ctx, x, y + 7, 42);
  rect(ctx, '#101a25', x - 22, y - 17, 44, 30);
  rect(ctx, '#687988', x - 19, y - 14, 38, 24);
  rect(ctx, '#24394a', x - 16, y - 11, 32, 18);
  rect(ctx, disponible && ahora % 800 < 400 ? '#fff0a4' : base, x - 13, y - 8, 26, 14);
  rect(ctx, '#182838', x - 9, y - 5, 18, 9);
  rect(ctx, base, x - 6, y - 4, 12, 7);
  rect(ctx, '#182838', x - 2, y - 3, 4, 5);
  rect(ctx, '#536475', x - 18, y - 19, 36, 3);
  const txt = `MISIÓN ✦ ${mision.corto.toUpperCase()}`;
  ctx.font = 'bold 9px monospace';
  const w = Math.ceil(ctx.measureText(txt).width) + 14, ty = etiqueta === 'abajo' ? y + 18 : y - 44;
  rect(ctx, '#101a25', x - w / 2, ty, w, 17);
  rect(ctx, disponible || completada ? '#4a3a17' : '#2b3644', x - w / 2 + 2, ty + 2, w - 4, 13);
  ctx.fillStyle = base;
  ctx.textAlign = 'center';
  ctx.fillText(txt, x, ty + 12);
  ctx.textAlign = 'start';
}

/* Rutas del plano: la línea principal 1→10 y el ramal de la misión desde Contratos (04) */
const esRamal = n => typeof n === 'string';
const puntoDe = n => (esRamal(n) ? puntoRamal(n) : LUGARES[n]);
/* Ruta entre dos nodos: sectores (índices 0..9) o ramales (id de la misión), que cuelgan de su sector */
function ruta(desde, hasta, anclaDe) {
  if (desde === hasta) return [puntoDe(desde)];
  const linea = (a, b) => { const r = []; const paso = a <= b ? 1 : -1; for (let k = a; k !== b + paso; k += paso) r.push(k); return r; };
  const a = esRamal(desde) ? anclaDe(desde) : desde, b = esRamal(hasta) ? anclaDe(hasta) : hasta;
  const nodos = [...(esRamal(desde) ? [desde] : []), ...linea(a, b), ...(esRamal(hasta) ? [hasta] : [])];
  return nodos.map(puntoDe);
}
const largo = pts => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p.x - pts[i].x, p.y - pts[i].y), 0);
function puntoEn(pts, d) {
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], l = Math.hypot(b.x - a.x, b.y - a.y);
    if (d <= l || i === pts.length - 1) { const t = l ? Math.min(1, d / l) : 1; return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, dx: b.x - a.x, dy: b.y - a.y }; }
    d -= l;
  }
  return { ...pts[0], dx: 0, dy: 1 };
}
const direccion = (dx, dy) => (Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'der' : 'izq') : dy > 0 ? 'abajo' : 'arriba');
function dibujarRuta(ctx, pts, ahora) {
  const total = largo(pts);
  for (let d = (ahora / 40) % 14; d < total; d += 14) {
    const p = puntoEn(pts, d);
    rect(ctx, '#101923', p.x - 4, p.y - 4, 8, 8);
    rect(ctx, '#ffd84a', p.x - 3, p.y - 3, 6, 6);
  }
}
function anillo(ctx, p, ahora, color) {
  const r = 34 + (Math.floor(ahora / 160) % 4) * 2;
  ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.setLineDash([6, 5]); ctx.lineDashOffset = -ahora / 60;
  ctx.strokeRect(Math.round(p.x - r), Math.round(p.y - r * 0.72), r * 2, Math.round(r * 1.44));
  ctx.setLineDash([]);
}

const reducido = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function MapaMundo({
  mundos, actual, abierto, completo, onViajar, onCerrar, capitulos = () => null,
  misiones = [], misionAbierta = () => false, misionCompleta = () => false, onIniciarMision = () => {}, misionActual = null, pasosDe = () => null,
}) {
  const ref = useRef(null);
  const sprite = useRef(null);
  const finalizados = mundos.filter(completo).length;
  const accesibles = mundos.filter(abierto).length;
  const progreso = Math.round((finalizados / mundos.length) * 100);
  const mision = misiones[0];
  const enMision = !!misionActual;
  const origen = enMision ? misionActual : actual - 1;
  const anclaDe = id => (misiones.find(m => m.id === id)?.mundo ?? 4) - 1;

  // Destino elegido (vista previa de la ruta) y viaje en curso
  const [sel, setSel] = useState(() => (enMision ? { tipo: 'mision', id: misionActual } : { tipo: 'mundo', id: actual }));
  const [viaje, setViaje] = useState(null);
  const estado = useRef({});
  estado.current = { mundos, abierto, completo, misiones, misionAbierta, misionCompleta, sel, viaje, origen, enMision, anclaDe };

  const nodoDe = d => (d.tipo === 'mision' ? d.id : d.id - 1);
  const esAqui = d => (d.tipo === 'mision' ? d.id === misionActual : !enMision && d.id === actual);
  const puedeIr = d => (d.tipo === 'mision' ? misionAbierta(misiones.find(m => m.id === d.id)) : abierto(mundos.find(m => m.id === d.id)));

  const ir = d => {
    if (viaje) return;
    if (esAqui(d)) { onCerrar(); return; }
    if (!puedeIr(d)) { setSel(d); return; }
    const fin = () => (d.tipo === 'mision' ? onIniciarMision(misiones.find(m => m.id === d.id)) : onViajar(mundos.find(m => m.id === d.id)));
    const pts = ruta(origen, nodoDe(d), anclaDe);
    if (reducido() || pts.length < 2) { fin(); return; }
    const dur = Math.max(700, Math.min(2200, largo(pts) * 3.2));
    setSel(d);
    setViaje({ pts, t0: performance.now(), dur, destino: d });
    setTimeout(fin, dur + 120);
  };
  // Primer clic elige y muestra la ruta; el segundo (o el botón de la ficha) viaja
  const tocar = d => (sel.tipo === d.tipo && sel.id === d.id ? ir(d) : setSel(d));

  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return undefined;
    ctx.imageSmoothingEnabled = false;
    let raf;
    const loop = ahora => {
      const e = estado.current;
      dibujarPiso(ctx);
      TRAYECTO.forEach(([a, b], i) => dibujarCinta(ctx, a, b, e.completo(e.mundos[i]), ahora));
      for (const m of e.misiones) {
        const disponible = e.misionAbierta(m), completada = e.misionCompleta(m);
        dibujarCinta(ctx, LUGARES[m.mundo - 1], puntoRamal(m.id), disponible || completada, ahora, true);
        dibujarMision(ctx, m, disponible, completada, ahora);
      }
      LUGARES.forEach((l, i) => dibujarMaquina(ctx, l, !e.abierto(e.mundos[i]), ahora));
      // Ruta hacia el destino elegido
      const destino = e.viaje ? e.viaje.destino : e.sel;
      const nodo = destino.tipo === 'mision' ? destino.id : destino.id - 1;
      if (nodo !== e.origen) dibujarRuta(ctx, ruta(e.origen, nodo, e.anclaDe), ahora);
      anillo(ctx, puntoDe(nodo), ahora, esRamal(nodo) ? '#ffe38a' : '#7fc8ff');
      // Robot: quieto en su ubicación o caminando por la ruta
      let pos = puntoDe(e.origen), dir = 'abajo', paso = 0;
      if (e.viaje) {
        const t = Math.min(1, (ahora - e.viaje.t0) / e.viaje.dur);
        const suave = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
        const p = puntoEn(e.viaje.pts, suave * largo(e.viaje.pts));
        pos = p; dir = direccion(p.dx, p.dy); paso = t < 1 ? 1 + (Math.floor(ahora / 120) % 2) : 0;
      }
      // El robot se dibuja a doble escala en un lienzo auxiliar para que se lea bien en el plano
      const mini = sprite.current || (sprite.current = Object.assign(document.createElement('canvas'), { width: 20, height: 20 }));
      const mc = mini.getContext('2d');
      mc.clearRect(0, 0, 20, 20);
      robotRPG(mc, 10, 18, { pal: paletaRPG('azul', { energia: 100 }), dir, paso, salto: e.viaje ? 0 : Math.floor(ahora / 300) % 2 });
      const ox = e.viaje ? 0 : 30, oy = e.viaje ? 6 : 14;
      ctx.fillStyle = 'rgba(5,8,14,.45)'; ctx.fillRect(Math.round(pos.x + ox - 12), Math.round(pos.y + oy - 1), 24, 5);
      ctx.drawImage(mini, Math.round(pos.x + ox - 20), Math.round(pos.y + oy - 36), 40, 40);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const esc = e => { if (e.key === 'Escape') onCerrar(); };
    addEventListener('keydown', esc);
    return () => removeEventListener('keydown', esc);
  }, [onCerrar]);

  // Ficha del destino elegido
  const ficha = useMemo(() => {
    if (sel.tipo === 'mision') {
      const m = misiones.find(x => x.id === sel.id) || mision;
      const ok = misionAbierta(m), hecho = misionCompleta(m), aqui = m.id === misionActual;
      return {
        num: '✦', titulo: m.titulo, sub: `Misión opcional · ${m.concepto}`,
        lineas: [['Sale de', `Sector ${String(m.mundo).padStart(2, '0')} · ${mundos[m.mundo - 1].nombre}`], ['Pasos', pasosDe(m) ? `${pasosDe(m).hechos} de ${pasosDe(m).total} superados` : `${m.pasos?.length || 1}`], ['Requisito', m.requisito || `Completar el Mundo ${m.mundo}`], ['Recompensa', m.recompensa]],
        estado: aqui ? 'Estás aquí' : hecho ? 'Módulo obtenido' : ok ? 'Disponible' : 'Bloqueada',
        boton: aqui ? 'Seguir en la misión' : ok ? (hecho ? 'Repetir misión ✦' : pasosDe(m)?.hechos ? 'Continuar misión ✦' : 'Iniciar misión ✦') : (m.requisitoCorto || `Completa el Mundo ${m.mundo}`),
        ok: ok || aqui, mision: true,
      };
    }
    const m = mundos.find(x => x.id === sel.id);
    const ok = abierto(m), hecho = completo(m), aqui = !enMision && m.id === actual, cap = capitulos(m);
    return {
      num: String(m.id).padStart(2, '0'), titulo: m.nombre, sub: m.tema,
      lineas: [cap ? ['Capítulos', `${cap.hechos} de ${cap.total} superados`] : ['Capítulos', 'En diseño'], ['Estado', hecho ? 'Operativo' : ok ? 'Abierto' : m.niveles ? 'Bloqueado' : 'Próximamente']],
      estado: aqui ? 'Estás aquí' : hecho ? 'Operativo' : ok ? 'Disponible' : m.niveles ? 'Bloqueado' : 'En diseño',
      boton: aqui ? 'Seguir aquí' : enMision && m.id === actual ? 'Volver a la ruta' : ok ? 'Viajar aquí →' : m.niveles ? 'Completa el sector anterior' : 'Próximamente',
      ok: ok || aqui,
    };
  }, [sel, mundos, misiones, mision, abierto, completo, misionAbierta, misionCompleta, misionActual, actual, enMision, capitulos]);

  const elegido = d => sel.tipo === d.tipo && sel.id === d.id;

  return (
    <div className="modal-fondo" role="dialog" aria-modal="true" aria-labelledby="mapa-t" onClick={e => { if (e.target === e.currentTarget) onCerrar(); }}>
      <div className={'modal rpg-ventana mapa-modal' + (viaje ? ' viajando' : '')}>
        <div className="mapa-cab">
          <div className="mapa-titulos">
            <p className="mapa-kicker">CLASSBOTS // PLANO DE PLANTA</p>
            <h2 id="mapa-t">Complejo de fabricación</h2>
          </div>
          <div className="mapa-resumen" role="group" aria-label={`${finalizados} de ${mundos.length} mundos completados`}>
            <strong>{String(finalizados).padStart(2, '0')}<small>/{mundos.length}</small></strong>
            <div className="mapa-resumen-datos">
              <span>SECTORES OPERATIVOS</span>
              <div className="mapa-progreso" role="progressbar" aria-label="Progreso de la fábrica" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progreso}>
                <i style={{ width: `${progreso}%` }} />
              </div>
            </div>
          </div>
          <button type="button" className="mapa-cerrar" onClick={onCerrar} autoFocus aria-label="Cerrar plano">×</button>
        </div>
        <div className="mapa-contenido">
          <section className="mapa-visor" aria-label="Plano industrial interactivo de la fábrica">
            <div className="mapa-visor-cab">
              <span>{viaje ? 'EN RUTA…' : 'RED DE PRODUCCIÓN'}</span>
              <span>{enMision ? 'RAMAL ✦ MISIÓN ESPECIAL' : `SECTOR ${String(actual).padStart(2, '0')} / ${String(mundos.length).padStart(2, '0')}`}</span>
            </div>
            <div className="mapa-lienzo">
              <canvas ref={ref} width={W} height={H} className="pixel-canvas" aria-hidden="true" />
              {LUGARES.map((l, i) => {
                const m = mundos[i], ok = abierto(m), terminado = completo(m), d = { tipo: 'mundo', id: m.id };
                return (
                  <button key={m.id} type="button" className={`mapa-punto${esAqui(d) ? ' aqui' : ''}${terminado ? ' completo' : ''}${!ok ? ' cerrado' : ''}${elegido(d) ? ' elegido' : ''}`}
                    style={{ left: `${(l.x / W) * 100}%`, top: `${(l.y / H) * 100}%` }} aria-pressed={elegido(d)}
                    title={`Sector ${m.id}: ${m.nombre}`} aria-label={`Sector ${m.id}: ${m.nombre}, ${m.tema}${esAqui(d) ? ', estás aquí' : terminado ? ', completado' : ok ? ', disponible' : ', bloqueado'}`}
                    onClick={() => tocar(d)} onDoubleClick={() => ir(d)}>{String(m.id).padStart(2, '0')}</button>
                );
              })}
              {misiones.map((m, i) => {
                const ok = misionAbierta(m), terminado = misionCompleta(m), d = { tipo: 'mision', id: m.id };
                return <button key={m.id} type="button" className={`mapa-punto mapa-punto-mision${terminado ? ' completo' : ''}${!ok ? ' cerrado' : ''}${esAqui(d) ? ' aqui' : ''}${elegido(d) ? ' elegido' : ''}`}
                  style={{ left: `${(puntoRamal(m.id).x / W) * 100}%`, top: `${(puntoRamal(m.id).y / H) * 100}%` }} aria-pressed={elegido(d)}
                  title={`Misión especial: ${m.titulo}`}
                  aria-label={`Misión especial ${i + 1}: ${m.titulo}, ${m.concepto}${esAqui(d) ? ', estás aquí' : terminado ? ', completada' : ok ? ', disponible' : ', completa el Mundo ' + m.mundo + ' para desbloquearla'}`}
                  onClick={() => tocar(d)} onDoubleClick={() => ir(d)}>✦</button>;
              })}
            </div>
            <div className={'mapa-ficha' + (ficha.mision ? ' es-mision' : '')} aria-live="polite">
              <span className="mapa-ficha-num">{ficha.num}</span>
              <div className="mapa-ficha-info">
                <strong>{ficha.titulo} <em>{ficha.estado}</em></strong>
                <small>{ficha.sub}</small>
                <dl>{ficha.lineas.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
              </div>
              <button type="button" className={ficha.mision ? 'btn-pri mapa-ir mision' : 'btn-pri mapa-ir'} disabled={!ficha.ok || !!viaje} onClick={() => ir(sel)}>
                {viaje ? 'Viajando…' : ficha.boton}
              </button>
            </div>
            <div className="mapa-leyenda" aria-label="Estados del plano">
              <span><i className="actual" /> Ubicación actual</span>
              <span><i className="completo" /> Operativo</span>
              <span><i className="cerrado" /> Bloqueado</span>
              <span><i className="ramal" /> Misión opcional</span>
              <span className="mapa-ayuda">Clic para ver la ruta · doble clic o «Viajar» para ir</span>
            </div>
          </section>
          <section className="mapa-destinos" aria-label="Sectores y misiones de la fábrica">
            <div className="mapa-destinos-cab">
              <h3>Sectores de producción</h3>
              <span>{accesibles} ACCESIBLES</span>
            </div>
            <ol className="mapa-lista">
              {mundos.map(m => {
                const ok = abierto(m), terminado = completo(m), d = { tipo: 'mundo', id: m.id }, aqui = esAqui(d);
                const est = aqui ? 'actual' : terminado ? 'completo' : !ok ? (m.niveles ? 'bloqueado' : 'proximo') : 'abierto';
                const etiqueta = aqui ? 'Estás aquí' : terminado ? 'Operativo' : !ok ? (m.niveles ? 'Bloqueado' : 'En diseño') : 'Disponible';
                return (
                  <li key={m.id}>
                    <button type="button" className={`mapa-destino ${est}${elegido(d) ? ' elegido' : ''}`} aria-pressed={elegido(d)}
                      aria-current={aqui ? 'location' : undefined} onClick={() => tocar(d)} onDoubleClick={() => ir(d)}>
                      <span className="mapa-destino-num">{String(m.id).padStart(2, '0')}</span>
                      <span className="mapa-destino-info"><strong>{m.nombre}</strong><small>{m.tema}</small></span>
                      <span className="mapa-estado">{etiqueta}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
            {misiones.length > 0 && <section className="mapa-misiones" aria-labelledby="mapa-misiones-t">
              <div className="mapa-destinos-cab">
                <h3 id="mapa-misiones-t">Misiones especiales</h3>
                <span>RAMALES OPCIONALES</span>
              </div>
              <ol className="mapa-lista">
                {misiones.map(m => {
                  const ok = misionAbierta(m), terminado = misionCompleta(m), d = { tipo: 'mision', id: m.id }, aqui = esAqui(d);
                  const pd = pasosDe(m), etiqueta = aqui ? 'Estás aquí' : terminado ? 'Completada' : !ok ? (m.requisitoCorto || `Completa el Mundo ${m.mundo}`) : pd?.hechos ? `Paso ${pd.hechos + 1} de ${pd.total}` : 'Disponible';
                  return <li key={m.id}>
                    <button type="button" className={`mapa-destino mapa-destino-mision${aqui ? ' actual' : ''}${terminado ? ' completo' : ''}${!ok ? ' bloqueado' : ''}${elegido(d) ? ' elegido' : ''}`}
                      aria-pressed={elegido(d)} aria-current={aqui ? 'location' : undefined} onClick={() => tocar(d)} onDoubleClick={() => ir(d)}>
                      <span className="mapa-destino-num">✦</span>
                      <span className="mapa-destino-info"><strong>{m.titulo}</strong><small>{m.concepto} · {m.recompensa}</small></span>
                      <span className="mapa-estado">{etiqueta}</span>
                    </button>
                  </li>;
                })}
              </ol>
            </section>}
          </section>
        </div>
      </div>
    </div>
  );
}
