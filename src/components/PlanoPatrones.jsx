/* Segunda página del plano: el interior del sector de patrones (Mundo 8 · La Forja).
   Cada patrón ocupa una zona del piso; sus capítulos son paradas sobre la cinta y el mini-jefe es la
   máquina del final. Aquí se elige el capítulo: la cabecera del juego ya no lista los pasos de este mundo. */
import { useEffect, useRef, useState } from 'react';
import { W, H, pisoBase, banco, caja, rect, dibujarCinta, dibujarMaquina, largo, puntoEn, direccion, dibujarRuta, anillo, reducido, dibujarRobotPlano } from './mapaDibujo.js';

const ENTRADA = { x: 40, y: 318 };
/* Una zona por patrón, en el orden del mundo: la cinta entra por la izquierda, recorre la fila de abajo,
   sube por la derecha y vuelve por la fila de arriba. `pasos` son las paradas; la última es la máquina.
   `rotulo: 'arriba'` sube el letrero de la máquina cuando la cinta le llega por debajo. */
const TRAMOS = [
  { zona: [62, 262, 190, 100], forma: 'taller', techo: '#d89648', pasos: [[95, 318], [150, 318], [215, 318]] },
  { zona: [268, 262, 190, 100], forma: 'arena', techo: '#d97869', pasos: [[300, 318], [355, 318], [420, 318]] },
  { zona: [474, 126, 138, 236], forma: 'averias', techo: '#e0606e', rotulo: 'arriba', pasos: [[505, 318], [570, 318], [578, 252], [562, 185]] },
  { zona: [268, 126, 190, 102], forma: 'estacion', techo: '#6fa8d8', pasos: [[430, 185], [375, 185], [310, 185]] },
  { zona: [62, 126, 190, 102], forma: 'fabrica', techo: '#d7a85f', pasos: [[225, 185], [170, 185], [105, 185]] },
];
/* Reparte n paradas sobre la línea de un tramo (por si un patrón tiene más o menos capítulos que paradas dibujadas) */
function paradas(tramo, n) {
  const pts = tramo.pasos.map(([x, y]) => ({ x, y }));
  if (n === pts.length) return pts;
  const total = largo(pts);
  return Array.from({ length: n }, (_, k) => { const p = puntoEn(pts, n === 1 ? total : (total * k) / (n - 1)); return { x: Math.round(p.x), y: Math.round(p.y) }; });
}

function dibujarZona(ctx, tramo, patron, estado) {
  const [x, y, w, h] = tramo.zona;
  const borde = { aqui: '#d9b44a', dominado: '#4f9f74', abierto: '#5f86a6', cerrado: '#3d4f62' }[estado];
  rect(ctx, '#142435', x, y, w, h);
  rect(ctx, estado === 'cerrado' ? '#1a2a3b' : '#20384d', x + 2, y + 2, w - 4, h - 4);
  for (const [cx, cy] of [[x, y], [x + w - 8, y], [x, y + h - 3], [x + w - 8, y + h - 3]]) rect(ctx, borde, cx, cy, 8, 3);
  for (const [cx, cy] of [[x, y], [x + w - 3, y], [x, y + h - 8], [x + w - 3, y + h - 8]]) rect(ctx, borde, cx, cy, 3, 8);
  ctx.font = 'bold 9px monospace';
  ctx.fillStyle = estado === 'cerrado' ? '#7d8997' : borde;
  ctx.fillText(patron.corto.toUpperCase(), x + 8, y + 13);
}

/* Estante del Códice: una casilla por patrón, encendida cuando está dominado */
function dibujarCodice(ctx, patrones, ahora) {
  const x0 = 606 - patrones.length * 36, y0 = 62;
  ctx.font = 'bold 8px monospace';
  ctx.fillStyle = '#7fc8ff';
  ctx.fillText('CÓDICE DE PATRONES', x0, y0 - 4);
  patrones.forEach((p, k) => {
    const x = x0 + k * 36;
    rect(ctx, '#101a25', x, y0, 32, 30);
    rect(ctx, p.dominado ? '#4a3a17' : '#263a4d', x + 2, y0 + 2, 28, 26);
    rect(ctx, p.dominado ? (ahora % 1400 < 700 ? '#ffd84a' : '#e0b63a') : '#3a4c5e', x + 5, y0 + 5, 22, 13);
    ctx.fillStyle = p.dominado ? '#3a2a06' : '#8191a2';
    ctx.textAlign = 'center';
    ctx.fillText(p.sigla, x + 16, y0 + 15);
    ctx.textAlign = 'start';
    rect(ctx, p.dominado ? '#7ed6a0' : '#4d5864', x + 12, y0 + 22, 8, 3);
  });
}

