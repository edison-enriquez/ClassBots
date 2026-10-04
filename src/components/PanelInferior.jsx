import { useEffect, useState } from 'react';
import UmlPanel from './UmlPanel.jsx';

const ICONO = { ok: '✓', falla: '✗', error: '!', pendiente: '•' };

/* Panel de resultados al estilo juez en línea: pruebas, consola, problemas, UML y eventos */
export default function PanelInferior({ nivel, objetivo, resultado, enviado, problemas, modelo, tab, setTab, onIrA, onCorregir }) {
  const nProb = problemas.length, nErr = problemas.filter(p => p.sev === 'err').length;
  const tabs = [
    ['pruebas', 'Casos de prueba', resultado?.casos?.length ? `${resultado.aprobados}/${resultado.casos.length}` : null],
    ['consola', 'Consola', null],
    ['problemas', 'Problemas', nProb ? String(nProb) : null, nErr ? 'err' : nProb ? 'warn' : ''],
    ['uml', 'UML', null],
    ['eventos', 'Eventos', resultado?.animacion?.log?.length ? String(resultado.animacion.log.length) : null],
  ];
  return (
    <section className="panel-inf" aria-label="Resultados">
      <div className="tabs" role="tablist">
        {tabs.map(([id, txt, badge, cls]) => (
          <button key={id} role="tab" type="button" className="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
            {txt}{badge && <span className={'badge ' + (cls || '')}>{badge}</span>}
          </button>
        ))}
      </div>
      <div className="tab-cuerpo" role="tabpanel">
        {tab === 'pruebas' && <Pruebas nivel={nivel} r={resultado} enviado={enviado} onIrA={onIrA} />}
        {tab === 'consola' && <Consola r={resultado} onIrA={onIrA} />}
        {tab === 'problemas' && <Problemas lista={problemas} onIrA={onIrA} onCorregir={onCorregir} />}
        {tab === 'uml' && <UmlPanel modelo={modelo} objetivo={objetivo} />}
        {tab === 'eventos' && <Eventos r={resultado} />}
      </div>
    </section>
  );
}

function ErroresCompilacion({ errores, onIrA }) {
  return (
    <ul className="errores">
      {errores.map((e, k) => (
        <li key={k}><button type="button" className="loc" onClick={() => onIrA(e.archivo, e.linea)}>{e.archivo}:{e.linea}</button> <span>{e.msg}</span></li>
      ))}
    </ul>
  );
}

function Pruebas({ nivel, r, enviado, onIrA }) {
  const [sel, setSel] = useState(0);
  useEffect(() => { if (r?.casos) { const k = r.casos.findIndex(c => c.estado === 'falla' || c.estado === 'error'); setSel(k >= 0 ? k : 0); } }, [r]);
  if (!r) {
    return (
      <div className="pruebas-vacio">
        <p>Pulsa <strong>Ejecutar código</strong> para correr los casos de ejemplo. <strong>Enviar</strong> corre además los casos ocultos y, si todo pasa, supera el capítulo.</p>
        <ul className="casos-lista solo">
          {nivel.pruebas.map((p, i) => <li key={i} className="pendiente"><span className="ic">{p.oculto ? '🔒' : '•'}</span>{p.oculto ? `Caso oculto ${i}` : `Caso de prueba ${i}`}<small>{p.oculto ? 'se revela al enviar' : p.nombre}</small></li>)}
        </ul>
      </div>
    );
  }
  if (r.estado === 'compilacion') {
    return (
      <div className="veredicto mal">
        <h3>Error de compilación</h3>
        <p>Corrige estos problemas y vuelve a ejecutar. Toca la ubicación para ir a la línea.</p>
        <ErroresCompilacion errores={r.errores} onIrA={onIrA} />
      </div>
    );
  }
  if (r.estado === 'previo') {
    return (
      <div className="veredicto mal">
        <h3>Tu código compila, pero falta algo</h3>
        <p>{r.previo}</p>
      </div>
    );
  }
  const c = r.casos[sel] || r.casos[0];
  const titulo = r.todosOk ? (enviado ? '¡Todos los casos pasaron!' : 'Casos de ejemplo aprobados') : `${r.aprobados} de ${r.evaluados} casos aprobados`;
  return (
    <div className="juez">
      <div className={'veredicto ' + (r.todosOk || (!enviado && r.aprobados === r.evaluados) ? 'bien' : 'mal')}>
        <h3>{titulo}</h3>
        {!enviado && r.aprobados === r.evaluados && <p>Los casos ocultos se revisan al <strong>Enviar</strong>.</p>}
        {enviado && r.todosOk && <p>{nivel.exito}</p>}
        {r.errorEjecucion && <p className="err-run">Error al ejecutar: {r.errorEjecucion}</p>}
      </div>
      <div className="juez-cuerpo">
        <ul className="casos-lista" role="listbox" aria-label="Casos de prueba">
          {r.casos.map((k, i) => (
            <li key={i} role="option" aria-selected={i === sel} className={k.estado} tabIndex={0} onClick={() => setSel(i)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setSel(i); }}>
              <span className="ic">{k.oculto && k.estado === 'pendiente' ? '🔒' : ICONO[k.estado]}</span>
              {k.oculto ? `Caso oculto ${i}` : `Caso de prueba ${i}`}
            </li>
          ))}
        </ul>
        <div className="caso-detalle">
          {c.estado === 'pendiente'
            ? <p className="dim">Este caso está oculto. Se ejecuta cuando pulses <strong>Enviar</strong>.</p>
            : <>
                <h4>{c.nombre}{c.ms ? <small> · {c.ms} ms</small> : null}</h4>
                {c.oculto && <p className="dim">Caso oculto: solo ves si pasó y qué obtuviste.</p>}
                {c.entrada && <Bloque titulo="Entrada" txt={c.entrada} />}
                {c.error
                  ? <Bloque titulo="Error" txt={c.error} cls="mal" />
                  : <>
                      {!c.oculto && <Bloque titulo="Salida esperada" txt={c.esperado} />}
                      <Bloque titulo="Tu salida" txt={c.obtenido} cls={c.ok ? 'bien' : 'mal'} />
                    </>}
                {c.detalle && <p className="detalle">{c.detalle}</p>}
              </>}
        </div>
      </div>
    </div>
  );
}
const Bloque = ({ titulo, txt, cls = '' }) => (
  <div className="bloque">
    <span className="rotulo">{titulo}</span>
    <pre className={'salida ' + cls}>{String(txt ?? '')}</pre>
  </div>
);

