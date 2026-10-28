/* Quiz en vivo: protocolo y cálculos (sin React ni red, para poder probarlos).

   El profesor difunde el estado con el mensaje del aula (un solo envío llega a toda la clase, así
   no choca con el límite de mensajes del servidor). El texto lleva una firma con la llave de la
   clase, así nadie más puede mover el quiz:  classbots-quiz:<firma>:<json>
   Las preguntas viajan dentro de la app (src/quiz/repaso.js); el estado solo dice cuál y en qué fase.
   Las respuestas del estudiante van cifradas para la clase por el canal de reenvío del aula. */
import { QUIZZES } from './repaso.js';

export const PREFIJO = 'classbots-quiz:';
export const FASES = ['votando', 'cerrada', 'revelada', 'fin'];
export const textoFirmaQuiz = (claseId, json) => `classbots-quiz|${claseId}|${json}`;

export const codificarEstado = (json, firma) => `${PREFIJO}${firma}:${json}`;
export function decodificarEstado(texto) {
  if (typeof texto !== 'string' || !texto.startsWith(PREFIJO)) return null;
  const resto = texto.slice(PREFIJO.length), k = resto.indexOf(':');
  if (k < 1) return null;
  const firma = resto.slice(0, k), json = resto.slice(k + 1);
  let p; try { p = JSON.parse(json); } catch { return null; }
  return estadoValido(p) ? { firma, json, p } : null;
}

/* p = { q: id del quiz, n: pregunta (0…), f: fase, r: ronda 1|2, t: hora } */
export function estadoValido(p) {
  if (!p || typeof p !== 'object' || !FASES.includes(p.f) || !Number.isFinite(p.t)) return false;
  if (p.f === 'fin') return typeof p.q === 'string';
  const quiz = QUIZZES[p.q];
  return !!quiz && Number.isInteger(p.n) && p.n >= 0 && p.n < quiz.preguntas.length && (p.r === 1 || p.r === 2);
}

/* Respuesta del estudiante (va cifrada dentro de un sobre) */
export function respuestaValida(x, quiz) {
  return !!(x && quiz && x.q === quiz.id && Number.isInteger(x.n) && x.n >= 0 && x.n < quiz.preguntas.length
    && (x.r === 1 || x.r === 2) && Number.isInteger(x.o) && x.o >= 0 && x.o < quiz.preguntas[x.n].opciones.length);
}

/* respuestas: { [n]: { [ronda]: { [alumno]: { o, ms, t } } } } */
export function anotar(respuestas, alumno, x) {
  const porN = respuestas[x.n] || {}, porR = porN[x.r] || {};
  return { ...respuestas, [x.n]: { ...porN, [x.r]: { ...porR, [alumno]: { o: x.o, ms: Math.max(0, Math.round(x.ms || 0)), t: x.t || Date.now() } } } };
}

function ronda(pregunta, mapa = {}) {
  const dist = pregunta.opciones.map(() => 0);
  for (const a of Object.values(mapa)) dist[a.o] += 1;
  const total = dist.reduce((s, v) => s + v, 0), correctas = dist[pregunta.correcta];
  return { total, correctas, dist, pct: total ? Math.round((100 * correctas) / total) : null };
}

/* Qué hacer después de la primera ronda (peer instruction) */
export function recomendacion(pct) {
  if (pct == null) return '';
  if (pct < 30) return 'Pocos aciertos: conviene volver a explicar el concepto antes de seguir.';
  if (pct <= 70) return 'Zona ideal para discutir en parejas: abre la ronda 2.';
  return 'La mayoría acertó: revela, explica rápido y sigue.';
}

export function resumen(quiz, respuestas) {
  const preguntas = quiz.preguntas.map((p, n) => ({ n, id: p.id, mundo: p.mundo, concepto: p.concepto, r1: ronda(p, respuestas[n]?.[1]), r2: ronda(p, respuestas[n]?.[2]) }));
  const mundos = {};
  for (const x of preguntas) {
    const m = (mundos[x.mundo] ||= { mundo: x.mundo, total: 0, correctas: 0 });
    m.total += x.r1.total; m.correctas += x.r1.correctas;
  }
  for (const m of Object.values(mundos)) m.pct = m.total ? Math.round((100 * m.correctas) / m.total) : null;
  const alumnos = {};
  quiz.preguntas.forEach((p, n) => {
    for (const r of [1, 2]) for (const [id, a] of Object.entries(respuestas[n]?.[r] || {})) {
      const x = (alumnos[id] ||= { id, r1: 0, r1ok: 0, r2: 0, r2ok: 0 });
      x[`r${r}`] += 1; if (a.o === p.correcta) x[`r${r}ok`] += 1;
    }
  });
  return { preguntas, mundos: Object.values(mundos).sort((a, b) => a.mundo - b.mundo), alumnos: Object.values(alumnos) };
}

const celda = v => { const s = String(v ?? ''); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
/* Una fila por respuesta, separada por «;» como los demás CSV del panel */
export function csvQuiz(quiz, respuestas, nombre = id => id) {
  const filas = [['alumno', 'nombre', 'pregunta', 'mundo', 'concepto', 'ronda', 'opcion', 'correcta', 'acierto', 'segundos']];
  quiz.preguntas.forEach((p, n) => {
    for (const r of [1, 2]) for (const [id, a] of Object.entries(respuestas[n]?.[r] || {})) {
      filas.push([id, nombre(id), n + 1, p.mundo, p.concepto, r, 'ABCD'[a.o], 'ABCD'[p.correcta], a.o === p.correcta ? 1 : 0, (a.ms / 1000).toFixed(1)]);
    }
  });
  return filas.map(f => f.map(celda).join(';')).join('\n');
}
