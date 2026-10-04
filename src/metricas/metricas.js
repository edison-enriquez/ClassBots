/* Métricas de aprendizaje sin servidor.
   Todo se guarda en el navegador del estudiante y viaja en un archivo .json que él descarga:
   sirve para continuar en otro computador y como entregable para el profesor. */
import { NIVELES, MUNDOS } from '../levels/niveles.js';
import { MISIONES, PASOS } from '../levels/misiones.js';

export const FORMATO = 1;
const SAL = 'classbots·taller-de-objetos·v1';

/* ---------- Estructura ---------- */
export const metricasVacias = () => ({ tiempoTotal: 0, sesiones: 0, primeraActividad: null, ultimaActividad: null, niveles: {} });
const nivelVacio = () => ({
  abierto: null, tiempo: 0, ejecuciones: 0, envios: 0, enviosFallidos: 0,
  primerExito: null, intentosHastaExito: null, tiempoHastaExito: null,
  compilacion: 0, estructura: 0, ejecucion: 0, pruebasFallidas: {}, categorias: {},
  pistas: 0, solucionUsada: false, sugerenciasIA: 0,
});
const ahora = () => new Date().toISOString();
const conNivel = (met, id, f) => {
  const m = met || metricasVacias();
  const n = { ...nivelVacio(), ...(m.niveles[id] || {}) };
  f(n);
  return { ...m, ultimaActividad: ahora(), primeraActividad: m.primeraActividad || ahora(), niveles: { ...m.niveles, [id]: n } };
};

