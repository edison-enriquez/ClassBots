import { useEffect, useMemo, useRef, useState } from 'react';
import { leerArchivo, abrirConLlave, resumen, minutos, CATEGORIAS, SENALES, csvClase, csvDetalle, descargar } from '../metricas/metricas.js';
import { generarLlaves, huella, llavePublica } from '../metricas/cifrado.js';
import { resaltar } from '../util/resaltar.js';

const CLAVE_SESION = 'classbots-llave-privada';
const leerLlave = () => { try { return JSON.parse(sessionStorage.getItem(CLAVE_SESION) || 'null'); } catch { return null; } };

/* Panel del profesor: reúne los archivos de avance de la clase (sin servidor), los descifra con la
   llave privada del profesor y los resume */
export default function PanelProfesor({ onCerrar }) {
  const [crudos, setCrudos] = useState([]);
  const [estudiantes, setEstudiantes] = useState([]);
  const [errores, setErrores] = useState([]);
  const [orden, setOrden] = useState({ col: 'nombre', asc: true });
  const [sel, setSel] = useState(null);
  const [arrastre, setArrastre] = useState(false);
  const [llave, setLlave] = useState(leerLlave);
  const input = useRef(null);

  const cargar = async files => {
    const nuevos = [], errs = [];
    for (const f of files) {
      try { nuevos.push({ ...leerArchivo(await f.text()), archivo: f.name }); } catch (e) { errs.push(`${f.name}: ${e.message}`); }
    }
    setErrores(errs);
    setCrudos(prev => {
      // Un estudiante por id: se queda el archivo exportado más recientemente
      const m = new Map(prev.map(e => [e.perfil.id || e.perfil.nombre, e]));
      for (const e of nuevos) {
        const k = e.perfil.id || e.perfil.nombre, viejo = m.get(k);
        if (!viejo || viejo.exportado < e.exportado) m.set(k, e);
      }
      return [...m.values()];
    });
  };

  // Descifrar y resumir cada vez que cambian los archivos o la llave
  useEffect(() => {
    let vivo = true;
    (async () => {
      const lista = [];
      for (const d of crudos) {
        if (!llave) { lista.push({ ...d, r: resumen({ progreso: d.progreso }), problemas: ['métricas cifradas: carga tu llave privada'], cifrado: true }); continue; }
        const { metricas, problemas } = await abrirConLlave(d, llave.privada);
        lista.push({ ...d, r: resumen({ progreso: d.progreso, metricas }), problemas });
      }
      if (vivo) setEstudiantes(lista);
    })();
    return () => { vivo = false; };
  }, [crudos, llave]);

  const clase = useMemo(() => {
    if (!estudiantes.length) return null;
    const n = estudiantes.length;
    const prom = f => estudiantes.reduce((s, e) => s + f(e), 0) / n;
    const porNivel = new Map();
    for (const e of estudiantes) for (const x of e.r.niveles) {
      if (!x.ruta || (!x.intentos && !x.superado)) continue;
      const a = porNivel.get(x.id) || { id: x.id, etiqueta: x.etiqueta, titulo: x.titulo, concepto: x.concepto, intentaron: 0, superaron: 0, intentos: [], tiempo: [] };
      a.intentaron++; if (x.superado) a.superaron++;
      if (x.intentosHastaExito != null) a.intentos.push(x.intentosHastaExito);
      a.tiempo.push(x.tiempo);
      porNivel.set(x.id, a);
    }
    const media = xs => (xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : 0);
    const dificiles = [...porNivel.values()].map(a => ({ ...a, pct: Math.round((100 * a.superaron) / a.intentaron), intentosMedios: +media(a.intentos).toFixed(1), tiempoMedio: media(a.tiempo) }))
      .sort((a, b) => (a.pct - b.pct) || (b.intentosMedios - a.intentosMedios)).slice(0, 6);
    const cats = {};
    for (const e of estudiantes) for (const [k, v] of Object.entries(e.r.categorias)) cats[k] = (cats[k] || 0) + v;
    return {
      n, avance: Math.round(prom(e => e.r.pct)), tiempo: prom(e => e.r.tiempoTotal),
      revisar: estudiantes.filter(e => !e.cifrado && e.problemas.length).length,
      alertas: estudiantes.filter(e => e.r.indicios.nivel !== 'bajo').length,
      dificiles, categorias: Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 5),
    };
  }, [estudiantes]);

  const NIV = { bajo: 0, medio: 1, alto: 2 };
  const COLS = [
    ['nombre', 'Estudiante', e => e.perfil.nombre.toLowerCase()],
    ['grupo', 'Grupo', e => (e.perfil.grupo || '').toLowerCase()],
    ['avance', 'Capítulos', e => e.r.capitulos],
    ['actual', 'Va en', e => e.r.actual],
    ['tiempo', 'Tiempo', e => e.r.tiempoTotal],
    ['intentos', 'Intentos/cap.', e => e.r.intentosPromedio ?? 999],
    ['primer', '1.er envío', e => e.r.primerEnvio ?? -1],
    ['pegado', 'Pegado externo', e => e.r.escritura.externosChars],
    ['indicio', 'Indicio copia/IA', e => NIV[e.r.indicios.nivel]],
    ['pistas', 'Pistas', e => e.r.pistas],
    ['ultima', 'Última actividad', e => e.r.ultimaActividad || ''],
  ];
  const filas = [...estudiantes].sort((a, b) => {
    const f = COLS.find(c => c[0] === orden.col)[2], x = f(a), y = f(b);
    return (x < y ? -1 : x > y ? 1 : 0) * (orden.asc ? 1 : -1);
  });
  const est = sel != null ? estudiantes.find(e => (e.perfil.id || e.perfil.nombre) === sel) : null;
  const pct = (a, b) => (a + b ? Math.round((100 * a) / (a + b)) : 0);

  return (
    <div className="modal-fondo" role="dialog" aria-modal="true" aria-labelledby="profe-t" onClick={e => { if (e.target === e.currentTarget) onCerrar(); }}>
      <div className="modal rpg-ventana panel-profe">
        <header className="avance-cab">
          <div>
            <p className="mapa-kicker">MODO PROFESOR</p>
            <h2 id="profe-t">Panel de la clase</h2>
          </div>
          <button type="button" className="mapa-cerrar" onClick={onCerrar} aria-label="Cerrar" autoFocus>×</button>
        </header>

        <Llave llave={llave} onLlave={l => { setLlave(l); try { if (l) sessionStorage.setItem(CLAVE_SESION, JSON.stringify(l)); else sessionStorage.removeItem(CLAVE_SESION); } catch { /* nada */ } }} />

        <div className={'profe-soltar' + (arrastre ? ' activo' : '')}
          onDragOver={e => { e.preventDefault(); setArrastre(true); }} onDragLeave={() => setArrastre(false)}
          onDrop={e => { e.preventDefault(); setArrastre(false); cargar([...e.dataTransfer.files]); }}>
          <p>Arrastra aquí los archivos <code>.json</code> que entregaron tus estudiantes, o</p>
          <button type="button" className="btn-pri" onClick={() => input.current?.click()}>Elegir archivos</button>
          <input ref={input} type="file" accept=".json,application/json" multiple hidden onChange={e => { cargar([...e.target.files]); e.target.value = ''; }} />
          <small>Los archivos se leen y se descifran en este navegador; no se envían a ningún servidor.</small>
        </div>
        {errores.map(x => <p key={x} className="avance-alerta">{x}</p>)}

        {clase && <>
          <div className="avance-tarjetas">
            <div><strong>{clase.n}</strong><span>estudiantes</span></div>
            <div><strong>{clase.avance}%</strong><span>avance promedio</span></div>
            <div><strong>{minutos(clase.tiempo)}</strong><span>tiempo promedio</span></div>
            <div className={clase.alertas ? 'alerta' : ''}><strong>{clase.alertas}</strong><span>con indicios de copia o IA</span></div>
            <div className={clase.revisar ? 'alerta' : ''}><strong>{clase.revisar}</strong><span>archivos con problemas</span></div>
          </div>

          <div className="profe-dos">
            <section>
              <h3>Capítulos con más dificultad</h3>
              <table className="profe-tabla compacta">
                <thead><tr><th>Cap.</th><th>Concepto</th><th>Superaron</th><th>Intentos</th><th>Tiempo</th></tr></thead>
                <tbody>{clase.dificiles.map(d => (
                  <tr key={d.id}><td>{d.etiqueta}</td><td>{d.concepto}</td><td>{d.superaron}/{d.intentaron} ({d.pct}%)</td><td>{d.intentosMedios || '—'}</td><td>{minutos(d.tiempoMedio)}</td></tr>
                ))}</tbody>
              </table>
            </section>
            <section>
              <h3>Errores más frecuentes en la clase</h3>
              {clase.categorias.length ? clase.categorias.map(([k, v]) => <div key={k} className="avance-cat"><span>{CATEGORIAS[k] || k}</span><i style={{ width: `${(100 * v) / clase.categorias[0][1]}%` }} /><small>{v}</small></div>) : <p className="bienv-nota">{llave ? 'Sin errores registrados.' : 'Carga tu llave privada para ver los errores.'}</p>}
            </section>
          </div>

          <section>
            <div className="profe-barra">
              <h3>Estudiantes</h3>
              <button type="button" className="btn-sec" onClick={() => descargar('ClassBots_clase_resumen.csv', csvClase(estudiantes), 'text/csv')}>⬇ CSV resumen</button>
              <button type="button" className="btn-sec" onClick={() => descargar('ClassBots_clase_por_capitulo.csv', csvDetalle(estudiantes), 'text/csv')}>⬇ CSV por capítulo</button>
            </div>
            <div className="profe-scroll">
              <table className="profe-tabla">
                <thead><tr>{COLS.map(([k, t]) => <th key={k} aria-sort={orden.col === k ? (orden.asc ? 'ascending' : 'descending') : undefined}><button type="button" onClick={() => setOrden(o => ({ col: k, asc: o.col === k ? !o.asc : true }))}>{t}{orden.col === k ? (orden.asc ? ' ▲' : ' ▼') : ''}</button></th>)}</tr></thead>
                <tbody>{filas.map(e => {
                  const k = e.perfil.id || e.perfil.nombre, w = e.r.escritura;
                  return (
                    <tr key={k} className={sel === k ? 'sel' : ''} onClick={() => setSel(sel === k ? null : k)}>
                      <td>{!e.cifrado && e.problemas.length > 0 && <span className="avance-alerta" title={e.problemas.join('\n')}>⚠ </span>}<button type="button" className="enlace">{e.perfil.nombre}</button></td>
                      <td>{e.perfil.grupo}</td><td>{e.r.capitulos}/{e.r.totalCapitulos}</td><td>{e.r.actual}</td>
                      {e.cifrado ? <td colSpan={7} className="profe-cifrado">🔒 cifrado</td> : <>
                        <td>{minutos(e.r.tiempoTotal)}</td><td>{e.r.intentosPromedio ?? '—'}</td><td>{e.r.primerEnvio != null ? e.r.primerEnvio + '%' : '—'}</td>
                        <td>{pct(w.externosChars, w.tecleados)}%</td>
                        <td><span className={'indicio ' + e.r.indicios.nivel} title={e.r.indicios.razones.join('\n') || 'Sin indicios'}>{e.r.indicios.nivel}</span></td>
                        <td>{e.r.pistas}</td><td>{e.r.ultimaActividad ? new Date(e.r.ultimaActividad).toLocaleString() : '—'}</td>
                      </>}
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
          </section>

          {est && <DetalleEstudiante e={est} />}
        </>}
      </div>
    </div>
  );
}

/* Llave privada del profesor: se carga desde un archivo y vive solo en esta pestaña (sessionStorage) */
function Llave({ llave, onLlave }) {
  const input = useRef(null);
  const [nueva, setNueva] = useState(null);
  const [error, setError] = useState('');
  const [huellaApp, setHuellaApp] = useState('');
  useEffect(() => { huella(llavePublica()).then(setHuellaApp).catch(() => {}); }, []);
  const cargar = async f => {
    setError('');
    try {
      const d = JSON.parse(await f.text());
      if (d.tipo !== 'llave-privada-profesor' || !d.privada?.d) throw new Error('El archivo no es una llave privada de ClassBots.');
      onLlave(d);
    } catch (e) { setError(e.message); }
  };
  const generar = async () => {
    const par = await generarLlaves();
    const archivo = { app: 'ClassBots', tipo: 'llave-privada-profesor', huella: par.huella, creada: new Date().toISOString(), privada: par.privada };
    descargar(`ClassBots_llave_privada_profesor_${par.huella}.json`, JSON.stringify(archivo, null, 2));
    setNueva({ ...par, archivo });
  };
  return (
    <section className={'profe-llave' + (llave ? ' lista' : '')}>
      {llave
        ? <p>🔑 Llave privada cargada (huella <code>{llave.huella}</code>). {llave.huella !== huellaApp && huellaApp && <span className="avance-alerta">Esta versión del juego cifra con otra llave (<code>{huellaApp}</code>): los archivos nuevos no se podrán leer con esta.</span>} <button type="button" className="enlace" onClick={() => onLlave(null)}>olvidar</button></p>
        : <>
            <p>🔒 Las métricas de los estudiantes vienen <strong>cifradas</strong>. Carga tu llave privada para leerlas. El juego publicado cifra con la llave de huella <code>{huellaApp || '…'}</code>.</p>
            <div className="modal-acc">
              <button type="button" className="btn-pri" onClick={() => input.current?.click()}>Cargar llave privada</button>
              <button type="button" className="btn-sec" onClick={generar}>Generar un par de llaves nuevo</button>
            </div>
            <input ref={input} type="file" accept=".json,application/json" hidden onChange={e => { if (e.target.files[0]) cargar(e.target.files[0]); e.target.value = ''; }} />
          </>}
      {error && <p className="avance-alerta">{error}</p>}
      {nueva && (
        <div className="profe-nueva">
          <p>✔ Se descargó tu llave privada (huella <code>{nueva.huella}</code>). Guárdala en un lugar seguro: si la pierdes, no podrás leer las métricas cifradas con ella, y nunca la subas al repositorio.</p>
          <p>Para que el juego cifre con esta llave, crea en GitHub la variable del repositorio <code>VITE_LLAVE_PROFESOR</code> (Settings → Secrets and variables → Actions → Variables) con este valor y vuelve a publicar:</p>
          <textarea readOnly rows={3} value={JSON.stringify(nueva.publica)} onFocus={e => e.target.select()} />
          <div className="modal-acc"><button type="button" className="btn-sec" onClick={() => onLlave(nueva.archivo)}>Usar esta llave ahora</button></div>
        </div>
      )}
    </section>
  );
}

function DetalleEstudiante({ e }) {
  const [cap, setCap] = useState(null);
  const [archivo, setArchivo] = useState(null);
  const visibles = e.r.niveles.filter(n => n.intentos || n.superado || n.tiempo || n.tecleados || n.pegados);
  const codigo = cap && e.progreso.codigo?.[cap];
  const archivos = codigo ? Object.keys(codigo.files || {}) : [];
  const actual = archivo && archivos.includes(archivo) ? archivo : archivos[0];
  const w = e.r.escritura;
  return (
    <section className="profe-detalle">
      <h3>{e.perfil.nombre} <small>· {e.archivo} · exportado {new Date(e.exportado).toLocaleString()}</small></h3>
      {e.problemas.length > 0 && <ul className="profe-problemas">{e.problemas.map(p => <li key={p}>⚠ {p}</li>)}</ul>}
      {!e.cifrado && (
        <div className="profe-escritura">
          <div><strong>{w.tecleados}</strong><span>caracteres tecleados</span></div>
          <div><strong>{w.externosChars}</strong><span>pegados desde fuera</span></div>
          <div><strong>{w.pegadosTrasSalir}</strong><span>pegados al volver de otra ventana</span></div>
          <div><strong>{w.salidas}</strong><span>salidas de la pestaña ({minutos(w.tiempoFuera)} fuera)</span></div>
          <div><strong>{w.iaChars}</strong><span>caracteres de la IA del taller ({w.sugerenciasIA} pedidos)</span></div>
          <div className={'indicio-caja ' + e.r.indicios.nivel}><strong>{e.r.indicios.nivel}</strong><span>indicio de copia o IA externa</span></div>
        </div>
      )}
      {!e.cifrado && e.r.indicios.razones.length > 0 && <p className="bienv-nota">Por qué: {e.r.indicios.razones.join(' · ')}. Es un indicio para conversar con el estudiante, no una prueba.</p>}
      {!e.cifrado && Object.keys(w.senales).length > 0 && <p className="bienv-nota">Rasgos de estilo detectados en envíos: {Object.entries(w.senales).map(([k, v]) => `${SENALES[k] || k} (${v} cap.)`).join(' · ')}</p>}
      <div className="profe-scroll">
        <table className="profe-tabla compacta">
          <thead><tr><th>Cap.</th><th>Título</th><th>Estado</th><th>Tiempo</th><th>Ejec.</th><th>Envíos</th><th>Intentos</th><th>Errores C/E/X</th><th>Pistas</th><th>Tecleado</th><th>Pegado ext.</th><th>Al volver</th><th>IA taller</th><th>Indicios</th><th>Código</th></tr></thead>
          <tbody>{visibles.map(n => (
            <tr key={n.id} className={cap === n.id ? 'sel' : ''}>
              <td>{n.etiqueta}</td><td>{n.titulo}</td><td>{n.superado ? '✔ superado' : 'en curso'}{n.solucionUsada ? ' · vio solución' : ''}</td>
              <td>{minutos(n.tiempo)}</td><td>{n.ejecuciones}</td><td>{n.envios}</td><td>{n.intentosHastaExito ?? '—'}</td>
              <td title="compilación / estructura / ejecución">{n.compilacion}/{n.estructura}/{n.ejecucion}</td><td>{n.pistas}</td>
              <td>{n.tecleados}</td><td>{n.externosChars}{n.pegadosExternos ? ` (${n.pegadosExternos})` : ''}</td><td>{n.pegadosTrasSalir || '—'}</td><td>{n.iaChars || '—'}</td>
              <td>{n.indicios.length ? <span className="indicio medio" title={n.indicios.join('\n')}>{n.indicios.length}</span> : '—'}</td>
              <td>{e.progreso.codigo?.[n.id] ? <button type="button" className="enlace" onClick={() => { setCap(cap === n.id ? null : n.id); setArchivo(null); }}>{cap === n.id ? 'ocultar' : 'ver'}</button> : '—'}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {codigo && (
        <div className="profe-codigo">
          <div className="tabs-guia" role="tablist">{archivos.map(a => <button key={a} type="button" role="tab" aria-selected={a === actual} onClick={() => setArchivo(a)}>{a}</button>)}</div>
          <pre className="ejemplo"><code dangerouslySetInnerHTML={{ __html: resaltar(codigo.files[actual] || '') }} /></pre>
        </div>
      )}
    </section>
  );
}
