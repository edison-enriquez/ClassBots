/* Segunda página del plano: el interior del sector de patrones (Mundo 8 · La Forja).
   Se lee igual que la primera: cada patrón es un sector con su máquina, unidos por la cinta, y se viaja
   de sector en sector. Los patrones van en orden libre: todos se abren al terminar el mundo anterior,
   salvo el que reúne a los demás (MVC), que espera a que estén dominados. Los capítulos de cada patrón no son paradas del plano: se ven en la lista de la
   derecha (y como testigos bajo la máquina) para quien quiera entrar a un paso concreto.
   El último sector (MVC) reúne a los demás: al elegirlo, o al elegir uno de los que usa, se ven los enlaces. */
import { useEffect, useRef, useState } from 'react';
import { W, H, pisoBase, banco, caja, rect, dibujarCinta, dibujarMaquina, largo, puntoEn, direccion, dibujarRuta, anillo, reducido, dibujarRobotPlano } from './mapaDibujo.js';

const ENTRADA = { x: 38, y: 296 };
/* Un sector por patrón, en el orden del mundo: la cinta entra por la izquierda y zigzaguea como en el complejo */
const LUGARES = [
  { x: 96, y: 296, techo: '#d89648', forma: 'taller' },
  { x: 189, y: 196, techo: '#d97869', forma: 'arena' },
  { x: 282, y: 296, techo: '#e0606e', forma: 'averias' },
  { x: 375, y: 196, techo: '#6fa8d8', forma: 'estacion' },
  { x: 468, y: 296, techo: '#d7a85f', forma: 'fabrica' },
  { x: 561, y: 196, techo: '#7fc8ff', forma: 'panel' },
];
const lugarDe = i => LUGARES[i % LUGARES.length];

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

/* Testigos de avance bajo el rótulo de la máquina: uno por capítulo, el último (mini-jefe) más ancho */
function dibujarTestigos(ctx, lugar, patron) {
  const n = patron.capitulos.length, ancho = k => (k === n - 1 ? 9 : 5);
  const total = patron.capitulos.reduce((s, _, k) => s + ancho(k) + 3, -3);
  let x = Math.round(lugar.x - total / 2);
  rect(ctx, '#101a25', x - 3, lugar.y + 39, total + 6, 9);
  patron.capitulos.forEach((c, k) => {
    rect(ctx, c.aqui ? '#ffd84a' : c.hecho ? '#7ed6a0' : c.abierto ? '#7fa3c4' : '#44505e', x, lugar.y + 41, ancho(k), 5);
    x += ancho(k) + 3;
  });
}

