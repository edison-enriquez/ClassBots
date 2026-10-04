import { useEffect, useRef } from 'react';
import { suelo, sombra, robotRPG, paletaRPG } from '../game/rpg.js';
import { P, texto, mezclar } from '../game/sprites.js';

/* Mapa del mundo: los nueve lugares del curso unidos por un camino */
export const LUGARES = [
  { x: 22, y: 90, techo: '#b5651d', forma: 'casa' },
  { x: 58, y: 94, techo: '#6d7499', forma: 'boveda' },
  { x: 92, y: 74, techo: '#a0402c', forma: 'pueblo' },
  { x: 58, y: 56, techo: '#3f78d0', forma: 'casa' },
  { x: 24, y: 40, techo: '#3f8530', forma: 'arbol' },
  { x: 66, y: 24, techo: '#c0392b', forma: 'arena' },
  { x: 108, y: 34, techo: '#8a6a40', forma: 'fabrica' },
  { x: 140, y: 54, techo: '#7a83a8', forma: 'pueblo' },
  { x: 166, y: 22, techo: '#8a2d3b', forma: 'torre' },
];
const rect = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };

function camino(ctx, a, b) {
  const pasos = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 2);
  for (let k = 0; k <= pasos; k++) {
    const t = k / pasos, x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
    rect(ctx, '#7a6a4e', x - 3, y - 2, 6, 5); rect(ctx, '#c9b48a', x - 2, y - 1, 4, 3);
  }
}
function lugar(ctx, l, bloqueado, now) {
  const { x, y } = l, c = bloqueado ? '#555a70' : l.techo;
  sombra(ctx, x, y + 1, 16);
  if (l.forma === 'arbol') {
    rect(ctx, P.ink, x - 2, y - 6, 4, 7); rect(ctx, '#6b4423', x - 1, y - 6, 2, 6);
    rect(ctx, P.ink, x - 8, y - 20, 16, 15); rect(ctx, c, x - 7, y - 19, 14, 13); rect(ctx, mezclar(c, 0.25), x - 5, y - 17, 5, 3);
  } else if (l.forma === 'torre') {
    rect(ctx, P.ink, x - 5, y - 24, 10, 25); rect(ctx, bloqueado ? '#666' : '#9aa1c0', x - 4, y - 23, 8, 23);
    rect(ctx, P.ink, x - 7, y - 28, 14, 5); rect(ctx, c, x - 6, y - 27, 12, 3);
    rect(ctx, bloqueado ? '#333' : (Math.floor(now / 400) % 2 ? P.gold : '#fff3a8'), x - 1, y - 18, 2, 3);
  } else if (l.forma === 'boveda') {
    rect(ctx, P.ink, x - 9, y - 12, 18, 13); rect(ctx, c, x - 8, y - 11, 16, 11);
    rect(ctx, P.ink, x - 3, y - 8, 6, 6); rect(ctx, bloqueado ? '#888' : P.gold, x - 1, y - 6, 2, 2);
  } else if (l.forma === 'arena') {
    rect(ctx, P.ink, x - 11, y - 9, 22, 10); rect(ctx, '#c9b48a', x - 10, y - 8, 20, 8);
    for (let k = -9; k <= 7; k += 4) rect(ctx, c, x + k, y - 12, 2, 4);
  } else {
    const w = l.forma === 'fabrica' || l.forma === 'pueblo' ? 18 : 14;
    rect(ctx, P.ink, x - w / 2, y - 9, w, 10); rect(ctx, bloqueado ? '#777' : '#e8dcc0', x - w / 2 + 1, y - 8, w - 2, 8);
    for (let k = 0; k < 5; k++) rect(ctx, k ? c : P.ink, x - w / 2 - 1 + k, y - 10 - k, w + 2 - k * 2, 1);
    rect(ctx, P.ink, x - 1, y - 5, 3, 5);
    if (l.forma === 'fabrica') { rect(ctx, P.ink, x + 4, y - 18, 4, 9); rect(ctx, '#8a8fb0', x + 5, y - 17, 2, 8); if (!bloqueado) rect(ctx, 'rgba(220,220,230,.7)', x + 5 + Math.floor(now / 300) % 3, y - 22, 3, 2); }
  }
  if (bloqueado) { rect(ctx, P.ink, x - 3, y - 4, 7, 6); rect(ctx, '#c9cee8', x - 2, y - 3, 5, 4); rect(ctx, P.ink, x, y - 2, 1, 2); }
}

