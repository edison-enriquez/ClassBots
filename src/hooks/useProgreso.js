import { useEffect, useRef, useState } from 'react';
import { NIVELES } from '../levels/niveles.js';
import { MISIONES, PASOS } from '../levels/misiones.js';
import { metricasVacias } from '../metricas/metricas.js';

export const CLAVE = 'taller-objetos-react-v2';
export const CLAVE_SEGMENTO = 'classbots-segmento-actual';
const VACIO = { nivelId: NIVELES[0].id, hechos: [], misionesHechas: [], pasosHechos: [], codigo: {}, profe: false, asistente: 'basico', perfil: null, metricas: metricasVacias(), segmentos: [] };

/* El segmento cifrado de la sesión anterior pasa a la lista de segmentos cerrados */
function conSegmentoAnterior(segmentos) {
  try {
    const actual = JSON.parse(localStorage.getItem(CLAVE_SEGMENTO) || 'null');
    if (actual && actual.k && !segmentos.some(x => x.k === actual.k)) return [...segmentos, actual];
  } catch { /* sin almacenamiento */ }
  return segmentos;
}

function leer() {
  try {
    const g = JSON.parse(localStorage.getItem(CLAVE) || 'null');
    if (g && typeof g === 'object') return {
      ...VACIO,
      ...g,
      hechos: Array.isArray(g.hechos) ? g.hechos.filter(id => NIVELES.some(n => n.id === id)) : [],
      misionesHechas: Array.isArray(g.misionesHechas) ? g.misionesHechas.filter(id => MISIONES.some(m => m.id === id)) : [],
      pasosHechos: Array.isArray(g.pasosHechos) ? g.pasosHechos.filter(id => PASOS.some(x => x.id === id)) : [],
      // Las métricas nunca se guardan legibles: cada sesión empieza en memoria y se sella cifrada.
      metricas: metricasVacias(),
      segmentos: conSegmentoAnterior(Array.isArray(g.segmentos) ? g.segmentos : []),
    };
  } catch { /* sin almacenamiento */ }
  return VACIO;
}

/* Progreso local: ruta principal y misiones especiales se registran por separado. */
export function useProgreso() {
  const [p, setP] = useState(leer);
  const t = useRef(null);
  useEffect(() => {
    clearTimeout(t.current);
    t.current = setTimeout(() => { try { localStorage.setItem(CLAVE, JSON.stringify({ ...p, metricas: undefined })); } catch { /* sin almacenamiento */ } }, 300);
  }, [p]);
  return [p, setP];
}

export const indiceDe = id => Math.max(0, NIVELES.findIndex(n => n.id === id));

export function codigoInicial(p, i) {
  const n = NIVELES[i];
  if (i === 0) return n.inicial();
  const prevN = NIVELES[i - 1];
  const prev = p.hechos.includes(prevN.id) && p.codigo[prevN.id] ? { ...prevN.solucion, ...p.codigo[prevN.id].files } : prevN.solucion;
  return n.inicial(prev);
}

/* Código inicial de un paso de misión: parte de lo que el estudiante dejó en el paso anterior */
export function codigoInicialPaso(p, paso) {
  const m = MISIONES.find(x => x.id === paso.misionId), k = m.pasos.findIndex(x => x.id === paso.id);
  if (k <= 0) return paso.inicial();
  const prevP = m.pasos[k - 1];
  const prev = (p.pasosHechos || []).includes(prevP.id) && p.codigo[prevP.id] ? { ...prevP.solucion, ...p.codigo[prevP.id].files } : prevP.solucion;
  return paso.inicial(prev);
}
export function codigoPaso(p, paso) {
  return codigoGuardado(p, paso, () => codigoInicialPaso(p, paso));
}

export function codigoDe(p, i) {
  return codigoGuardado(p, NIVELES[i], () => codigoInicial(p, i));
}
function codigoGuardado(p, n, base) {
  const c = p.codigo[n.id];
  if (c && c.files) {
    const files = {};
    let ini = null;
    for (const a of n.archivos) files[a] = c.files[a] ?? (ini || (ini = base()))[a] ?? '';
    return { files, activo: n.archivos.includes(c.activo) ? c.activo : n.archivoInicial || n.archivos[0] };
  }
  return { files: base(), activo: n.archivoInicial || n.archivos[0] };
}

/* Reemplaza el progreso guardado (cargar un avance, cambiar de estudiante) y recarga la página */
export function guardarYRecargar(p) {
  try {
    localStorage.removeItem(CLAVE_SEGMENTO);
    if (p) localStorage.setItem(CLAVE, JSON.stringify({ ...p, metricas: undefined })); else localStorage.removeItem(CLAVE);
  } catch { /* sin almacenamiento */ }
  location.reload();
}
