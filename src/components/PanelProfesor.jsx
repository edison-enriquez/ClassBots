import { useMemo, useRef, useState } from 'react';
import { leerArchivo, resumen, minutos, CATEGORIAS, csvClase, csvDetalle, descargar } from '../metricas/metricas.js';
import { resaltar } from '../util/resaltar.js';

/* Panel del profesor: reúne los archivos de avance de la clase (sin servidor) y los resume */
export default function PanelProfesor({ onCerrar }) {
  const [estudiantes, setEstudiantes] = useState([]);
  const [errores, setErrores] = useState([]);
  const [orden, setOrden] = useState({ col: 'nombre', asc: true });
  const [sel, setSel] = useState(null);
  const [arrastre, setArrastre] = useState(false);
  const input = useRef(null);

  const cargar = async files => {
    const nuevos = [], errs = [];
    for (const f of files) {
      try {
        const d = leerArchivo(await f.text());
        nuevos.push({ ...d, archivo: f.name, r: resumen(d) });
      } catch (e) { errs.push(`${f.name}: ${e.message}`); }
    }
    setErrores(errs);
    setEstudiantes(prev => {
      // Un estudiante por id: se queda el archivo exportado más recientemente
      const m = new Map(prev.map(e => [e.perfil.id || e.perfil.nombre, e]));
      for (const e of nuevos) {
        const k = e.perfil.id || e.perfil.nombre, viejo = m.get(k);
        if (!viejo || viejo.exportado < e.exportado) m.set(k, e);
      }
      return [...m.values()];
    });
  };

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
      alterados: estudiantes.filter(e => !e.integro || e.perfil.alterado).length,
      dificiles, categorias: Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 5),
    };
  }, [estudiantes]);

  const COLS = [
    ['nombre', 'Estudiante', e => e.perfil.nombre.toLowerCase()],
    ['grupo', 'Grupo', e => (e.perfil.grupo || '').toLowerCase()],
    ['avance', 'Capítulos', e => e.r.capitulos],
    ['actual', 'Va en', e => e.r.actual],
    ['tiempo', 'Tiempo', e => e.r.tiempoTotal],
    ['intentos', 'Intentos/cap.', e => e.r.intentosPromedio ?? 999],
    ['primer', '1.er envío', e => e.r.primerEnvio ?? -1],
    ['pistas', 'Pistas', e => e.r.pistas],
    ['misiones', 'Misiones', e => e.r.misiones.length],
    ['ultima', 'Última actividad', e => e.r.ultimaActividad || ''],
  ];
  const filas = [...estudiantes].sort((a, b) => {
    const f = COLS.find(c => c[0] === orden.col)[2], x = f(a), y = f(b);
    return (x < y ? -1 : x > y ? 1 : 0) * (orden.asc ? 1 : -1);
  });
  const est = sel != null ? estudiantes.find(e => (e.perfil.id || e.perfil.nombre) === sel) : null;

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

        <div className={'profe-soltar' + (arrastre ? ' activo' : '')}
          onDragOver={e => { e.preventDefault(); setArrastre(true); }} onDragLeave={() => setArrastre(false)}
          onDrop={e => { e.preventDefault(); setArrastre(false); cargar([...e.dataTransfer.files]); }}>
          <p>Arrastra aquí los archivos <code>.json</code> que entregaron tus estudiantes, o</p>
          <button type="button" className="btn-pri" onClick={() => input.current?.click()}>Elegir archivos</button>
          <input ref={input} type="file" accept=".json,application/json" multiple hidden onChange={e => { cargar([...e.target.files]); e.target.value = ''; }} />
          <small>Los archivos se leen en este navegador; no se envían a ningún servidor.</small>
        </div>
        {errores.map(x => <p key={x} className="avance-alerta">{x}</p>)}

        {clase && <>
          <div className="avance-tarjetas">
            <div><strong>{clase.n}</strong><span>estudiantes</span></div>
            <div><strong>{clase.avance}%</strong><span>avance promedio</span></div>
            <div><strong>{minutos(clase.tiempo)}</strong><span>tiempo promedio</span></div>
            <div className={clase.alterados ? 'alerta' : ''}><strong>{clase.alterados}</strong><span>archivos alterados</span></div>
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
              {clase.categorias.map(([k, v]) => <div key={k} className="avance-cat"><span>{CATEGORIAS[k] || k}</span><i style={{ width: `${(100 * v) / clase.categorias[0][1]}%` }} /><small>{v}</small></div>)}
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
                  const k = e.perfil.id || e.perfil.nombre;
                  return (
                    <tr key={k} className={sel === k ? 'sel' : ''} onClick={() => setSel(sel === k ? null : k)}>
                      <td>{(!e.integro || e.perfil.alterado) && <span className="avance-alerta" title="Archivo modificado fuera de ClassBots">⚠ </span>}<button type="button" className="enlace">{e.perfil.nombre}</button></td>
                      <td>{e.perfil.grupo}</td><td>{e.r.capitulos}/{e.r.totalCapitulos}</td><td>{e.r.actual}</td><td>{minutos(e.r.tiempoTotal)}</td>
                      <td>{e.r.intentosPromedio ?? '—'}</td><td>{e.r.primerEnvio != null ? e.r.primerEnvio + '%' : '—'}</td><td>{e.r.pistas}</td><td>{e.r.misiones.length}</td>
                      <td>{e.r.ultimaActividad ? new Date(e.r.ultimaActividad).toLocaleString() : '—'}</td>
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

function DetalleEstudiante({ e }) {
  const [cap, setCap] = useState(null);
  const visibles = e.r.niveles.filter(n => n.intentos || n.superado || n.tiempo);
  const codigo = cap && e.progreso.codigo?.[cap];
  const [archivo, setArchivo] = useState(null);
  const archivos = codigo ? Object.keys(codigo.files || {}) : [];
  const actual = archivo && archivos.includes(archivo) ? archivo : archivos[0];
  return (
    <section className="profe-detalle">
      <h3>{e.perfil.nombre} <small>· {e.archivo} · exportado {new Date(e.exportado).toLocaleString()}{e.integro ? '' : ' · ⚠ alterado'}</small></h3>
      <div className="profe-scroll">
        <table className="profe-tabla compacta">
          <thead><tr><th>Cap.</th><th>Título</th><th>Estado</th><th>Tiempo</th><th>Ejec.</th><th>Envíos</th><th>Intentos hasta superar</th><th>Compilación</th><th>Estructura</th><th>Ejecución</th><th>Pistas</th><th>Prueba que más falló</th><th>Código</th></tr></thead>
          <tbody>{visibles.map(n => {
            const top = Object.entries(n.pruebasFallidas).sort((a, b) => b[1] - a[1])[0];
            return (
              <tr key={n.id} className={cap === n.id ? 'sel' : ''}>
                <td>{n.etiqueta}</td><td>{n.titulo}</td><td>{n.superado ? '✔ superado' : 'en curso'}{n.solucionUsada ? ' · vio solución' : ''}</td>
                <td>{minutos(n.tiempo)}</td><td>{n.ejecuciones}</td><td>{n.envios}</td><td>{n.intentosHastaExito ?? '—'}</td>
                <td>{n.compilacion}</td><td>{n.estructura}</td><td>{n.ejecucion}</td><td>{n.pistas}</td><td>{top ? `${top[0]} (${top[1]})` : '—'}</td>
                <td>{e.progreso.codigo?.[n.id] ? <button type="button" className="enlace" onClick={() => { setCap(cap === n.id ? null : n.id); setArchivo(null); }}>{cap === n.id ? 'ocultar' : 'ver'}</button> : '—'}</td>
              </tr>
            );
          })}</tbody>
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
