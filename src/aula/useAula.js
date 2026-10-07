/* Aula en vivo: el estudiante envía su estado (cifrado para la clase) y el profesor lo recibe. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { conectarAula, urlAula, comprimir } from './conexion.js';
import { cifrarParaClase, tieneAula } from '../metricas/cifrado.js';

const identidad = c => ({ id: c.id, pub: c.pub, firma: c.firma });

/* ---------- Estudiante ----------
   estadoVivo(): instantánea pequeña (capítulo, código abierto, errores, si está fuera de la ventana…)
   archivoActual(): el mismo archivo de avance que se descarga (con sus métricas selladas) */
export function useAulaEstudiante({ clase, perfilId, activo, estadoVivo, archivoActual, onMensaje, onPareja }) {
  const [estado, setEstado] = useState('apagado');
  const conn = useRef(null);
  const refs = useRef({});
  refs.current = { estadoVivo, archivoActual, onMensaje, onPareja, clase };
  const ultimoVivo = useRef({ txt: '', t: 0 });
  const usar = activo && tieneAula(clase) && /^[\w-]{1,40}$/.test(perfilId || '');

  const enviarArchivo = useCallback(async () => {
    const c = conn.current, { archivoActual: a, clase: cl } = refs.current;
    if (!c || !cl) return;
    try { c.enviarSobre('archivo', await cifrarParaClase(comprimir(await a()), cl)); } catch { /* se intenta en el próximo ciclo */ }
  }, []);

  useEffect(() => {
    if (!usar) { setEstado('apagado'); return undefined; }
    const c = conectarAula({
      url: urlAula(clase.aula),
      saludo: () => ({ t: 'hola', rol: 'estudiante', clase: identidad(clase), alumno: perfilId }),
      alEstado: setEstado,
      alMensaje: m => { if (m.t === 'mensaje') refs.current.onMensaje?.(m); if (m.t === 'pareja') refs.current.onPareja?.(m.d); if (m.t === 'listo') { enviarArchivo(); refs.current.onPareja?.({ tipo: 'reconectado' }); } },
    });
    conn.current = c;
    ultimoVivo.current = { txt: '', t: 0 };
    const vivo = async () => {
      const snap = refs.current.estadoVivo();
      const txt = JSON.stringify(snap), ahora = Date.now();
      // Solo si cambió algo, o cada 30 s para que el profesor sepa que sigue ahí
      if (txt === ultimoVivo.current.txt && ahora - ultimoVivo.current.t < 30000) return;
      ultimoVivo.current = { txt, t: ahora };
      try { c.enviarSobre('vivo', await cifrarParaClase({ ...snap, t: ahora }, refs.current.clase)); } catch { /* siguiente ciclo */ }
    };
    const tVivo = setInterval(vivo, 3000);
    const tArchivo = setInterval(enviarArchivo, 60000);
    const oculto = () => { if (document.visibilityState === 'hidden') { vivo(); enviarArchivo(); } };
    document.addEventListener('visibilitychange', oculto);
    return () => { clearInterval(tVivo); clearInterval(tArchivo); document.removeEventListener('visibilitychange', oculto); c.cerrar(); conn.current = null; };
  }, [usar, clase?.id, clase?.aula, perfilId, enviarArchivo]); // eslint-disable-line react-hooks/exhaustive-deps

  const enviarPareja = useCallback(d => !!conn.current?.enviar({ t: 'pareja', d }), []);
  return { estado, enviarArchivo, enviarPareja };
}
