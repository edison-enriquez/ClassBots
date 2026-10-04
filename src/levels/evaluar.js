/* Corre un nivel como un juez en línea: compila, valida la estructura,
   ejecuta cada caso de prueba en limpio y prepara la animación. */
import { parsePrograma, ejecutar, repasar } from '../engine/motor.js';
import { diagnosticar } from '../editor/diagnostico.js';

export function evaluarNivel(nivel, files, { incluirOcultas = false } = {}) {
  const { modelo, errores } = diagnosticar(files);
  const base = { modelo, errores, casos: [], previo: null, animacion: null, salida: [], errorEjecucion: null };
  if (errores.length) return { ...base, estado: 'compilacion' };

  const previo = nivel.previo ? nivel.previo(modelo) : null;
  if (previo) return { ...base, previo, estado: 'previo' };

  const cache = new Map();
  const run = arnes => {
    if (!cache.has(arnes)) {
      const r = ejecutar(modelo, arnes);
      cache.set(arnes, { rt: r.rt, error: r.error, rep: repasar(r.rt.log) });
    }
    const r = cache.get(arnes);
    if (r.error) throw Object.assign(new Error(r.error), { java: true });
    return r;
  };

  const casos = nivel.pruebas.map((p, i) => {
    const info = { id: i, nombre: p.nombre, oculto: !!p.oculto, entrada: p.entrada || null };
    if (p.oculto && !incluirOcultas) return { ...info, estado: 'pendiente' };
    const t0 = performance.now();
    try {
      const r = p.prueba({ modelo, run, archivos: files });
      return { ...info, ...r, estado: r.ok ? 'ok' : 'falla', ms: Math.max(1, Math.round(performance.now() - t0)) };
    } catch (e) {
      return { ...info, estado: 'error', ok: false, error: e.java ? e.message : 'Error inesperado: ' + e.message };
    }
  });

  let animacion = null, salida = [], errorEjecucion = null;
  if (nivel.animacion) {
    const r = ejecutar(modelo, nivel.animacion);
    animacion = { ...repasar(r.rt.log), log: r.rt.log, registro: r.rt.registro };
    salida = r.rt.salida;
    errorEjecucion = r.error || null;
  }
  const evaluados = casos.filter(c => c.estado !== 'pendiente');
  const todosOk = casos.every(c => c.estado === 'ok');
  return { ...base, casos, animacion, salida, errorEjecucion, estado: 'ejecutado', aprobados: evaluados.filter(c => c.ok).length, evaluados: evaluados.length, todosOk };
}

export { parsePrograma };