export default function PlanoPatrones({ mundo, patrones, onIr, onCerrar }) {
  const ref = useRef(null);
  const sprite = useRef({});
  const iAqui = patrones.findIndex(p => p.capitulos.some(c => c.aqui));
  // A dónde lleva «viajar» a un patrón: su capítulo en curso, el primero pendiente o, si ya está dominado, el primero
  const destino = p => p.capitulos.find(c => c.aqui) || p.capitulos.find(c => !c.hecho && c.abierto) || p.capitulos.find(c => c.abierto) || p.capitulos[0];
  const accesible = p => p.capitulos.some(c => c.abierto || c.aqui);
  const [sel, setSel] = useState(() => (iAqui >= 0 ? iAqui : Math.max(0, patrones.findIndex(p => !p.dominado && accesible(p)))));
  const [viaje, setViaje] = useState(null);
  // Enlaces del patrón elegido: el que reúne a otros (MVC) se une con cada uno; los demás, con el que los reúne
  const iReune = patrones.findIndex(p => p.reune?.length);
  const enlaces = i => (i === iReune ? patrones[i].reune.map(id => patrones.findIndex(p => p.id === id)).filter(k => k >= 0) : iReune >= 0 && patrones[i].papel ? [i] : []);
  const estado = useRef({});
  estado.current = { patrones, sel, viaje, iAqui, accesible, iReune, enlaces };

  // Puntos de la cinta entre dos sectores (-1 es la entrada)
  const puntos = (desde, hasta) => {
    const r = [], paso = desde <= hasta ? 1 : -1;
    for (let k = desde; k !== hasta + paso; k += paso) r.push(k < 0 ? ENTRADA : lugarDe(k));
    return r;
  };
  // El robot camina hasta el sector del patrón y entra al capítulo c
  const entrar = (i, c) => {
    if (viaje) return;
    if (c.aqui) { onCerrar(); return; }
    if (!c.abierto) { setSel(i); return; }
    const pts = puntos(iAqui, i);
    if (reducido() || pts.length < 2) { onIr(c.k); return; }
    const dur = Math.max(600, Math.min(2000, largo(pts) * 3.2));
    setSel(i);
    setViaje({ pts, t0: performance.now(), dur });
    setTimeout(() => onIr(c.k), dur + 120);
  };
  const ir = i => entrar(i, destino(patrones[i]));
  // Primer clic elige y muestra la ruta; el segundo (o el botón de la ficha) viaja
  const tocar = i => (sel === i ? ir(i) : setSel(i));

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
      banco(ctx, 40, 150, 54, 82);
      for (const [x, y] of [[322, 70], [344, 86], [606, 150], [324, 372], [150, 364], [600, 366]]) caja(ctx, x, y);
      dibujarCodice(ctx, e.patrones, ahora);
      // Orden libre: un tramo de cinta se enciende cuando los dos sectores que une están abiertos
      dibujarCinta(ctx, ENTRADA, lugarDe(0), e.accesible(e.patrones[0]), ahora);
      e.patrones.slice(1).forEach((p, k) => dibujarCinta(ctx, lugarDe(k), lugarDe(k + 1), e.accesible(e.patrones[k]) && e.accesible(p), ahora));
      // Compuerta de entrada
      rect(ctx, '#101a25', ENTRADA.x - 12, ENTRADA.y - 16, 16, 32);
      rect(ctx, '#bd9d55', ENTRADA.x - 9, ENTRADA.y - 13, 10, 26);
      rect(ctx, '#101a25', ENTRADA.x - 6, ENTRADA.y - 10, 4, 20);
      // Enlaces punteados entre el patrón elegido y MVC (se dibujan bajo las máquinas)
      if (!e.viaje) for (const k of e.enlaces(e.sel)) dibujarCinta(ctx, lugarDe(k), lugarDe(e.iReune), e.patrones[k].dominado, ahora, true);
      e.patrones.forEach((p, i) => {
        const l = lugarDe(i);
        dibujarMaquina(ctx, { ...l, zona: p.corto.toUpperCase() }, !e.accesible(p), ahora);
        dibujarTestigos(ctx, l, p);
      });
      if (!e.viaje && e.sel !== e.iAqui && e.accesible(e.patrones[e.sel])) dibujarRuta(ctx, puntos(e.iAqui, e.sel), ahora);
      if (e.viaje) dibujarRuta(ctx, e.viaje.pts, ahora);
      anillo(ctx, lugarDe(e.sel), ahora, '#7fc8ff');
      // Robot: quieto en su sector (o en la entrada) o caminando por la cinta
      let pos = e.iAqui >= 0 ? lugarDe(e.iAqui) : ENTRADA, dir = 'abajo', paso = 0;
      if (e.viaje) {
        const t = Math.min(1, (ahora - e.viaje.t0) / e.viaje.dur);
        const suave = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
        const p = puntoEn(e.viaje.pts, suave * largo(e.viaje.pts));
        pos = p; dir = direccion(p.dx, p.dy); paso = t < 1 ? 1 + (Math.floor(ahora / 120) % 2) : 0;
      }
      dibujarRobotPlano(ctx, sprite.current, pos, { dir, paso, enViaje: !!e.viaje, ahora, ...(e.iAqui >= 0 ? {} : { ox: -4, oy: -18 }) });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const pSel = patrones[sel], meta = destino(pSel);
  const dominados = patrones.filter(p => p.dominado).length;
  const hechosDe = p => p.capitulos.filter(c => c.hecho).length;
  const claseDe = (p, i) => (i === iAqui ? 'actual' : p.dominado ? 'completo' : accesible(p) ? 'abierto' : 'bloqueado');
  const estadoDe = (p, i) => (i === iAqui ? 'Estás aquí' : p.dominado ? 'Dominado' : !accesible(p) ? 'Bloqueado' : hechosDe(p) ? `Paso ${hechosDe(p) + 1} de ${p.capitulos.length}` : 'Disponible');
  const estadoCap = c => (c.aqui ? 'Estás aquí' : c.hecho ? 'Superado' : c.abierto ? 'Disponible' : 'Bloqueado');
  const claseCap = c => (c.aqui ? 'actual' : c.hecho ? 'completo' : c.abierto ? 'abierto' : 'bloqueado');
  // Lo que le falta a un patrón cerrado: los que reúne sin dominar (MVC) o terminar el mundo anterior
  const faltan = p => (p.reune?.length ? patrones.filter(x => p.reune.includes(x.id) && !x.dominado) : []);
  const requisito = p => (faltan(p).length === 1 ? `Domina ${faltan(p)[0].corto}` : faltan(p).length ? `Domina ${faltan(p).length} patrones más` : `Completa el Mundo ${mundo.id - 1}`);
  const boton = sel === iAqui ? 'Seguir aquí' : !accesible(pSel) ? requisito(pSel) : pSel.dominado ? 'Repetir patrón →' : hechosDe(pSel) ? 'Continuar patrón →' : 'Viajar aquí →';

  return (
    <div className={'mapa-contenido' + (viaje ? ' viajando' : '')}>
      <section className="mapa-visor" aria-label={`Plano interactivo de ${mundo.nombre}: un sector por patrón`}>
        <div className="mapa-visor-cab">
          <span>{viaje ? 'EN RUTA…' : 'LÍNEA DE PATRONES'}</span>
          <span>{iAqui >= 0 ? `PATRÓN ${String(iAqui + 1).padStart(2, '0')} / ${String(patrones.length).padStart(2, '0')}` : `${dominados} DE ${patrones.length} DOMINADOS`}</span>
        </div>
        <div className="mapa-lienzo">
          <canvas ref={ref} width={W} height={H} className="pixel-canvas" aria-hidden="true" />
          {patrones.map((p, i) => {
            const l = lugarDe(i);
            return (
              <button key={p.id} type="button" className={`mapa-punto${i === iAqui ? ' aqui' : ''}${p.dominado ? ' completo' : ''}${!accesible(p) ? ' cerrado' : ''}${sel === i ? ' elegido' : ''}`}
                style={{ left: `${(l.x / W) * 100}%`, top: `${(l.y / H) * 100}%` }} aria-pressed={sel === i}
                title={`${p.corto}: «${p.titulo}»`}
                aria-label={`Patrón ${i + 1}: ${p.corto}, ${hechosDe(p)} de ${p.capitulos.length} capítulos, ${estadoDe(p, i).toLowerCase()}`}
                onClick={() => tocar(i)} onDoubleClick={() => ir(i)}>{p.sigla}</button>
            );
          })}
        </div>
        <div className="mapa-ficha" aria-live="polite">
          <span className="mapa-ficha-num">{pSel.sigla}</span>
          <div className="mapa-ficha-info">
            <strong>{pSel.corto} <em>{estadoDe(pSel, sel)}</em></strong>
            <small>«{pSel.titulo}»</small>
            <dl>
              <div><dt>Capítulos</dt><dd>{hechosDe(pSel)} de {pSel.capitulos.length} superados</dd></div>
              <div><dt>{meta.aqui ? 'Estás en' : pSel.dominado ? 'Empieza en' : 'Sigue'}</dt><dd>{meta.etiqueta} · {meta.titulo}</dd></div>
              <div><dt>Recompensa</dt><dd>{pSel.recompensa}</dd></div>
              {sel === iReune && <div><dt>Reúne</dt><dd>{enlaces(sel).map(k => patrones[k].corto + (patrones[k].dominado ? ' ✓' : '')).join(' · ')}</dd></div>}
              {sel !== iReune && iReune >= 0 && pSel.papel && <div><dt>En {patrones[iReune].corto}</dt><dd>{pSel.papel}</dd></div>}
            </dl>
          </div>
          <button type="button" className="btn-pri mapa-ir" disabled={!!viaje || !(accesible(pSel) || sel === iAqui)} onClick={() => ir(sel)}>
            {viaje ? 'Viajando…' : boton}
          </button>
        </div>
        <div className="mapa-leyenda" aria-label="Estados del plano">
          <span><i className="actual" /> Ubicación actual</span>
          <span><i className="completo" /> Dominado</span>
          <span><i className="cerrado" /> Bloqueado</span>
          {iReune >= 0 && <span><i className="ramal" /> Orden libre · {patrones[iReune].corto} usa los otros {enlaces(iReune).length}</span>}
          <span className="mapa-ayuda">Clic para ver la ruta · doble clic o «Viajar» para ir</span>
        </div>
      </section>
      <section className="mapa-destinos" aria-label="Patrones del sector y sus capítulos">
        <div className="mapa-destinos-cab">
          <h3>Patrones de diseño</h3>
          <span>{dominados} DE {patrones.length} DOMINADOS</span>
        </div>
        <ol className="mapa-lista">
          {patrones.map((p, i) => (
            <li key={p.id}>
              <button type="button" className={`mapa-destino ${claseDe(p, i)}${sel === i ? ' elegido' : ''}`} aria-pressed={sel === i} aria-current={i === iAqui ? 'location' : undefined}
                onClick={() => tocar(i)} onDoubleClick={() => ir(i)}>
                <span className="mapa-destino-num">{p.sigla}</span>
                <span className="mapa-destino-info"><strong>{p.corto}</strong><small>«{p.titulo}» · {p.recompensa}</small></span>
                <span className="mapa-estado">{estadoDe(p, i)}</span>
              </button>
            </li>
          ))}
        </ol>
        <section className="mapa-misiones" aria-labelledby="plano-caps-t">
          <div className="mapa-destinos-cab">
            <h3 id="plano-caps-t">Capítulos de {pSel.corto}</h3>
            <span>ENTRAR DIRECTO</span>
          </div>
          <ol className="mapa-lista">
            {pSel.capitulos.map((c, j) => (
              <li key={c.id}>
                <button type="button" className={`mapa-destino mapa-capitulo ${claseCap(c)}`} aria-current={c.aqui ? 'location' : undefined} disabled={!(c.abierto || c.aqui)}
                  onClick={() => entrar(sel, c)}>
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