export default function MapaMundo({ mundos, actual, abierto, completo, onViajar, onCerrar }) {
  const ref = useRef(null);
  useEffect(() => {
    const ctx = ref.current.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    let raf;
    const loop = now => {
      suelo(ctx, 'pasto', 0, 0, 192, 112);
      // Lago y árboles decorativos
      ctx.fillStyle = '#2f6fb0'; ctx.fillRect(150, 78, 42, 34); ctx.fillRect(140, 88, 12, 24);
      ctx.fillStyle = '#5aa0e0'; for (let k = 0; k < 4; k++) ctx.fillRect(156 + ((k * 9 + Math.floor(now / 500)) % 30), 86 + k * 6, 4, 1);
      for (const [x, y] of [[8, 10], [40, 70], [100, 100], [124, 8], [186, 40], [90, 50], [10, 62]]) { rect(ctx, P.ink, x - 4, y - 8, 9, 8); rect(ctx, '#2f6b25', x - 3, y - 7, 7, 6); rect(ctx, '#6b4423', x, y, 1, 2); }
      for (let k = 0; k < LUGARES.length - 1; k++) camino(ctx, LUGARES[k], LUGARES[k + 1]);
      LUGARES.forEach((l, k) => {
        const m = mundos[k];
        lugar(ctx, l, !abierto(m), now);
        if (completo(m)) { rect(ctx, P.ink, l.x + 6, l.y - 16, 7, 7); rect(ctx, P.gold, l.x + 7, l.y - 15, 5, 5); }
        texto(ctx, String(m.id), l.x - 10, l.y - 4, P.white, { sombra: P.ink });
      });
      const l = LUGARES[actual - 1];
      if (l) robotRPG(ctx, l.x + 12, l.y + 4, { pal: paletaRPG('azul', { energia: 100 }), salto: Math.floor(now / 300) % 2 });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [mundos, actual, abierto, completo]);

  useEffect(() => {
    const esc = e => { if (e.key === 'Escape') onCerrar(); };
    addEventListener('keydown', esc);
    return () => removeEventListener('keydown', esc);
  }, [onCerrar]);

  return (
    <div className="modal-fondo" role="dialog" aria-modal="true" aria-labelledby="mapa-t" onClick={e => { if (e.target === e.currentTarget) onCerrar(); }}>
      <div className="modal rpg-ventana mapa-modal">
        <div className="mapa-cab">
          <h2 id="mapa-t">Mapa del mundo</h2>
          <button type="button" className="btn-mini" onClick={onCerrar} autoFocus>Cerrar ✕</button>
        </div>
        <div className="mapa-lienzo">
          <canvas ref={ref} width={192} height={112} className="pixel-canvas" aria-hidden="true" />
          {LUGARES.map((l, k) => {
            const m = mundos[k], ok = abierto(m);
            return <button key={m.id} type="button" className={'mapa-punto' + (m.id === actual ? ' aqui' : '')} disabled={!ok} style={{ left: `${(l.x / 192) * 100}%`, top: `${((l.y - 8) / 112) * 100}%` }}
              title={`Mundo ${m.id}: ${m.nombre}`} aria-label={`Mundo ${m.id}: ${m.nombre}, ${m.tema}${ok ? '' : ' (bloqueado)'}`} onClick={() => onViajar(m)} />;
          })}
        </div>
        <ol className="mapa-lista">
          {mundos.map(m => (
            <li key={m.id}>
              <button type="button" disabled={!abierto(m)} aria-current={m.id === actual ? 'location' : undefined} onClick={() => onViajar(m)}>
                <b>{m.id}</b> {m.nombre} <small>{m.tema}{!m.niveles ? ' · próximamente' : !abierto(m) ? ' · bloqueado' : completo(m) ? ' · ★' : ''}</small>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
