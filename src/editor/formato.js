/* Orden del código: sangría de 4 espacios según la estructura de Java (llaves, if/else, switch…).
   - cambiosOrden(state): los cambios para ordenar todo el archivo (Shift+Alt+F o el botón «Ordenar»)
   - ordenarTexto(texto): lo mismo sobre un texto
   - problemasSangria(archivo, texto): advertencias de líneas mal sangradas, cada una con su corrección */
import { EditorState } from '@codemirror/state';
import { java } from '@codemirror/lang-java';
import { indentUnit, indentRange, ensureSyntaxTree, syntaxTree } from '@codemirror/language';

export const SANGRIA = 4;
const extensiones = [java(), indentUnit.of(' '.repeat(SANGRIA)), EditorState.tabSize.of(SANGRIA)];
const MAX_POR_ARCHIVO = 3;

const columnas = ws => { let c = 0; for (const ch of ws) c = ch === '\t' ? c + SANGRIA - (c % SANGRIA) : c + 1; return c; };

function estadoListo(texto) {
  const st = EditorState.create({ doc: texto, extensions: extensiones });
  ensureSyntaxTree(st, st.doc.length, 1000);
  return st;
}

/* ¿La línea empieza dentro de un comentario de bloque o un text block? Ahí no se toca nada */
function dentroDeComentario(st, pos) {
  const n = syntaxTree(st).resolveInner(pos, 1);
  return /Comment|TextBlock|StringLiteral/.test(n.name) && n.from < pos;
}

/* Sangría que debería tener cada línea: el archivo se re-sangra completo (cada línea según cómo
   quedaron las anteriores) y los comentarios de bloque se alinean con su apertura. */
function sangriaIdeal(st) {
  const r = st.update({ changes: indentRange(st, 0, st.doc.length) }).state;
  const doc = st.doc, out = [];
  let apertura = 0;
  for (let i = 1; i <= doc.lines; i++) {
    const l = doc.line(i), cuerpo = l.text.trim();
    const ideal = /^[ \t]*/.exec(r.doc.line(i).text)[0].length;
    const ws = /^[ \t]*/.exec(l.text)[0];
    const enCom = cuerpo && dentroDeComentario(st, l.from + ws.length);
    if (!enCom) apertura = ideal;
    out.push({ ws, cuerpo, enCom, ideal: enCom ? (/^\*/.test(cuerpo) ? apertura + 1 : null) : ideal });
  }
  return out;
}

/* Las líneas que se juzgan: empiezan una instrucción nueva (la anterior cerró con ; { } o :).
   Las continuaciones de una expresión larga quedan como las escribió el estudiante. */
function esperadas(st) {
  const ideal = sangriaIdeal(st), out = [];
  let previa = '';
  ideal.forEach((x, k) => {
    if (!x.cuerpo) { out.push(null); return; }
    const empieza = !previa || /[;{}:]$/.test(previa) || /^(\/\/|\/\*|\*|@)/.test(previa) || /\*\/$/.test(previa) || /^[})\]]/.test(x.cuerpo);
    out.push(x.ideal != null && empieza && !x.enCom ? { linea: k + 1, actual: columnas(x.ws), esperada: x.ideal, ws: x.ws, enCom: x.enCom } : null);
    if (!x.enCom && !/^\/\//.test(x.cuerpo)) previa = x.cuerpo.replace(/\s*\/\/.*$/, '');
  });
  return { ideal, juzgadas: out };
}

/* Cambios para ordenar el documento completo: sangría correcta, tabuladores a espacios y sin espacios al final */
export function cambiosOrden(state) {
  const st = estadoListo(state.doc.toString());
  const { ideal } = esperadas(st), cambios = [];
  for (let i = 1; i <= st.doc.lines; i++) {
    const l = st.doc.line(i), txt = l.text, x = ideal[i - 1];
    if (!x.cuerpo) { if (txt) cambios.push({ from: l.from, to: l.to, insert: '' }); continue; }
    const fin = /[ \t]+$/.exec(txt);
    if (fin && fin.index > x.ws.length) cambios.push({ from: l.from + fin.index, to: l.to, insert: '' });
    const nueva = ' '.repeat(x.ideal ?? columnas(x.ws));
    if (nueva !== x.ws) cambios.push({ from: l.from, to: l.from + x.ws.length, insert: nueva });
  }
  return cambios;
}

/* Ordena el archivo abierto en el editor. Devuelve cuántas líneas cambió (0 si ya estaba ordenado). */
export function ordenarVista(view) {
  if (view.state.readOnly) return 0;
  const cambios = cambiosOrden(view.state);
  if (!cambios.length) return 0;
  const lineas = new Set(cambios.map(c => view.state.doc.lineAt(c.from).number)).size;
  // userEvent propio: no cuenta como escritura del estudiante en las métricas
  view.dispatch({ changes: cambios, userEvent: 'format', scrollIntoView: true });
  return lineas;
}

export function ordenarTexto(texto) {
  const st = EditorState.create({ doc: texto });
  return st.update({ changes: cambiosOrden(st) }).state.doc.toString();
}

const cache = new Map();
export function problemasSangria(archivo, texto) {
  const k = archivo + '\0' + texto;
  if (cache.has(k)) return cache.get(k);
  let out = [];
  try {
    const malas = esperadas(estadoListo(texto)).juzgadas.filter(e => e && e.actual !== e.esperada);
    out = malas.slice(0, MAX_POR_ARCHIVO).map((e, j) => ({
      archivo, linea: e.linea, sev: 'warn', sangria: true,
      msg: `Sangría: van ${e.esperada} espacios, hay ${e.actual}.`
        + (j === 0 && malas.length > MAX_POR_ARCHIVO ? ` (${malas.length} líneas desordenadas)` : '')
        + ' Shift+Alt+F ordena todo el archivo.',
      fix: l => ' '.repeat(e.esperada) + l.trimStart(),
    }));
  } catch { out = []; }
  if (cache.size > 50) cache.clear();
  cache.set(k, out);
  return out;
}
