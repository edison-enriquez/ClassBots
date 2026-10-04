/* Extensiones de CodeMirror 6 para el editor del taller:
   autocompletado contextual, diagnóstico con correcciones, "error lens",
   ayuda de parámetros y sugerencias en gris (locales o con IA). */
import { EditorView, keymap, Decoration, WidgetType, ViewPlugin, showTooltip, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, dropCursor, highlightSpecialChars } from '@codemirror/view';
import { EditorState, StateEffect, StateField, Prec } from '@codemirror/state';
import { autocompletion, completionKeymap, completionStatus, acceptCompletion, closeBrackets, closeBracketsKeymap, snippet, hasNextSnippetField, nextSnippetField, startCompletion } from '@codemirror/autocomplete';
import { linter, lintGutter, forEachDiagnostic, lintKeymap } from '@codemirror/lint';
import { defaultKeymap, history, historyKeymap, indentMore, indentLess } from '@codemirror/commands';
import { indentOnInput, bracketMatching, syntaxHighlighting, HighlightStyle, indentUnit } from '@codemirror/language';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { java } from '@codemirror/lang-java';
import { tags as t } from '@lezer/highlight';
import { contexto, sugerencias, sugerenciaLocal, firmaEn, dinamica, PLANTILLAS, SNIP_CLAVE } from './analisis.js';
import { diagnosticar, clasesPorArchivo } from './diagnostico.js';
import { obtenerProveedorIA, promptIA, limpiarIA, MENSAJES_IA, IA_PERMANENTE } from './ia.js';
import { recordarCopia, esInterno } from '../metricas/portapapeles.js';

/* ---------- Tema ---------- */
const estilo = HighlightStyle.define([
  { tag: [t.keyword, t.modifier, t.definitionKeyword, t.controlKeyword, t.operatorKeyword, t.moduleKeyword], color: 'var(--s-kw)' },
  { tag: [t.typeName, t.standard(t.typeName)], color: 'var(--s-ty)' },
  { tag: [t.className, t.definition(t.className)], color: 'var(--s-cl)' },
  { tag: [t.string, t.character], color: 'var(--s-str)' },
  { tag: [t.number, t.bool, t.null], color: 'var(--s-num)' },
  { tag: [t.comment, t.lineComment, t.blockComment], color: 'var(--s-com)', fontStyle: 'italic' },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: 'var(--s-fn)' },
  { tag: [t.propertyName], color: 'var(--s-prop)' },
  { tag: [t.self], color: 'var(--s-kw)', fontStyle: 'italic' },
]);

const tema = EditorView.theme({
  '&': { height: '100%', color: 'var(--ink)', backgroundColor: 'var(--code)', fontSize: '14px' },
  '.cm-content': { fontFamily: 'var(--f-code)', caretColor: 'var(--gold)', padding: '10px 0' },
  '.cm-scroller': { fontFamily: 'var(--f-code)', lineHeight: '1.65' },
  '.cm-gutters': { backgroundColor: 'var(--code)', color: 'var(--gutter)', border: 'none', borderRight: '2px solid var(--line)' },
  '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--gold)' },
  '.cm-activeLine': { backgroundColor: 'rgba(255,204,51,.05)' },
  '&.cm-focused .cm-cursor': { borderLeftColor: 'var(--gold)', borderLeftWidth: '2px' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': { backgroundColor: 'rgba(124,212,255,.22) !important' },
  '.cm-matchingBracket': { backgroundColor: 'rgba(255,204,51,.18)', outline: '1px solid rgba(255,204,51,.5)' },
  '.cm-tooltip': { backgroundColor: 'var(--panel2)', border: '2px solid var(--line)', borderRadius: '0', color: 'var(--ink)', boxShadow: '4px 4px 0 rgba(0,0,0,.45)' },
  '.cm-tooltip-autocomplete > ul': { fontFamily: 'var(--f-code)', fontSize: '13px', maxHeight: '15em' },
  '.cm-tooltip-autocomplete > ul > li': { padding: '2px 10px 2px 4px !important', lineHeight: '1.6' },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': { backgroundColor: 'var(--gold)', color: 'var(--gold-ink)' },
  '.cm-completionDetail': { color: 'var(--dim)', fontStyle: 'normal', marginLeft: '1.2em', fontSize: '12px' },
  'li[aria-selected] .cm-completionDetail': { color: 'var(--gold-ink)' },
  '.cm-completionMatchedText': { textDecoration: 'none', fontWeight: '700', color: 'var(--gold)' },
  'li[aria-selected] .cm-completionMatchedText': { color: 'var(--gold-ink)' },
  '.cm-completionInfo': { padding: '8px 10px', maxWidth: '300px', fontFamily: 'var(--f-body)', fontSize: '13.5px', lineHeight: '1.45' },
  '.cm-diagnostic': { fontFamily: 'var(--f-body)', fontSize: '13.5px', padding: '6px 10px' },
  '.cm-diagnosticAction': { backgroundColor: 'var(--gold)', color: 'var(--gold-ink)', borderRadius: 0, fontWeight: 700, padding: '2px 8px' },
  '.cm-lintRange-error': { backgroundImage: 'none', textDecoration: 'underline wavy var(--err)', textUnderlineOffset: '3px', textDecorationSkipInk: 'none' },
  '.cm-lintRange-warning': { backgroundImage: 'none', textDecoration: 'underline wavy var(--warn)', textUnderlineOffset: '3px', textDecorationSkipInk: 'none' },
  '.cm-lens': { paddingLeft: '2.2em', fontStyle: 'italic', fontSize: '12.5px', fontFamily: 'var(--f-code)', pointerEvents: 'none' },
  '.cm-lens-error': { color: 'var(--err)' }, '.cm-lens-warning': { color: 'var(--warn)' },
  '.cm-ghost': { color: 'var(--ghost)', whiteSpace: 'pre', pointerEvents: 'none' },
  '.cm-ghost-ia': { color: 'var(--ia)' },
  '.cm-ghost-pensando': { color: 'var(--ia)', animation: 'pulso 1s ease-in-out infinite alternate' },
  '.cm-firma': { padding: '3px 10px', fontFamily: 'var(--f-code)', fontSize: '12.5px', color: 'var(--dim)' },
  '.cm-firma b': { color: 'var(--gold)' },
  '.cm-panels': { backgroundColor: 'var(--panel2)', color: 'var(--ink)' },
}, { dark: true });

