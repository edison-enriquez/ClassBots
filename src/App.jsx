import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NIVELES, MUNDOS } from './levels/niveles.js';
import { MISIONES, misionDisponible } from './levels/misiones.js';
import { evaluarNivel } from './levels/evaluar.js';
import { diagnosticar } from './editor/diagnostico.js';
import { obtenerProveedorIA } from './editor/ia.js';
import { useProgreso, codigoDe, codigoInicial, indiceDe } from './hooks/useProgreso.js';
import PixelStage from './game/PixelStage.jsx';
import CodeEditor from './components/CodeEditor.jsx';
import Leccion from './components/Leccion.jsx';
import PanelInferior from './components/PanelInferior.jsx';
import Avatar from './components/Avatar.jsx';
import Guia from './components/Guia.jsx';
import PestanasArchivos from './components/PestanasArchivos.jsx';
import Dialogo from './components/Dialogo.jsx';
import MapaMundo from './components/MapaMundo.jsx';

const MODOS = [['off', 'Apagado'], ['basico', 'Básico'], ['ia', 'IA ✦']];

export default function App() {
  const [prog, setProg] = useProgreso();
  const i = indiceDe(prog.nivelId);
  const [misionId, setMisionId] = useState(null);
  const nivelRuta = NIVELES[i];
  const nivel = MISIONES.find(m => m.id === misionId) || nivelRuta;
  const esMision = !!nivel.mision;
  const mundo = MUNDOS.find(m => m.id === nivel.mundo);
  const [verMundo, setVerMundo] = useState(nivel.mundo);
  const [guia, setGuia] = useState(null);
  const [mapa, setMapa] = useState(false);

  const [cod, setCod] = useState(() => codigoDe(prog, i));
  const [revision, setRevision] = useState(0);
  const [resultado, setResultado] = useState(null);
  const [enviado, setEnviado] = useState(false);
  const [token, setToken] = useState(0);
  const [caption, setCaption] = useState('');
  const [tab, setTab] = useState('pruebas');
  const [aviso, setAviso] = useState('');
  const [cursor, setCursor] = useState([1, 1]);
  const [iaDisp, setIaDisp] = useState(null);
  const [exito, setExito] = useState(null);
  const editor = useRef(null);
  const clicsMarca = useRef(0);
  const temporizadorMarca = useRef(null);

  // Guardar el código del nivel
  useEffect(() => { setProg(p => ({ ...p, codigo: { ...p.codigo, [nivel.id]: cod } })); }, [cod]); // eslint-disable-line react-hooks/exhaustive-deps

  // Diagnóstico en vivo, con un pequeño retraso mientras se escribe
  const [diferidos, setDiferidos] = useState(cod.files);
  useEffect(() => { const t = setTimeout(() => setDiferidos(cod.files), 300); return () => clearTimeout(t); }, [cod.files]);
  const diag = useMemo(() => diagnosticar(diferidos), [diferidos]);

  // Aviso temporal en la barra de estado
  const tAviso = useRef(null);
  const avisar = useCallback(m => { setAviso(m); clearTimeout(tAviso.current); if (m) tAviso.current = setTimeout(() => setAviso(''), 5000); }, []);
  const contarClicsMarca = () => {
    clicsMarca.current += 1;
    clearTimeout(temporizadorMarca.current);
    if (clicsMarca.current === 5) {
      clicsMarca.current = 0;
      setProg(p => ({ ...p, profe: !p.profe }));
      avisar(`Modo profesor ${prog.profe ? 'desactivado' : 'activado'}.`);
    } else {
      temporizadorMarca.current = setTimeout(() => { clicsMarca.current = 0; }, 1800);
    }
  };

  useEffect(() => {
    obtenerProveedorIA().then(p => {
      setIaDisp(!!p);
      if (!p) setProg(s => (s.asistente === 'ia' ? { ...s, asistente: 'basico' } : s));
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const hecho = k => prog.hechos.includes(NIVELES[k].id);
  const abierto = k => prog.profe || k === 0 || hecho(k - 1) || hecho(k);
  const misionAbierta = m => misionDisponible(m, prog.hechos, prog.profe);
  const misionCompleta = m => (prog.misionesHechas || []).includes(m.id);

  const irNivel = k => {
    if (!abierto(k)) return;
    setMisionId(null);
    setProg(p => ({ ...p, nivelId: NIVELES[k].id }));
    setVerMundo(NIVELES[k].mundo);
    setCod(codigoDe({ ...prog, codigo: { ...prog.codigo, [nivel.id]: cod } }, k));
    setResultado(null); setEnviado(false); setCaption(''); setExito(null); setTab('pruebas'); setToken(t => t + 1);
  };
  const iniciarMision = m => {
    if (!misionAbierta(m)) return;
    setMisionId(m.id);
    setVerMundo(m.mundo);
    const guardado = prog.codigo[m.id];
    const inicial = m.inicial();
    const files = Object.fromEntries(m.archivos.map(a => [a, guardado?.files?.[a] ?? inicial[a] ?? '']));
    setCod({ files, activo: m.archivos.includes(guardado?.activo) ? guardado.activo : m.archivoInicial || m.archivos[0] });
    setMapa(false); setResultado(null); setEnviado(false); setCaption(''); setExito(null); setTab('pruebas'); setToken(t => t + 1);
  };
  const volverARuta = () => {
    setMisionId(null);
    setVerMundo(nivelRuta.mundo);
    setCod(codigoDe({ ...prog, codigo: { ...prog.codigo, [nivel.id]: cod } }, i));
    setResultado(null); setEnviado(false); setCaption(''); setExito(null); setTab('pruebas'); setToken(t => t + 1);
  };

  const izq = useRef(null);
  const ejecutar = enviar => {
    const r = evaluarNivel(nivel, cod.files, { incluirOcultas: enviar });
    if (r.animacion && izq.current && izq.current.scrollTop > 120) izq.current.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    setResultado(r); setEnviado(enviar); setToken(t => t + 1); setExito(null);
    setTab('pruebas');
    if (enviar && r.todosOk) {
      const nuevo = esMision ? !misionCompleta(nivel) : !prog.hechos.includes(nivel.id);
      if (nuevo) setProg(p => esMision
        ? { ...p, misionesHechas: [...(p.misionesHechas || []), nivel.id] }
        : { ...p, hechos: [...p.hechos, nivel.id] });
      const espera = Math.min(6000, 400 + (r.animacion?.frames.length || 0) * 260);
      setTimeout(() => setExito({ nuevo, esMision }), espera);
    }
  };
  const ejecutarRef = useRef(ejecutar);
  ejecutarRef.current = ejecutar;

  const irA = (archivo, linea) => {
    if (archivo !== cod.activo && cod.files[archivo] != null) {
      setCod(c => ({ ...c, activo: archivo }));
      setTimeout(() => editor.current?.irALinea(linea), 30);
    } else editor.current?.irALinea(linea);
  };
  const corregir = (archivo, linea, fix) => {
    const hacer = () => { if (editor.current?.reemplazarLinea(linea, fix)) avisar('Corregido. Ctrl+Z lo deshace.'); };
    if (archivo !== cod.activo) { setCod(c => ({ ...c, activo: archivo })); setTimeout(hacer, 30); } else hacer();
  };
  const reemplazarTodo = files => { setCod({ files, activo: nivel.archivoInicial || nivel.archivos[0] }); setRevision(r => r + 1); setResultado(null); };

  const [confirmarReset, setConfirmarReset] = useState(false);
  const xp = prog.hechos.length * 100;
  const nv = prog.hechos.length + 1;
  const delMundo = NIVELES.filter(n => n.mundo === mundo.id);
  const pctMundo = Math.round(100 * delMundo.filter(n => prog.hechos.includes(n.id)).length / delMundo.length);
  const mundoAbierto = m => !!m.niveles && abierto(NIVELES.findIndex(n => n.mundo === m.id));
  const mundoCompleto = m => !!m.niveles && m.niveles.every(n => prog.hechos.includes(n.id));
  const viajar = m => {
    const ks = NIVELES.map((n, k) => k).filter(k => NIVELES[k].mundo === m.id);
    const k = ks.find(k => !hecho(k) && abierto(k)) ?? ks[0];
    setMapa(false);
    if (misionId || k !== i) irNivel(k); else setVerMundo(m.id);
  };
  const nErr = diag.lista.filter(p => p.sev === 'err').length, nWarn = diag.lista.length - nErr;
  const modo = prog.asistente || 'basico';

  return (
    <div className="app">
      <header className="top">
        <div className="marca">
          <Avatar tamano={2} color="naranja" titulo="Logo de ClassBots" />
          <div>
            <h1 onClick={contarClicsMarca}>ClassBots</h1>
            <p>{esMision ? `Misión especial · Mundo ${mundo.id}: ${mundo.nombre}` : `POO en Java · Mundo ${mundo.id}: ${mundo.nombre}`}</p>
          </div>
        </div>
        <nav className="mapa" aria-label="Mundos y capítulos">
          <div className="mundos" role="tablist" aria-label="Mundos">
            {MUNDOS.map(m => {
              const listo = !!m.niveles, completo = listo && m.niveles.every(n => prog.hechos.includes(n.id));
              return (
                <button key={m.id} type="button" role="tab" className={'mundo-chip' + (completo ? ' completo' : '')} aria-selected={verMundo === m.id} disabled={!listo}
                  title={listo ? `Mundo ${m.id}: ${m.nombre} · ${m.tema}` : `Mundo ${m.id}: ${m.nombre} · ${m.tema} (próximamente)`} onClick={() => setVerMundo(m.id)}>
                  {listo ? m.id : '🔒'}
                </button>
              );
            })}
          </div>
          <div className="mapa-mundo">
            <span className="mapa-nombre">{MUNDOS.find(m => m.id === verMundo)?.nombre}</span>
            <ol>
              {NIVELES.map((n, k) => n.mundo !== verMundo ? null : (
                <li key={n.id} className={hecho(k) ? 'hecho' : ''}>
                  <button type="button" className={'nodo' + (n.jefe ? ' jefe' : '')} aria-current={k === i ? 'step' : undefined} disabled={!abierto(k)} onClick={() => irNivel(k)} title={abierto(k) ? `${n.mundo}.${n.enMundo + 1} ${n.titulo} · ${n.concepto}` : 'Supera el capítulo anterior para abrirlo'}>
                    {n.jefe ? '★' : n.enMundo + 1}
                  </button>
                </li>
              ))}
            </ol>
            {esMision && <button type="button" className="btn-sec volver-ruta" onClick={volverARuta}>← Volver a la ruta principal</button>}
          </div>
        </nav>
        <div className="hud">
          <button type="button" className="btn-sec mapa-btn" onClick={() => setMapa(true)}>Mapa</button>
          <button type="button" className="btn-sec guia-btn" onClick={() => setGuia('relaciones')}>Guía</button>
          {(prog.misionesHechas || []).includes('mision-strategy') && <span className="modulo-badge" title="Habilidad obtenida en una misión especial">✦ Módulo táctico</span>}
          <div className="stats rpg-ventana" title={`${xp} EXP en total · ${pctMundo}% del mundo ${mundo.id}`}>
            <span className="nv">NV {nv}</span>
            <span className="exp"><small>EXP</small><span className="exp-barra" role="progressbar" aria-label={`Progreso del mundo ${mundo.id}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pctMundo}><i style={{ width: pctMundo + '%' }} /></span><span className="xp">{xp}</span></span>
          </div>
        </div>
      </header>

      <main className="cols">
        <aside className="izq" ref={izq}>
          <div className="monitor">
            <div className="monitor-bisel">
              <PixelStage nivel={nivel} modelo={diag.modelo} animacion={resultado?.animacion} token={token} onCaption={setCaption} />
              {exito && <div className="sello">¡Capítulo superado!</div>}
            </div>
            <Dialogo caption={caption} reposo={resultado?.animacion ? 'Fin de la escena. Revisa los casos de prueba.' : 'Escribe tu código y pulsa Ejecutar para ver la escena.'} />
          </div>
          <Leccion nivel={nivel} mundo={mundo} superado={prog.hechos.includes(nivel.id)} onSolucion={() => reemplazarTodo({ ...nivel.solucion })} onGuia={setGuia} />
        </aside>

        <section className="der">
          <div className="ed-bar">
            <PestanasArchivos archivos={nivel.archivos} activo={cod.activo} onElegir={a => setCod(c => ({ ...c, activo: a }))}
              marcas={a => { const m = diag.porArchivo[a]; return m && [...m.values()].some(x => x.sev === 'err') ? 'err' : m?.size ? 'warn' : ''; }} />
            <div className="seg" role="radiogroup" aria-label="Asistente de código">
              <span className="seg-lbl">Asistente</span>
              {MODOS.map(([id, txt]) => (
                <button key={id} type="button" role="radio" aria-checked={modo === id} disabled={id === 'ia' && iaDisp === false}
                  title={id === 'ia' && iaDisp === false ? 'La IA no está configurada en este despliegue' : undefined}
                  onClick={() => { setProg(p => ({ ...p, asistente: id })); avisar(id === 'off' ? 'Asistente apagado: solo detección de errores. Ctrl+Espacio sigue mostrando sugerencias.' : id === 'basico' ? 'Asistente básico: sugerencias del taller mientras escribes.' : 'Asistente con IA: Alt+\\ o el botón piden una sugerencia.'); }}>
                  {txt}
                </button>
              ))}
            </div>
            {!confirmarReset
              ? <button type="button" className="btn-mini" onClick={() => setConfirmarReset(true)}>Reiniciar</button>
              : <span className="confirmar">¿Borrar tu código de este capítulo? <button type="button" className="btn-mini peligro" onClick={() => { setConfirmarReset(false); reemplazarTodo(codigoInicial(prog, i)); }}>Sí, reiniciar</button><button type="button" className="btn-mini" onClick={() => setConfirmarReset(false)}>No</button></span>}
          </div>

          <div className="ed">
            <CodeEditor
              ref={editor} nivel={nivel} archivos={cod.files} activo={cod.activo} revision={revision} modo={modo}
              onCambio={(a, txt) => setCod(c => (c.files[a] === txt ? c : { ...c, files: { ...c.files, [a]: txt } }))}
              onCursor={(l, c) => setCursor([l, c])} onAviso={avisar} onEjecutar={() => ejecutarRef.current(false)}
              onIaNoDisponible={() => { setIaDisp(false); setProg(p => ({ ...p, asistente: 'basico' })); }}
            />
          </div>

          <div className="estado-ed">
            <span className="pos">Ln {cursor[0]}, Col {cursor[1]}</span>
            <button type="button" className="probs" onClick={() => setTab('problemas')} aria-label={`${nErr} errores y ${nWarn} advertencias`}>
              <span className={nErr ? 'on-err' : ''}>● {nErr}</span><span className={nWarn ? 'on-warn' : ''}>▲ {nWarn}</span>
            </button>
            <span className="aviso" role="status">{aviso}</span>
            {modo === 'ia' && <button type="button" className="btn-mini ia" onMouseDown={e => e.preventDefault()} onClick={() => editor.current?.pedirIA()}>✦ Sugerir <kbd>Alt+\</kbd></button>}
          </div>

          <PanelInferior nivel={nivel} objetivo={nivel.objetivoUML} resultado={resultado} enviado={enviado} problemas={diag.lista} modelo={diag.modelo} tab={tab} setTab={setTab} onIrA={irA} onCorregir={corregir} />

          <div className="barra-juez">
            <span className="atajos">Tab acepta la sugerencia gris · Ctrl+Espacio sugiere · Ctrl+. corrige · Ctrl+Enter ejecuta</span>
            <button type="button" className="btn-sec" onClick={() => ejecutar(false)}>▶ Ejecutar código</button>
            <button type="button" className="btn-pri" onClick={() => ejecutar(true)}>Enviar</button>
          </div>
        </section>
      </main>

      {mapa && <MapaMundo mundos={MUNDOS} actual={mundo.id} abierto={mundoAbierto} completo={mundoCompleto}
        misiones={MISIONES} misionAbierta={misionAbierta} misionCompleta={misionCompleta}
        onIniciarMision={m => (m.id === misionId ? setMapa(false) : iniciarMision(m))} onViajar={viajar} onCerrar={() => setMapa(false)}
        misionActual={misionId} capitulos={m => (m.niveles ? { hechos: m.niveles.filter(n => prog.hechos.includes(n.id)).length, total: m.niveles.length } : null)} />}

      {guia && <Guia tema={guia} onTema={setGuia} onCerrar={() => setGuia(null)} />}

      {exito && (
        <div className="modal-fondo" role="dialog" aria-modal="true" aria-labelledby="exito-t">
          <div className="modal rpg-ventana exito">
            <p className="mision">¡MISIÓN CUMPLIDA!</p>
            <Avatar tamano={4} />
            <h2 id="exito-t">{exito.esMision ? '¡Misión especial completada!' : nivel.jefe ? `¡Mundo ${mundo.id} completado!` : `Capítulo ${nivel.mundo}.${nivel.enMundo + 1} superado`}</h2>
            <p>{nivel.exito}</p>
            {exito.esMision && exito.nuevo
              ? <p className="xp-gana">✦ Módulo desbloqueado: {nivel.recompensa}</p>
              : exito.nuevo && <p className="xp-gana">+100 EXP · ¡Subiste a NV {nv}!</p>}
            <div className="modal-acc">
              <button type="button" className="btn-sec" onClick={() => setExito(null)}>Seguir aquí</button>
              {!exito.esMision && i + 1 < NIVELES.length
                ? <button type="button" className="btn-pri" autoFocus onClick={() => irNivel(i + 1)}>Siguiente: {NIVELES[i + 1].titulo} →</button>
                : <button type="button" className="btn-pri" autoFocus onClick={() => setExito(null)}>Seguir explorando</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