/* ---------- Categorías de error (para ver qué conceptos cuestan más) ---------- */
export const CATEGORIAS = {
  sintaxis: 'Sintaxis', nombres: 'Nombres y declaraciones', tipos: 'Tipos', constructores: 'Constructores',
  encapsulamiento: 'Encapsulamiento', interfaces: 'Interfaces y clases abstractas', herencia: 'Herencia',
  polimorfismo: 'Polimorfismo', null: 'Referencias null', estructura: 'Estructura pedida', logica: 'Lógica (pruebas)', otros: 'Otros',
};
export function categoria(msg = '') {
  const m = String(msg);
  if (/NullPointer|es null/.test(m)) return 'null';
  if (/ClassCastException|es de tipo .* no tiene|instanceof/.test(m)) return 'polimorfismo';
  if (/es private|protected|visibilidad|getter/.test(m)) return 'encapsulamiento';
  if (/super\(|extends|hereda|final en|no se puede redefinir|clase base/.test(m)) return 'herencia';
  if (/interfaz|implements|abstract|contrato/.test(m)) return 'interfaces';
  if (/constructor/i.test(m)) return 'constructores';
  if (/Tipos incompatibles|debe devolver|tipo de retorno|No encuentro el tipo|String, con S/.test(m)) return 'tipos';
  if (/falta ;|sintaxis|llave|paréntesis|fuera de una clase|dentro de un método/.test(m)) return 'sintaxis';
  if (/No encuentro el símbolo|No existe|no tiene un método|declarad/.test(m)) return 'nombres';
  return 'otros';
}

/* ---------- Registro de eventos ---------- */
export const registrarApertura = (met, id) => conNivel(met, id, n => { n.abierto = n.abierto || ahora(); });
export const registrarPista = (met, id) => conNivel(met, id, n => { n.pistas += 1; });
export const registrarSolucion = (met, id) => conNivel(met, id, n => { n.solucionUsada = true; });
export const registrarIA = (met, id) => conNivel(met, id, n => { n.sugerenciasIA += 1; });
export const registrarTiempo = (met, id, ms) => {
  const m = conNivel(met, id, n => { n.tiempo += ms; });
  return { ...m, tiempoTotal: (m.tiempoTotal || 0) + ms };
};
export const registrarSesion = met => ({ ...(met || metricasVacias()), sesiones: ((met && met.sesiones) || 0) + 1, ultimaActividad: ahora() });

/* Una ejecución (enviar = false) o un envío (enviar = true) con su resultado del juez */
export function registrarResultado(met, id, r, enviar) {
  return conNivel(met, id, n => {
    if (enviar) n.envios += 1; else n.ejecuciones += 1;
    const sumar = cat => { n.categorias[cat] = (n.categorias[cat] || 0) + 1; };
    if (r.estado === 'compilacion') {
      n.compilacion += 1;
      for (const e of (r.errores || []).slice(0, 3)) sumar(categoria(e.msg));
    } else if (r.estado === 'previo') {
      n.estructura += 1; sumar('estructura');
    } else {
      if (r.errorEjecucion) { n.ejecucion += 1; sumar(categoria(r.errorEjecucion)); }
      for (const c of r.casos || []) {
        if (c.estado === 'falla' || c.estado === 'error') {
          n.pruebasFallidas[c.nombre] = (n.pruebasFallidas[c.nombre] || 0) + 1;
          sumar(c.estado === 'error' ? categoria(c.error) : 'logica');
        }
      }
    }
    if (enviar && !r.todosOk) n.enviosFallidos += 1;
    if (enviar && r.todosOk && !n.primerExito) {
      n.primerExito = ahora();
      n.intentosHastaExito = n.ejecuciones + n.envios;
      n.tiempoHastaExito = n.tiempo;
      n.fallidosAntesDeExito = n.enviosFallidos;
    }
  });
}

/* ---------- Resumen para el estudiante y el profesor ---------- */
const TODOS = () => [...NIVELES.map(n => ({ ...n, ruta: true })), ...PASOS];
export function resumen(datos) {
  const met = datos.metricas || metricasVacias();
  const hechos = new Set([...(datos.progreso?.hechos || []), ...(datos.progreso?.pasosHechos || [])]);
  const niveles = TODOS().map(n => {
    const m = { ...nivelVacio(), ...(met.niveles[n.id] || {}) };
    return {
      id: n.id, titulo: n.titulo, concepto: n.concepto, mundo: n.mundo, mision: !!n.mision, ruta: !!n.ruta,
      etiqueta: n.mision ? `✦${n.misionCorto} ${n.enMundo + 1}` : `${n.mundo}.${n.enMundo + 1}`,
      superado: hechos.has(n.id), ...m,
      intentos: m.ejecuciones + m.envios,
      alPrimerEnvio: !!m.primerExito && m.fallidosAntesDeExito === 0,
    };
  });
  const ruta = niveles.filter(n => n.ruta), superados = ruta.filter(n => n.superado);
  const categorias = {};
  for (const n of niveles) for (const [k, v] of Object.entries(n.categorias)) categorias[k] = (categorias[k] || 0) + v;
  const mundos = MUNDOS.filter(w => w.niveles).map(w => {
    const ns = ruta.filter(n => n.mundo === w.id);
    return { id: w.id, nombre: w.nombre, superados: ns.filter(n => n.superado).length, total: ns.length, tiempo: ns.reduce((s, n) => s + n.tiempo, 0) };
  });
  const conExito = superados.filter(n => n.intentosHastaExito != null);
  const actual = NIVELES.find(n => n.id === datos.progreso?.nivelId);
  return {
    capitulos: superados.length, totalCapitulos: ruta.length,
    pct: Math.round((100 * superados.length) / Math.max(1, ruta.length)),
    misiones: MISIONES.filter(m => (datos.progreso?.misionesHechas || []).includes(m.id) || m.pasos.every(p => hechos.has(p.id))).map(m => m.titulo),
    tiempoTotal: met.tiempoTotal || 0, sesiones: met.sesiones || 0,
    ejecuciones: niveles.reduce((s, n) => s + n.ejecuciones, 0), envios: niveles.reduce((s, n) => s + n.envios, 0),
    intentosPromedio: conExito.length ? +(conExito.reduce((s, n) => s + n.intentosHastaExito, 0) / conExito.length).toFixed(1) : null,
    primerEnvio: superados.length ? Math.round((100 * superados.filter(n => n.alPrimerEnvio).length) / superados.length) : null,
    pistas: niveles.reduce((s, n) => s + n.pistas, 0), soluciones: niveles.filter(n => n.solucionUsada).length,
    categorias, mundos, niveles,
    actual: actual ? `${actual.mundo}.${actual.enMundo + 1} ${actual.titulo}` : '—',
    primeraActividad: met.primeraActividad, ultimaActividad: met.ultimaActividad,
  };
}

/* ---------- Firma (detecta archivos editados a mano; no es seguridad fuerte) ---------- */
function fnv(s) {
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 16777619); h2 = Math.imul(h2 ^ c, 2246822519); }
  return ((h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0'));
}
const canon = v => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(k2 => [k2, x[k2]])) : x));
export const firmar = cuerpo => fnv(SAL + canon(cuerpo));

