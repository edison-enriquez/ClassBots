import { useEffect, useMemo, useRef, useState } from 'react';
import { W, H, pisoBase, banco, caja, rect, dibujarCinta, dibujarMaquina, largo, puntoEn, direccion, dibujarRuta, anillo, reducido, dibujarRobotPlano } from './mapaDibujo.js';
import { sombra } from '../game/rpg.js';
import PlanoPatrones from './PlanoPatrones.jsx';

const LUGARES = [
  { x: 72, y: 318, zona: 'PLANOS', techo: '#d89648', forma: 'mesa' },
  { x: 154, y: 250, zona: 'BÓVEDA', techo: '#8f9bb5', forma: 'boveda' },
  { x: 238, y: 306, zona: 'CONEXIONES', techo: '#ce7654', forma: 'taller' },
  { x: 282, y: 205, zona: 'CONTRATOS', techo: '#6fa8d8', forma: 'estacion' },
  { x: 390, y: 246, zona: 'ÁRBOL', techo: '#83bd68', forma: 'arbol' },
  { x: 462, y: 146, zona: 'ARENA', techo: '#d97869', forma: 'arena' },
  { x: 540, y: 318, zona: 'AVERÍAS', techo: '#e0606e', forma: 'averias' },
  { x: 548, y: 229, zona: 'FORJA', techo: '#d7a85f', forma: 'fabrica' },
];
/* Ramales de misión: cada uno sale del sector cuyo concepto refuerza */
const RAMALES = {
  'mision-object': { x: 205, y: 160, etiqueta: 'arriba' },
  'expedicion-central': { x: 326, y: 286, etiqueta: 'abajo' },
  'mision-kotlin': { x: 594, y: 180, etiqueta: 'arriba' },
};
const PUNTO_OTRO = { x: 330, y: 150, etiqueta: 'arriba' };
const puntoRamal = id => RAMALES[id] || PUNTO_OTRO;
const TRAYECTO = LUGARES.slice(0, -1).map((l, i) => [l, LUGARES[i + 1]]);

function dibujarPiso(ctx) {
  pisoBase(ctx, 'CLASSBOTS // COMPLEJO DE ENSAMBLAJE');
  // Bancos de montaje secundarios y siluetas de maquinaria.
  for (const [x, y, w, h] of [[42, 76, 110, 40], [190, 74, 110, 38], [40, 174, 54, 82]]) banco(ctx, x, y, w, h);
  for (const [x, y] of [[28, 128], [610, 266], [606, 68], [324, 370], [414, 80]]) caja(ctx, x, y);
}

/* Expedición oculta: una grieta violeta en el piso, no una estación */
function dibujarExpedicion(ctx, mision, disponible, completada, ahora) {
  const { x, y, etiqueta } = puntoRamal(mision.id), base = completada ? '#7ed6a0' : '#c9a7ff';
  const brillo = disponible && ahora % 900 < 450;
  sombra(ctx, x, y + 7, 40);
  rect(ctx, '#140d24', x - 20, y - 14, 40, 26);
  rect(ctx, brillo ? '#3a2763' : '#2a1d47', x - 17, y - 11, 34, 20);
  // la grieta: un zigzag de bloques
  for (const [dx, dy, w] of [[-12, -8, 6], [-8, -4, 6], [-4, -1, 6], [0, 2, 6], [4, 5, 6], [-2, 5, 4], [6, -6, 4]]) rect(ctx, brillo ? '#efe2ff' : base, x + dx, y + dy, w, 3);
  const txt = `EXPEDICIÓN ✦ ${mision.corto.toUpperCase()}`;
  ctx.font = 'bold 9px monospace';
  const w = Math.ceil(ctx.measureText(txt).width) + 14, ty = etiqueta === 'abajo' ? y + 16 : y - 42;
  rect(ctx, '#140d24', x - w / 2, ty, w, 17);
  rect(ctx, '#3a2763', x - w / 2 + 2, ty + 2, w - 4, 13);
  ctx.fillStyle = base;
  ctx.textAlign = 'center';
  ctx.fillText(txt, x, ty + 12);
  ctx.textAlign = 'start';
}

function dibujarMision(ctx, mision, disponible, completada, ahora) {
  if (mision.expedicion) return dibujarExpedicion(ctx, mision, disponible, completada, ahora);
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
  const txt = `MISIÓN ✦ ${(mision.rotulo || mision.corto).toUpperCase()}`;
  ctx.font = 'bold 9px monospace';
  const w = Math.ceil(ctx.measureText(txt).width) + 14, ty = etiqueta === 'abajo' ? y + 18 : y - 44;
  // El rótulo se corre hacia adentro si el ramal está pegado al borde del plano
  const lx = Math.max(w / 2 + 26, Math.min(W - w / 2 - 26, x));
  rect(ctx, '#101a25', lx - w / 2, ty, w, 17);
  rect(ctx, disponible || completada ? '#4a3a17' : '#2b3644', lx - w / 2 + 2, ty + 2, w - 4, 13);
  ctx.fillStyle = base;
  ctx.textAlign = 'center';
  ctx.fillText(txt, lx, ty + 12);
  ctx.textAlign = 'start';
}

