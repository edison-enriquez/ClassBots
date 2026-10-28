/* Quiz en vivo, lado del profesor: pantalla para proyectar. Muestra la pregunta y cuántos han
   respondido, nunca quién votó qué; la distribución aparece solo al revelar, para no inducir el voto.
   Flujo por pregunta (peer instruction): ronda 1 → cerrar → (ronda 2 en parejas) → revelar → siguiente. */
import { useEffect, useState } from 'react';
import { useDocente } from '../aula/docente.js';
import { QUIZZES, LETRAS } from './repaso.js';
import { resumen, recomendacion, csvQuiz } from './logica.js';
import { descargar } from '../metricas/metricas.js';
import { resaltar } from '../util/resaltar.js';

const reloj = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

export default function QuizProyector({ docente }) {
  useDocente(docente);
  const z = docente.quiz;
  const [min, setMin] = useState(false);
  const [privado, setPrivado] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [, tic] = useState(0);
  useEffect(() => { if (!z || z.f !== 'votando') return undefined; const t = setInterval(() => tic(x => x + 1), 1000); return () => clearInterval(t); }, [z?.f, z?.abierta]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setPrivado(false); }, [z?.n, z?.r]);
  if (!z) return null;
  const quiz = QUIZZES[z.q];
  const sala = docente.sala(z.claseId);
  const enLinea = Object.values(sala?.alumnos || {}).filter(a => a.conectado).length;
  const res = resumen(quiz, z.respuestas);

  if (min) {
    return <button type="button" className="btn-pri quiz-chip" onClick={() => setMin(false)}>🎯 Quiz en curso · pregunta {z.n + 1} · volver</button>;
  }

  if (z.f === 'fin') {
    const nombre = id => docente.nombreAlumno(z.claseId, id);
    const total = quiz.preguntas.length;
    const alumnos = res.alumnos.map(a => ({ ...a, nombre: nombre(a.id) })).sort((a, b) => a.r1ok - b.r1ok || a.nombre.localeCompare(b.nombre));
    return (
      <div className="quiz-proy" role="dialog" aria-modal="true" aria-labelledby="qp-t">
        <div className="quiz-proy-cab">
          <p className="mapa-kicker">QUIZ DE REPASO · RESUMEN</p>
          <h2 id="qp-t">{quiz.titulo}</h2>
        </div>
        <div className="quiz-proy-cuerpo">
          <h3>Acierto en el primer voto, por mundo</h3>
          <div className="quiz-barras">
            {res.mundos.map(m => (
              <div key={m.mundo} className="quiz-barra-fila">
                <span>Mundo {m.mundo}</span>
                <span className="quiz-barra"><span className={'quiz-barra-in' + (m.pct != null && m.pct < 60 ? ' baja' : '')} style={{ width: `${m.pct ?? 0}%` }} /></span>
                <strong>{m.pct == null ? '—' : `${m.pct} %`}</strong>
              </div>
            ))}
          </div>
          <p className="bienv-nota">Por debajo de 60 % (en rojo): vale la pena reforzar ese mundo antes del examen.</p>
          <h3>Por pregunta</h3>
          <table className="profe-tabla quiz-tabla">
            <thead><tr><th>#</th><th>Concepto</th><th>Mundo</th><th>Ronda 1</th><th>Ronda 2</th></tr></thead>
            <tbody>{res.preguntas.map(x => (
              <tr key={x.n}><td>{x.n + 1}</td><td>{x.concepto}</td><td>{x.mundo}</td>
                <td>{x.r1.total ? `${x.r1.pct} % (${x.r1.correctas}/${x.r1.total})` : '—'}</td>
                <td>{x.r2.total ? `${x.r2.pct} % (${x.r2.correctas}/${x.r2.total})` : '—'}</td></tr>
            ))}</tbody>
          </table>
          <details>
            <summary>Por estudiante (no proyectar)</summary>
            <table className="profe-tabla quiz-tabla">
              <thead><tr><th>Estudiante</th><th>Aciertos 1.er voto</th><th>Votos ronda 2</th></tr></thead>
              <tbody>{alumnos.map(a => <tr key={a.id}><td>{a.nombre}</td><td>{a.r1ok} de {total} ({a.r1} respondidas)</td><td>{a.r2 ? `${a.r2ok} de ${a.r2}` : '—'}</td></tr>)}</tbody>
            </table>
          </details>
        </div>
        <div className="quiz-proy-acc">
          <button type="button" className="btn-sec" onClick={() => descargar(`ClassBots_quiz_${new Date(z.inicio).toISOString().slice(0, 10)}.csv`, csvQuiz(quiz, z.respuestas, nombre), 'text/csv')}>⬇ CSV de respuestas</button>
          <button type="button" className="btn-pri" onClick={() => docente.cerrarQuiz()}>Cerrar</button>
        </div>
      </div>
    );
  }

  const preg = quiz.preguntas[z.n];
  const actual = res.preguntas[z.n][`r${z.r}`];
  const r1 = res.preguntas[z.n].r1, r2 = res.preguntas[z.n].r2;
  const ultima = z.n + 1 >= quiz.preguntas.length;
  const revelada = z.f === 'revelada';
  return (
    <div className="quiz-proy" role="dialog" aria-modal="true" aria-labelledby="qp-t">
      <div className="quiz-proy-cab">
        <p className="mapa-kicker">PREGUNTA {z.n + 1} DE {quiz.preguntas.length} · MUNDO {preg.mundo} · {preg.concepto.toUpperCase()}</p>
        <div className="quiz-proy-meta">
          {z.r === 2 && <span className="quiz-ronda2">👥 Ronda 2 · en parejas</span>}
          <span className="quiz-cuenta">{actual.total} de {enLinea} respondieron</span>
          {z.f === 'votando' && <span className="quiz-reloj">⏱ {reloj(Date.now() - z.abierta)}</span>}
          {z.f === 'cerrada' && <span className="quiz-reloj">Votación cerrada</span>}
        </div>
      </div>
      <div className="quiz-proy-cuerpo">
        <h2 id="qp-t">{preg.enunciado}</h2>
        {revelada && <p className="quiz-explica"><strong>Correcta: {LETRAS[preg.correcta]}.</strong> {preg.explicacion}{r2.total ? ` · Acierto: ${r1.pct ?? 0} % → ${r2.pct} %.` : r1.total ? ` · Acierto: ${r1.pct} %.` : ''}</p>}
        {preg.codigo && <pre className="ejemplo quiz-codigo"><code dangerouslySetInnerHTML={{ __html: resaltar(preg.codigo) }} /></pre>}
        <div className="quiz-opciones grande">
          {preg.opciones.map((op, o) => (
            <div key={o} className={'quiz-op' + (revelada && o === preg.correcta ? ' correcta' : '')}>
              <span className="quiz-letra">{LETRAS[o]}</span>
              <span className="quiz-texto">{op}</span>
              {revelada && (
                <span className="quiz-dist" aria-label={`Ronda 1: ${r1.dist[o]} votos${r2.total ? `; ronda 2: ${r2.dist[o]}` : ''}`}>
                  <span className="quiz-barra"><span className="quiz-barra-in r1" style={{ width: `${r1.total ? (100 * r1.dist[o]) / r1.total : 0}%` }} /></span>
                  {r2.total > 0 && <span className="quiz-barra"><span className="quiz-barra-in r2" style={{ width: `${(100 * r2.dist[o]) / r2.total}%` }} /></span>}
                  <small>{r1.dist[o]}{r2.total ? ` → ${r2.dist[o]}` : ''}</small>
                </span>
              )}
            </div>
          ))}
        </div>
        {revelada && r1.total > 0 && <p className="quiz-leyenda"><span><i style={{ background: 'var(--info)' }} />Ronda 1</span>{r2.total > 0 && <span><i style={{ background: 'var(--gold)' }} />Ronda 2 (en parejas)</span>}</p>}
      </div>
      <div className="quiz-proy-acc">
        {z.f === 'cerrada' && (
          <div className="quiz-privado">
            {privado
              ? <span>Solo para ti: acierto en ronda {z.r}, <strong>{actual.pct ?? 0} %</strong> ({actual.correctas}/{actual.total}). {z.r === 1 ? recomendacion(actual.pct) : ''} <button type="button" className="btn-mini" onClick={() => setPrivado(false)}>Ocultar</button></span>
              : <button type="button" className="btn-mini" onClick={() => setPrivado(true)} title="No lo muestres en el proyector antes de la ronda 2">👁 Ver acierto (no proyectar)</button>}
          </div>
        )}
        {z.f === 'votando' && <button type="button" className="btn-pri" onClick={() => docente.moverQuiz({ f: 'cerrada' })}>Cerrar votación</button>}
        {z.f === 'cerrada' && z.r === 1 && <button type="button" className="btn-sec" onClick={() => docente.moverQuiz({ f: 'votando', r: 2 })}>👥 Ronda 2 en parejas</button>}
        {z.f === 'cerrada' && <button type="button" className="btn-pri" onClick={() => docente.moverQuiz({ f: 'revelada' })}>Revelar respuesta</button>}
        {revelada && (ultima
          ? <button type="button" className="btn-pri" onClick={() => docente.moverQuiz({ f: 'fin' })}>Ver resumen →</button>
          : <button type="button" className="btn-pri" onClick={() => docente.moverQuiz({ n: z.n + 1, r: 1, f: 'votando' })}>Siguiente pregunta →</button>)}
        <span className="quiz-espacio" />
        <button type="button" className="btn-mini" onClick={() => setMin(true)} title="Volver al juego o al panel; el quiz sigue">Minimizar</button>
        {confirmar
          ? <span className="quiz-confirma">¿Terminar ya? <button type="button" className="btn-mini peligro" onClick={() => { setConfirmar(false); docente.moverQuiz({ f: 'fin' }); }}>Sí, ver resumen</button> <button type="button" className="btn-mini" onClick={() => setConfirmar(false)}>No</button></span>
          : <button type="button" className="btn-mini" onClick={() => setConfirmar(true)}>Terminar quiz</button>}
      </div>
    </div>
  );
}