/* ---------- Ghost text ---------- */
export const setGhost = StateEffect.define();
class GhostWidget extends WidgetType {
  constructor(g) { super(); this.g = g; }
  eq(o) { return o.g.texto === this.g.texto && o.g.pensando === this.g.pensando && o.g.ia === this.g.ia; }
  toDOM() {
    const s = document.createElement('span');
    const vacio = this.g.pensando && !this.g.texto;
    s.className = 'cm-ghost' + (this.g.ia ? ' cm-ghost-ia' : '') + (vacio ? ' cm-ghost-pensando' : '');
    s.textContent = vacio ? ' ✦ pensando…' : this.g.texto;
    s.setAttribute('aria-hidden', 'true');
    return s;
  }
  ignoreEvent() { return true; }
}
export const ghostField = StateField.define({
  create: () => null,
  update(v, tr) {
    for (const e of tr.effects) if (e.is(setGhost)) return e.value;
    if (!v) return null;
    if (tr.docChanged) {
      if (v.pensando) return null;
      let sigue = null;
      if (tr.isUserEvent('input.type')) {
        tr.changes.iterChanges((fa, ta, fb, tb, ins) => {
          const s = ins.toString();
          if (fa === v.pos && ta === fa && s && v.texto.startsWith(s)) sigue = { ...v, texto: v.texto.slice(s.length), pos: tb };
        });
      }
      return sigue && sigue.texto ? sigue : null;
    }
    if (tr.selection) { const h = tr.state.selection.main; if (!h.empty || h.head !== v.pos) return null; }
    return v;
  },
  provide: f => EditorView.decorations.from(f, v => (v && (v.texto || v.pensando) ? Decoration.set([Decoration.widget({ widget: new GhostWidget(v), side: 1 }).range(v.pos)]) : Decoration.none)),
});

/* ---------- Error lens ---------- */
class LensWidget extends WidgetType {
  constructor(msg, sev) { super(); this.msg = msg; this.sev = sev; }
  eq(o) { return o.msg === this.msg && o.sev === this.sev; }
  toDOM() { const s = document.createElement('span'); s.className = 'cm-lens cm-lens-' + this.sev; s.textContent = this.msg; return s; }
  ignoreEvent() { return true; }
}
const lens = ViewPlugin.fromClass(class {
  constructor(v) { this.decorations = this.build(v); }
  update(u) { this.decorations = this.build(u.view); }
  build(view) {
    const st = view.state, cur = st.doc.lineAt(st.selection.main.head).number, porLinea = new Map();
    forEachDiagnostic(st, (d, from) => {
      const ln = st.doc.lineAt(Math.min(from, st.doc.length)).number, prev = porLinea.get(ln);
      if (!prev || (prev.severity !== 'error' && d.severity === 'error')) porLinea.set(ln, d);
    });
    const r = [];
    for (const [ln, d] of [...porLinea].sort((a, b) => a[0] - b[0])) {
      if (ln === cur || st.field(ghostField)?.pos === st.doc.line(ln).to) continue;
      r.push(Decoration.widget({ widget: new LensWidget(d.message + (d.actions?.length ? '  · Ctrl+. corrige' : ''), d.severity), side: 2 }).range(st.doc.line(ln).to));
    }
    return Decoration.set(r);
  }
}, { decorations: v => v.decorations });

