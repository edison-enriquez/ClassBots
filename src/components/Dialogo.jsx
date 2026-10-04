import { useEffect, useState } from 'react';
import Avatar from './Avatar.jsx';

/* Ventana de diálogo RPG con efecto de máquina de escribir */
export function useEscribir(texto, velocidad = 18) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const quieto = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (quieto || !texto) { setN(texto ? texto.length : 0); return; }
    setN(0);
    let k = 0;
    const t = setInterval(() => { k += 2; setN(Math.min(k, texto.length)); if (k >= texto.length) clearInterval(t); }, velocidad);
    return () => clearInterval(t);
  }, [texto, velocidad]);
  return [texto ? texto.slice(0, n) : '', n >= (texto?.length || 0), () => setN(texto?.length || 0)];
}

/* Quién habla según el texto del cuadro de la animación */
export function hablante(cap) {
  if (!cap) return null;
  let m = cap.match(/^System\.out\.println → (.*)$/);
  if (m) return { quien: 'CONSOLA', txt: m[1], tipo: 'consola' };
  m = cap.match(/^new (\w+)/);
  if (m) return { quien: 'TALLER', txt: `¡Se construyó un ${m[1]} nuevo!`, tipo: 'taller' };
  m = cap.match(/^([^.\s(]+)\.(.*)$/);
  if (m) return { quien: m[1], txt: m[2], tipo: 'objeto' };
  return { quien: 'TALLER', txt: cap, tipo: 'taller' };
}

export default function Dialogo({ caption, reposo }) {
  const h = hablante(caption) || { quien: 'CHISPA', txt: reposo, tipo: 'chispa' };
  const [visible, listo, saltar] = useEscribir(h.txt);
  return (
    <div className={'dialogo rpg-ventana d-' + h.tipo} onClick={saltar}>
      {h.tipo === 'chispa' && <Avatar tamano={2} className="retrato" />}
      <div className="dialogo-cuerpo">
        <span className="dialogo-nombre">{h.quien}</span>
        <p className="tipeo"><span className="sr" aria-live="polite">{h.txt}</span><span className="tipeo-hueco" aria-hidden="true">{h.txt} ▼</span><span className="tipeo-txt" aria-hidden="true">{visible}{listo && <span className="cursor-rpg"> ▼</span>}</span></p>
      </div>
    </div>
  );
}
