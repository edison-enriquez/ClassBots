import { useEffect, useRef, useState } from 'react';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { crearExtensiones } from '../editor/extensiones.js';
import { extensionesColab } from './CodeEditor.jsx';
import { archivosDeDoc } from '../aula/pareja.js';

/* Editor del profesor en una sesión de programación en pareja: los mismos archivos que el
   estudiante, ligados al documento compartido, con el diagnóstico y el autocompletado del taller. */
export default function EditorPareja({ canal, archivos, activoInicial, nombre }) {
  const host = useRef(null), view = useRef(null);
  const [activo, setActivo] = useState(archivos.includes(activoInicial) ? activoInicial : archivos[0]);
  const actual = useRef(activo);
  actual.current = activo;
  const herramientas = useRef(null);
  const colab = useRef({ doc: canal.doc, awareness: canal.awareness });

  const estado = archivo => EditorState.create({ doc: canal.doc.getText(archivo).toString(), extensions: [herramientas.current.extensiones, extensionesColab(colab.current, archivo)] });

  useEffect(() => {
    herramientas.current = crearExtensiones({
      activo: () => actual.current,
      archivos: () => archivosDeDoc(canal.doc, archivos),
      modo: () => 'basico',
      nivel: () => ({ id: 'pareja', titulo: '', archivos }),
      aviso: () => {}, iaNoDisponible: () => {}, onCambio: () => {}, onCursor: () => {}, onEjecutar: () => {},
    });
    const v = new EditorView({ parent: host.current, state: estado(actual.current) });
    view.current = v;
    return () => { v.destroy(); view.current = null; };
  }, [canal]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cambiar de archivo: el estado se rehace desde el documento compartido
  const primera = useRef(true);
  useEffect(() => {
    if (primera.current) { primera.current = false; return; }
    view.current?.setState(estado(activo));
    view.current?.focus();
  }, [activo]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="pareja-editor">
      <div className="tabs-guia" role="tablist" aria-label={`Archivos de ${nombre}`}>
        {archivos.map(a => <button key={a} type="button" role="tab" aria-selected={a === activo} onClick={() => setActivo(a)}>{a}</button>)}
      </div>
      <div className="cm-host" ref={host} />
    </div>
  );
}
