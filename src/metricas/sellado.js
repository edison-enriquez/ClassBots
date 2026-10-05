/* Sella (cifra) las métricas de esta sesión cada 20 s y al salir de la pestaña.
   El sobre queda en localStorage; al recargar pasa a la lista de segmentos cerrados. */
import { useCallback, useEffect, useRef } from 'react';
import { sellarPara } from './cifrado.js';
import { nuevoSegmento, contenidoSegmento } from './metricas.js';
import { CLAVE_SEGMENTO } from '../hooks/useProgreso.js';

export function useSellado(prog) {
  const seg = useRef(null);
  if (!seg.current) seg.current = nuevoSegmento(prog.segmentos);
  const ultimo = useRef(prog);
  ultimo.current = prog;
  const sellar = useCallback(async () => {
    const sobre = await sellarPara(contenidoSegmento(ultimo.current, seg.current), ultimo.current.clase);
    try { localStorage.setItem(CLAVE_SEGMENTO, JSON.stringify(sobre)); } catch { /* sin almacenamiento */ }
    return sobre;
  }, []);
  useEffect(() => {
    const quizas = () => { if (ultimo.current.perfil) sellar().catch(() => {}); };
    const t = setInterval(quizas, 20000);
    const oculto = () => { if (document.visibilityState === 'hidden') quizas(); };
    document.addEventListener('visibilitychange', oculto);
    window.addEventListener('pagehide', quizas);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', oculto); window.removeEventListener('pagehide', quizas); };
  }, [sellar]);
  return sellar;
}