/* ---------- Construcción ---------- */
const TIPO = { metodo: 'method', atributo: 'property', clase: 'class', variable: 'variable', clave: 'keyword', tipo: 'type', plantilla: 'text' };
const BOOST = { variable: 4, atributo: 3, metodo: 3, plantilla: 2, clase: 1, tipo: 0, clave: -1 };

/**
 * cfg: {
 *   activo(): nombre del archivo abierto, archivos(): {archivo: código},
 *   modo(): 'off'|'basico'|'ia', nivel(): nivel actual,
 *   aviso(msg), iaNoDisponible(), onCambio(texto), onCursor(linea, col), onEjecutar()
 * }
 */
export function crearExtensiones(cfg) {
  let memoKey = '', memoC = {};
  const clases = state => {
    const files = { ...cfg.archivos(), [cfg.activo()]: state.doc.toString() };
    const key = Object.entries(files).map(([a, s]) => a + '\0' + s).join('\u0001');
    if (key !== memoKey) { memoKey = key; memoC = Object.assign({}, ...Object.values(clasesPorArchivo(files))); }
    return memoC;
  };

  const fuente = context => {
    if (cfg.modo() === 'off' && !context.explicit) return null;
    const r = sugerencias(context.state.doc.toString(), context.pos, clases(context.state), context.explicit);
    if (!r || !r.items.length) return null;
    return {
      from: r.from,
      validFor: /^[\w$]*$/,
      options: r.items.map(it => ({
        label: it.label, type: TIPO[it.kind], detail: it.detail || undefined, info: it.doc || undefined,
        boost: BOOST[it.kind], apply: it.plantilla ? snippet(it.plantilla) : undefined,
      })),
    };
  };

  const fuenteLint = view => {
    const d = diagnosticar({ ...cfg.archivos(), [cfg.activo()]: view.state.doc.toString() });
    const m = d.porArchivo[cfg.activo()];
    if (!m) return [];
    const doc = view.state.doc;
    return [...m.values()].filter(x => x.linea <= doc.lines).map(x => {
      const line = doc.line(x.linea), ws = /^\s*/.exec(line.text)[0].length;
      return {
        from: line.from + ws, to: Math.max(line.from + ws, line.to), severity: x.sev === 'err' ? 'error' : 'warning', message: x.msg,
        actions: x.fix ? [{ name: 'Corregir', apply(v, from) { const l = v.state.doc.lineAt(from); const n = x.fix(l.text); if (n !== l.text) v.dispatch({ changes: { from: l.from, to: l.to, insert: n }, userEvent: 'input.fix' }); } }] : [],
      };
    });
  };

  const aceptarGhost = (view, palabra) => {
    const g = view.state.field(ghostField);
    if (!g || !g.texto || g.pensando) return false;
    let txt = g.texto;
    if (palabra) { const m = /^(\s*[\w$]+|\s*[^\w\s]+|\s+)/.exec(txt); if (m) txt = m[0]; }
    const resto = g.texto.slice(txt.length), fin = g.pos + txt.length;
    view.dispatch({
      changes: { from: g.pos, insert: txt },
      selection: { anchor: !resto && g.atras ? fin - g.atras : fin },
      effects: setGhost.of(resto ? { ...g, texto: resto, pos: fin } : null),
      userEvent: g.ia ? 'input.complete.ia' : 'input.complete', scrollIntoView: true,
    });
    if (g.ia && !resto) cfg.aviso('');
    return true;
  };

  const expandirPlantilla = view => {
    const st = view.state, sel = st.selection.main;
    if (!sel.empty) return false;
    const ctx = contexto(st.doc.toString(), sel.head);
    if (ctx.enTexto) return false;
    const w = /[\w$]+$/.exec(ctx.prefijoLinea);
    if (!w) return false;
    const p = PLANTILLAS.find(x => x.label === w[0] && x.zona === ctx.zona);
    const tpl = p ? dinamica(p, ctx, clases(st)) : ctx.zona === 'metodo' && SNIP_CLAVE[w[0]];
    if (!tpl) return false;
    snippet(tpl)(view, null, sel.head - w[0].length, sel.head);
    return true;
  };

  const corregirLinea = view => {
    const st = view.state, ln = st.doc.lineAt(st.selection.main.head);
    let hecho = false;
    forEachDiagnostic(st, (d, from) => {
      if (hecho || !d.actions?.length) return;
      if (st.doc.lineAt(Math.min(from, st.doc.length)).number === ln.number) { d.actions[0].apply(view, from, from); hecho = true; }
    });
    cfg.aviso(hecho ? 'Corregido. Ctrl+Z lo deshace.' : 'No hay una corrección automática para esta línea.');
    return true;
  };

  let iaCtl = null;
  const pedirIA = async view => {
    if (cfg.modo() !== 'ia') { cfg.aviso('Activa el asistente «IA ✦» para pedir sugerencias.'); return; }
    const prov = await obtenerProveedorIA();
    if (!prov) { cfg.iaNoDisponible(); cfg.aviso('La IA no está disponible en este despliegue. El asistente básico sigue funcionando.'); return; }
    const st = view.state, pos = st.selection.main.head, texto = st.doc.toString(), ctx = contexto(texto, pos);
    if (!st.selection.main.empty || ctx.enTexto || ctx.sufijoLinea.trim()) { cfg.aviso('Ubica el cursor al final de una línea para pedir una sugerencia.'); return; }
    if (iaCtl) iaCtl.abort();
    const ctl = new AbortController(); iaCtl = ctl;
    const vigente = () => { const g = view.state.field(ghostField); return iaCtl === ctl && g && g.ia && g.pos === pos; };
    view.dispatch({ effects: setGhost.of({ texto: '', pos, ia: true, pensando: true }) });
    cfg.aviso('La IA está pensando… Esc cancela.');
    try {
      const prompt = promptIA({ nivel: cfg.nivel(), archivos: cfg.archivos(), activo: cfg.activo(), texto, pos });
      const final = await prov.sugerir(prompt, { signal: ctl.signal, onText: txt => { if (vigente()) view.dispatch({ effects: setGhost.of({ texto: limpiarIA(txt, ctx.prefijoLinea), pos, ia: true, pensando: true }) }); } });
      if (!vigente()) return;
      iaCtl = null;
      const s = limpiarIA(final, ctx.prefijoLinea);
      view.dispatch({ effects: setGhost.of(s ? { texto: s, pos, ia: true } : null) });
      cfg.aviso(s ? 'Sugerencia de la IA: Tab la acepta, Esc la descarta.' : 'La IA no encontró nada útil que sugerir aquí.');
    } catch (e) {
      if (iaCtl === ctl) iaCtl = null;
      const code = e?.code;
      if (code === 'cancelled' || e?.name === 'AbortError') return;
      if (view.state.field(ghostField)?.ia) view.dispatch({ effects: setGhost.of(null) });
      if (IA_PERMANENTE.has(code)) cfg.iaNoDisponible();
      cfg.aviso(MENSAJES_IA[code] || 'No se pudo obtener la sugerencia. Intenta de nuevo.');
    }
  };

  const ghostPlugin = ViewPlugin.fromClass(class {
    constructor(v) { this.view = v; this.t = null; }
    update(u) {
      const g = u.state.field(ghostField), antes = u.startState.field(ghostField);
      if (!g && antes?.ia && iaCtl) { iaCtl.abort(); iaCtl = null; }
      const escrito = u.transactions.some(tr => tr.isUserEvent('input') || tr.isUserEvent('delete'));
      if (u.docChanged && escrito && !g && cfg.modo() !== 'off') { clearTimeout(this.t); this.t = setTimeout(() => this.calcular(), 60); }
      if (u.docChanged) cfg.onCambio(u.state.doc.toString());
      if (u.selectionSet || u.docChanged) { const h = u.state.selection.main.head, l = u.state.doc.lineAt(h); cfg.onCursor(l.number, h - l.from + 1); }
    }
    calcular() {
      const v = this.view, st = v.state, sel = st.selection.main;
      if (st.field(ghostField) || !sel.empty || cfg.modo() === 'off') return;
      if (completionStatus(st) === 'active') return;
      const s = sugerenciaLocal(st.doc.toString(), sel.head, clases(st));
      if (s) v.dispatch({ effects: setGhost.of({ ...s, pos: sel.head }) });
    }
    destroy() { clearTimeout(this.t); }
  });

  const calcFirma = st => {
    const sel = st.selection.main;
    if (!sel.empty) return null;
    const f = firmaEn(st.doc.toString(), sel.head, clases(st));
    if (!f) return null;
    return {
      pos: sel.head, above: true, arrow: false,
      create: () => {
        const dom = document.createElement('div');
        dom.className = 'cm-firma';
        const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
        dom.innerHTML = f.texto ? esc(f.titulo) : `${esc(f.titulo)}(${f.params.map((p, i) => (i === f.activo ? `<b>${esc(p)}</b>` : esc(p))).join(', ')})${f.params.length ? '' : ' <i>sin parámetros</i>'}`;
        return { dom };
      },
    };
  };
  const firmaField = StateField.define({
    create: calcFirma,
    update: (v, tr) => (tr.docChanged || tr.selection ? calcFirma(tr.state) : v),
    provide: f => showTooltip.from(f),
  });

  const miKeymap = Prec.highest(keymap.of([
    { key: 'Tab', run: v => aceptarGhost(v, false) || (hasNextSnippetField(v.state) && nextSnippetField(v)) || (completionStatus(v.state) === 'active' && acceptCompletion(v)) || expandirPlantilla(v) || indentMore(v), shift: indentLess },
    { key: 'Mod-ArrowRight', run: v => aceptarGhost(v, true) },
    { key: 'Escape', run: v => { if (v.state.field(ghostField)) { v.dispatch({ effects: setGhost.of(null) }); return true; } return false; } },
    { key: 'Mod-.', run: corregirLinea, preventDefault: true },
    { key: 'Alt-\\', run: v => { pedirIA(v); return true; }, preventDefault: true },
    { key: 'Mod-Enter', run: () => { cfg.onEjecutar(); return true; }, preventDefault: true },
    { key: 'Mod-Space', run: startCompletion },
  ]));

  /* Métricas de escritura: cómo llega el código al editor (tecleado, autocompletado, IA o pegado) */
  const sinEspacios = t => t.replace(/\s+/g, '').length;
  const escritura = [
    EditorView.updateListener.of(u => {
      if (!u.docChanged || !cfg.onEscritura) return;
      for (const tr of u.transactions) {
        if (!tr.docChanged) continue;
        let ins = '', del = 0;
        tr.changes.iterChanges((fA, tA, fB, tB, texto) => { del += tA - fA; ins += texto.toString(); });
        let tipo = null;
        if (tr.isUserEvent('input.paste') || tr.isUserEvent('input.drop')) tipo = 'pegado';
        else if (tr.isUserEvent('input.complete.ia')) tipo = 'ia';
        else if (tr.isUserEvent('input.complete')) tipo = 'completar';
        else if (tr.isUserEvent('input')) tipo = 'teclado';
        else if (tr.isUserEvent('delete')) tipo = 'borrar';
        if (!tipo) continue; // deshacer, rehacer o cambios del propio taller
        if (tipo === 'borrar') cfg.onEscritura({ tipo, n: del });
        else if (tipo === 'pegado') cfg.onEscritura({ tipo, n: sinEspacios(ins), externo: !esInterno(ins) });
        else if (ins) cfg.onEscritura({ tipo, n: sinEspacios(ins) });
      }
    }),
    EditorView.domEventHandlers({
      copy: (e, v) => { const r = v.state.selection.main; recordarCopia(v.state.sliceDoc(r.from, r.to)); },
      cut: (e, v) => { const r = v.state.selection.main; recordarCopia(v.state.sliceDoc(r.from, r.to)); },
    }),
  ];

  const extensiones = [
    lineNumbers(), highlightActiveLineGutter(), highlightSpecialChars(), history(), drawSelection(), dropCursor(),
    EditorState.allowMultipleSelections.of(false), indentUnit.of('    '), EditorState.tabSize.of(4),
    indentOnInput(), syntaxHighlighting(estilo), bracketMatching(), closeBrackets(),
    autocompletion({ override: [fuente], activateOnTypingDelay: 80, icons: true, maxRenderedOptions: 60 }),
    highlightActiveLine(), highlightSelectionMatches(), java(),
    lintGutter(), linter(fuenteLint, { delay: 400 }), lens,
    ghostField, ghostPlugin, firmaField, miKeymap,
    keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...searchKeymap, ...historyKeymap, ...completionKeymap, ...lintKeymap]),
    EditorView.contentAttributes.of({ 'aria-label': 'Editor de código Java', spellcheck: 'false', autocapitalize: 'off', autocorrect: 'off' }),
    tema, escritura,
  ];
  return { extensiones, pedirIA, aceptarGhost };
}
