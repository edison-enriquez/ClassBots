import { useState } from 'react';
import Avatar from './Avatar.jsx';
import { resaltar } from '../util/resaltar.js';
import { useEscribir } from './Dialogo.jsx';

function Mentor({ texto }) {
  const [visible, listo, saltar] = useEscribir(texto, 16);
  return (
    <div className="mentor rpg-ventana" onClick={saltar}>
      <Avatar tamano={3} className="retrato" />
      <div className="dialogo-cuerpo">
        <span className="dialogo-nombre">CHISPA</span>
        <p className="globo tipeo"><span className="sr">{texto}</span><span className="tipeo-hueco" aria-hidden="true">{texto} ▼</span><span className="tipeo-txt" aria-hidden="true">{visible}{listo && <span className="cursor-rpg"> ▼</span>}</span></p>
      </div>
    </div>
  );
}

/* Columna izquierda: diálogo de Chispa, teoría, ejemplo, tarea y ayudas */
export default function Leccion({ nivel, mundo, superado, onSolucion, onGuia, profe = false }) {
  const [pista, setPista] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  return (
    <article className="leccion" key={nivel.id} onClick={e => { const g = e.target.closest?.('[data-guia]'); if (g) onGuia(g.dataset.guia); }}>
      <header className="lec-head">
        <span className="chip">{nivel.concepto}</span>
        <span className="rotulo">{nivel.mision
          ? `Misión especial · ${nivel.misionCorto} · paso ${nivel.enMundo + 1} de ${nivel.totalMundo}`
          : `Mundo ${mundo.id} · ${mundo.nombre} · capítulo ${nivel.enMundo + 1} de ${nivel.totalMundo}`}{superado ? ' · superado' : ''}</span>
      </header>
      <h2 className="lec-titulo">{nivel.titulo}</h2>
      <Mentor texto={nivel.mentor} />
      <div className="teoria" dangerouslySetInnerHTML={{ __html: nivel.teoria }} />
      <pre className="ejemplo"><code dangerouslySetInnerHTML={{ __html: resaltar(nivel.ejemplo) }} /></pre>
      <h3 className="rotulo">Ponlo a prueba</h3>
      <ol className="tareas">
        {nivel.tareas.map((t, i) => <li key={i}><span dangerouslySetInnerHTML={{ __html: t }} /></li>)}
      </ol>
      {nivel.nota && <p className="nota" dangerouslySetInnerHTML={{ __html: nivel.nota }} />}
      <div className="acciones">
        <button type="button" className="btn-sec" aria-expanded={pista} onClick={() => setPista(v => !v)}>{pista ? 'Ocultar pista' : 'Ver pista'}</button>
        {/* La respuesta solo está disponible en modo profesor */}
        {profe && (!confirmar
          ? <button type="button" className="btn-sec" onClick={() => setConfirmar(true)}>Mostrar la respuesta</button>
          : <span className="confirmar">Reemplaza tu código por la solución.
              <button type="button" className="btn-sec peligro" onClick={() => { setConfirmar(false); onSolucion(); }}>Reemplazar</button>
              <button type="button" className="btn-sec" onClick={() => setConfirmar(false)}>Cancelar</button>
            </span>)}
      </div>
      {pista && <p className="pista" dangerouslySetInnerHTML={{ __html: nivel.pista }} />}
    </article>
  );
}
