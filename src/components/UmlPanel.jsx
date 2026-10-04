import { useMemo, useState } from 'react';
import { deflateRaw } from 'pako';
import { miembrosUML, relaciones, plantuml } from '../engine/motor.js';

export const NOMBRE_REL = { composicion: 'composición', agregacion: 'agregación', asociacion: 'asociación', dependencia: 'dependencia', realizacion: 'realización', herencia: 'herencia' };
export const SIMBOLO_REL = { composicion: '◆──', agregacion: '◇──', asociacion: '──>', dependencia: '┄┄>', realizacion: '┄┄▷', herencia: '──▷' };

/* Marcadores UML compartidos: rombo lleno/vacío en el origen, flecha abierta o triángulo en el destino */
export function Marcadores({ id = 'u' }) {
  return (
    <defs>
      <marker id={`${id}-abierta`} viewBox="0 0 12 12" refX="11" refY="6" markerWidth="11" markerHeight="11" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
        <path d="M1 1L11 6L1 11" className="u-mk-linea" />
      </marker>
      <marker id={`${id}-triangulo`} viewBox="0 0 14 14" refX="13" refY="7" markerWidth="14" markerHeight="14" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
        <path d="M1 1L13 7L1 13z" className="u-mk-vacio" />
      </marker>
      <marker id={`${id}-rombo-vacio`} viewBox="0 0 20 12" refX="19" refY="6" markerWidth="20" markerHeight="12" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
        <path d="M1 6L10 1L19 6L10 11z" className="u-mk-vacio" />
      </marker>
      <marker id={`${id}-rombo-lleno`} viewBox="0 0 20 12" refX="19" refY="6" markerWidth="20" markerHeight="12" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
        <path d="M1 6L10 1L19 6L10 11z" className="u-mk-lleno" />
      </marker>
    </defs>
  );
}
export function propsLinea(tipo, id = 'u') {
  const p = { className: 'u-rel' + (tipo === 'dependencia' || tipo === 'realizacion' ? ' punteada' : '') };
  if (tipo === 'composicion') p.markerStart = `url(#${id}-rombo-lleno)`;
  if (tipo === 'agregacion') p.markerStart = `url(#${id}-rombo-vacio)`;
  if (tipo === 'asociacion' || tipo === 'dependencia') p.markerEnd = `url(#${id}-abierta)`;
  if (tipo === 'realizacion' || tipo === 'herencia') p.markerEnd = `url(#${id}-triangulo)`;
  return p;
}
/* Notación en miniatura para la guía y la lista de relaciones */
export function Flecha({ tipo, ancho = 92, de = 'A', a = 'B' }) {
  const id = 'mini-' + tipo, cw = 6.7;
  const x1 = de ? de.length * cw + 8 : 2, x2 = x1 + ancho, W = x2 + (a ? a.length * cw + 10 : 4);
  return (
    <svg width={W} height="26" viewBox={`0 0 ${W} 26`} className="flecha-mini" role="img" aria-label={`${de} ${NOMBRE_REL[tipo]} ${a}`.trim()}>
      <Marcadores id={id} />
      {de && <text x="2" y="17" className="u-mini-t">{de}</text>}
      <line x1={x1} y1="13" x2={x2} y2="13" {...propsLinea(tipo, id)} />
      {a && <text x={x2 + 6} y="17" className="u-mini-t">{a}</text>}
    </svg>
  );
}

export default function UmlPanel({ modelo, objetivo }) {
  const fuente = useMemo(() => plantuml(modelo), [modelo]);
  const rels = useMemo(() => relaciones(modelo), [modelo]);
  const url = useMemo(() => { try { return 'https://www.plantuml.com/plantuml/uml/' + codificar(fuente); } catch { return null; } }, [fuente]);
  const [copiado, setCopiado] = useState('');
  const copiar = () => {
    const ok = () => { setCopiado('Copiado'); setTimeout(() => setCopiado(''), 1500); };
    try { navigator.clipboard.writeText(fuente).then(ok, () => setCopiado('Selecciona y copia con Ctrl+C')); } catch { setCopiado('Selecciona y copia con Ctrl+C'); }
  };
  return (
    <div className="uml">
      {objetivo?.length > 0 && <Objetivo objetivo={objetivo} rels={rels} />}
      <div className="uml-svg"><Diagrama modelo={modelo} rels={rels} /></div>
      {rels.length > 0 && (
        <ul className="rel-lista" aria-label="Relaciones detectadas">
          {rels.map((r, k) => (
            <li key={k}><Flecha tipo={r.tipo} ancho={56} de="" a="" /><span><strong>{r.de} {SIMBOLO_REL[r.tipo]} {r.a}</strong>{r.mult ? ` (${r.mult})` : ''} · {NOMBRE_REL[r.tipo]}. {r.razon}</span></li>
          ))}
        </ul>
      )}
      <div className="uml-head">
        <span className="rotulo">Fuente PlantUML</span>
        <span className="uml-acc">
          <button type="button" className="btn-mini" onClick={copiar}>{copiado || 'Copiar'}</button>
          {url && <a className="btn-mini" href={url} target="_blank" rel="noopener noreferrer">Abrir en PlantUML ↗</a>}
        </span>
      </div>
      <pre className="puml">{fuente}</pre>
    </div>
  );
}

