import { useRef } from 'react';

// Barra arrastrable para redimensionar paneles. `onMover` recibe la posición
// del puntero (clientX en vertical, clientY en horizontal); `onPaso` recibe
// +1/-1 desde el teclado y `onReiniciar` vuelve al tamaño por defecto.
export default function Divisor({ orientacion = 'vertical', etiqueta, onMover, onPaso, onReiniciar, valor }) {
  const arrastrando = useRef(false);
  const vertical = orientacion === 'vertical';

  const mover = e => {
    if (!arrastrando.current) return;
    e.preventDefault();
    onMover(vertical ? e.clientX : e.clientY);
  };
  const soltar = e => {
    if (!arrastrando.current) return;
    arrastrando.current = false;
    document.body.classList.remove('arrastrando-divisor', 'arrastrando-v', 'arrastrando-h');
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ya liberado */ }
  };

  return (
    <div
      className={`divisor divisor-${vertical ? 'v' : 'h'}`}
      role="separator"
      aria-orientation={vertical ? 'vertical' : 'horizontal'}
      aria-label={etiqueta}
      aria-valuenow={valor ?? undefined}
      tabIndex={0}
      title={`${etiqueta}: arrastra para cambiar el tamaño · doble clic para restablecer`}
      onPointerDown={e => {
        if (e.button !== 0) return;
        arrastrando.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        document.body.classList.add('arrastrando-divisor', vertical ? 'arrastrando-v' : 'arrastrando-h');
        e.preventDefault();
      }}
      onPointerMove={mover}
      onPointerUp={soltar}
      onPointerCancel={soltar}
      onDoubleClick={onReiniciar}
      onKeyDown={e => {
        const menos = vertical ? 'ArrowLeft' : 'ArrowUp';
        const mas = vertical ? 'ArrowRight' : 'ArrowDown';
        if (e.key === menos || e.key === mas) { e.preventDefault(); onPaso(e.key === mas ? 1 : -1, e.shiftKey); }
        else if (e.key === 'Home' || e.key === 'Enter') { e.preventDefault(); onReiniciar(); }
      }}
    >
      <span className="divisor-agarre" aria-hidden="true" />
    </div>
  );
}