/* ---------- Exportar e importar ---------- */
export function exportar(prog) {
  const cuerpo = {
    perfil: prog.perfil || null,
    progreso: { nivelId: prog.nivelId, hechos: prog.hechos, pasosHechos: prog.pasosHechos || [], misionesHechas: prog.misionesHechas || [], codigo: prog.codigo },
    metricas: prog.metricas || metricasVacias(),
  };
  const r = resumen(cuerpo);
  return {
    app: 'ClassBots', formato: FORMATO, exportado: ahora(), ...cuerpo,
    resumen: { capitulos: r.capitulos, totalCapitulos: r.totalCapitulos, misiones: r.misiones, tiempoTotalMin: Math.round(r.tiempoTotal / 60000), envios: r.envios, ejecuciones: r.ejecuciones, actual: r.actual },
    firma: firmar(cuerpo),
  };
}
export function leerArchivo(texto) {
  let d;
  try { d = JSON.parse(texto); } catch { throw new Error('El archivo no es un avance de ClassBots (no es JSON válido).'); }
  if (!d || d.app !== 'ClassBots' || !d.progreso || !d.perfil) throw new Error('El archivo no es un avance de ClassBots.');
  if (d.formato > FORMATO) throw new Error('Este avance se creó con una versión más nueva de ClassBots.');
  const integro = d.firma === firmar({ perfil: d.perfil, progreso: d.progreso, metricas: d.metricas });
  return { ...d, integro };
}
/* Convierte un archivo leído en el estado de progreso de la app */
export function aProgreso(d, base) {
  const ids = new Set(NIVELES.map(n => n.id)), pids = new Set(PASOS.map(p => p.id));
  return {
    ...base,
    perfil: { ...d.perfil, alterado: d.perfil.alterado || !d.integro },
    nivelId: ids.has(d.progreso.nivelId) ? d.progreso.nivelId : NIVELES[0].id,
    hechos: (d.progreso.hechos || []).filter(id => ids.has(id)),
    pasosHechos: (d.progreso.pasosHechos || []).filter(id => pids.has(id)),
    misionesHechas: (d.progreso.misionesHechas || []).filter(id => MISIONES.some(m => m.id === id)),
    codigo: d.progreso.codigo || {},
    metricas: d.metricas || metricasVacias(),
  };
}
export const nombreArchivo = (perfil, ext = 'json') => {
  const limpio = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w-]+/g, '_').replace(/^_+|_+$/g, '');
  const f = new Date(), fecha = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
  return `ClassBots_${limpio(perfil?.nombre) || 'estudiante'}${perfil?.grupo ? '_' + limpio(perfil.grupo) : ''}_${fecha}.${ext}`;
};
export function descargar(nombre, contenido, tipo = 'application/json') {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo + ';charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: nombre });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* ---------- Formatos ---------- */
export const minutos = ms => {
  const m = Math.round((ms || 0) / 60000);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`;
};
const celda = v => { const s = v == null ? '' : String(v); return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
/* CSV de la clase: una fila por estudiante (separador ; para abrir directo en Excel en español) */
export function csvClase(estudiantes) {
  const cab = ['Estudiante', 'Grupo', 'Capítulos superados', 'Total capítulos', '% avance', 'Capítulo actual', 'Misiones', 'Tiempo activo (min)', 'Sesiones', 'Ejecuciones', 'Envíos', 'Intentos promedio hasta superar', '% superados al primer envío', 'Pistas', 'Soluciones vistas', 'Dificultad principal', 'Última actividad', 'Archivo íntegro'];
  const filas = estudiantes.map(e => {
    const r = e.r, top = Object.entries(r.categorias).sort((a, b) => b[1] - a[1])[0];
    return [e.perfil.nombre, e.perfil.grupo || '', r.capitulos, r.totalCapitulos, r.pct, r.actual, r.misiones.join(' / '), Math.round(r.tiempoTotal / 60000), r.sesiones, r.ejecuciones, r.envios, r.intentosPromedio ?? '', r.primerEnvio ?? '', r.pistas, r.soluciones, top ? `${CATEGORIAS[top[0]] || top[0]} (${top[1]})` : '', r.ultimaActividad || '', e.integro && !e.perfil.alterado ? 'sí' : 'NO'];
  });
  return '﻿' + [cab, ...filas].map(f => f.map(celda).join(';')).join('\r\n');
}
/* CSV por capítulo: una fila por estudiante y capítulo */
export function csvDetalle(estudiantes) {
  const cab = ['Estudiante', 'Grupo', 'Capítulo', 'Título', 'Concepto', 'Superado', 'Tiempo (min)', 'Ejecuciones', 'Envíos', 'Envíos fallidos', 'Intentos hasta superar', 'Errores de compilación', 'Errores de estructura', 'Errores en ejecución', 'Pistas', 'Solución vista', 'Prueba que más falló'];
  const filas = [];
  for (const e of estudiantes) for (const n of e.r.niveles) {
    if (!n.intentos && !n.tiempo && !n.superado) continue;
    const top = Object.entries(n.pruebasFallidas).sort((a, b) => b[1] - a[1])[0];
    filas.push([e.perfil.nombre, e.perfil.grupo || '', n.etiqueta, n.titulo, n.concepto, n.superado ? 'sí' : 'no', +(n.tiempo / 60000).toFixed(1), n.ejecuciones, n.envios, n.enviosFallidos, n.intentosHastaExito ?? '', n.compilacion, n.estructura, n.ejecucion, n.pistas, n.solucionUsada ? 'sí' : 'no', top ? `${top[0]} (${top[1]})` : '']);
  }
  return '﻿' + [cab, ...filas].map(f => f.map(celda).join(';')).join('\r\n');
}