function Objetivo({ objetivo, rels }) {
  const filas = objetivo.map(([de, a, tipo]) => {
    const r = rels.find(x => x.de === de && x.a === a);
    return { de, a, tipo, ok: r?.tipo === tipo, encontrado: r ? NOMBRE_REL[r.tipo] : null };
  });
  const n = filas.filter(f => f.ok).length;
  return (
    <div className="objetivo">
      <span className="rotulo">Plano objetivo · {n} de {filas.length} relaciones</span>
      <ul>
        {filas.map((f, k) => (
          <li key={k} className={f.ok ? 'bien' : 'mal'}>
            <span className="ic">{f.ok ? '✓' : '✗'}</span>
            <code>{f.de} {SIMBOLO_REL[f.tipo]} {f.a}</code> {NOMBRE_REL[f.tipo]}
            {!f.ok && <small>{f.encontrado ? ` · hoy es ${f.encontrado}` : ' · todavía no existe'}</small>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* Diagrama de clases por capas: arriba las interfaces y los "todos", abajo las partes */
function Diagrama({ modelo, rels }) {
  const todas = Object.values(modelo.clases);
  if (!todas.length) return <p className="vacio">Declara una clase y su diagrama aparecerá aquí mientras escribes.</p>;
  const ocultarMain = todas.length > 3 && modelo.clases.Main;
  const cs = ocultarMain ? todas.filter(c => c.nombre !== 'Main') : todas;
  const nombres = new Set(cs.map(c => c.nombre));
  const rs = rels.filter(r => nombres.has(r.de) && nombres.has(r.a));
  // capas por camino más largo
  const arriba = r => (r.tipo === 'realizacion' || r.tipo === 'herencia' ? r.a : r.de), abajo = r => (r.tipo === 'realizacion' || r.tipo === 'herencia' ? r.de : r.a);
  const capa = Object.fromEntries(cs.map(c => [c.nombre, 0]));
  for (let it = 0; it < cs.length; it++) for (const r of rs) if (capa[abajo(r)] < capa[arriba(r)] + 1) capa[abajo(r)] = Math.min(cs.length, capa[arriba(r)] + 1);
  const CW = 7.4, LH = 16, PAD = 10, GX = 34, GY = 70;
  const cajas = cs.map(c => {
    const { atr, ops } = miembrosUML(c);
    const lineas = [c.nombre, ...atr.map(a => a.t), ...ops.map(o => o.t)];
    const w = Math.max(130, ...lineas.map(s => s.length * CW + PAD * 2));
    const cab = c.tipo === 'interface' || c.abstracta ? 40 : 26;
    const h = cab + (c.tipo === 'interface' ? 0 : Math.max(1, atr.length) * LH + 8) + Math.max(1, ops.length) * LH + 8;
    return { c, atr, ops, w, h, cab, capa: capa[c.nombre] };
  });
  const filas = [];
  for (const b of cajas) (filas[b.capa] ||= []).push(b);
  const filasOk = filas.filter(Boolean);
  // orden dentro de la fila por la posición media de sus vecinos de arriba
  let y = 10, ancho = 0;
  const pos = {};
  filasOk.forEach(fila => {
    const w = fila.reduce((s, b) => s + b.w, 0) + GX * (fila.length - 1);
    ancho = Math.max(ancho, w);
    fila.w = w;
    fila.y = y;
    y += Math.max(...fila.map(b => b.h)) + GY;
  });
  function media(b) {
    const vec = rs.filter(r => abajo(r) === b.c.nombre && pos[arriba(r)]).map(r => pos[arriba(r)].x + pos[arriba(r)].w / 2);
    return vec.length ? vec.reduce((s, v) => s + v, 0) / vec.length : 0;
  }
  const W = ancho + 20, H = y - GY + 20;
  filasOk.forEach((fila, fi) => {
    if (fi > 0) fila.sort((p, q) => media(p) - media(q));
    let x = 10 + (ancho - fila.w) / 2;
    for (const b of fila) { pos[b.c.nombre] = { x, y: fila.y, w: b.w, h: b.h }; b.x = x; b.y = fila.y; x += b.w + GX; }
  });
  const borde = (p, hacia) => {
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2, dx = hacia.x - cx, dy = hacia.y - cy;
    if (!dx && !dy) return { x: cx, y: cy };
    const s = Math.min(Math.abs((p.w / 2) / (dx || 1e-9)), Math.abs((p.h / 2) / (dy || 1e-9)));
    return { x: cx + dx * s, y: cy + dy * s };
  };
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Diagrama de clases UML">
      <Marcadores id="u" />
      {rs.map((r, k) => {
        const A = pos[r.de], B = pos[r.a];
        const ca = { x: A.x + A.w / 2, y: A.y + A.h / 2 }, cb = { x: B.x + B.w / 2, y: B.y + B.h / 2 };
        const p1 = borde(A, cb), p2 = borde(B, ca);
        const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
        const ux = p2.x - p1.x, uy = p2.y - p1.y, L = Math.hypot(ux, uy) || 1;
        return (
          <g key={k}>
            <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} {...propsLinea(r.tipo)} />
            {r.mult && <text className="u-lbl" x={p2.x - (ux / L) * 18 + 6} y={p2.y - (uy / L) * 18 - 4}>{r.mult}</text>}
            {(r.campo || r.etiqueta) && <text className="u-lbl tenue" x={mx + 6} y={my - 4}>{r.etiqueta ? `«${r.etiqueta}»` : r.campo}</text>}
          </g>
        );
      })}
      {cajas.map(b => {
        const y1 = b.y + b.cab, int = b.c.tipo === 'interface';
        const y2 = int ? y1 : y1 + 4 + Math.max(1, b.atr.length) * LH + 4;
        return (
          <g key={b.c.nombre}>
            <rect className={'u-box' + (int ? ' int' : '')} x={b.x} y={b.y} width={b.w} height={b.h} />
            <rect className={'u-head' + (int ? ' int' : '')} x={b.x} y={b.y} width={b.w} height={b.cab} />
            {(int || b.c.abstracta) && <text className="u-estereo" x={b.x + b.w / 2} y={b.y + 15} textAnchor="middle">{int ? '«interface»' : '«abstract»'}</text>}
            <text className={'u-name' + (int || b.c.abstracta ? ' cursiva' : '')} x={b.x + b.w / 2} y={b.y + b.cab - 9} textAnchor="middle">{b.c.nombre}</text>
            {!int && <>
              <line className="u-sep" x1={b.x} y1={y1} x2={b.x + b.w} y2={y1} />
              {!b.atr.length && <text className="u-empty" x={b.x + PAD} y={y1 + 4 + LH - 4}>sin atributos</text>}
              {b.atr.map((a, i) => <text key={i} className={'u-mem' + (a.st ? ' st' : '')} x={b.x + PAD} y={y1 + 4 + (i + 1) * LH - 4}>{a.t}</text>)}
              <line className="u-sep" x1={b.x} y1={y2} x2={b.x + b.w} y2={y2} />
            </>}
            {!b.ops.length && <text className="u-empty" x={b.x + PAD} y={y2 + 4 + LH - 4}>sin métodos</text>}
            {b.ops.map((o, i) => <text key={i} className={'u-mem' + (o.st ? ' st' : '') + (o.ab && !int ? ' cursiva' : '')} x={b.x + PAD} y={y2 + 4 + (i + 1) * LH - 4}>{o.t}</text>)}
          </g>
        );
      })}
      {ocultarMain && <text className="u-empty" x="10" y={H - 4}>Main se omite para no saturar el diagrama.</text>}
    </svg>
  );
}

function codificar(txt) {
  const d = deflateRaw(new TextEncoder().encode(txt), { level: 9 });
  const A = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';
  let r = '';
  for (let i = 0; i < d.length; i += 3) {
    const b1 = d[i], b2 = i + 1 < d.length ? d[i + 1] : 0, b3 = i + 2 < d.length ? d[i + 2] : 0;
    r += A[b1 >> 2] + A[((b1 & 3) << 4) | (b2 >> 4)] + A[((b2 & 15) << 2) | (b3 >> 6)] + A[b3 & 63];
  }
  return r;
}
