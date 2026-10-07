/* Aula en vivo: el estudiante envía su estado (cifrado para la clase) y el profesor lo recibe. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { conectarAula, urlAula, comprimir, descomprimir } from './conexion.js';
import { cifrarParaClase, abrirSobre, firmarReto, tieneAula } from '../metricas/cifrado.js';

const identidad = c => ({ id: c.id, pub: c.pub, firma: c.firma });

/* ---------- Estudiante ----------
   estadoVivo(): instantánea pequeña (capítulo, código abierto, errores, si está fuera de la ventana…)
   archivoActual(): el mismo archivo de avance que se descarga (con sus métricas selladas) */
export function useAulaEstudiante({ clase, perfilId, activo, estadoVivo, archivoActual, onMensaje }) {
  const [estado, setEstado] = useState('apagado');
  const conn = useRef(null);
  const refs = useRef({});
  refs.current = { estadoVivo, archivoActual, onMensaje, clase };
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
      alMensaje: m => { if (m.t === 'mensaje') refs.current.onMensaje?.(m); if (m.t === 'listo') enviarArchivo(); },
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

  return { estado, enviarArchivo };
}

/* ---------- Profesor ----------
   Se conecta a una clase abierta (con su llave privada), recibe el historial guardado y lo que
   llega en vivo, y lo descifra en este navegador. */
export function useAulaProfesor({ clase, priv, onArchivo }) {
  const [estado, setEstado] = useState('apagado');
  const [detalle, setDetalle] = useState('');
  const [alumnos, setAlumnos] = useState({});
  const conn = useRef(null);
  const alArchivo = useRef(onArchivo);
  alArchivo.current = onArchivo;
  const usar = tieneAula(clase) && !!priv?.firma;

  useEffect(() => {
    if (!usar) { setEstado('apagado'); return undefined; }
    setAlumnos({});
    const llaves = { clases: { [clase.id]: priv } };
    const poner = (id, f) => setAlumnos(a => ({ ...a, [id]: f(a[id] || { conectado: false }) }));
    const abrir = async ({ alumno, clave, recibido, sobre }) => {
      try {
        const d = await abrirSobre(sobre, llaves);
        if (clave === 'vivo') poner(alumno, a => (a.vivoT > d.t ? a : { ...a, vivo: d, vivoT: d.t, recibido }));
        if (clave === 'archivo') { const arch = descomprimir(d); poner(alumno, a => ({ ...a, archivoT: recibido })); alArchivo.current?.(arch, alumno); }
      } catch { poner(alumno, a => ({ ...a, ilegible: true })); }
    };
    const c = conectarAula({
      url: urlAula(clase.aula),
      saludo: async reto => ({ t: 'hola', rol: 'profesor', clase: identidad(clase), firma: await firmarReto(priv, clase.id, reto) }),
      alEstado: (e, x) => { setEstado(e); setDetalle(typeof x === 'string' ? x : ''); if (e !== 'conectado') setAlumnos(a => Object.fromEntries(Object.entries(a).map(([k, v]) => [k, { ...v, conectado: false }]))); },
      alMensaje: m => {
        if (m.t === 'listo') for (const id of m.presentes || []) poner(id, a => ({ ...a, conectado: true }));
        if (m.t === 'historial') m.filas.forEach(abrir);
        if (m.t === 'sobre') abrir(m);
        if (m.t === 'presencia') poner(m.alumno, a => ({ ...a, conectado: m.conectado, desde: m.t2 }));
      },
    });
    conn.current = c;
    return () => { c.cerrar(); conn.current = null; };
  }, [usar, clase?.id, clase?.aula, priv]); // eslint-disable-line react-hooks/exhaustive-deps

  const mensaje = useCallback((para, texto) => !!conn.current?.enviar({ t: 'mensaje', para, texto }), []);
  return { estado, detalle, alumnos, mensaje, usar };
}
