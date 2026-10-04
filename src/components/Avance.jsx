import { useRef, useState } from 'react';
import Avatar from './Avatar.jsx';
import { exportar, leerArchivo, aProgreso, resumen, nombreArchivo, descargar } from '../metricas/metricas.js';
import { guardarYRecargar } from '../hooks/useProgreso.js';
import { decodificarClase } from '../metricas/cifrado.js';

/* Campo para pegar el enlace o código de clase que comparte el profesor */
function CampoClase({ onClase, texto = 'Unirme' }) {
  const [valor, setValor] = useState('');
  const [error, setError] = useState('');
  const unir = () => {
    const c = decodificarClase(valor);
    if (!c) { setError('Ese enlace o código no es de una clase de ClassBots.'); return; }
    setError(''); setValor(''); onClase(c);
  };
  return (
    <div className="campo-clase">
      <input value={valor} onChange={e => setValor(e.target.value)} placeholder="Pega aquí el enlace o código de tu clase" aria-label="Enlace o código de clase" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); unir(); } }} />
      <button type="button" className="btn-sec" onClick={unir} disabled={!valor.trim()}>{texto}</button>
      {error && <p className="avance-alerta">{error}</p>}
    </div>
  );
}
const Clase = ({ clase }) => (clase
  ? <p className="clase-chip">🏫 Clase <strong>{clase.nombre}</strong>{clase.docente ? ` · ${clase.docente}` : ''}</p>
  : null);

/* Lee un archivo de avance elegido por el usuario y pide confirmación antes de reemplazar */
function useCargarAvance(prog) {
  const input = useRef(null);
  const [pendiente, setPendiente] = useState(null);
  const [error, setError] = useState('');
  const elegir = () => { setError(''); input.current?.click(); };
  const alElegir = async e => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try { setPendiente(leerArchivo(await f.text())); } catch (err) { setError(err.message); }
  };
  const confirmar = () => guardarYRecargar(aProgreso(pendiente, prog));
  const campo = <input ref={input} type="file" accept=".json,application/json" hidden onChange={alElegir} />;
  const aviso = pendiente && (
    <div className="avance-confirmar" role="alert">
      <p>Vas a cargar el avance de <strong>{pendiente.perfil.nombre}</strong>{pendiente.perfil.grupo ? ` (${pendiente.perfil.grupo})` : ''}: {pendiente.resumen?.capitulos ?? '?'} capítulos superados, exportado el {new Date(pendiente.exportado).toLocaleString()}.</p>
      {!pendiente.integro && <p className="avance-alerta">⚠ El archivo fue modificado fuera de ClassBots. Se puede cargar, pero el profesor lo verá marcado.</p>}
      <p>Reemplazará el avance que hay ahora en este navegador.</p>
      <div className="modal-acc">
        <button type="button" className="btn-sec" onClick={() => setPendiente(null)}>Cancelar</button>
        <button type="button" className="btn-pri" onClick={confirmar}>Cargar este avance</button>
      </div>
    </div>
  );
  return { elegir, campo, aviso, error };
}

/* ---------- Bienvenida: identifica al estudiante en este navegador ---------- */
export function Bienvenida({ prog, onListo, onClase }) {
  const [nombre, setNombre] = useState('');
  const [grupo, setGrupo] = useState('');
  const carga = useCargarAvance(prog);
  const valido = nombre.trim().length >= 3;
  const enviar = e => {
    e.preventDefault();
    if (!valido) return;
    onListo({ nombre: nombre.trim().replace(/\s+/g, ' ').slice(0, 60), grupo: grupo.trim().slice(0, 40), id: Math.random().toString(36).slice(2, 10), creado: new Date().toISOString() });
  };
  return (
    <div className="modal-fondo" role="dialog" aria-modal="true" aria-labelledby="bienv-t">
      <form className="modal rpg-ventana bienvenida" onSubmit={enviar}>
        <Avatar tamano={4} />
        <h2 id="bienv-t">¡Bienvenido a ClassBots!</h2>
        <p>Soy Chispa, la jefa del taller. ¿Cómo te llamas? Así registro tu avance para que se lo puedas entregar a tu profesor.</p>
        {prog.clase && <Clase clase={prog.clase} />}
        <label className="campo">Nombre completo
          <input name="nombre" autoFocus value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej.: Ana María Pérez" maxLength={60} autoComplete="name" />
        </label>
        <label className="campo">Grupo o curso <small>(opcional)</small>
          <input name="grupo" value={grupo} onChange={e => setGrupo(e.target.value)} placeholder="Ej.: POO 2026-2 · G1" maxLength={40} />
        </label>
        {!prog.clase && (
          <details className="bienv-clase">
            <summary>¿Tu profesor te dio un enlace o código de clase?</summary>
            <CampoClase onClase={onClase} texto="Usar" />
          </details>
        )}
        <button type="submit" className="btn-pri" disabled={!valido}>Entrar al taller →</button>
        <p className="bienv-sep">¿Ya empezaste en otro computador?</p>
        <button type="button" className="btn-sec" onClick={carga.elegir}>Cargar mi avance (.json)</button>
        {carga.campo}
        {carga.error && <p className="avance-alerta">{carga.error}</p>}
        {carga.aviso}
        <p className="bienv-nota">Tu avance se guarda solo en este navegador. Descárgalo desde «Mi avance» para llevarlo a otro equipo o entregarlo.</p>
      </form>
    </div>
  );
}

