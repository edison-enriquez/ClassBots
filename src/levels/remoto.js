/* Niveles que se califican en el juez de Kotlin (servidor propio, ver juez-kotlin/).
   El juego envía los archivos, espera su turno en la cola y traduce la respuesta al mismo
   formato que devuelve evaluarNivel, para que el panel de pruebas y las métricas no cambien. */

export const JUEZ_URL = (import.meta.env?.VITE_JUEZ_URL ?? 'https://juez.cybermas.app').replace(/\/$/, '');

const espera = ms => new Promise(r => setTimeout(r, ms));

/* Convierte la respuesta del juez en el resultado que entiende el juego */
export function traducirResultado(nivel, res, { incluirOcultas = false } = {}) {
  const base = { remoto: true, modelo: null, errores: [], casos: [], previo: null, animacion: null, salida: [], errorEjecucion: null, captura: res.captura || null, ms: res.ms };
  if (res.compilo === false || res.errores?.length) {
    return { ...base, estado: 'compilacion', errores: (res.errores || []).map(e => ({ archivo: e.archivo, linea: e.linea, msg: e.msg })) };
  }
  if (res.tiempoAgotado) {
    return { ...base, estado: 'ejecutado', errorEjecucion: 'Tus pruebas tardaron demasiado y el juez las detuvo. ¿Hay un ciclo que nunca termina?', aprobados: 0, evaluados: 1, todosOk: false,
      casos: [{ id: 0, nombre: 'Tiempo agotado', oculto: false, estado: 'error', ok: false, error: 'El juez detuvo las pruebas a los 60 segundos.' }] };
  }
  if (!res.casos?.length) {
    return { ...base, estado: 'ejecutado', errorEjecucion: res.fallo || 'El juez no pudo correr las pruebas.', aprobados: 0, evaluados: 1, todosOk: false,
      casos: [{ id: 0, nombre: 'Sin resultados', oculto: false, estado: 'error', ok: false, error: res.fallo || 'Revisa que estén todos los archivos.' }] };
  }
  // Primero los visibles y después los ocultos, como en los niveles locales
  const orden = [...res.casos].sort((a, b) => Number(a.oculto) - Number(b.oculto));
  const casos = orden.map((c, i) => {
    const info = { id: i, nombre: c.nombre, oculto: c.oculto, entrada: null };
    if (c.oculto && !incluirOcultas) return { ...info, estado: 'pendiente' };
    return { ...info, ok: c.ok, estado: c.ok ? 'ok' : 'falla', esperado: 'La prueba pasa', obtenido: c.ok ? 'La prueba pasa' : (c.mensaje || 'La prueba falló') };
  });
  const evaluados = casos.filter(c => c.estado !== 'pendiente');
  return { ...base, estado: 'ejecutado', casos, aprobados: evaluados.filter(c => c.ok).length, evaluados: evaluados.length, todosOk: casos.every(c => c.estado === 'ok') };
}

/* Envía al juez y espera el resultado. onCola recibe la posición mientras espera su turno. */
export async function evaluarRemoto(nivel, files, { incluirOcultas = false, alumno = '', onCola = () => {}, senal } = {}) {
  const archivos = Object.fromEntries(nivel.archivos.filter(a => files[a] != null).map(a => [a, files[a]]));
  const error = msg => ({ remoto: true, estado: 'ejecutado', casos: [{ id: 0, nombre: 'Juez de Kotlin', oculto: false, estado: 'error', ok: false, error: msg }], errores: [], aprobados: 0, evaluados: 1, todosOk: false, errorEjecucion: msg, salida: [], animacion: null, captura: null });
  let r;
  try {
    r = await fetch(`${JUEZ_URL}/kotlin/evaluar`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ reto: nivel.remoto.reto, archivos, alumno }), signal: senal });
  } catch {
    return error('No pude conectarme al juez de Kotlin. Revisa tu conexión o avisa a tu profesor.');
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok && r.status !== 202) return error(j.error || `El juez respondió ${r.status}.`);
  const id = j.id;
  onCola(j.posicion || 0, j.estado);
  const t0 = Date.now();
  for (let k = 0; Date.now() - t0 < 5 * 60_000; k++) {
    await espera(k < 3 ? 1500 : 2500);
    if (senal?.aborted) return error('Cancelado.');
    let e;
    try { e = await (await fetch(`${JUEZ_URL}/kotlin/estado/${id}`, { signal: senal })).json(); } catch { continue; }
    if (e.estado === 'listo') return traducirResultado(nivel, e.resultado, { incluirOcultas });
    if (e.estado === 'error' || e.error) return error(e.resultado?.mensaje || e.error || 'El juez no pudo evaluar este intento.');
    onCola(e.posicion || 0, e.estado);
  }
  return error('El juez tardó demasiado. Intenta de nuevo en un momento.');
}
