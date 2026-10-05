/* Métricas de aprendizaje sin servidor.
   Todo se guarda en el navegador del estudiante y viaja en un archivo .json que él descarga:
   sirve para continuar en otro computador y como entregable para el profesor. */
import { NIVELES, MUNDOS } from '../levels/niveles.js';
import { MISIONES, PASOS } from '../levels/misiones.js';
import { abrirSobre, clasePublica } from './cifrado.js';

export const FORMATO = 2;
const SAL = 'classbots·taller-de-objetos·v1';

/* ---------- Estructura ---------- */
export const metricasVacias = () => ({ tiempoTotal: 0, sesiones: 0, salidas: 0, tiempoFuera: 0, primeraActividad: null, ultimaActividad: null, niveles: {}, eventos: [] });
const nivelVacio = () => ({
  abierto: null, tiempo: 0, ejecuciones: 0, envios: 0, enviosFallidos: 0,
  primerExito: null, intentosHastaExito: null, tiempoHastaExito: null,
  compilacion: 0, estructura: 0, ejecucion: 0, pruebasFallidas: {}, categorias: {},
  pistas: 0, solucionUsada: false, sugerenciasIA: 0,
  // Escritura: cómo llegó el código al editor
  teclas: 0, tecleados: 0, borrados: 0, completados: 0, iaChars: 0,
  pegados: 0, pegadoChars: 0, pegadoMayor: 0, pegadosExternos: 0, externosChars: 0, pegadosTrasSalir: 0,
  senales: {},
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
  polimorfismo: 'Polimorfismo', excepciones: 'Excepciones', null: 'Referencias null', estructura: 'Estructura pedida', logica: 'Lógica (pruebas)', otros: 'Otros',
};
export function categoria(msg = '') {
  const m = String(msg);
  if (/Excepción sin atrapar|excepción comprobada|throws|\bcatch\b|\btry\b|throw\b|no es una excepción|ya la atrapa/.test(m)) return 'excepciones';
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

/* Escritura en el editor. ev = { tipo: 'teclado'|'borrar'|'completar'|'ia'|'pegado', n, externo, trasSalir } */
export const registrarEscritura = (met, id, ev) => conNivel(met, id, n => {
  const c = ev.n || 0;
  if (ev.tipo === 'teclado') { n.teclas += ev.teclas ?? 1; n.tecleados += c; }
  else if (ev.tipo === 'borrar') n.borrados += c;
  else if (ev.tipo === 'completar') n.completados += c;
  else if (ev.tipo === 'ia') n.iaChars += c;
  else if (ev.tipo === 'pegado') {
    n.pegados += 1; n.pegadoChars += c; n.pegadoMayor = Math.max(n.pegadoMayor, c);
    if (ev.externo) { n.pegadosExternos += 1; n.externosChars += c; }
    if (ev.trasSalir) n.pegadosTrasSalir += 1;
  }
});
/* Historial de identidad: alta, cambios de nombre o grupo, cargas de archivos, cambios de clase */
export const registrarEvento = (met, ev) => {
  const m = met || metricasVacias();
  return { ...m, eventos: [...(m.eventos || []), { t: ahora(), ...ev }].slice(-200) };
};
/* Salidas de la pestaña (a otra ventana o aplicación) y tiempo fuera */
export const registrarSalida = met => ({ ...(met || metricasVacias()), salidas: ((met && met.salidas) || 0) + 1 });
export const registrarRegreso = (met, ms) => ({ ...(met || metricasVacias()), tiempoFuera: ((met && met.tiempoFuera) || 0) + Math.max(0, ms) });

/* ---------- Rasgos de estilo poco habituales en el curso (indicios, no pruebas) ---------- */
export const SENALES = {
  javadoc: 'Comentarios Javadoc (/** … */, @param, @return)',
  ingles: 'Comentarios en inglés',
  identificadores: 'Nombres de variables o métodos en inglés',
  lambda: 'Lambdas (->)',
  streams: 'Streams (.stream(), .map(), .filter(), .forEach())',
  format: 'String.format / printf',
  var: 'Uso de var',
  excepciones: 'try/catch o throws antes del Mundo 7',
  avanzado: 'APIs no vistas (Optional, Objects, HashMap, StringBuilder, switch con ->)',
};
const REGLAS = [
  ['javadoc', /\/\*\*[\s\S]*?\*\/|@param|@return/],
  ['ingles', /(?:\/\/|\/\*+|^\s*\*).*\b(the|this|returns?|create[sd]?|check|method|class|value|loop|initiali[sz]e)\b/im],
  ['identificadores', /\b(?:int|String|double|boolean|void|[A-Z]\w*)\s+(?:get|set|is)?(calculate|update|create|handle|process|initialize|current|result|amount|damage|health|speed|counter|number|value|item)\w*\s*[=;(,)]/i],
  ['lambda', /->/],
  ['streams', /\.stream\(\)|\.map\(|\.filter\(|\.forEach\(|\.collect\(/],
  ['format', /String\.format\(|\.printf\(/],
  ['var', /\bvar\s+[a-zA-Z_]\w*\s*=/],
  ['excepciones', /\btry\s*\{|\bcatch\s*\(|\bthrows\b/],
  ['avanzado', /\bOptional\b|\bObjects\.|\bHashMap\b|\bStringBuilder\b|case\s+[^:]+->/],
];
/* Revisa solo las líneas que escribió el estudiante (las que no venían en el código inicial) */
export function analizarEstilo(archivos, inicial = {}, vistos = []) {
  const base = new Set(Object.values(inicial || {}).join('\n').split('\n').map(l => l.trim()).filter(Boolean));
  const propio = Object.values(archivos || {}).join('\n').split('\n').filter(l => !base.has(l.trim())).join('\n');
  return REGLAS.filter(([k, re]) => !vistos.includes(k) && re.test(propio)).map(([k]) => k);
}
export const registrarSenales = (met, id, lista) => conNivel(met, id, n => { for (const k of lista) n.senales[k] = (n.senales[k] || 0) + 1; });

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
      pctPegado: m.pegadoChars + m.tecleados ? Math.round((100 * m.pegadoChars) / (m.pegadoChars + m.tecleados)) : 0,
      indicios: indiciosNivel(m),
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
    escritura: {
      tecleados: niveles.reduce((s, n) => s + n.tecleados, 0), pegadoChars: niveles.reduce((s, n) => s + n.pegadoChars, 0),
      externosChars: niveles.reduce((s, n) => s + n.externosChars, 0), pegadosTrasSalir: niveles.reduce((s, n) => s + n.pegadosTrasSalir, 0),
      iaChars: niveles.reduce((s, n) => s + n.iaChars, 0), sugerenciasIA: niveles.reduce((s, n) => s + n.sugerenciasIA, 0),
      salidas: met.salidas || 0, tiempoFuera: met.tiempoFuera || 0,
      senales: niveles.reduce((acc, n) => { for (const k of Object.keys(n.senales)) acc[k] = (acc[k] || 0) + 1; return acc; }, {}),
    },
    indicios: indiciosGlobal(niveles, met),
    primeraActividad: met.primeraActividad, ultimaActividad: met.ultimaActividad,
  };
}

/* ---------- Indicios de copia o uso de IA externa ----------
   Heurísticas para orientar una conversación con el estudiante, nunca una prueba. */
export function indiciosNivel(m) {
  const r = [], escrito = m.pegadoChars + m.tecleados;
  if (m.externosChars >= 150 && m.externosChars / Math.max(1, escrito) >= 0.5) r.push(`pegó desde fuera ${m.externosChars} de ${escrito} caracteres`);
  if (m.pegadosTrasSalir >= 1) r.push(`${m.pegadosTrasSalir} pegado(s) justo al volver de otra ventana`);
  if (m.pegadoMayor >= 250 && m.pegadosExternos) r.push(`un pegado externo de ${m.pegadoMayor} caracteres`);
  const s = Object.keys(m.senales || {});
  if (s.length >= 2) r.push(`estilo poco habitual: ${s.map(k => SENALES[k]?.split(' (')[0].toLowerCase() || k).join(', ')}`);
  if (m.primerExito && m.intentosHastaExito === 1 && m.tecleados < 40 && m.pegadoChars > 120) r.push('superado al primer intento casi sin teclear');
  return r;
}
function indiciosGlobal(niveles, met) {
  const razones = [];
  const t = niveles.reduce((a, n) => ({ tec: a.tec + n.tecleados, peg: a.peg + n.externosChars, tras: a.tras + n.pegadosTrasSalir }), { tec: 0, peg: 0, tras: 0 });
  const conIndicios = niveles.filter(n => n.indicios.length);
  if (t.peg >= 300 && t.peg / Math.max(1, t.peg + t.tec) >= 0.4) razones.push(`${Math.round((100 * t.peg) / (t.peg + t.tec))}% del código vino pegado desde fuera`);
  if (t.tras >= 2) razones.push(`${t.tras} pegados al volver de otra ventana`);
  if (conIndicios.length) razones.push(`indicios en ${conIndicios.length} capítulo(s): ${conIndicios.slice(0, 4).map(n => n.etiqueta).join(', ')}${conIndicios.length > 4 ? '…' : ''}`);
  const puntos = (t.peg >= 300 && t.peg / Math.max(1, t.peg + t.tec) >= 0.4 ? 2 : 0) + Math.min(3, t.tras) + Math.min(3, conIndicios.length);
  return { nivel: puntos >= 5 ? 'alto' : puntos >= 2 ? 'medio' : 'bajo', razones };
}

/* ---------- Fusión de segmentos (cada sesión del navegador cifra su propio segmento) ---------- */
const SUMABLES = ['tiempo', 'ejecuciones', 'envios', 'enviosFallidos', 'compilacion', 'estructura', 'ejecucion', 'pistas', 'sugerenciasIA', 'teclas', 'tecleados', 'borrados', 'completados', 'iaChars', 'pegados', 'pegadoChars', 'pegadosExternos', 'externosChars', 'pegadosTrasSalir'];
export function fusionar(lista) {
  const total = metricasVacias();
  for (const m of lista) {
    if (!m) continue;
    for (const k of ['tiempoTotal', 'sesiones', 'salidas', 'tiempoFuera']) total[k] += m[k] || 0;
    total.eventos = [...total.eventos, ...(m.eventos || [])];
    if (m.primeraActividad && (!total.primeraActividad || m.primeraActividad < total.primeraActividad)) total.primeraActividad = m.primeraActividad;
    if (m.ultimaActividad && (!total.ultimaActividad || m.ultimaActividad > total.ultimaActividad)) total.ultimaActividad = m.ultimaActividad;
    for (const [id, x0] of Object.entries(m.niveles || {})) {
      const a = { ...nivelVacio(), ...(total.niveles[id] || {}) }, x = { ...nivelVacio(), ...x0 };
      const previos = a.ejecuciones + a.envios, fallidosPrevios = a.enviosFallidos, tiempoPrevio = a.tiempo;
      for (const k of SUMABLES) a[k] += x[k] || 0;
      a.pegadoMayor = Math.max(a.pegadoMayor, x.pegadoMayor || 0);
      a.solucionUsada = a.solucionUsada || !!x.solucionUsada;
      if (x.abierto && (!a.abierto || x.abierto < a.abierto)) a.abierto = x.abierto;
      if (!a.primerExito && x.primerExito) {
        a.primerExito = x.primerExito;
        a.intentosHastaExito = previos + (x.intentosHastaExito || 0);
        a.fallidosAntesDeExito = fallidosPrevios + (x.fallidosAntesDeExito || 0);
        a.tiempoHastaExito = tiempoPrevio + (x.tiempoHastaExito || 0);
      }
      for (const campo of ['pruebasFallidas', 'categorias', 'senales']) {
        a[campo] = { ...a[campo] };
        for (const [k, v] of Object.entries(x[campo] || {})) a[campo][k] = (a[campo][k] || 0) + v;
      }
      total.niveles[id] = a;
    }
  }
  total.eventos.sort((a, b) => (a.t < b.t ? -1 : 1));
  return total;
}

/* ---------- Firma (detecta archivos editados a mano; no es seguridad fuerte) ---------- */
function fnv(s) {
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 16777619); h2 = Math.imul(h2 ^ c, 2246822519); }
  return ((h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0'));
}
const canon = v => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(k2 => [k2, x[k2]])) : x));
export const firmar = cuerpo => fnv(SAL + canon(cuerpo));

/* ---------- Exportar e importar ----------
   El archivo lleva en claro lo necesario para continuar (perfil, capítulos y código) y las métricas
   como segmentos cifrados con la llave pública del profesor: el estudiante no puede leerlas. */
export const nuevoSegmento = (segmentos = []) => ({ id: Math.random().toString(36).slice(2, 10), seq: segmentos.length + 1, inicio: new Date().toISOString() });
export const contenidoSegmento = (prog, seg) => ({
  ...seg, guardado: new Date().toISOString(), perfilId: prog.perfil?.id || null,
  nombre: prog.perfil?.nombre || null, grupo: prog.perfil?.grupo || '', dispositivo: prog.dispositivo || null, clase: prog.clase?.id || null,
  hechos: [...(prog.hechos || []), ...(prog.pasosHechos || [])], metricas: prog.metricas || metricasVacias(),
});
/* segmentos: los sobres ya cerrados más el de esta sesión (ya cifrado por quien llama) */
export function exportar(prog, segmentos) {
  const cuerpo = {
    perfil: prog.perfil || null,
    progreso: { nivelId: prog.nivelId, hechos: prog.hechos, pasosHechos: prog.pasosHechos || [], misionesHechas: prog.misionesHechas || [], codigo: prog.codigo },
    segmentos,
    clase: clasePublica(prog.clase) || null,
  };
  const r = resumen({ progreso: cuerpo.progreso });
  return {
    app: 'ClassBots', formato: FORMATO, exportado: ahora(), ...cuerpo,
    resumen: { capitulos: r.capitulos, totalCapitulos: r.totalCapitulos, misiones: r.misiones, actual: r.actual },
    firma: firmar(cuerpo),
  };
}
export function leerArchivo(texto) {
  let d;
  try { d = JSON.parse(texto); } catch { throw new Error('El archivo no es un avance de ClassBots (no es JSON válido).'); }
  if (!d || d.app !== 'ClassBots' || !d.progreso || !d.perfil) throw new Error('El archivo no es un avance de ClassBots.');
  if (d.formato > FORMATO) throw new Error('Este avance se creó con una versión más nueva de ClassBots.');
  if (!Array.isArray(d.segmentos)) throw new Error('Este avance es de una versión anterior de ClassBots y no trae métricas cifradas.');
  // Los archivos anteriores a las clases no incluían «clase» en la firma
  const integro = d.firma === firmar('clase' in d ? { perfil: d.perfil, progreso: d.progreso, segmentos: d.segmentos, clase: d.clase } : { perfil: d.perfil, progreso: d.progreso, segmentos: d.segmentos });
  return { ...d, integro };
}
/* Convierte un archivo leído en el estado de progreso de la app (las métricas siguen cifradas) */
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
    segmentos: d.segmentos || [],
    clase: d.clase || base.clase || null,
    metricas: metricasVacias(),
    // Se anota en el historial cifrado al recargar
    pendientes: [...(base.pendientes || []), { tipo: 'carga', nombre: d.perfil.nombre, grupo: d.perfil.grupo || '', perfilId: d.perfil.id, exportado: d.exportado, desde: base.perfil?.nombre || null }],
  };
}
/* Solo el profesor: descifra los segmentos, los fusiona y revisa la coherencia.
   llaves = { clases: { [id]: privada }, rsa: privada } */
export async function abrirConLlave(d, llaves) {
  const problemas = [], partes = [], faltan = new Set();
  for (const sobre of d.segmentos) {
    try { partes.push(await abrirSobre(sobre, llaves)); }
    catch (e) { if (e.clase) faltan.add(e.clase); else problemas.push('un segmento no se pudo descifrar con las llaves cargadas'); }
  }
  if (faltan.size) problemas.push('faltan contraseñas de clase para leer parte de las métricas');
  partes.sort((a, b) => a.seq - b.seq);
  const seqs = partes.map(p => p.seq);
  if (!faltan.size) for (let k = 1; k <= Math.max(0, ...seqs); k++) if (!seqs.includes(k)) { problemas.push(`falta el segmento ${k} de las métricas (¿se borró?)`); break; }
  if (partes.some(p => p.perfilId && d.perfil.id && p.perfilId !== d.perfil.id)) problemas.push('hay métricas de otro perfil mezcladas');
  const metricas = fusionar(partes.map(p => p.metricas));
  // Identidad: nombres con que se trabajó en cada sesión y cambios registrados
  const nombres = [...new Set(partes.map(p => p.nombre).filter(Boolean))];
  if (nombres.length > 1 || (nombres[0] && nombres[0] !== d.perfil.nombre)) problemas.push(`trabajó con más de un nombre: ${[...new Set([...nombres, d.perfil.nombre])].join(' → ')}`);
  const cambios = metricas.eventos.filter(e => e.tipo === 'perfil' && e.de && e.de !== e.a);
  if (cambios.length) problemas.push(`cambió su nombre ${cambios.length} vez(es)`);
  const docente = metricas.eventos.filter(e => e.tipo === 'profesor');
  if (docente.length) problemas.push(`activó el modo profesor ${docente.length} vez(es): pudo ver las respuestas`);
  const fallidos = metricas.eventos.filter(e => e.tipo === 'acceso-fallido');
  if (fallidos.length) problemas.push(`intentó entrar al modo profesor ${fallidos.length} vez(es) sin la contraseña`);
  const cargas = metricas.eventos.filter(e => e.tipo === 'carga' && e.perfilId && e.perfilId !== d.perfil.id);
  if (cargas.length) problemas.push(`cargó avances de otro perfil: ${[...new Set(cargas.map(e => e.nombre))].join(', ')}`);
  if (!faltan.size) {
    const registrados = new Set(partes.flatMap(p => p.hechos || []));
    const sinRegistro = [...(d.progreso.hechos || []), ...(d.progreso.pasosHechos || [])].filter(id => !registrados.has(id) && !metricas.niveles[id]?.primerExito);
    if (sinRegistro.length) problemas.push(`${sinRegistro.length} capítulo(s) aparecen superados sin registro en las métricas`);
  }
  if (!d.integro) problemas.push('el archivo fue editado fuera de ClassBots');
  if (d.perfil.alterado) problemas.push('se cargó antes un archivo editado');
  return {
    metricas, problemas, faltan: [...faltan], leidos: partes.length,
    sesiones: partes.map(p => p.id).filter(Boolean), dispositivos: [...new Set(partes.map(p => p.dispositivo).filter(Boolean))], nombres,
  };
}

/* Cruces entre archivos de la clase: perfiles con dos nombres, sesiones compartidas y código idéntico */
const comentarios = t => (String(t || '').match(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g) || []).map(c => c.replace(/^\/\/|^\/\*+|\*+\/$/g, '').replace(/\s+/g, ' ').trim().toLowerCase()).filter(c => c.length >= 25);
const comentariosBase = n => { try { return new Set(comentarios(Object.values(n.inicial({}) || {}).join('\n'))); } catch { return new Set(); } };
const normalizarCodigo = t => String(t || '').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, '');
export function cruzarArchivos(estudiantes, niveles = [...NIVELES, ...PASOS]) {
  const alertas = new Map(estudiantes.map(e => [e, []]));
  const quien = e => `${e.perfil.nombre}${e.perfil.grupo ? ' (' + e.perfil.grupo + ')' : ''}`;
  for (let i = 0; i < estudiantes.length; i++) for (let j = i + 1; j < estudiantes.length; j++) {
    const a = estudiantes[i], b = estudiantes[j];
    const avisar = (txt, fuerte = true) => { alertas.get(a).push({ txt: txt(b), fuerte }); alertas.get(b).push({ txt: txt(a), fuerte }); };
    if (a.perfil.id && a.perfil.id === b.perfil.id) avisar(o => `mismo perfil que «${quien(o)}»: la misma sesión entregada con otro nombre`);
    const sa = new Set([...(a.sesiones || []), ...a.segmentos.map(x => x.iv)]);
    const comunes = [...new Set([...(b.sesiones || []), ...b.segmentos.map(x => x.iv)])].filter(x => sa.has(x));
    if (comunes.length && a.perfil.id !== b.perfil.id) avisar(o => `comparte ${comunes.length} sesión(es) de trabajo con «${quien(o)}»`);
    const iguales = [];
    for (const n of niveles) {
      const ca = a.progreso.codigo?.[n.id]?.files, cb = b.progreso.codigo?.[n.id]?.files;
      if (!ca || !cb) continue;
      const x = normalizarCodigo(Object.values(ca).join('\n')), y = normalizarCodigo(Object.values(cb).join('\n'));
      const ref = normalizarCodigo(Object.values(n.solucion || {}).join('\n'));
      if (x.length >= 150 && x === y && x !== ref) iguales.push(n.mision ? `✦${n.misionCorto} ${n.enMundo + 1}` : `${n.mundo}.${n.enMundo + 1}`);
    }
    if (iguales.length) avisar(o => `código idéntico a «${quien(o)}» en ${iguales.join(', ')}`);
    // Comentarios propios idénticos: casi nunca coinciden por azar
    const mismos = new Set();
    for (const n of niveles) {
      const ca = a.progreso.codigo?.[n.id]?.files, cb = b.progreso.codigo?.[n.id]?.files;
      if (!ca || !cb) continue;
      const base = comentariosBase(n), cmB = new Set(comentarios(Object.values(cb).join('\n')));
      for (const c of comentarios(Object.values(ca).join('\n'))) if (!base.has(c) && cmB.has(c)) mismos.add(c);
    }
    if (mismos.size) avisar(o => `comparte con «${quien(o)}» comentarios idénticos: «${[...mismos][0].slice(0, 60)}»${mismos.size > 1 ? ` y ${mismos.size - 1} más` : ''}`);
    const dev = (a.dispositivos || []).filter(x => (b.dispositivos || []).includes(x));
    if (dev.length) avisar(o => `usó el mismo computador que «${quien(o)}»`, false);
  }
  return alertas;
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
  const cab = ['Estudiante', 'Grupo', 'Capítulos superados', 'Total capítulos', '% avance', 'Capítulo actual', 'Misiones', 'Tiempo activo (min)', 'Sesiones', 'Ejecuciones', 'Envíos', 'Intentos promedio hasta superar', '% superados al primer envío', 'Pistas', 'Soluciones vistas', 'Dificultad principal', 'Caracteres tecleados', 'Caracteres pegados desde fuera', 'Pegados al volver de otra ventana', 'Salidas de la pestaña', 'Caracteres de la IA del taller', 'Indicio de copia/IA', 'Razones', 'Última actividad', 'Revisión del archivo'];
  const filas = estudiantes.map(e => {
    const r = e.r, top = Object.entries(r.categorias).sort((a, b) => b[1] - a[1])[0];
    return [e.perfil.nombre, e.perfil.grupo || '', r.capitulos, r.totalCapitulos, r.pct, r.actual, r.misiones.join(' / '), Math.round(r.tiempoTotal / 60000), r.sesiones, r.ejecuciones, r.envios, r.intentosPromedio ?? '', r.primerEnvio ?? '', r.pistas, r.soluciones, top ? `${CATEGORIAS[top[0]] || top[0]} (${top[1]})` : '', r.escritura.tecleados, r.escritura.externosChars, r.escritura.pegadosTrasSalir, r.escritura.salidas, r.escritura.iaChars, r.indicios.nivel, r.indicios.razones.join(' | '), r.ultimaActividad || '', [...(e.problemas || []), ...(e.cruces || []).map(c => c.txt)].join(' | ') || 'sin problemas'];
  });
  return '﻿' + [cab, ...filas].map(f => f.map(celda).join(';')).join('\r\n');
}
/* CSV por capítulo: una fila por estudiante y capítulo */
export function csvDetalle(estudiantes) {
  const cab = ['Estudiante', 'Grupo', 'Capítulo', 'Título', 'Concepto', 'Superado', 'Tiempo (min)', 'Ejecuciones', 'Envíos', 'Envíos fallidos', 'Intentos hasta superar', 'Errores de compilación', 'Errores de estructura', 'Errores en ejecución', 'Pistas', 'Solución vista', 'Prueba que más falló', 'Tecleados', 'Pegados (car.)', 'Pegados externos', 'Pegados al volver', 'IA del taller (car.)', '% pegado', 'Rasgos de estilo', 'Indicios'];
  const filas = [];
  for (const e of estudiantes) for (const n of e.r.niveles) {
    if (!n.intentos && !n.tiempo && !n.superado) continue;
    const top = Object.entries(n.pruebasFallidas).sort((a, b) => b[1] - a[1])[0];
    filas.push([e.perfil.nombre, e.perfil.grupo || '', n.etiqueta, n.titulo, n.concepto, n.superado ? 'sí' : 'no', +(n.tiempo / 60000).toFixed(1), n.ejecuciones, n.envios, n.enviosFallidos, n.intentosHastaExito ?? '', n.compilacion, n.estructura, n.ejecucion, n.pistas, n.solucionUsada ? 'sí' : 'no', top ? `${top[0]} (${top[1]})` : '', n.tecleados, n.pegadoChars, n.pegadosExternos, n.pegadosTrasSalir, n.iaChars, n.pctPegado, Object.keys(n.senales).join(', '), n.indicios.join(' | ')]);
  }
  return '﻿' + [cab, ...filas].map(f => f.map(celda).join(';')).join('\r\n');
}
