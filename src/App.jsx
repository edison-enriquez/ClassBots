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
import AccesoDocente from './components/AccesoDocente.jsx';
import { profeEnSesion, ponerProfeEnSesion } from './metricas/clasesLocales.js';
import { registrarApertura, registrarResultado, registrarPista, registrarSolucion, registrarIA, registrarTiempo, registrarSesion, registrarEscritura, registrarSalida, registrarRegreso, registrarSenales, analizarEstilo, exportar, descargar, nombreArchivo, registrarEvento } from './metricas/metricas.js';
import { decodificarClase, clasePublica } from './metricas/cifrado.js';
import { useSellado } from './metricas/sellado.js';
import { useAulaEstudiante } from './aula/useAula.js';
import { useParejaEstudiante } from './aula/useParejaEstudiante.js';
import { AulaDocente, useDocente, textoHabilitar } from './aula/docente.js';
import { archivosDeDoc } from './aula/pareja.js';
import { verificarTexto, tieneAula } from './metricas/cifrado.js';
import { clasesAbiertas, misClases } from './metricas/clasesLocales.js';

const MODOS = [['off', 'Apagado'], ['basico', 'Básico'], ['ia', 'IA ✦']];

export default function App() {
  const [prog, setProg] = useProgreso();
  const i = indiceDe(prog.nivelId);
  const [pasoId, setPasoId] = useState(null);
  const nivelRuta = NIVELES[i];
  const nivelPropio = PASOS.find(p => p.id === pasoId) || nivelRuta;

  /* ---- Profesor: aulas en vivo y vista de estudiante ---- */
  const docenteRef = useRef(null);
  if (!docenteRef.current) docenteRef.current = new AulaDocente();
  const docente = docenteRef.current;
  // { claseId, alumno, nivelSel }: el profesor ve la plataforma como la ve ese estudiante
  const [vista, setVista] = useState(null);
  useDocente(vista ? docente : null);
  const alumnoV = vista ? docente.alumno(vista.claseId, vista.alumno) : null;
  const vivoV = alumnoV?.vivo || null;
  const archV = alumnoV?.archivo || null;
  const parejaV = vista && docente.pareja?.alumno === vista.alumno && docente.pareja?.claseId === vista.claseId ? docente.pareja : null;
  const colabV = parejaV?.estado === 'activa' ? parejaV.canal : null;
  const nivelVivoV = vivoV ? (NIVELES.find(n => n.id === vivoV.nivel.id) || PASOS.find(p => p.id === vivoV.nivel.id)) : null;
  const idVista = vista ? (colabV ? parejaV.nivel?.id : vista.nivelSel) || vivoV?.nivel.id : null;
  const nivelVista = idVista ? (NIVELES.find(n => n.id === idVista) || PASOS.find(p => p.id === idVista)) : null;
  const nivel = nivelVista || nivelPropio;
  const esMision = !!nivel.mision;
  const misionId = esMision ? nivel.misionId : null;
  const misionDeNivel = esMision ? MISIONES.find(m => m.id === misionId) : null;
  const mundo = MUNDOS.find(m => m.id === nivel.mundo);
  const [verMundo, setVerMundo] = useState(nivel.mundo);
  const [guia, setGuia] = useState(null);
  const [mapa, setMapa] = useState(false);
  const [avance, setAvance] = useState(false);
  const [panelProfe, setPanelProfe] = useState(false);
  const [claseNueva, setClaseNueva] = useState(null);
  // Modo profesor: acceso oculto, con contraseña de clase y solo en esta pestaña
  const [profe, setProfeEstado] = useState(profeEnSesion);
  const [acceso, setAcceso] = useState(false);
  const setProfe = v => { ponerProfeEnSesion(v); setProfeEstado(v); };

  const [codPropio, setCodPropio] = useState(() => codigoDe(prog, i));
  // En la vista de estudiante, el código es el suyo: en vivo, el de la sesión en pareja o el guardado en su avance
  const [vistaActivo, setVistaActivo] = useState(null);
  const [, setVerColab] = useState(0);
  useEffect(() => {
    if (!colabV) return undefined;
    const f = () => setVerColab(x => x + 1);
    colabV.doc.on('update', f);
    return () => colabV.doc.off('update', f);
  }, [colabV]);
  let codVista = null;
  if (vista && nivelVista) {
    let files;
    if (colabV) files = archivosDeDoc(colabV.doc, parejaV.archivos);
    else if (vivoV && nivelVista.id === vivoV.nivel.id) files = vivoV.archivos || {};
    else {
      const k = NIVELES.indexOf(nivelVista);
      files = archV?.progreso?.codigo?.[nivelVista.id]?.files || (nivelVista.mision ? nivelVista.inicial() : nivelVista.inicial(k > 0 ? NIVELES[k - 1].solucion : undefined));
    }
    const nombres = nivelVista.archivos.filter(a => files[a] != null);
    const pref = [vistaActivo, nivelVista.id === vivoV?.nivel.id ? vivoV.activo : null, nivelVista.archivoInicial, nombres[0]];
    codVista = { files, activo: pref.find(a => a && files[a] != null) || nivelVista.archivos[0] };
  }
  const cod = codVista || codPropio;
  const setCod = codVista ? f => { const n = typeof f === 'function' ? f(codVista) : f; if (n.activo !== codVista.activo) setVistaActivo(n.activo); } : setCodPropio;
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
  useEffect(() => { if (prog.perfil && !vista) medir(m => registrarApertura(m, nivel.id)); }, [nivel.id, !!prog.perfil]); // eslint-disable-line react-hooks/exhaustive-deps
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

  // Eventos de identidad pendientes (por ejemplo, la carga de un archivo antes de recargar la página)
  useEffect(() => {
    if (prog.pendientes?.length) { const evs = prog.pendientes; setProg(p => ({ ...p, pendientes: [] })); evs.forEach(ev => medir(m => registrarEvento(m, ev))); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Enlace de clase (?clase=…): el profesor lo comparte para que las métricas se cifren para su clase
  useEffect(() => {
    const c = decodificarClase(location.href);
    if (!c) return;
    try { history.replaceState(null, '', location.pathname + location.hash.replace(/clase=[\w-]+&?/, '')); } catch { /* nada */ }
    // La misma clase sin cambios: nada que hacer (si el profesor le agregó el aula, se pregunta)
    if (prog.clase?.id === c.id && (c.aula || '') === (prog.clase.aula || '')) return;
    if (!prog.perfil) setProg(p => ({ ...p, clase: clasePublica(c) }));
    else setClaseNueva(c);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // ¿El enlace es la versión actualizada de la clase del estudiante? (misma clase con aula, o la que la reemplaza)
  const esActualizacion = c => !!prog.clase && (c.id === prog.clase.id || c.reemplaza === prog.clase.id);
  const unirseAClase = c => {
    const actualizada = esActualizacion(c);
    medir(m => registrarEvento(m, { tipo: 'clase', de: prog.clase?.nombre || null, a: c.nombre, claseId: c.id, ...(actualizada ? { actualizada: true, deId: prog.clase.id } : {}) }));
    setProg(p => ({ ...p, clase: clasePublica(c) }));
    setClaseNueva(null);
    avisar(actualizada ? `Tu clase «${c.nombre}» se actualizó: ahora usa el aula en vivo.` : `Ahora estás en la clase «${c.nombre}».`);
  };

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
  useEffect(() => { setProg(p => ({ ...p, codigo: { ...p.codigo, [nivelPropio.id]: codPropio } })); }, [codPropio]); // eslint-disable-line react-hooks/exhaustive-deps

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
      if (profe) { setProfe(false); avisar('Modo profesor desactivado.'); }
      else setAcceso(true);
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

  const progV = archV?.progreso || null;
  const hechos = vista ? (progV?.hechos || []) : prog.hechos;
  const habilitados = vista ? (progV?.habilitados || []) : (prog.habilitados || []);
  const hecho = k => hechos.includes(NIVELES[k].id);
  const abierto = k => profe || k === 0 || hecho(k - 1) || hecho(k) || habilitados.includes(NIVELES[k].id);
  const pasosHechos = (vista ? progV?.pasosHechos : prog.pasosHechos) || [];
  const pasoOk = p => pasoAbierto(p, pasosHechos, profe) || habilitados.includes(p.id);
  const misionAbierta = m => misionDisponible(m, prog.hechos, profe);
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
    if (!misionAbierta(m) || !pasoOk(paso)) return;
    setPasoId(paso.id);
    setVerMundo(paso.mundo);
    setCod(codigoPaso({ ...prog, codigo: { ...prog.codigo, [nivel.id]: cod } }, paso));
    setMapa(false); setResultado(null); setEnviado(false); setCaption(''); setExito(null); setTab('pruebas'); setToken(t => t + 1);
  };
  const iniciarMision = m => {
    if (!misionAbierta(m)) return;
    const pasos = PASOS.filter(p => p.misionId === m.id);
    irPaso(pasos.find(p => !pasosHechos.includes(p.id) && pasoOk(p)) || pasos[0]);
  };
  const volverARuta = () => {
    setPasoId(null);
    setVerMundo(nivelRuta.mundo);
    setCod(codigoDe({ ...prog, codigo: { ...prog.codigo, [nivel.id]: cod } }, i));
    setResultado(null); setEnviado(false); setCaption(''); setExito(null); setTab('pruebas'); setToken(t => t + 1);
  };

  const izq = useRef(null);
  const ejecutar = enviar => {
    if (vista && enviar) return;
    const r = evaluarNivel(nivel, cod.files, { incluirOcultas: enviar });
    if (vista) { setResultado(r); setEnviado(false); setToken(t => t + 1); setExito(null); setTab('pruebas'); return; }
    volcarEscritura();
    medir(m => registrarResultado(m, nivel.id, r, enviar));
    if (enviar) {
      const senales = analizarEstilo(cod.files, esMision ? codigoInicialPaso(prog, nivel) : codigoInicial(prog, i), nivel.mundo >= 7 ? ['excepciones'] : []);
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
      setTimeout(aula.enviarArchivo, 1500);
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
  const reemplazarTodo = files => { parejaRef.current?.reemplazar(files); setCod({ files, activo: nivel.archivoInicial || nivel.archivos[0] }); setRevision(r => r + 1); setResultado(null); };
  const parejaRef = useRef(null);

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

  /* ---- Vista de estudiante (profesor) ---- */
  const colabVista = useMemo(() => (colabV ? { doc: colabV.doc, awareness: colabV.awareness } : null), [colabV]);
  const [habilitadosVista, setHabilitadosVista] = useState([]);
  const limpiarEscena = () => { setResultado(null); setEnviado(false); setCaption(''); setExito(null); setTab('pruebas'); setToken(t => t + 1); };
  const entrarVista = (claseId, alumno) => { setPanelProfe(false); setVistaActivo(null); setHabilitadosVista([]); setVista({ claseId, alumno, nivelSel: null }); limpiarEscena(); };
  const salirVista = () => { if (parejaV) docente.terminarPareja('', true); setVista(null); setVistaActivo(null); setVerMundo(nivelPropio.mundo); limpiarEscena(); };
  const verNivelVista = id => { if (colabV) return; setVista(v => ({ ...v, nivelSel: id === vivoV?.nivel.id ? null : id })); setVistaActivo(null); limpiarEscena(); };
  useEffect(() => { if (vista && nivelVista) setVerMundo(nivelVista.mundo); }, [idVista]); // eslint-disable-line react-hooks/exhaustive-deps
  // Siguiente capítulo (o paso de la misión) que el profesor le puede habilitar
  const siguienteV = (() => {
    if (!nivelVivoV) return null;
    if (nivelVivoV.mision) { const k = PASOS.indexOf(nivelVivoV); const p = PASOS[k + 1]; return p && p.misionId === nivelVivoV.misionId ? p : null; }
    return NIVELES[NIVELES.indexOf(nivelVivoV) + 1] || null;
  })();
  const yaAbiertoV = siguienteV && (hechos.includes(siguienteV.id) || pasosHechos.includes(siguienteV.id) || habilitados.includes(siguienteV.id) || habilitadosVista.includes(siguienteV.id) || (!siguienteV.mision && hechos.includes(nivelVivoV.id)));
  const habilitarVista = async () => {
    if (!siguienteV) return;
    const ok = await docente.habilitar(vista.claseId, vista.alumno, siguienteV.id);
    if (ok) { setHabilitadosVista(l => [...l, siguienteV.id]); docente.avisar(`✔ Le habilitaste «${siguienteV.titulo}» a ${vivoV.perfil.nombre.split(' ')[0]}.`); }
    else docente.avisar('Sin conexión con el aula: no se pudo habilitar.');
  };
  const situacionV = !alumnoV ? '' : !alumnoV.conectado ? '⚫ desconectado' : vivoV?.fuera ? '🟠 fuera de la ventana' : vivoV?.inactivo ? '🟡 inactivo' : '🟢 trabajando';
  const avisoDocente = docente.aviso && Date.now() - docente.aviso.t < 8000 ? docente.aviso.txt : '';
  // El modo profesor abre las aulas de las clases abiertas en esta pestaña
  useEffect(() => {
    if (profe) { const ab = clasesAbiertas(); docente.sincronizar(misClases().filter(c => ab[c.id]).map(c => ({ clase: c, priv: ab[c.id] }))); }
    else { docente.cerrarTodo(); setVista(null); }
  }, [profe]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- Estudiante: el profesor le habilita un capítulo (orden firmada con la llave de la clase) ---- */
  const [habilitado, setHabilitado] = useState(null);
  const recibirHabilitar = async d => {
    const c = prog.clase, yo = prog.perfil?.id;
    if (!c || !yo || typeof d.nivel !== 'string' || Math.abs(Date.now() - d.t) > 10 * 60000) return;
    if (!(await verificarTexto(c, textoHabilitar(c.id, yo, d.nivel, d.t), d.firma))) return;
    const n = NIVELES.find(x => x.id === d.nivel) || PASOS.find(x => x.id === d.nivel);
    if (!n) return;
    setProg(p => ({ ...p, habilitados: [...new Set([...(p.habilitados || []), n.id])] }));
    medir(m => registrarEvento(m, { tipo: 'habilitado', nivel: n.id, titulo: n.titulo }));
    setHabilitado(n);
  };
  const modo = prog.asistente || 'basico';

  // Aula en vivo: si la clase tiene servidor, el profesor ve el avance y el código mientras se trabaja
  const [mensajeProfe, setMensajeProfe] = useState(null);
  const aula = useAulaEstudiante({
    clase: prog.clase, perfilId: prog.perfil?.id, activo: !!prog.perfil && !profe,
    estadoVivo: () => ({
      perfil: { id: prog.perfil?.id, nombre: prog.perfil?.nombre, grupo: prog.perfil?.grupo || '' },
      nivel: { id: nivel.id, titulo: nivel.titulo, concepto: nivel.concepto, etiqueta: esMision ? `${misionDeNivel.corto} · paso ${nivel.enMundo + 1}` : `${nivel.mundo}.${nivel.enMundo + 1}` },
      capitulos: prog.hechos.length, pasos: pasosHechos.length,
      archivos: cod.files, activo: cod.activo, linea: cursor[0],
      errores: nErr, avisos: nWarn,
      resultado: resultado && { estado: resultado.estado, aprobados: resultado.aprobados ?? 0, evaluados: resultado.evaluados ?? 0, enviado, todosOk: !!resultado.todosOk },
      fuera: salio.current != null, inactivo: Date.now() - actividad.current > 120000,
    }),
    archivoActual: async () => { const sobre = await sellar(); return exportar(prog, [...(prog.segmentos || []), sobre]); },
    onMensaje: m => setMensajeProfe(m),
    onPareja: d => (d?.tipo === 'habilitar' ? recibirHabilitar(d) : parejaRef.current?.recibir(d)),
  });
  // Programación en pareja con el profesor (solo si el estudiante acepta)
  const pareja = useParejaEstudiante({
    clase: prog.clase, perfil: prog.perfil, nivel, cod, setCod, enviar: aula.enviarPareja,
    onEvento: ev => medir(m => registrarEvento(m, ev)), onAviso: avisar,
  });
  parejaRef.current = pareja;

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
                  const p = PASOS.find(x => x.id === p0.id), ok = pasoOk(p);
                  return (
                    <li key={p.id} className={(pasosHechos.includes(p.id) ? 'hecho' : '') + (vista && p.id === vivoV?.nivel.id ? ' alumno-aqui' : '')}>
                      <button type="button" className={'nodo nodo-mision' + (p.jefe ? ' jefe' : '')} aria-current={p.id === nivel.id ? 'step' : undefined} disabled={!ok} onClick={() => (vista ? verNivelVista(p.id) : irPaso(p))}
                        title={ok ? `Paso ${k + 1}: ${p.titulo} · ${p.concepto}` : 'Supera el paso anterior para abrirlo'}>{p.jefe ? '★' : k + 1}</button>
                    </li>
                  );
                })}
              </ol>
              {!vista && <button type="button" className="btn-sec volver-ruta" onClick={volverARuta}>← Volver a la ruta principal</button>}
            </div>
          ) : (
          <div className="mapa-mundo">
            <span className="mapa-nombre">{MUNDOS.find(m => m.id === verMundo)?.nombre}</span>
            <ol>
              {NIVELES.map((n, k) => n.mundo !== verMundo ? null : (
                <li key={n.id} className={(hecho(k) ? 'hecho' : '') + (vista && n.id === vivoV?.nivel.id ? ' alumno-aqui' : '')}>
                  <button type="button" className={'nodo' + (n.jefe ? ' jefe' : '')} aria-current={(vista ? n.id === nivel.id : k === i) ? 'step' : undefined} disabled={!abierto(k)} onClick={() => (vista ? verNivelVista(n.id) : irNivel(k))} title={(vista && n.id === vivoV?.nivel.id ? `Aquí está ${vivoV.perfil.nombre} · ` : '') + (abierto(k) ? `${n.mundo}.${n.enMundo + 1} ${n.titulo} · ${n.concepto}` : 'Supera el capítulo anterior para abrirlo')}>
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
          <MenuUsuario perfil={prog.perfil} nv={nv} xp={xp} pct={pctMundo} mundo={mundo.id} profe={!!profe} recompensas={completadas}
            onAvance={() => setAvance(true)} onCodice={() => setGuia('patrones')} onPanel={() => setPanelProfe(true)}
            onDescargar={async () => { const sobre = await sellar(); descargar(nombreArchivo(prog.perfil), JSON.stringify(exportar(prog, [...(prog.segmentos || []), sobre]), null, 2)); }}
            onSalirProfe={() => { setProfe(false); avisar('Modo profesor desactivado.'); }} />
        </div>
        {vista && (
          <div className="vista-banda" role="status" aria-live="polite">
            <span className="vista-ojo">👁 VISTA DE ESTUDIANTE</span>
            <span className="vista-quien"><strong>{vivoV?.perfil.nombre || 'Estudiante'}</strong>{vivoV?.perfil.grupo ? ` · ${vivoV.perfil.grupo}` : ''} · está en <strong>{vivoV ? `${vivoV.nivel.etiqueta} «${vivoV.nivel.titulo}»` : '…'}</strong> · {situacionV}</span>
            {vivoV && nivel.id !== vivoV.nivel.id && <span className="vista-otro">Viendo «{nivel.titulo}» (código guardado) <button type="button" className="btn-mini" onClick={() => verNivelVista(vivoV.nivel.id)}>Ir a su capítulo</button></span>}
            <span className="vista-acc">
              {colabV
                ? <><span className="pareja-on">👥 En pareja · tu cursor es el amarillo</span><button type="button" className="btn-mini" onClick={() => docente.terminarPareja('Terminaste la sesión en pareja.', true)}>Terminar pareja</button></>
                : parejaV
                  ? <><span className="bienv-nota">Esperando que acepte…</span><button type="button" className="btn-mini" onClick={() => docente.terminarPareja('', true)}>Cancelar</button></>
                  : <button type="button" className="btn-mini" disabled={!alumnoV?.conectado} title={alumnoV?.conectado ? 'Editar su código con él en tiempo real (debe aceptar)' : 'El estudiante no está conectado'} onClick={() => { verNivelVista(vivoV.nivel.id); docente.invitar(vista.claseId, vista.alumno, vivoV.perfil.nombre); }}>👥 Programar en pareja</button>}
              {siguienteV && <button type="button" className="btn-mini" disabled={!!yaAbiertoV || !alumnoV?.conectado} title={yaAbiertoV ? 'Ya lo tiene abierto' : 'Le desbloquea el siguiente capítulo aunque no haya superado el actual'} onClick={habilitarVista}>⏭ Habilitar «{siguienteV.titulo}»</button>}
              <button type="button" className="btn-mini" onClick={() => setPanelProfe(true)}>Panel</button>
              <button type="button" className="btn-mini peligro" onClick={salirVista}>Salir de la vista</button>
            </span>
            {avisoDocente && <span className={avisoDocente.startsWith('✔') ? 'avance-ok' : 'avance-alerta'}>{avisoDocente}</span>}
          </div>
        )}
      </header>

      <main className="cols">
        <aside className="izq" ref={izq}>
          <div className="monitor">
            <div className="monitor-bisel">
              <PixelStage nivel={nivel} modelo={diag.modelo} animacion={resultado?.animacion} token={token} onCaption={setCaption} />
              {exito && <div className="sello">{esMision ? '¡Paso superado!' : '¡Capítulo superado!'}</div>}
            </div>
            <Dialogo caption={caption} reposo={resultado?.animacion ? 'Fin de la escena. Revisa los casos de prueba.' : vista ? `Vista de ${vivoV?.perfil.nombre || 'el estudiante'}: pulsa Ejecutar para ver su escena (no cuenta como intento suyo).` : `${prog.perfil ? `¡Hola, ${prog.perfil.nombre.split(' ')[0]}! ` : ''}Escribe tu código y pulsa Ejecutar para ver la escena.`} />
          </div>
          <Leccion nivel={nivel} mundo={mundo} superado={esMision ? pasosHechos.includes(nivel.id) : hechos.includes(nivel.id)} onSolucion={() => { if (profe && !vista) { reemplazarTodo({ ...nivel.solucion }); medir(m => registrarSolucion(m, nivel.id)); } }} onGuia={setGuia} profe={!!profe && !vista} onPista={() => { if (!vista) medir(m => registrarPista(m, nivel.id)); }} />
        </aside>

        <section className="der">
          <div className="ed-bar">
            {pareja.sesion && (
              <span className="pareja-banda" role="status" title="Tu profesor ve y edita este código contigo. Su cursor es el amarillo.">
                👥 En pareja con tu profesor
                <button type="button" className="btn-mini" onClick={() => pareja.terminar(true, 'Terminaste la sesión en pareja.')}>Terminar</button>
              </span>
            )}
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
            {vista ? null : !confirmarReset
              ? <button type="button" className="btn-mini" onClick={() => setConfirmarReset(true)}>Reiniciar</button>
              : <span className="confirmar">¿Borrar tu código de este capítulo? <button type="button" className="btn-mini peligro" onClick={() => { setConfirmarReset(false); reemplazarTodo(esMision ? codigoInicialPaso(prog, nivel) : codigoInicial(prog, i)); }}>Sí, reiniciar</button><button type="button" className="btn-mini" onClick={() => setConfirmarReset(false)}>No</button></span>}
          </div>

          <div className="ed">
            <CodeEditor
              ref={editor} nivel={nivel} archivos={cod.files} activo={cod.activo} revision={revision} modo={modo} colab={vista ? colabVista : pareja.colab} soloLectura={!!vista && !colabVista}
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
            <button type="button" className="btn-pri" disabled={!!vista} title={vista ? 'En la vista de estudiante solo puedes ejecutar: enviar le corresponde al estudiante' : undefined} onClick={() => ejecutar(true)}>Enviar</button>
          </div>
        </section>
      </main>

      {mapa && <MapaMundo mundos={MUNDOS} actual={mundo.id} abierto={mundoAbierto} completo={mundoCompleto}
        misiones={MISIONES} misionAbierta={misionAbierta} misionCompleta={misionCompleta}
        onIniciarMision={m => (m.id === misionId ? setMapa(false) : iniciarMision(m))} onViajar={viajar} onCerrar={() => setMapa(false)}
        pasosDe={m => ({ hechos: m.pasos.filter(p => pasosHechos.includes(p.id)).length, total: m.pasos.length })}
        misionActual={misionId} capitulos={m => (m.niveles ? { hechos: m.niveles.filter(n => prog.hechos.includes(n.id)).length, total: m.niveles.length } : null)} />}

      {!prog.perfil && <Bienvenida prog={prog} onClase={c => setProg(p => ({ ...p, clase: clasePublica(c) }))}
        onListo={perfil => { setProg(p => ({ ...p, perfil })); medir(m => registrarEvento(m, { tipo: 'alta', nombre: perfil.nombre, grupo: perfil.grupo, perfilId: perfil.id, claseId: prog.clase?.id || null })); }} />}
      {avance && prog.perfil && <MiAvance prog={prog} sellar={sellar} aula={aula.estado} onCerrar={() => setAvance(false)} onClase={unirseAClase}
        onPerfil={perfil => { medir(m => registrarEvento(m, { tipo: 'perfil', de: prog.perfil.nombre, a: perfil.nombre, grupoDe: prog.perfil.grupo || '', grupoA: perfil.grupo || '' })); setProg(p => ({ ...p, perfil })); }} />}
      {claseNueva && prog.perfil && (
        <div className="modal-fondo" role="dialog" aria-modal="true" aria-labelledby="clase-t">
          <div className="modal rpg-ventana">
            {esActualizacion(claseNueva) ? <>
              <h2 id="clase-t">🔄 Tu profesor actualizó la clase «{claseNueva.nombre}»</h2>
              <p>{claseNueva.docente ? `Docente: ${claseNueva.docente}. ` : ''}Tu avance se conserva.</p>
              {tieneAula(claseNueva) && <p className="aula-aviso">📡 Desde ahora la clase usa el <strong>aula en vivo</strong>: mientras trabajas, tu profesor ve en qué capítulo vas, tu código y tus métricas (cifradas, solo él puede leerlas), y te puede enviar mensajes.</p>}
              <div className="modal-acc">
                <button type="button" className="btn-sec" onClick={() => setClaseNueva(null)}>Ahora no</button>
                <button type="button" className="btn-pri" autoFocus onClick={() => unirseAClase(claseNueva)}>Actualizar</button>
              </div>
            </> : <>
              <h2 id="clase-t">¿Unirte a la clase «{claseNueva.nombre}»?</h2>
              <p>{claseNueva.docente ? `Docente: ${claseNueva.docente}. ` : ''}{prog.clase ? `Ahora estás en «${prog.clase.nombre}». ` : ''}Desde ahora tus métricas se cifrarán para esta clase. Tu avance se conserva.</p>
              {tieneAula(claseNueva) && <p className="aula-aviso">📡 Esta clase usa el <strong>aula en vivo</strong>: tu profesor verá tu avance y tu código mientras trabajas.</p>}
              <div className="modal-acc">
                <button type="button" className="btn-sec" onClick={() => setClaseNueva(null)}>No, seguir como estoy</button>
                <button type="button" className="btn-pri" autoFocus onClick={() => unirseAClase(claseNueva)}>Unirme</button>
              </div>
            </>}
          </div>
        </div>
      )}
      {panelProfe && profe && <PanelProfesor docente={docente} onVer={entrarVista} onCerrar={() => setPanelProfe(false)} />}
      {habilitado && (
        <div className="modal-fondo" role="dialog" aria-modal="true" aria-labelledby="habil-t">
          <div className="modal rpg-ventana">
            <p className="mapa-kicker">TU PROFESOR</p>
            <h2 id="habil-t">🔓 Te habilitó «{habilitado.titulo}»</h2>
            <p>Puedes seguir con ese {habilitado.mision ? 'paso' : 'capítulo'} aunque no hayas superado el anterior. Puedes volver cuando quieras.</p>
            <div className="modal-acc">
              <button type="button" className="btn-sec" onClick={() => setHabilitado(null)}>Seguir aquí</button>
              <button type="button" className="btn-pri" autoFocus onClick={() => { const n = habilitado; setHabilitado(null); if (n.mision) irPaso(n); else irNivel(NIVELES.indexOf(n)); }}>Ir ahora →</button>
            </div>
          </div>
        </div>
      )}
      {acceso && <AccesoDocente claseActual={prog.clase} onCerrar={() => setAcceso(false)}
        onFallo={c => medir(m => registrarEvento(m, { tipo: 'acceso-fallido', clase: c.nombre, claseId: c.id }))}
        onListo={(c, accion) => { setProfe(true); setAcceso(false); { const ab = clasesAbiertas(); docente.sincronizar(misClases().filter(x => ab[x.id]).map(x => ({ clase: x, priv: ab[x.id] }))); } medir(m => registrarEvento(m, { tipo: 'profesor', accion, clase: c.nombre, claseId: c.id })); avisar(`Modo profesor activado · clase «${c.nombre}».`); }} />}

      {pareja.invitacion && (
        <div className="modal-fondo" role="dialog" aria-modal="true" aria-labelledby="pareja-t">
          <div className="modal rpg-ventana pareja-invita">
            <p className="mapa-kicker">PROGRAMAR EN PAREJA</p>
            <h2 id="pareja-t">👥 Tu profesor quiere programar contigo</h2>
            <p>Si aceptas, compartirán el código de <strong>{nivel.titulo}</strong>: verá lo que escribes, podrá escribir en tus archivos y verás su cursor en amarillo. Lo que él escriba no cuenta como tecleado tuyo. Puedes terminar la sesión cuando quieras.</p>
            <div className="modal-acc">
              <button type="button" className="btn-sec" onClick={pareja.rechazar}>Ahora no</button>
              <button type="button" className="btn-pri" autoFocus onClick={pareja.aceptar}>Aceptar</button>
            </div>
          </div>
        </div>
      )}
      {mensajeProfe && (
        <div className="modal-fondo" role="dialog" aria-modal="true" aria-labelledby="msj-t">
          <div className="modal rpg-ventana mensaje-profe">
            <p className="mapa-kicker">MENSAJE DE TU PROFESOR · {new Date(mensajeProfe.enviado).toLocaleTimeString()}</p>
            <h2 id="msj-t">📣 {mensajeProfe.texto}</h2>
            <div className="modal-acc"><button type="button" className="btn-pri" autoFocus onClick={() => setMensajeProfe(null)}>Entendido</button></div>
          </div>
        </div>
      )}
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
