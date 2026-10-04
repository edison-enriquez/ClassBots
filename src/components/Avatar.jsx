import { useEffect, useRef } from 'react';
import { robotRPG, paletaRPG } from '../game/rpg.js';

/* Chispa, la jefa del taller: un robot chibi en pixel art RPG */
export default function Avatar({ tamano = 3, color = 'amarillo', titulo = 'Chispa, jefa del taller', className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    const ctx = ref.current.getContext('2d');
    let raf;
    const quieto = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const loop = now => {
      ctx.clearRect(0, 0, 18, 18);
      const pal = paletaRPG(color, { energia: 100, antena: Math.floor(now / 600) % 2 === 0 });
      robotRPG(ctx, 9, 16, { pal, parpadeo: Math.floor(now / 140) % 28 === 0, salto: quieto ? 0 : (Math.floor(now / 500) % 2) });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [color]);
  return <canvas ref={ref} width={18} height={18} className={'avatar ' + className} style={{ width: 18 * tamano, height: 18 * tamano }} role="img" aria-label={titulo} />;
}
