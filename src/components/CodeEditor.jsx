import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { EditorView } from '@codemirror/view';
import { EditorState, EditorSelection } from '@codemirror/state';
import { crearExtensiones } from '../editor/extensiones.js';

/* Envuelve CodeMirror. Mantiene un EditorState por archivo (cada uno con su
   historial de deshacer) y expone irALinea / pedirIA al resto de la app. */
const CodeEditor = forwardRef(function CodeEditor(props, ref) {
  const { nivel, archivos, activo, revision, modo } = props;
  const host = useRef(null);
  const view = useRef(null);
  const estados = useRef(new Map());
  const herramientas = useRef(null);
  const latest = useRef(props);
  latest.current = props;
  const anterior = useRef(activo);

  // Crear la vista una vez por nivel/revisión
  useEffect(() => {
    const cfg = {
      activo: () => latest.current.activo,
      archivos: () => latest.current.archivos,
      modo: () => latest.current.modo,
      nivel: () => latest.current.nivel,
      aviso: m => latest.current.onAviso?.(m),
      iaNoDisponible: () => latest.current.onIaNoDisponible?.(),
      onCambio: txt => latest.current.onCambio?.(latest.current.activo, txt),
      onCursor: (l, c) => latest.current.onCursor?.(l, c),
      onEjecutar: () => latest.current.onEjecutar?.(),
      onEscritura: ev => latest.current.onEscritura?.(ev),
    };
    herramientas.current = crearExtensiones(cfg);
    estados.current = new Map();
    const v = new EditorView({ parent: host.current, state: crearEstado(archivos[activo] ?? '') });
    view.current = v;
    anterior.current = latest.current.activo;
    return () => { v.destroy(); view.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nivel.id, revision]);

  function crearEstado(doc) {
    return EditorState.create({ doc, extensions: herramientas.current.extensiones });
  }

  // Cambiar de archivo conservando el estado de cada uno
  useEffect(() => {
    const v = view.current;
    if (!v || anterior.current === activo) { anterior.current = activo; return; }
    estados.current.set(anterior.current, v.state);
    v.setState(estados.current.get(activo) || crearEstado(latest.current.archivos[activo] ?? ''));
    anterior.current = activo;
    v.focus();
  }, [activo]);

  // Al cambiar el modo del asistente, forzar una actualización del linter/ghost
  useEffect(() => { view.current?.dispatch({}); }, [modo]);

  useImperativeHandle(ref, () => ({
    irALinea(linea) {
      const v = view.current; if (!v) return;
      const l = v.state.doc.line(Math.max(1, Math.min(linea, v.state.doc.lines)));
      v.dispatch({ selection: EditorSelection.range(l.from, l.to), scrollIntoView: true });
      v.focus();
    },
    reemplazarLinea(linea, fix) {
      const v = view.current; if (!v || linea > v.state.doc.lines) return false;
      const l = v.state.doc.line(linea), n = fix(l.text);
      if (n === l.text) return false;
      v.dispatch({ changes: { from: l.from, to: l.to, insert: n }, selection: { anchor: l.from + n.length }, userEvent: 'input.fix', scrollIntoView: true });
      v.focus();
      return true;
    },
    pedirIA() { const v = view.current; if (v) { v.focus(); herramientas.current.pedirIA(v); } },
    foco() { view.current?.focus(); },
  }), []);

  return <div className="cm-host" ref={host} />;
});

export default CodeEditor;
