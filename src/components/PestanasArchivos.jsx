import { useEffect, useRef, useState } from 'react';

/* Pestañas de archivos del editor: se desplazan en horizontal sin barras visibles,
   con la rueda del ratón, con flechas cuando no caben, y la pestaña activa siempre a la vista. */
export default function PestanasArchivos({ archivos, activo, marcas, onElegir }) {
  const ref = useRef(null);
  const [borde, setBorde] = useState({ izq: false, der: false });

  const medir = () => {
    const el = ref.current;
    if (!el) return;
    const izq = el.scrollLeft > 2, der = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
    setBorde(b => (b.izq === izq && b.der === der ? b : { izq, der }));
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    medir();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(medir) : null;
    ro?.observe(el);
    // La rueda vertical desplaza las pestañas en horizontal
    const rueda = e => {
      if (el.scrollWidth <= el.clientWidth || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener('wheel', rueda, { passive: false });
    return () => { ro?.disconnect(); el.removeEventListener('wheel', rueda); };
  }, [archivos.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const tab = ref.current?.querySelector('[aria-selected="true"]');
    tab?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    medir();
  }, [activo, archivos.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const mover = dir => ref.current?.scrollBy({ left: dir * Math.max(120, ref.current.clientWidth * 0.6), behavior: 'smooth' });

  // Flechas del teclado entre pestañas (patrón de tablist accesible)
  const teclado = e => {
    const k = archivos.indexOf(activo);
    let n = null;
    if (e.key === 'ArrowRight') n = (k + 1) % archivos.length;
    else if (e.key === 'ArrowLeft') n = (k - 1 + archivos.length) % archivos.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = archivos.length - 1;
    if (n == null) return;
    e.preventDefault();
    onElegir(archivos[n]);
    requestAnimationFrame(() => ref.current?.querySelector('[aria-selected="true"]')?.focus());
  };

  return (
    <div className={'archivos-marco' + (borde.izq ? ' hay-izq' : '') + (borde.der ? ' hay-der' : '')}>
      {borde.izq && <button type="button" className="archivos-flecha izq" tabIndex={-1} aria-hidden="true" onClick={() => mover(-1)}>‹</button>}
      <div className="archivos" role="tablist" aria-label="Archivos" ref={ref} onScroll={medir} onKeyDown={teclado}>
        {archivos.map(a => {
          const marca = marcas(a);
          return (
            <button key={a} type="button" role="tab" className="archivo" aria-selected={a === activo} tabIndex={a === activo ? 0 : -1}
              title={a} onClick={() => onElegir(a)}>
              {a}{marca && <span className={'punto ' + marca} aria-label={marca === 'err' ? 'con errores' : 'con advertencias'}>●</span>}
            </button>
          );
        })}
      </div>
      {borde.der && <button type="button" className="archivos-flecha der" tabIndex={-1} aria-hidden="true" onClick={() => mover(1)}>›</button>}
    </div>
  );
}
