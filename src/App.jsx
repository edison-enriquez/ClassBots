import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NIVELES, MUNDOS } from './levels/niveles.js';
import { MISIONES, PASOS, misionDisponible, misionCompletada, pasoAbierto } from './levels/misiones.js';
import { evaluarNivel } from './levels/evaluar.js';
import { diagnosticar } from './editor/diagnostico.js';
import { obtenerProveedorIA } from './editor/ia.js';
import { useProgreso, codigoDe, codigoInicial, codigoPaso, codigoInicialPaso, indiceDe } from './hooks/useProgreso.js';
import { ponerEquipo } from './game/dibujo.js';
import PixelStage from './game/PixelStage.jsx';
import CodeEditor from './components/CodeEditor.jsx';
import Leccion from './components/Leccion.jsx';
import PanelInferior from './components/PanelInferior.jsx';
import Avatar from './components/Avatar.jsx';
import Guia from './components/Guia.jsx';
import PestanasArchivos from './components/PestanasArchivos.jsx';
import Dialogo from './components/Dialogo.jsx';
import MapaMundo from './components/MapaMundo.jsx';
import { Bienvenida, MiAvance } from './components/Avance.jsx';
import PanelProfesor from './components/PanelProfesor.jsx';
import MenuUsuario from './components/MenuUsuario.jsx';
import { registrarApertura, registrarResultado, registrarPista, registrarSolucion, registrarIA, registrarTiempo, registrarSesion, registrarEscritura, registrarSalida, registrarRegreso, registrarSenales, analizarEstilo, exportar, descargar, nombreArchivo } from './metricas/metricas.js';
import { useSellado } from './metricas/sellado.js';

const MODOS = [['off', 'Apagado'], ['basico', 'Básico'], ['ia', 'IA ✦']];