/* Rutas del plano: la línea principal 1→8 y los ramales de misión que cuelgan de su sector */
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

export default function MapaMundo({
  mundos, actual, abierto, completo, onViajar, onCerrar, capitulos = () => null,
  misiones = [], misionAbierta = () => false, misionCompleta = () => false, onIniciarMision = () => {}, misionActual = null, pasosDe = () => null, patrones = () => null,
  // Segunda página: el plano del sector de patrones ({ mundo, patrones }) y cómo se entra a un capítulo
  plano = null, paginaInicial = null, onIrCapitulo = () => {},
}) {
  const ref = useRef(null);
  const sprite = useRef({});
  const finalizados = mundos.filter(completo).length;
  const accesibles = mundos.filter(abierto).length;
  const progreso = Math.round((finalizados / mundos.length) * 100);
  const dominados = plano ? plano.patrones.filter(p => p.dominado).length : 0;
  const mision = misiones[0];
  const enMision = !!misionActual;
  const origen = enMision ? misionActual : actual - 1;
  const anclaDe = id => (misiones.find(m => m.id === id)?.mundo ?? 4) - 1;
  // Página 1: el complejo completo. Página 2: el sector de patrones, donde se elige el capítulo.
  const [pagina, setPagina] = useState(() => paginaInicial || (plano && !enMision && actual === plano.mundo.id ? 2 : 1));
  const esPlano = d => !!plano && d.tipo === 'mundo' && d.id === plano.mundo.id;

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
    // El sector de patrones no lleva a un capítulo: abre su propio plano (también para verlo cuando está bloqueado)
    if (esPlano(d) && (esAqui(d) || !puedeIr(d))) { setSel(d); setPagina(2); return; }
    if (esAqui(d)) { onCerrar(); return; }
    if (!puedeIr(d)) { setSel(d); return; }
    const fin = () => (esPlano(d) ? (setViaje(null), setPagina(2)) : d.tipo === 'mision' ? onIniciarMision(misiones.find(m => m.id === d.id)) : onViajar(mundos.find(m => m.id === d.id)));
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
      dibujarRobotPlano(ctx, sprite.current, pos, { dir, paso, enViaje: !!e.viaje, ahora });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [pagina]);

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
        num: '✦', titulo: m.titulo, sub: m.expedicion ? `Expedición de diseño libre${m.oculta ? ' · oculta, solo la ves en modo profesor' : ''} · ${m.concepto}` : `Misión opcional${m.oculta ? ' · oculta, solo la ves en modo profesor' : ''} · ${m.concepto}`,
        lineas: [['Sale de', `Sector ${String(m.mundo).padStart(2, '0')} · ${mundos[m.mundo - 1].nombre}`], ['Pasos', pasosDe(m) ? `${pasosDe(m).hechos} de ${pasosDe(m).total} superados` : `${m.pasos?.length || 1}`], ['Requisito', m.requisito || `Completar el Mundo ${m.mundo}`], ['Recompensa', m.recompensa]],
        estado: aqui ? 'Estás aquí' : hecho ? 'Módulo obtenido' : ok ? 'Disponible' : 'Bloqueada',
        boton: aqui ? (m.expedicion ? 'Seguir en la expedición' : 'Seguir en la misión') : ok ? (hecho ? (m.expedicion ? 'Repetir expedición ✦' : 'Repetir misión ✦') : pasosDe(m)?.hechos ? (m.expedicion ? 'Continuar expedición ✦' : 'Continuar misión ✦') : (m.expedicion ? 'Entrar a la grieta ✦' : 'Iniciar misión ✦')) : (m.requisitoCorto || `Completa el Mundo ${m.mundo}`),
        ok: ok || aqui, mision: true,
      };
    }
    const m = mundos.find(x => x.id === sel.id);
    const ok = abierto(m), hecho = completo(m), aqui = !enMision && m.id === actual, cap = capitulos(m);
    return {
      num: String(m.id).padStart(2, '0'), titulo: m.nombre, sub: m.tema,
      lineas: [cap ? ['Capítulos', `${cap.hechos} de ${cap.total} superados`] : ['Capítulos', 'En diseño'], ...(patrones(m) ? [['Patrones', `${patrones(m).hechos} de ${patrones(m).total} dominados`]] : []), ['Estado', hecho ? 'Operativo' : ok ? 'Abierto' : m.niveles ? 'Bloqueado' : 'Próximamente']],
      estado: aqui ? 'Estás aquí' : hecho ? 'Operativo' : ok ? 'Disponible' : m.niveles ? 'Bloqueado' : 'En diseño',
      boton: esPlano(sel) ? 'Ver el plano del sector →' : aqui ? 'Seguir aquí' : enMision && m.id === actual ? 'Volver a la ruta' : ok ? 'Viajar aquí →' : m.niveles ? 'Completa el sector anterior' : 'Próximamente',
      ok: ok || aqui || esPlano(sel),
    };
  }, [sel, mundos, misiones, mision, abierto, completo, misionAbierta, misionCompleta, misionActual, actual, enMision, capitulos, patrones, plano]);

  const elegido = d => sel.tipo === d.tipo && sel.id === d.id;

  return (
    <div className="modal-fondo" role="dialog" aria-modal="true" aria-labelledby="mapa-t" onClick={e => { if (e.target === e.currentTarget) onCerrar(); }}>
      <div className={'modal rpg-ventana mapa-modal' + (viaje ? ' viajando' : '')}>
        <div className="mapa-cab">
          <div className="mapa-titulos">
            <p className="mapa-kicker">{pagina === 2 ? `CLASSBOTS // SECTOR ${String(plano.mundo.id).padStart(2, '0')}` : 'CLASSBOTS // PLANO DE PLANTA'}</p>
            <h2 id="mapa-t">{pagina === 2 ? `${plano.mundo.nombre}: ${plano.mundo.tema}` : 'Complejo de fabricación'}</h2>
          </div>
          {plano && (
            <div className="mapa-paginas" role="tablist" aria-label="Páginas del plano">
              <button type="button" role="tab" aria-selected={pagina === 1} disabled={!!viaje} onClick={() => setPagina(1)}>1 · Complejo</button>
              <button type="button" role="tab" aria-selected={pagina === 2} disabled={!!viaje} onClick={() => setPagina(2)}>2 · {plano.mundo.nombre}</button>
            </div>
          )}
          {pagina === 2 ? (
            <div className="mapa-resumen" role="group" aria-label={`${dominados} de ${plano.patrones.length} patrones dominados`}>
              <strong>{String(dominados).padStart(2, '0')}<small>/{plano.patrones.length}</small></strong>
              <div className="mapa-resumen-datos">
                <span>PATRONES DOMINADOS</span>
                <div className="mapa-progreso" role="progressbar" aria-label="Patrones dominados" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((dominados / plano.patrones.length) * 100)}>
                  <i style={{ width: `${(dominados / plano.patrones.length) * 100}%` }} />
                </div>
              </div>
            </div>
          ) : (
            <div className="mapa-resumen" role="group" aria-label={`${finalizados} de ${mundos.length} mundos completados`}>
              <strong>{String(finalizados).padStart(2, '0')}<small>/{mundos.length}</small></strong>
              <div className="mapa-resumen-datos">
                <span>SECTORES OPERATIVOS</span>
                <div className="mapa-progreso" role="progressbar" aria-label="Progreso de la fábrica" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progreso}>
                  <i style={{ width: `${progreso}%` }} />
                </div>
              </div>
            </div>
          )}
          <button type="button" className="mapa-cerrar" onClick={onCerrar} autoFocus aria-label="Cerrar plano">×</button>
        </div>
        {pagina === 2 ? <PlanoPatrones mundo={plano.mundo} patrones={plano.patrones} onIr={onIrCapitulo} onCerrar={onCerrar} /> : (
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
                return <button key={m.id} type="button" className={`mapa-punto mapa-punto-mision${m.expedicion ? ' mapa-punto-expedicion' : ''}${terminado ? ' completo' : ''}${!ok ? ' cerrado' : ''}${esAqui(d) ? ' aqui' : ''}${elegido(d) ? ' elegido' : ''}`}
                  style={{ left: `${(puntoRamal(m.id).x / W) * 100}%`, top: `${(puntoRamal(m.id).y / H) * 100}%` }} aria-pressed={elegido(d)}
                  title={`${m.expedicion ? 'Expedición' : 'Misión especial'}: ${m.titulo}`}
                  aria-label={`${m.expedicion ? 'Expedición' : `Misión especial ${i + 1}`}: ${m.titulo}, ${m.concepto}${esAqui(d) ? ', estás aquí' : terminado ? ', completada' : ok ? ', disponible' : ', completa el Mundo ' + m.mundo + ' para desbloquearla'}`}
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
                    <button type="button" className={`mapa-destino mapa-destino-mision${m.expedicion ? ' mapa-destino-expedicion' : ''}${aqui ? ' actual' : ''}${terminado ? ' completo' : ''}${!ok ? ' bloqueado' : ''}${elegido(d) ? ' elegido' : ''}`}
                      aria-pressed={elegido(d)} aria-current={aqui ? 'location' : undefined} onClick={() => tocar(d)} onDoubleClick={() => ir(d)}>
                      <span className="mapa-destino-num">✦</span>
                      <span className="mapa-destino-info"><strong>{m.titulo}</strong><small>{m.expedicion ? `Expedición${m.oculta ? ' · solo profesor' : ''} · ` : (m.oculta ? 'Solo profesor · ' : '')}{m.concepto} · {m.recompensa}</small></span>
                      <span className="mapa-estado">{etiqueta}</span>
                    </button>
                  </li>;
                })}
              </ol>
            </section>}
          </section>
        </div>
        )}
      </div>
    </div>
  );
}
