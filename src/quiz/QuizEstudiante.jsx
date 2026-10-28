/* Quiz en vivo, lado del estudiante: recibe el estado firmado por su profesor, muestra la pregunta
   y envía su voto cifrado para la clase. Cada voto queda también en sus métricas. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { QUIZZES, LETRAS } from './repaso.js';
import { decodificarEstado, textoFirmaQuiz } from './logica.js';
import { verificarTexto, cifrarParaClase } from '../metricas/cifrado.js';
import { resaltar } from '../util/resaltar.js';

export function useQuizEstudiante({ clase, enviar, onEvento }) {
  const [p, setP] = useState(null);         // estado verificado: { q, n, f, r, t }
  const [votos, setVotos] = useState({});   // `${q}|${n}|${r}` → opción
  const [envio, setEnvio] = useState('');   // '', 'enviando', 'ok', 'error'
  const desde = useRef(Date.now());
  const refs = useRef({});
  refs.current = { clase, enviar, onEvento };

  const recibir = useCallback(async texto => {
    const d = decodificarEstado(texto);
    const c = refs.current.clase;
    if (!d || !c?.firma) return;
    if (!(await verificarTexto(c, textoFirmaQuiz(c.id, d.json), d.firma))) return;
    // Un estado viejo que llega tarde no reemplaza al actual
    setP(prev => (prev && prev.q === d.p.q && prev.t > d.p.t ? prev : d.p));
  }, []);

  // Al abrirse una votación nueva, empieza a contar el tiempo de respuesta
  const clave = p && p.f !== 'fin' ? `${p.q}|${p.n}|${p.r}` : '';
  useEffect(() => { if (p?.f === 'votando') { desde.current = Date.now(); setEnvio(''); } }, [clave, p?.f]); // eslint-disable-line react-hooks/exhaustive-deps

  const votar = async o => {
    const { clase: c, enviar: env, onEvento: ev } = refs.current;
    if (!p || p.f !== 'votando' || !c) return;
    const quiz = QUIZZES[p.q], preg = quiz.preguntas[p.n];
    setVotos(v => ({ ...v, [clave]: o }));
    setEnvio('enviando');
    const x = { q: p.q, n: p.n, r: p.r, o, ms: Date.now() - desde.current, t: Date.now() };
    let ok = false;
    try { ok = !!env({ tipo: 'quiz-resp', sobre: await cifrarParaClase(x, c) }); } catch { ok = false; }
    setEnvio(ok ? 'ok' : 'error');
    ev?.({ tipo: 'quiz', quiz: p.q, pregunta: p.n + 1, mundo: preg.mundo, concepto: preg.concepto, ronda: p.r, opcion: LETRAS[o], acierto: o === preg.correcta });
  };

  const cerrar = () => { setP(null); setVotos({}); };
  const vista = p ? <QuizEstudiante p={p} votos={votos} envio={envio} onVotar={votar} onCerrar={cerrar} /> : null;
  return { recibir, vista, activo: !!p };
}

function QuizEstudiante({ p, votos, envio, onVotar, onCerrar }) {
  const quiz = QUIZZES[p.q];
  if (p.f === 'fin') {
    const total = quiz.preguntas.length;
    const aciertos = quiz.preguntas.filter((x, n) => votos[`${p.q}|${n}|1`] === x.correcta).length;
    const votadas = quiz.preguntas.filter((x, n) => votos[`${p.q}|${n}|1`] != null).length;
    return (
      <div className="modal-fondo quiz-fondo" role="dialog" aria-modal="true" aria-labelledby="quiz-t">
        <div className="modal rpg-ventana quiz-est">
          <p className="mapa-kicker">QUIZ DE REPASO · TERMINADO</p>
          <h2 id="quiz-t">🎯 {quiz.titulo}</h2>
          {votadas
            ? <p>En el primer voto acertaste <strong>{aciertos} de {total}</strong>{votadas < total ? ` (respondiste ${votadas})` : ''}. Repasa en el juego los conceptos que fallaste.</p>
            : <p>El quiz terminó.</p>}
          <div className="modal-acc"><button type="button" className="btn-pri" autoFocus onClick={onCerrar}>Volver al juego</button></div>
        </div>
      </div>
    );
  }
  const preg = quiz.preguntas[p.n];
  const revelada = p.f === 'revelada';
  // Al revelar tras la ronda 2, quien no volvió a votar conserva su voto de la ronda 1
  const mio = votos[`${p.q}|${p.n}|${p.r}`] ?? (revelada ? votos[`${p.q}|${p.n}|1`] : undefined);
  const estado = p.f === 'votando'
    ? (mio == null ? 'Elige una opción. Puedes cambiarla mientras la votación siga abierta.'
      : envio === 'error' ? '⚠ No se pudo enviar (sin conexión con el aula). Vuelve a tocar tu opción.'
        : envio === 'enviando' ? 'Enviando…' : `✔ Votaste ${LETRAS[mio]}. Puedes cambiarla mientras siga abierta.`)
    : p.f === 'cerrada' ? (mio == null ? 'Votación cerrada: no alcanzaste a votar.' : `Votación cerrada. Votaste ${LETRAS[mio]}. Espera a tu profesor.`)
      : '';
  return (
    <div className="modal-fondo quiz-fondo" role="dialog" aria-modal="true" aria-labelledby="quiz-t">
      <div className="modal rpg-ventana quiz-est">
        <p className="mapa-kicker">QUIZ DE REPASO · PREGUNTA {p.n + 1} DE {quiz.preguntas.length} · MUNDO {preg.mundo} · {preg.concepto.toUpperCase()}</p>
        {p.r === 2 && !revelada && <p className="quiz-ronda2">👥 Ronda 2: convence a tu compañero (o déjate convencer) y vuelve a votar.</p>}
        <h2 id="quiz-t">{preg.enunciado}</h2>
        {preg.codigo && <pre className="ejemplo quiz-codigo"><code dangerouslySetInnerHTML={{ __html: resaltar(preg.codigo) }} /></pre>}
        <div className="quiz-opciones" role="group" aria-label="Opciones">
          {preg.opciones.map((op, o) => {
            const cls = 'quiz-op' + (mio === o ? ' elegida' : '') + (revelada && o === preg.correcta ? ' correcta' : '') + (revelada && mio === o && o !== preg.correcta ? ' incorrecta' : '');
            return (
              <button key={o} type="button" className={cls} disabled={p.f !== 'votando'} aria-pressed={mio === o} onClick={() => onVotar(o)}>
                <span className="quiz-letra">{LETRAS[o]}</span><span className="quiz-texto">{op}</span>
              </button>
            );
          })}
        </div>
        {estado && <p className="quiz-estado" role="status">{estado}</p>}
        {revelada && (
          <div className="quiz-explica" role="status">
            <strong>{mio == null ? `La correcta es ${LETRAS[preg.correcta]}.` : mio === preg.correcta ? '✔ ¡Acertaste!' : `✖ La correcta es ${LETRAS[preg.correcta]}.`}</strong> {preg.explicacion}
          </div>
        )}
      </div>
    </div>
  );
}