export default function PlanoPatrones({ mundo, patrones, onIr, onCerrar }) {
  const ref = useRef(null);
  const sprite = useRef({});
  // Todas las paradas en orden de recorrido, cada una con su punto en el plano
  const nodos = patrones.flatMap((p, i) => {
    const tramo = TRAMOS[i % TRAMOS.length], pts = paradas(tramo, p.capitulos.length);
    return p.capitulos.map((c, j) => ({ ...c, ...pts[j], patron: p, tramo, ultimo: j === p.capitulos.length - 1 }));
  });
  const idxAqui = nodos.findIndex(n => n.aqui);
  const [sel, setSel] = useState(() => (nodos[idxAqui] || nodos.find(n => !n.hecho && n.abierto) || nodos[0]).k);
  const [viaje, setViaje] = useState(null);
  const estado = useRef({});
  estado.current = { nodos, patrones, sel, viaje, idxAqui };

  // Puntos de la cinta entre dos paradas (-1 es la entrada del sector)
  const puntos = (ns, desde, hasta) => {
    const r = [], paso = desde <= hasta ? 1 : -1;
    for (let k = desde; k !== hasta + paso; k += paso) r.push(k < 0 ? ENTRADA : ns[k]);
    return r;
  };
  const ir = k => {
    if (viaje) return;
    const j = nodos.findIndex(n => n.k === k), n = nodos[j];
    if (n.aqui) { onCerrar(); return; }
    if (!n.abierto) { setSel(k); return; }
    const pts = puntos(nodos, idxAqui, j);
    if (reducido() || pts.length < 2) { onIr(k); return; }
    const dur = Math.max(600, Math.min(2000, largo(pts) * 3.2));
    setSel(k);
    setViaje({ pts, t0: performance.now(), dur });
    setTimeout(() => onIr(k), dur + 120);
  };
  // Primer clic elige y muestra la ruta; el segundo (o el botón de la ficha) entra al capítulo
  const tocar = k => (sel === k ? ir(k) : setSel(k));

  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return undefined;
    ctx.imageSmoothingEnabled = false;
    let raf;
    const loop = ahora => {
      const e = estado.current;
      pisoBase(ctx, `CLASSBOTS // SECTOR ${String(mundo.id).padStart(2, '0')} · ${mundo.nombre.toUpperCase()}`);
      banco(ctx, 42, 62, 110, 40);
      banco(ctx, 190, 62, 110, 40);
      for (const [x, y] of [[322, 70], [344, 86], [28, 240], [606, 372]]) caja(ctx, x, y);
      dibujarCodice(ctx, e.patrones, ahora);
      e.patrones.forEach((p, i) => {
        const propios = e.nodos.filter(n => n.patron === p);
        dibujarZona(ctx, TRAMOS[i % TRAMOS.length], p, propios.some(n => n.aqui) ? 'aqui' : p.dominado ? 'dominado' : propios[0]?.abierto ? 'abierto' : 'cerrado');
      });
      e.nodos.forEach((n, j) => dibujarCinta(ctx, j ? e.nodos[j - 1] : ENTRADA, n, j ? e.nodos[j - 1].hecho : n.abierto, ahora));
      // Compuerta de entrada
      rect(ctx, '#101a25', ENTRADA.x - 12, ENTRADA.y - 16, 16, 32);
      rect(ctx, '#bd9d55', ENTRADA.x - 9, ENTRADA.y - 13, 10, 26);
      rect(ctx, '#101a25', ENTRADA.x - 6, ENTRADA.y - 10, 4, 20);
      for (const n of e.nodos) {
        if (n.ultimo) {
          dibujarMaquina(ctx, { x: n.x, y: n.y, techo: n.tramo.techo, forma: n.tramo.forma, zona: '' }, !n.abierto, ahora);
          ctx.fillStyle = n.abierto ? '#d7e3e8' : '#8993a0';
          ctx.font = 'bold 8px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('MINI-JEFE', n.x, n.tramo.rotulo === 'arriba' ? n.y - 36 : n.y + 34);
          ctx.textAlign = 'start';
        }
        else { rect(ctx, '#101a25', n.x - 13, n.y - 13, 26, 26); rect(ctx, n.abierto ? '#51657a' : '#3a4654', n.x - 10, n.y - 10, 20, 20); }
      }
      const j = e.nodos.findIndex(n => n.k === e.sel), elegido = e.nodos[j];
      if (!e.viaje && j !== e.idxAqui && elegido.abierto) dibujarRuta(ctx, puntos(e.nodos, e.idxAqui, j), ahora);
      if (e.viaje) dibujarRuta(ctx, e.viaje.pts, ahora);
      anillo(ctx, elegido, ahora, '#7fc8ff', elegido.ultimo ? 34 : 19);
      // Robot: quieto en su capítulo (o en la entrada) o caminando por la cinta
      const quieto = e.nodos[e.idxAqui];
      let pos = quieto || ENTRADA, dir = 'abajo', paso = 0;
      if (e.viaje) {
        const t = Math.min(1, (ahora - e.viaje.t0) / e.viaje.dur);
        const suave = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
        const p = puntoEn(e.viaje.pts, suave * largo(e.viaje.pts));
        pos = p; dir = direccion(p.dx, p.dy); paso = t < 1 ? 1 + (Math.floor(ahora / 120) % 2) : 0;
      }
      dibujarRobotPlano(ctx, sprite.current, pos, { dir, paso, enViaje: !!e.viaje, ahora, ...(quieto?.ultimo ? { ox: 30, oy: 14 } : quieto ? { ox: 0, oy: -14 } : { ox: -4, oy: -18 }) });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const elegido = nodos.find(n => n.k === sel), pSel = elegido.patron;
  const dominados = patrones.filter(p => p.dominado).length;
  const estadoCap = c => (c.aqui ? 'Estás aquí' : c.hecho ? 'Superado' : c.abierto ? 'Disponible' : 'Bloqueado');
  const claseCap = c => (c.aqui ? 'actual' : c.hecho ? 'completo' : c.abierto ? 'abierto' : 'bloqueado');
  const objetivo = p => (p.capitulos.find(c => c.aqui) || p.capitulos.find(c => !c.hecho && c.abierto) || p.capitulos[0]).k;

  return (
    <div className={'mapa-contenido' + (viaje ? ' viajando' : '')}>
      <section className="mapa-visor" aria-label={`Plano interactivo de ${mundo.nombre}: patrones y capítulos`}>
        <div className="mapa-visor-cab">
          <span>{viaje ? 'EN RUTA…' : 'LÍNEA DE PATRONES'}</span>
          <span>{dominados} DE {patrones.length} PATRONES DOMINADOS</span>
        </div>
        <div className="mapa-lienzo">
          <canvas ref={ref} width={W} height={H} className="pixel-canvas" aria-hidden="true" />
          {nodos.map(n => (
            <button key={n.id} type="button" className={`mapa-punto ${n.ultimo ? 'mapa-jefe' : 'mapa-paso'}${n.aqui ? ' aqui' : ''}${n.hecho ? ' completo' : ''}${!n.abierto ? ' cerrado' : ''}${sel === n.k ? ' elegido' : ''}`}
              style={{ left: `${(n.x / W) * 100}%`, top: `${(n.y / H) * 100}%` }} aria-pressed={sel === n.k}
              title={`${n.etiqueta} ${n.titulo} · ${n.patron.corto}`}
              aria-label={`Capítulo ${n.etiqueta}: ${n.titulo}, ${n.patron.corto}${n.ultimo ? ', mini-jefe' : ''}, ${estadoCap(n).toLowerCase()}`}
              onClick={() => tocar(n.k)} onDoubleClick={() => ir(n.k)}>{n.ultimo ? '★' : n.paso + 1}</button>
          ))}
        </div>
        <div className="mapa-ficha" aria-live="polite">
          <span className="mapa-ficha-num">{elegido.etiqueta}</span>
          <div className="mapa-ficha-info">
            <strong>{elegido.titulo} <em>{estadoCap(elegido)}</em></strong>
            <small>{pSel.corto} · {elegido.concepto}</small>
            <dl>
              <div><dt>Patrón</dt><dd>«{pSel.titulo}»</dd></div>
              <div><dt>Paso</dt><dd>{elegido.paso + 1} de {pSel.capitulos.length}{elegido.ultimo ? ' (mini-jefe)' : ''}</dd></div>
              <div><dt>Recompensa</dt><dd>{pSel.recompensa}</dd></div>
            </dl>
          </div>
          <button type="button" className="btn-pri mapa-ir" disabled={!!viaje || !(elegido.abierto || elegido.aqui)} onClick={() => ir(sel)}>
            {viaje ? 'Viajando…' : elegido.aqui ? 'Seguir aquí' : !elegido.abierto ? 'Supera el capítulo anterior' : elegido.hecho ? 'Repetir capítulo →' : 'Entrar al capítulo →'}
          </button>
        </div>
        <div className="mapa-leyenda" aria-label="Estados del plano">
          <span><i className="actual" /> Ubicación actual</span>
          <span><i className="completo" /> Superado</span>
          <span><i className="cerrado" /> Bloqueado</span>
          <span>★ Mini-jefe del patrón</span>
          <span className="mapa-ayuda">Clic para ver la ruta · doble clic o «Entrar» para ir</span>
        </div>
      </section>
      <section className="mapa-destinos" aria-label="Patrones y capítulos del sector">
        <div className="mapa-destinos-cab">
          <h3>Patrones de diseño</h3>
          <span>{dominados} DE {patrones.length}</span>
        </div>
        <ol className="mapa-lista">
          {patrones.map(p => {
            const aqui = p.capitulos.some(c => c.aqui), hechos = p.capitulos.filter(c => c.hecho).length, ok = p.capitulos.some(c => c.abierto);
            const est = aqui ? 'actual' : p.dominado ? 'completo' : ok ? 'abierto' : 'bloqueado';
            const etiqueta = aqui ? 'Estás aquí' : p.dominado ? 'Dominado' : !ok ? 'Bloqueado' : hechos ? `Paso ${hechos + 1} de ${p.capitulos.length}` : 'Disponible';
            return (
              <li key={p.id}>
                <button type="button" className={`mapa-destino ${est}${pSel === p ? ' elegido' : ''}`} aria-pressed={pSel === p} aria-current={aqui ? 'location' : undefined} onClick={() => setSel(objetivo(p))}>
                  <span className="mapa-destino-num">{p.sigla}</span>
                  <span className="mapa-destino-info"><strong>{p.corto}</strong><small>«{p.titulo}» · {p.recompensa}</small></span>
                  <span className="mapa-estado">{etiqueta}</span>
                </button>
              </li>
            );
          })}
        </ol>
        <section className="mapa-misiones" aria-labelledby="plano-caps-t">
          <div className="mapa-destinos-cab">
            <h3 id="plano-caps-t">Capítulos de {pSel.corto}</h3>
            <span>{pSel.capitulos.filter(c => c.hecho).length} DE {pSel.capitulos.length}</span>
          </div>
          <ol className="mapa-lista">
            {pSel.capitulos.map((c, j) => (
              <li key={c.id}>
                <button type="button" className={`mapa-destino ${claseCap(c)}${sel === c.k ? ' elegido' : ''}`} aria-pressed={sel === c.k} aria-current={c.aqui ? 'location' : undefined}
                  onClick={() => tocar(c.k)} onDoubleClick={() => ir(c.k)}>
                  <span className="mapa-destino-num">{j === pSel.capitulos.length - 1 ? '★' : j + 1}</span>
                  <span className="mapa-destino-info"><strong>{c.titulo}</strong><small>{c.etiqueta} · {c.concepto}</small></span>
                  <span className="mapa-estado">{estadoCap(c)}</span>
                </button>
              </li>
            ))}
          </ol>
        </section>
      </section>
    </div>
  );
}
