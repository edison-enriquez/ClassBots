import { useCallback, useEffect, useRef, useState } from 'react';

// Tamaños del área de trabajo que el estudiante ajusta con los divisores.
// Se recuerdan por navegador; null significa "tamaño por defecto del CSS".
const CLAVE = 'classbots.disposicion';
const MIN_IZQ = 260, MIN_DER = 380;      // ancho mínimo de lección y de código (px)
const MIN_ED = 140, MIN_PANEL = 44;      // alto mínimo del editor y del panel de resultados (px)
const PASO = 24, PASO_LARGO = 96;

const leer = () => {
  try { const v = JSON.parse(localStorage.getItem(CLAVE) || '{}'); return { izq: num(v.izq), panel: num(v.panel) }; }
  catch { return { izq: null, panel: null }; }
};
const num = v => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.round(v) : null);
const limitar = (v, lo, hi) => Math.round(Math.max(lo, Math.min(hi, v)));

export function useDisposicion() {
  const [tam, setTam] = useState(leer);
  const [ampliado, setAmpliado] = useState(false);
  const cols = useRef(null);   // <main class="cols">
  const der = useRef(null);    // <section class="der">
  const ed = useRef(null);     // contenedor del editor
  const barra = useRef(null);  // barra del juez (debajo del panel)

  useEffect(() => {
    try { localStorage.setItem(CLAVE, JSON.stringify(tam)); } catch { /* almacenamiento bloqueado */ }
  }, [tam]);

  // Escape sale del modo ampliado (sin robarle el Escape al autocompletado del editor).
  useEffect(() => {
    if (!ampliado) return undefined;
    const tecla = e => { if (e.key === 'Escape' && !e.defaultPrevented && !document.querySelector('.cm-tooltip-autocomplete')) setAmpliado(false); };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [ampliado]);

  const anchoIzq = useCallback(x => {
    const r = cols.current?.getBoundingClientRect();
    if (!r) return;
    setTam(t => ({ ...t, izq: limitar(x - r.left, MIN_IZQ, Math.max(MIN_IZQ, r.width - MIN_DER)) }));
  }, []);

  const altoPanel = useCallback(y => {
    const fondo = barra.current?.getBoundingClientRect().top;
    const techo = ed.current?.getBoundingClientRect().top;
    if (fondo == null || techo == null) return;
    // El estado del editor (línea/columna) y el divisor quedan entre el editor y el panel.
    setTam(t => ({ ...t, panel: limitar(fondo - y, MIN_PANEL, Math.max(MIN_PANEL, fondo - techo - MIN_ED - 40)) }));
  }, []);

  const actualIzq = () => tam.izq ?? cols.current?.querySelector('.izq')?.getBoundingClientRect().width ?? 400;
  const actualPanel = () => tam.panel ?? der.current?.querySelector('.panel-inf')?.getBoundingClientRect().height ?? 240;

  const divisorIzq = {
    etiqueta: 'Ancho de la lección',
    valor: tam.izq,
    onMover: anchoIzq,
    onPaso: (s, largo) => anchoIzq((cols.current?.getBoundingClientRect().left || 0) + actualIzq() + s * (largo ? PASO_LARGO : PASO)),
    onReiniciar: () => setTam(t => ({ ...t, izq: null })),
  };
  const divisorPanel = {
    etiqueta: 'Alto del panel de resultados',
    valor: tam.panel,
    onMover: altoPanel,
    // Abajo = panel más pequeño = editor más grande.
    onPaso: (s, largo) => altoPanel((barra.current?.getBoundingClientRect().top || 0) - actualPanel() + s * (largo ? PASO_LARGO : PASO)),
    onReiniciar: () => setTam(t => ({ ...t, panel: null })),
  };

  const estiloCols = tam.izq ? { '--ancho-leccion': `${tam.izq}px` } : undefined;
  const estiloDer = tam.panel ? { '--alto-resultados': `${tam.panel}px` } : undefined;

  return { refs: { cols, der, ed, barra }, ampliado, setAmpliado, divisorIzq, divisorPanel, estiloCols, estiloDer };
}