function Consola({ r, onIrA }) {
  if (!r) return <pre className="consola"><span className="dim">Aquí verás lo que imprima tu programa y los errores del compilador.</span></pre>;
  return (
    <pre className="consola">
      {r.errores?.length > 0 && <><span className="mal">El compilador encontró {r.errores.length} problema{r.errores.length > 1 ? 's' : ''}:</span>{'\n'}
        {r.errores.map((e, k) => <span key={k}><button type="button" className="loc" onClick={() => onIrA(e.archivo, e.linea)}>{e.archivo}:{e.linea}</button>  <span className="mal">{e.msg}</span>{'\n'}</span>)}</>}
      {r.previo && <span className="mal">{r.previo}{'\n'}</span>}
      {r.salida?.length > 0 && r.salida.join('\n') + '\n'}
      {r.errorEjecucion && <span className="mal">{r.errorEjecucion}{'\n'}</span>}
      {!r.errores?.length && !r.previo && !r.salida?.length && !r.errorEjecucion && <span className="dim">El programa terminó sin imprimir nada.</span>}
    </pre>
  );
}

function Problemas({ lista, onIrA, onCorregir }) {
  if (!lista.length) return <p className="limpio">Sin problemas detectados. El asistente revisa tu código mientras escribes.</p>;
  return (
    <ul className="problemas">
      {lista.map((p, k) => (
        <li key={k} className={p.sev}>
          <button type="button" className="ir" onClick={() => onIrA(p.archivo, p.linea)}>
            <span className="ic">{p.sev === 'err' ? '●' : '▲'}</span><span className="lc">{p.archivo}:{p.linea}</span><span className="ms">{p.msg}</span>
          </button>
          {p.fix && <button type="button" className="btn-mini" onClick={() => onCorregir(p.archivo, p.linea, p.fix)}>Corregir</button>}
        </li>
      ))}
    </ul>
  );
}

function Eventos({ r }) {
  const log = r?.animacion?.log || [];
  if (!log.length) return <p className="dim pad">Todavía no hay eventos. Ejecuta tu código: aquí verás cada objeto creado, cada atributo que cambia y cada método llamado.</p>;
  const cls = Object.fromEntries((r.animacion.registro || []).map(x => [x.id, x.cls]));
  const v = x => (typeof x === 'string' ? JSON.stringify(x) : String(x));
  return (
    <ol className="eventos">
      {log.slice(0, 400).map((ev, i) => {
        let op, val;
        if (ev.t === 'crear') { op = 'new'; val = `${ev.cls}#${ev.id}`; }
        else if (ev.t === 'set') { op = 'set'; val = `${cls[ev.id] || 'Obj'}#${ev.id}.${ev.campo} = ${v(ev.valor)}`; }
        else if (ev.t === 'llamada') { op = 'call'; val = `${cls[ev.id] || 'Obj'}#${ev.id}.${ev.metodo}(${ev.args.join(', ')})`; }
        else { op = 'out'; val = ev.texto; }
        return <li key={i}><span className="n">{i + 1}</span><span className={'op op-' + op}>{op}</span><span className="val">{val}</span></li>;
      })}
    </ol>
  );
}