export default function App() {
  const [prog, setProg] = useProgreso();
  const i = indiceDe(prog.nivelId);
  const [pasoId, setPasoId] = useState(null);
  const nivelRuta = NIVELES[i];
  const nivel = PASOS.find(p => p.id === pasoId) || nivelRuta;
  const esMision = !!nivel.mision;
  const misionId = esMision ? nivel.misionId : null;
  const misionDeNivel = esMision ? MISIONES.find(m => m.id === misionId) : null;
  const mundo = MUNDOS.find(m => m.id === nivel.mundo);
  const [verMundo, setVerMundo] = useState(nivel.mundo);
  const [guia, setGuia] = useState(null);
  const [mapa, setMapa] = useState(false);
  const [avance, setAvance] = useState(false);
  const [panelProfe, setPanelProfe] = useState(false);

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

  // Métricas de aprendizaje: se guardan con el progreso y viajan en el archivo de avance
  const medir = useCallback(f => setProg(p => ({ ...p, metricas: f(p.metricas) })), [setProg]);
  useEffect(() => { medir(registrarSesion); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (prog.perfil) medir(m => registrarApertura(m, nivel.id)); }, [nivel.id, !!prog.perfil]); // eslint-disable-line react-hooks/exhaustive-deps
  // Tiempo activo: cuenta en bloques de 15 s si la pestaña está visible y hubo actividad en los últimos 2 minutos
  const actividad = useRef(Date.now());
  const nivelActual = useRef(nivel.id);
  nivelActual.current = nivel.id;
  useEffect(() => {
    const marcar = () => { actividad.current = Date.now(); };
    const evs = ['keydown', 'pointerdown', 'pointermove', 'wheel'];
    evs.forEach(ev => window.addEventListener(ev, marcar, { passive: true }));
    const t = setInterval(() => {
      if (document.visibilityState === 'visible' && Date.now() - actividad.current < 120000) medir(m => registrarTiempo(m, nivelActual.current, 15000));
    }, 15000);
    return () => { clearInterval(t); evs.forEach(ev => window.removeEventListener(ev, marcar)); };
  }, [medir]);

  // Las métricas se sellan cifradas con la llave pública del profesor: el estudiante no las puede leer
  const sellar = useSellado(prog);

  // Escritura: lo tecleado se acumula y se registra por lotes; pegados e IA, al instante
  const pendiente = useRef({ id: null, teclas: 0, tecleados: 0, borrados: 0 });
  const volvio = useRef(0), salio = useRef(null);
  const volcarEscritura = useCallback(() => {
    const p = pendiente.current;
    if (!p.id || (!p.teclas && !p.borrados)) return;
    const { id, teclas, tecleados, borrados } = p;
    pendiente.current = { id, teclas: 0, tecleados: 0, borrados: 0 };
    medir(m => registrarEscritura(registrarEscritura(m, id, { tipo: 'teclado', teclas, n: tecleados }), id, { tipo: 'borrar', n: borrados }));
  }, [medir]);
  const alEscribir = ev => {
    const id = nivelActual.current;
    if (pendiente.current.id !== id) { volcarEscritura(); pendiente.current = { id, teclas: 0, tecleados: 0, borrados: 0 }; }
    if (ev.tipo === 'teclado') { pendiente.current.teclas += 1; pendiente.current.tecleados += ev.n; return; }
    if (ev.tipo === 'borrar') { pendiente.current.borrados += ev.n; return; }
    medir(m => registrarEscritura(m, id, { ...ev, trasSalir: ev.tipo === 'pegado' && ev.externo && Date.now() - volvio.current < 20000 }));
  };
  useEffect(() => {
    const t = setInterval(volcarEscritura, 5000);
    // Salidas de la ventana: a otra pestaña o aplicación (por ejemplo, un chat de IA)
    const fuera = () => { if (salio.current == null) { salio.current = Date.now(); medir(registrarSalida); } };
    const dentro = () => { if (salio.current != null) { const ms = Date.now() - salio.current; salio.current = null; volvio.current = Date.now(); medir(m => registrarRegreso(m, ms)); } };
    const vis = () => (document.visibilityState === 'hidden' ? fuera() : dentro());
    window.addEventListener('blur', fuera); window.addEventListener('focus', dentro); document.addEventListener('visibilitychange', vis);
    return () => { clearInterval(t); window.removeEventListener('blur', fuera); window.removeEventListener('focus', dentro); document.removeEventListener('visibilitychange', vis); };
  }, [volcarEscritura, medir]);

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
  const pasosHechos = prog.pasosHechos || [];
  const misionAbierta = m => misionDisponible(m, prog.hechos, prog.profe);
  const misionCompleta = m => misionCompletada(m, pasosHechos, prog.misionesHechas || []);
  const completadas = MISIONES.filter(misionCompleta);
  // Las recompensas de las misiones se ven en los robots de todas las escenas
  useEffect(() => { ponerEquipo(completadas.map(m => m.equipo)); }, [completadas.map(m => m.id).join()]); // eslint-disable-line react-hooks/exhaustive-deps

  const irNivel = k => {
    if (!abierto(k)) return;
    setPasoId(null);
    setProg(p => ({ ...p, nivelId: NIVELES[k].id }));
    setVerMundo(NIVELES[k].mundo);
    setCod(codigoDe({ ...prog, codigo: { ...prog.codigo, [nivel.id]: cod } }, k));
    setResultado(null); setEnviado(false); setCaption(''); setExito(null); setTab('pruebas'); setToken(t => t + 1);
  };
  const irPaso = paso => {
    const m = MISIONES.find(x => x.id === paso.misionId);
    if (!misionAbierta(m) || !pasoAbierto(paso, pasosHechos, prog.profe)) return;
    setPasoId(paso.id);
    setVerMundo(paso.mundo);
    setCod(codigoPaso({ ...prog, codigo: { ...prog.codigo, [nivel.id]: cod } }, paso));
    setMapa(false); setResultado(null); setEnviado(false); setCaption(''); setExito(null); setTab('pruebas'); setToken(t => t + 1);
  };
  const iniciarMision = m => {
    if (!misionAbierta(m)) return;
    const pasos = PASOS.filter(p => p.misionId === m.id);
    irPaso(pasos.find(p => !pasosHechos.includes(p.id) && pasoAbierto(p, pasosHechos, prog.profe)) || pasos[0]);
  };
  const volverARuta = () => {
    setPasoId(null);
    setVerMundo(nivelRuta.mundo);
    setCod(codigoDe({ ...prog, codigo: { ...prog.codigo, [nivel.id]: cod } }, i));
    setResultado(null); setEnviado(false); setCaption(''); setExito(null); setTab('pruebas'); setToken(t => t + 1);
  };

  const izq = useRef(null);
  const ejecutar = enviar => {
    const r = evaluarNivel(nivel, cod.files, { incluirOcultas: enviar });
    volcarEscritura();
    medir(m => registrarResultado(m, nivel.id, r, enviar));
    if (enviar) {
      const senales = analizarEstilo(cod.files, esMision ? codigoInicialPaso(prog, nivel) : codigoInicial(prog, i));
      if (senales.length) medir(m => registrarSenales(m, nivel.id, senales));
    }
    if (r.animacion && izq.current && izq.current.scrollTop > 120) izq.current.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    setResultado(r); setEnviado(enviar); setToken(t => t + 1); setExito(null);
    setTab('pruebas');
    if (enviar && r.todosOk) {
      const nuevo = esMision ? !pasosHechos.includes(nivel.id) : !prog.hechos.includes(nivel.id);
      const cierra = esMision && nivel.ultimo && !(prog.misionesHechas || []).includes(misionId);
      if (nuevo || cierra) setProg(p => esMision
        ? { ...p, pasosHechos: [...new Set([...(p.pasosHechos || []), nivel.id])], misionesHechas: cierra ? [...(p.misionesHechas || []), misionId] : (p.misionesHechas || []) }
        : { ...p, hechos: [...p.hechos, nivel.id] });
      const espera = Math.min(6000, 400 + (r.animacion?.frames.length || 0) * 260);
      setTimeout(() => setExito({ nuevo, esMision, ultimo: !!nivel.ultimo, recompensa: cierra }), espera);
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
    if (esMision || k !== i) irNivel(k); else setVerMundo(m.id);
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
            <p>{esMision ? `Misión especial · ${misionDeNivel.corto} · ramal del Mundo ${mundo.id}` : `POO en Java · Mundo ${mundo.id}: ${mundo.nombre}`}</p>
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
          {esMision ? (
            <div className="mapa-mundo mision-ruta">
              <span className="mapa-nombre">✦ {misionDeNivel.titulo}</span>
              <ol>
                {misionDeNivel.pasos.map((p0, k) => {
                  const p = PASOS.find(x => x.id === p0.id), ok = pasoAbierto(p, pasosHechos, prog.profe);
                  return (
                    <li key={p.id} className={pasosHechos.includes(p.id) ? 'hecho' : ''}>
                      <button type="button" className={'nodo nodo-mision' + (p.jefe ? ' jefe' : '')} aria-current={p.id === nivel.id ? 'step' : undefined} disabled={!ok} onClick={() => irPaso(p)}
                        title={ok ? `Paso ${k + 1}: ${p.titulo} · ${p.concepto}` : 'Supera el paso anterior para abrirlo'}>{p.jefe ? '★' : k + 1}</button>
                    </li>
                  );
                })}
              </ol>
              <button type="button" className="btn-sec volver-ruta" onClick={volverARuta}>← Volver a la ruta principal</button>
            </div>
          ) : (
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
          </div>
          )}
        </nav>
        <div className="hud">
          <button type="button" className="btn-sec herramienta mapa-btn" onClick={() => setMapa(true)} title="Mapa del mundo y misiones">Mapa</button>
          <button type="button" className="btn-sec herramienta guia-btn" onClick={() => setGuia('relaciones')} title="Guía: relaciones, interfaces y Códice de patrones">Guía</button>
          <MenuUsuario perfil={prog.perfil} nv={nv} xp={xp} pct={pctMundo} mundo={mundo.id} profe={!!prog.profe} recompensas={completadas}
            onAvance={() => setAvance(true)} onCodice={() => setGuia('patrones')} onPanel={() => setPanelProfe(true)}
            onDescargar={async () => { const sobre = await sellar(); descargar(nombreArchivo(prog.perfil), JSON.stringify(exportar(prog, [...(prog.segmentos || []), sobre]), null, 2)); }}
            onSalirProfe={() => { setProg(p => ({ ...p, profe: false })); avisar('Modo profesor desactivado.'); }} />
        </div>
      </header>

      <main className="cols">
        <aside className="izq" ref={izq}>
          <div className="monitor">
            <div className="monitor-bisel">
              <PixelStage nivel={nivel} modelo={diag.modelo} animacion={resultado?.animacion} token={token} onCaption={setCaption} />
              {exito && <div className="sello">{esMision ? '¡Paso superado!' : '¡Capítulo superado!'}</div>}
            </div>
            <Dialogo caption={caption} reposo={resultado?.animacion ? 'Fin de la escena. Revisa los casos de prueba.' : `${prog.perfil ? `¡Hola, ${prog.perfil.nombre.split(' ')[0]}! ` : ''}Escribe tu código y pulsa Ejecutar para ver la escena.`} />
          </div>
          <Leccion nivel={nivel} mundo={mundo} superado={esMision ? pasosHechos.includes(nivel.id) : prog.hechos.includes(nivel.id)} onSolucion={() => { if (prog.profe) { reemplazarTodo({ ...nivel.solucion }); medir(m => registrarSolucion(m, nivel.id)); } }} onGuia={setGuia} profe={!!prog.profe} onPista={() => medir(m => registrarPista(m, nivel.id))} />
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
              : <span className="confirmar">¿Borrar tu código de este capítulo? <button type="button" className="btn-mini peligro" onClick={() => { setConfirmarReset(false); reemplazarTodo(esMision ? codigoInicialPaso(prog, nivel) : codigoInicial(prog, i)); }}>Sí, reiniciar</button><button type="button" className="btn-mini" onClick={() => setConfirmarReset(false)}>No</button></span>}
          </div>

          <div className="ed">
            <CodeEditor
              ref={editor} nivel={nivel} archivos={cod.files} activo={cod.activo} revision={revision} modo={modo}
              onCambio={(a, txt) => setCod(c => (c.files[a] === txt ? c : { ...c, files: { ...c.files, [a]: txt } }))}
              onCursor={(l, c) => setCursor([l, c])} onEscritura={alEscribir} onAviso={avisar} onEjecutar={() => ejecutarRef.current(false)}
              onIaNoDisponible={() => { setIaDisp(false); setProg(p => ({ ...p, asistente: 'basico' })); }}
            />
          </div>

          <div className="estado-ed">
            <span className="pos">Ln {cursor[0]}, Col {cursor[1]}</span>
            <button type="button" className="probs" onClick={() => setTab('problemas')} aria-label={`${nErr} errores y ${nWarn} advertencias`}>
              <span className={nErr ? 'on-err' : ''}>● {nErr}</span><span className={nWarn ? 'on-warn' : ''}>▲ {nWarn}</span>
            </button>
            <span className="aviso" role="status">{aviso}</span>
            {modo === 'ia' && <button type="button" className="btn-mini ia" onMouseDown={e => e.preventDefault()} onClick={() => { editor.current?.pedirIA(); medir(m => registrarIA(m, nivel.id)); }}>✦ Sugerir <kbd>Alt+\</kbd></button>}
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
        pasosDe={m => ({ hechos: m.pasos.filter(p => pasosHechos.includes(p.id)).length, total: m.pasos.length })}
        misionActual={misionId} capitulos={m => (m.niveles ? { hechos: m.niveles.filter(n => prog.hechos.includes(n.id)).length, total: m.niveles.length } : null)} />}

      {!prog.perfil && <Bienvenida prog={prog} onListo={perfil => setProg(p => ({ ...p, perfil }))} />}
      {avance && prog.perfil && <MiAvance prog={prog} sellar={sellar} onCerrar={() => setAvance(false)} onPerfil={perfil => setProg(p => ({ ...p, perfil }))} />}
      {panelProfe && prog.profe && <PanelProfesor onCerrar={() => setPanelProfe(false)} />}

      {guia && <Guia tema={guia} onTema={setGuia} onCerrar={() => setGuia(null)} patrones={completadas.map(m => m.codice)} misiones={MISIONES} />}

      {exito && (
        <div className="modal-fondo" role="dialog" aria-modal="true" aria-labelledby="exito-t">
          <div className="modal rpg-ventana exito">
            <p className="mision">¡MISIÓN CUMPLIDA!</p>
            <Avatar tamano={4} />
            <h2 id="exito-t">{exito.esMision ? (exito.ultimo ? '¡Misión especial completada!' : `Paso ${nivel.enMundo + 1} de ${nivel.totalMundo} superado`) : nivel.jefe ? `¡Mundo ${mundo.id} completado!` : `Capítulo ${nivel.mundo}.${nivel.enMundo + 1} superado`}</h2>
            <p>{nivel.exito}</p>
            {exito.esMision
              ? exito.ultimo && <p className="xp-gana">✦ Recompensa: {nivel.recompensa}. Tus robots ya lo llevan puesto y el patrón quedó en el Códice.</p>
              : exito.nuevo && <p className="xp-gana">+100 EXP · ¡Subiste a NV {nv}!</p>}
            <div className="modal-acc">
              <button type="button" className="btn-sec" onClick={() => setExito(null)}>Seguir aquí</button>
              {exito.esMision
                ? (exito.ultimo
                  ? <>
                      <button type="button" className="btn-sec" onClick={() => { setExito(null); setGuia('patrones'); }}>Ver el Códice</button>
                      <button type="button" className="btn-pri" autoFocus onClick={volverARuta}>Volver a la ruta →</button>
                    </>
                  : <button type="button" className="btn-pri" autoFocus onClick={() => irPaso(PASOS[PASOS.findIndex(p => p.id === nivel.id) + 1])}>Siguiente paso: {PASOS[PASOS.findIndex(p => p.id === nivel.id) + 1].titulo} →</button>)
                : i + 1 < NIVELES.length
                  ? <button type="button" className="btn-pri" autoFocus onClick={() => irNivel(i + 1)}>Siguiente: {NIVELES[i + 1].titulo} →</button>
                  : <button type="button" className="btn-pri" autoFocus onClick={() => setExito(null)}>Seguir explorando</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
