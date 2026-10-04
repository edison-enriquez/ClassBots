import { useEffect, useRef } from 'react';
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
  { x: 548, y: 229, zona: 'FÁBRICA', techo: '#d7a85f', forma: 'fabrica' },
  { x: 572, y: 93, zona: 'CIUDAD', techo: '#91a5c9', forma: 'ciudad' },
  { x: 467, y: 54, zona: 'CONTROL', techo: '#b87591', forma: 'torre' },
];
const PUNTO_MISION = { x: 346, y: 105 };
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
  rect(ctx, '#263b4e', 26, 28, 588, 20);
  rect(ctx, '#314a60', 29, 31, 582, 14);
  ctx.fillStyle = '#7fc8ff';
  ctx.font = 'bold 10px monospace';
  ctx.fillText('CLASSBOTS // COMPLEJO DE ENSAMBLAJE', 38, 42);
  ctx.fillStyle = '#91a5b7';
  ctx.font = '8px monospace';
  ctx.fillText('PLANO DE PRODUCCIÓN  ·  SECTOR A', 430, 42);

  // Bancos de montaje secundarios y siluetas de maquinaria.
  for (const [x, y, w, h] of [[42, 76, 110, 40], [446, 292, 145, 56], [190, 74, 110, 38], [40, 174, 54, 82]]) {
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

function dibujarMision(ctx, disponible, completada, ahora) {
  const { x, y } = PUNTO_MISION, base = completada ? '#7ed6a0' : disponible ? '#f1c653' : '#788493';
  sombra(ctx, x, y + 7, 42);
  rect(ctx, '#101a25', x - 22, y - 17, 44, 30);
  rect(ctx, '#687988', x - 19, y - 14, 38, 24);
  rect(ctx, '#24394a', x - 16, y - 11, 32, 18);
  rect(ctx, disponible && ahora % 800 < 400 ? '#fff0a4' : base, x - 13, y - 8, 26, 14);
  rect(ctx, '#182838', x - 9, y - 5, 18, 9);
  rect(ctx, base, x - 6, y - 4, 12, 7);
  rect(ctx, '#182838', x - 2, y - 3, 4, 5);
  rect(ctx, '#536475', x - 18, y - 19, 36, 3);
  ctx.fillStyle = base;
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('SIDE QUEST // STRATEGY', x, y + 31);
  ctx.textAlign = 'start';
}

export default function MapaMundo({
  mundos, actual, abierto, completo, onViajar, onCerrar,
  misiones = [], misionAbierta = () => false, misionCompleta = () => false, onIniciarMision = () => {},
}) {
  const ref = useRef(null);
  const finalizados = mundos.filter(completo).length;
  const accesibles = mundos.filter(abierto).length;
  const progreso = Math.round((finalizados / mundos.length) * 100);

  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return undefined;
    ctx.imageSmoothingEnabled = false;
    let raf;
    const loop = ahora => {
      dibujarPiso(ctx);
      TRAYECTO.forEach(([a, b], i) => {
        dibujarCinta(ctx, a, b, completo(mundos[i]), ahora);
      });
      if (misiones.length) {
        const disponible = misionAbierta(misiones[0]), completada = misionCompleta(misiones[0]);
        dibujarCinta(ctx, LUGARES[3], PUNTO_MISION, disponible || completada, ahora, true);
        dibujarMision(ctx, disponible, completada, ahora);
      }
      LUGARES.forEach((l, i) => dibujarMaquina(ctx, l, !abierto(mundos[i]), ahora));
      const lugarActual = LUGARES[actual - 1];
      if (lugarActual) robotRPG(ctx, lugarActual.x + 23, lugarActual.y + 10, {
        pal: paletaRPG('azul', { energia: 100 }),
        salto: Math.floor(ahora / 300) % 2,
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [mundos, actual, abierto, completo, misiones, misionAbierta, misionCompleta]);

  useEffect(() => {
    const esc = e => { if (e.key === 'Escape') onCerrar(); };
    addEventListener('keydown', esc);
    return () => removeEventListener('keydown', esc);
  }, [onCerrar]);

  return (
    <div className="modal-fondo" role="dialog" aria-modal="true" aria-labelledby="mapa-t" onClick={e => { if (e.target === e.currentTarget) onCerrar(); }}>
      <div className="modal rpg-ventana mapa-modal">
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
              <span>RED DE PRODUCCIÓN</span>
              <span>SECTOR {String(actual).padStart(2, '0')} / {String(mundos.length).padStart(2, '0')}</span>
            </div>
            <div className="mapa-lienzo">
              <canvas ref={ref} width={W} height={H} className="pixel-canvas" aria-hidden="true" />
              {LUGARES.map((l, i) => {
                const m = mundos[i], ok = abierto(m), terminado = completo(m);
                return (
                  <button key={m.id} type="button" className={`mapa-punto${m.id === actual ? ' aqui' : ''}${terminado ? ' completo' : ''}`}
                    disabled={!ok} style={{ left: `${(l.x / W) * 100}%`, top: `${(l.y / H) * 100}%` }}
                    title={`Sector ${m.id}: ${m.nombre}`} aria-label={`Sector ${m.id}: ${m.nombre}, ${m.tema}${terminado ? ', completado' : ok ? ', disponible' : ', bloqueado'}`}
                    onClick={() => onViajar(m)}>{String(m.id).padStart(2, '0')}</button>
                );
              })}
              {misiones.map((m, i) => {
                const ok = misionAbierta(m), terminado = misionCompleta(m);
                return <button key={m.id} type="button" className={`mapa-punto mapa-punto-mision${terminado ? ' completo' : ''}`}
                  disabled={!ok} style={{ left: `${(PUNTO_MISION.x / W) * 100}%`, top: `${(PUNTO_MISION.y / H) * 100}%` }}
                  title={`Misión especial: ${m.titulo}`}
                  aria-label={`Misión especial ${i + 1}: ${m.titulo}, ${m.concepto}${terminado ? ', completada' : ok ? ', disponible' : ', completa el Mundo ' + m.mundo + ' para desbloquearla'}`}
                  onClick={() => onIniciarMision(m)}>✦</button>;
              })}
            </div>
            <div className="mapa-leyenda" aria-label="Estados del plano">
              <span><i className="actual" /> Sector actual</span>
              <span><i className="completo" /> En producción</span>
              <span><i className="cerrado" /> Bloqueado</span>
              <span><i className="ramal" /> Misión opcional</span>
            </div>
          </section>
          <section className="mapa-destinos" aria-label="Sectores y misiones de la fábrica">
            <div className="mapa-destinos-cab">
              <h3>Sectores de producción</h3>
              <span>{accesibles} ACCESIBLES</span>
            </div>
            <ol className="mapa-lista">
              {mundos.map(m => {
                const ok = abierto(m), terminado = completo(m);
                const estado = terminado ? 'completo' : !ok ? (m.niveles ? 'bloqueado' : 'proximo') : m.id === actual ? 'actual' : 'abierto';
                const etiqueta = terminado ? 'Operativo' : !ok ? (m.niveles ? 'Bloqueado' : 'En diseño') : m.id === actual ? 'En curso' : 'Disponible';
                return (
                  <li key={m.id}>
                    <button type="button" className={`mapa-destino ${estado}`} disabled={!ok}
                      aria-current={m.id === actual ? 'location' : undefined} onClick={() => onViajar(m)}>
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
                <span>DERIVACIONES</span>
              </div>
              <ol className="mapa-lista">
                {misiones.map(m => {
                  const ok = misionAbierta(m), terminado = misionCompleta(m);
                  const etiqueta = terminado ? 'Módulo obtenido' : ok ? 'Disponible' : `Completa el Mundo ${m.mundo}`;
                  return <li key={m.id}>
                    <button type="button" className={`mapa-destino mapa-destino-mision${terminado ? ' completo' : ''}${!ok ? ' bloqueado' : ''}`}
                      disabled={!ok} onClick={() => onIniciarMision(m)}>
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