/* ---------- Mi avance: resumen, descarga del entregable y carga en otro equipo ---------- */
export function MiAvance({ prog, sellar, onCerrar, onPerfil, onClase }) {
  // El estudiante ve su avance, no las métricas: esas viajan cifradas para el profesor
  const r = resumen({ progreso: prog });
  const carga = useCargarAvance(prog);
  const [cambiar, setCambiar] = useState(false);
  const [editar, setEditar] = useState(false);
  const [nombre, setNombre] = useState(prog.perfil?.nombre || '');
  const [grupo, setGrupo] = useState(prog.perfil?.grupo || '');
  const [descargado, setDescargado] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [fallo, setFallo] = useState('');
  const bajar = async () => {
    setOcupado(true); setFallo('');
    try {
      const sobre = await sellar();
      descargar(nombreArchivo(prog.perfil), JSON.stringify(exportar(prog, [...(prog.segmentos || []), sobre]), null, 2));
      setDescargado(true);
    } catch (e) { setFallo('No se pudo preparar el archivo: ' + e.message); }
    setOcupado(false);
  };
  return (
    <div className="modal-fondo" role="dialog" aria-modal="true" aria-labelledby="avance-t" onClick={e => { if (e.target === e.currentTarget) onCerrar(); }}>
      <div className="modal rpg-ventana avance">
        <header className="avance-cab">
          <div>
            <p className="mapa-kicker">MI AVANCE</p>
            {!editar
              ? <h2 id="avance-t">{prog.perfil?.nombre} {prog.perfil?.grupo && <small>· {prog.perfil.grupo}</small>} <button type="button" className="enlace" onClick={() => setEditar(true)}>editar</button></h2>
              : <form className="avance-editar" onSubmit={e => { e.preventDefault(); if (nombre.trim().length >= 3) { onPerfil({ ...prog.perfil, nombre: nombre.trim(), grupo: grupo.trim() }); setEditar(false); } }}>
                  <input value={nombre} onChange={e => setNombre(e.target.value)} aria-label="Nombre" maxLength={60} />
                  <input value={grupo} onChange={e => setGrupo(e.target.value)} aria-label="Grupo" placeholder="Grupo" maxLength={40} />
                  <button type="submit" className="btn-mini">Guardar</button>
                </form>}
          </div>
          <button type="button" className="mapa-cerrar" onClick={onCerrar} aria-label="Cerrar" autoFocus>×</button>
        </header>

        <div className="avance-tarjetas">
          <div><strong>{r.capitulos}<small>/{r.totalCapitulos}</small></strong><span>capítulos superados</span></div>
          <div><strong>{r.pct}%</strong><span>de la ruta principal</span></div>
          <div><strong>{r.misiones.length}</strong><span>misiones especiales</span></div>
          <div><strong className="avance-actual">{r.actual}</strong><span>vas en</span></div>
        </div>

        <section className="avance-mundos" aria-label="Avance por mundo">
          {r.mundos.map(w => (
            <div key={w.id} className="avance-mundo">
              <span>{w.id} · {w.nombre}</span>
              <span className="exp-barra" role="progressbar" aria-valuemin={0} aria-valuemax={w.total} aria-valuenow={w.superados} aria-label={`Mundo ${w.id}`}><i style={{ width: `${(100 * w.superados) / w.total}%` }} /></span>
              <small>{w.superados}/{w.total}</small>
            </div>
          ))}
        </section>

        <section className="avance-clase">
          {prog.clase ? <Clase clase={prog.clase} /> : <p className="bienv-nota">Todavía no estás en una clase. Si tu profesor te dio un enlace o código, pégalo aquí.</p>}
          <details>
            <summary>{prog.clase ? 'Cambiar de clase' : 'Unirme a una clase'}</summary>
            <CampoClase onClase={onClase} />
          </details>
        </section>
        <p className="avance-cifrado">🔒 Mientras trabajas, ClassBots registra cómo avanzas (tiempo, intentos, errores, forma de escribir, cambios de nombre). Esos datos viajan <strong>cifrados</strong> dentro de tu archivo: solo tu profesor puede leerlos.</p>

        <section className="avance-acciones">
          <div>
            <h3>Entregar o llevar a otro computador</h3>
            <p>Descarga tu avance: incluye tu código, tus capítulos y tus métricas. Ese archivo es tu <strong>entregable</strong> para el profesor, y también sirve para continuar en otro equipo.</p>
          </div>
          <div className="modal-acc">
            <button type="button" className="btn-pri" onClick={bajar} disabled={ocupado}>{ocupado ? 'Preparando…' : '⬇ Descargar mi avance'}</button>
            <button type="button" className="btn-sec" onClick={carga.elegir}>⬆ Cargar un avance</button>
            {!cambiar
              ? <button type="button" className="btn-sec" onClick={() => setCambiar(true)}>Cambiar de estudiante</button>
              : <span className="confirmar">{descargado ? 'Se borrará este avance del navegador.' : 'Aún no descargas este avance: se perderá.'}
                  <button type="button" className="btn-mini peligro" onClick={() => guardarYRecargar(null)}>Borrar y salir</button>
                  <button type="button" className="btn-mini" onClick={() => setCambiar(false)}>Cancelar</button>
                </span>}
          </div>
          {fallo && <p className="avance-alerta">{fallo}</p>}
          {descargado && <p className="avance-ok">✔ Archivo descargado: {nombreArchivo(prog.perfil)}</p>}
          {carga.campo}
          {carga.error && <p className="avance-alerta">{carga.error}</p>}
          {carga.aviso}
        </section>
      </div>
    </div>
  );
}
