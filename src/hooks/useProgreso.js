import { useEffect, useRef, useState } from 'react';
import { NIVELES } from '../levels/niveles.js';

const CLAVE = 'taller-objetos-react-v2';
const VACIO = { nivelId: NIVELES[0].id, hechos: [], codigo: {}, profe: false, asistente: 'basico' };

function leer() {
  try {
    const g = JSON.parse(localStorage.getItem(CLAVE) || 'null');
    if (g && typeof g === 'object') return { ...VACIO, ...g, hechos: (g.hechos || []).filter(id => NIVELES.some(n => n.id === id)) };
  } catch { /* sin almacenamiento */ }
  return VACIO;
}

/* Progreso del estudiante en este navegador: capítulo actual, capítulos superados (por id) y código */
export function useProgreso() {
  const [p, setP] = useState(leer);
  const t = useRef(null);
  useEffect(() => {
    clearTimeout(t.current);
    t.current = setTimeout(() => { try { localStorage.setItem(CLAVE, JSON.stringify(p)); } catch { /* sin almacenamiento */ } }, 300);
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

export function codigoDe(p, i) {
  const n = NIVELES[i];
  const c = p.codigo[n.id];
  const base = () => codigoInicial(p, i);
  if (c && c.files) {
    const files = {};
    let ini = null;
    for (const a of n.archivos) files[a] = c.files[a] ?? (ini || (ini = base()))[a] ?? '';
    return { files, activo: n.archivos.includes(c.activo) ? c.activo : n.archivoInicial || n.archivos[0] };
  }
  return { files: base(), activo: n.archivoInicial || n.archivos[0] };
}
