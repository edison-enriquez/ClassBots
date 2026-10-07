/* Lado del estudiante de la programación en pareja: recibe la invitación firmada, pide permiso,
   comparte el código del capítulo abierto y lo mantiene sincronizado con la app. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { invitacionValida, parEfimero, llaveSesion, crearCanal, docDesdeArchivos, archivosDeDoc, reemplazarEnDoc, COLORES } from './pareja.js';

export function useParejaEstudiante({ clase, perfil, nivel, cod, setCod, enviar, onEvento, onAviso }) {
  const [invitacion, setInvitacion] = useState(null);
  const [sesion, setSesion] = useState(null);
  const ref = useRef({});
  ref.current = { clase, perfil, nivel, cod, sesion, invitacion, enviar, onEvento, onAviso };

  /* razon (para el profesor): 'estudiante' | 'capitulo' | 'salio' */
  const terminar = useCallback((avisarAlOtro = true, motivo = '', razon = 'estudiante') => {
    const { sesion: ses, enviar: env, onEvento: ev, onAviso: av } = ref.current;
    if (!ses) return;
    if (avisarAlOtro) env({ tipo: 'fin', s: ses.canal.sesion, razon });
    ses.canal.cerrar();
    setSesion(null);
    ev?.({ tipo: 'pareja', fase: 'fin', nivel: ses.nivelId });
    if (motivo) av?.(motivo);
  }, []);

  const recibir = useCallback(async d => {
    if (!d || typeof d !== 'object') return;
    const { sesion: ses, clase: cl, perfil: pf, enviar: env } = ref.current;
    if (d.tipo === 'reconectado') { ses?.canal.enviarTodo(); return; }
    if (d.tipo === 'invita') {
      if (ses) { env({ tipo: 'ocupado', s: d.s }); return; }
      // Solo el profesor de la clase puede invitar: la invitación viene firmada con la llave de la clase
      if (!cl || !pf?.id || !(await invitacionValida(cl, pf.id, d))) return;
      setInvitacion(d);
      return;
    }
    if (!ses || d.s !== ses.canal.sesion) return;
    if (d.tipo === 'fin') { terminar(false, 'Tu profesor terminó la sesión en pareja.'); return; }
    ses.canal.recibir(d);
  }, [terminar]);

  const aceptar = useCallback(async () => {
    const { invitacion: d, nivel: nv, cod: c, perfil: pf, enviar: env, onEvento: ev } = ref.current;
    if (!d) return;
    setInvitacion(null);
    const par = await parEfimero();
    const llave = await llaveSesion(par.priv, d.pub, d.s);
    const nombres = nv.archivos;
    const doc = docDesdeArchivos(Object.fromEntries(nombres.map(f => [f, c.files[f] ?? ''])));
    const canal = crearCanal({ llave, sesion: d.s, enviar: x => ref.current.enviar(x), doc, usuario: { name: (pf.nombre || 'Estudiante').split(' ')[0], color: COLORES.estudiante } });
    // Lo que escribe el profesor llega al código del estudiante (y se guarda con su avance)
    doc.on('update', (u, origen) => { if (origen === 'remoto') setCod(x => ({ ...x, files: { ...x.files, ...archivosDeDoc(doc, nombres) } })); });
    env({ tipo: 'acepta', s: d.s, pub: par.pub, archivos: nombres, activo: c.activo, nivel: { id: nv.id, titulo: nv.titulo, etiqueta: nv.mision ? nv.misionCorto : `${nv.mundo}.${nv.enMundo + 1}` } });
    await canal.enviarTodo();
    setSesion({ canal, colab: { doc, awareness: canal.awareness }, nivelId: nv.id });
    ev?.({ tipo: 'pareja', fase: 'inicio', nivel: nv.id });
  }, [setCod]);

  const rechazar = useCallback(() => {
    const { invitacion: d, enviar: env } = ref.current;
    if (d) env({ tipo: 'rechaza', s: d.s });
    setInvitacion(null);
  }, []);

  // Cambiar de capítulo termina la sesión
  useEffect(() => { if (sesion && nivel.id !== sesion.nivelId) terminar(true, 'La sesión en pareja terminó porque cambiaste de capítulo.', 'capitulo'); }, [nivel.id, sesion, terminar]);
  // Al salir de la página, avisar al profesor
  useEffect(() => {
    const salir = () => { if (ref.current.sesion) ref.current.enviar({ tipo: 'fin', s: ref.current.sesion.canal.sesion, razon: 'salio' }); };
    window.addEventListener('pagehide', salir);
    return () => window.removeEventListener('pagehide', salir);
  }, []);

  const reemplazar = useCallback(files => { const ses = ref.current.sesion; if (ses) reemplazarEnDoc(ses.colab.doc, files); }, []);
  return { invitacion, sesion, colab: sesion?.colab || null, aceptar, rechazar, terminar, recibir, reemplazar };
}
