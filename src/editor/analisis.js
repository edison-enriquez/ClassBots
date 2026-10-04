/* Análisis ligero del código Java para el asistente: dónde está el cursor,
   qué variables se ven, qué tipo tiene una expresión y qué sugerir. */
import { blankComments, blankStrings, tipoBase } from '../engine/motor.js';

export const DOCS = {
  this: 'Referencia al objeto actual. this.nombre es el atributo; nombre a secas es el parámetro o la variable local.',
  new: 'Crea un objeto nuevo y ejecuta el constructor de la clase.',
  class: 'Declara una clase: el plano a partir del cual se fabrican objetos.',
  public: 'Visible desde cualquier clase. En UML se marca con +.',
  private: 'Solo el código dentro de la misma clase puede usarlo. En UML se marca con −.',
  protected: 'Visible en la clase, sus subclases y el paquete. En UML se marca con #.',
  static: 'Pertenece a la clase, no a cada objeto. main es static porque arranca antes de que exista cualquier objeto.',
  final: 'No se puede volver a asignar después de darle valor.',
  void: 'El método no devuelve ningún valor.',
  return: 'Termina el método y devuelve un valor a quien lo llamó.',
  if: 'Ejecuta un bloque solo si la condición es verdadera.',
  else: 'Bloque alternativo cuando la condición del if es falsa.',
  for: 'Repite un bloque un número conocido de veces.',
  while: 'Repite un bloque mientras la condición sea verdadera.',
  true: 'Valor booleano verdadero.', false: 'Valor booleano falso.',
  null: 'Ausencia de objeto. Usar un atributo de algo null produce NullPointerException.',
  break: 'Sale del bucle actual.', continue: 'Salta a la siguiente vuelta del bucle.',
  int: 'Número entero: 0, 7, -15.', double: 'Número con decimales: 3.5, -0.25.',
  boolean: 'Verdadero o falso.', char: "Un solo carácter entre comillas simples: 'a'.",
  String: 'Texto entre comillas dobles: "Tornillo". Se compara con .equals(...), no con ==.',
  long: 'Entero de 64 bits.', float: 'Decimal de menor precisión que double.',
  System: 'Clase del sistema. System.out es la consola.', Math: 'Funciones matemáticas: Math.max, Math.min, Math.abs.',
  ArrayList: 'Lista que crece: add, get y size.', import: 'Trae una clase de otro paquete.',
};
const CLAVES = {
  top: ['public', 'class', 'interface', 'import', 'implements'],
  clase: ['public', 'private', 'protected', 'static', 'final', 'void', 'class', 'boolean', 'return'],
  metodo: ['new', 'return', 'if', 'else', 'for', 'while', 'this', 'true', 'false', 'null', 'break', 'continue'],
};
const TIPOS = ['int', 'double', 'boolean', 'char', 'String', 'long', 'float'];
export const SNIP_CLAVE = {
  if: 'if (${1:condición}) {\n\t${}\n}',
  for: 'for (int i = 0; i < ${1:10}; i++) {\n\t${}\n}',
  while: 'while (${1:condición}) {\n\t${}\n}',
};
export const PLANTILLAS = [
  { label: 'sout', zona: 'metodo', detail: 'System.out.println(…);', doc: 'Imprime una línea en la consola.', plantilla: 'System.out.println(${});' },
  { label: 'fori', zona: 'metodo', detail: 'for (int i = 0; i < n; i++)', doc: 'Bucle que cuenta desde 0 hasta n − 1.', plantilla: 'for (int i = 0; i < ${1:10}; i++) {\n\t${}\n}' },
  { label: 'psvm', zona: 'clase', detail: 'public static void main(…)', doc: 'Punto de entrada del programa.', plantilla: 'public static void main(String[] args) {\n\t${}\n}' },
  { label: 'main', zona: 'clase', detail: 'public static void main(…)', doc: 'Punto de entrada del programa.', plantilla: 'public static void main(String[] args) {\n\t${}\n}' },
  { label: 'ctor', zona: 'clase', detail: 'constructor con los atributos', doc: 'Genera un constructor que recibe y guarda todos los atributos de la clase.', dinamico: 'ctor' },
  { label: 'getters', zona: 'clase', detail: 'getters de los atributos privados', doc: 'Genera un getter para cada atributo privado que todavía no lo tiene.', dinamico: 'getters' },
  { label: 'interfaz', zona: 'top', detail: 'public interface Nombre { }', doc: 'Declara una interfaz: un contrato de métodos sin cuerpo.', plantilla: 'public interface ${1:Nombre} {\n\t${}\n}' },
  { label: 'metodo', zona: 'clase', detail: 'public void nombre() { }', doc: 'Declara un método sin parámetros que no devuelve nada.', plantilla: 'public void ${1:nombre}() {\n\t${}\n}' },
  { label: 'clase', zona: 'top', detail: 'public class Nombre { }', doc: 'Declara una clase pública. El nombre debe coincidir con el archivo.', plantilla: 'public class ${1:Nombre} {\n\t${}\n}' },
];
const STD = {
  String: [['length', 'm', 'length() : int', 'Cantidad de caracteres.', 0], ['equals', 'm', 'equals(Object otro) : boolean', 'Compara el contenido de dos textos.', 1], ['toUpperCase', 'm', 'toUpperCase() : String', 'Copia en mayúsculas.', 0], ['toLowerCase', 'm', 'toLowerCase() : String', 'Copia en minúsculas.', 0], ['charAt', 'm', 'charAt(int i) : char', 'Carácter en la posición i.', 1], ['substring', 'm', 'substring(int ini, int fin) : String', 'Parte del texto entre ini y fin − 1.', 1], ['trim', 'm', 'trim() : String', 'Quita espacios al inicio y al final.', 0], ['isEmpty', 'm', 'isEmpty() : boolean', 'true si no tiene caracteres.', 0], ['contains', 'm', 'contains(String s) : boolean', 'true si contiene el texto.', 1], ['compareTo', 'm', 'compareTo(String otro) : int', 'Orden alfabético: negativo, cero o positivo.', 1]],
  ArrayList: [['add', 'm', 'add(E x) : boolean', 'Agrega un elemento al final.', 1], ['get', 'm', 'get(int i) : E', 'Elemento en la posición i.', 1], ['size', 'm', 'size() : int', 'Cantidad de elementos.', 0], ['isEmpty', 'm', 'isEmpty() : boolean', 'true si la lista está vacía.', 0], ['contains', 'm', 'contains(Object x) : boolean', 'true si el elemento ya está.', 1], ['remove', 'm', 'remove(int i) : E', 'Quita el elemento de la posición i.', 1]],
  PrintStream: [['println', 'm', 'println(Object x) : void', 'Imprime y salta de línea.', 1], ['print', 'm', 'print(Object x) : void', 'Imprime sin saltar de línea.', 1]],
  'System#': [['out', 'a', 'PrintStream', 'La consola de salida.']],
  'Math#': [['max', 'm', 'max(a, b)', 'El mayor de dos números.', 1], ['min', 'm', 'min(a, b)', 'El menor de dos números.', 1], ['abs', 'm', 'abs(x)', 'Valor absoluto.', 1]],
  'Collections#': [['sort', 'm', 'sort(List lista) : void', 'Ordena una lista de objetos Comparable.', 1]],
  'Integer#': [['compare', 'm', 'compare(int a, int b) : int', 'Negativo si a < b, cero si son iguales, positivo si a > b.', 1], ['parseInt', 'm', 'parseInt(String s) : int', 'Convierte texto en entero.', 1], ['MAX_VALUE', 'a', 'int', 'El mayor int posible.']],
};
STD.List = STD.ArrayList;
const VIS = { private: 'privado', protected: 'protegido', public: 'público', package: 'de paquete' };

const RE_CAB = /^((?:(?:public|private|protected|static|final|abstract|synchronized)\s+)*)(?:([A-Za-z_$][\w$]*(?:\s*<[^>]*>)?(?:\s*\[\s*\])*)\s+)?([A-Za-z_$][\w$]*)\s*\(([^()]*)\)/;
export const NO_METODO = new Set(['if', 'for', 'while', 'switch', 'catch', 'synchronized', 'return', 'new', 'else']);
const RE_LOCAL = /\b(int|double|float|long|short|byte|boolean|char|String|[A-Z][\w$]*(?:\s*<[^<>;]*>)?(?:\s*\[\s*\])*)\s+([a-zA-Z_$][\w$]*)\s*(?=[=;:,)])/g;

/** Contexto del cursor: clase y método que lo rodean, zona y variables visibles. */
export function contexto(txt, pos) {
  let i = 0, st = null, bound = 0;
  const pila = [];
  while (i < pos) {
    const ch = txt[i], d = txt[i + 1];
    if (st === 'l') { if (ch === '\n') st = null; i++; continue; }
    if (st === 'b') { if (ch === '*' && d === '/') { st = null; i += 2; continue; } i++; continue; }
    if (st === '"' || st === "'") { if (ch === '\\') { i += 2; continue; } if (ch === st || ch === '\n') st = null; i++; continue; }
    if (ch === '/' && d === '/') { st = 'l'; i += 2; continue; }
    if (ch === '/' && d === '*') { st = 'b'; i += 2; continue; }
    if (ch === '"' || ch === "'") { st = ch; i++; continue; }
    if (ch === '{') { pila.push({ cab: txt.slice(bound, i).replace(/\s+/g, ' ').trim(), ini: i + 1 }); bound = i + 1; }
    else if (ch === '}') { pila.pop(); bound = i + 1; }
    else if (ch === ';') bound = i + 1;
    i++;
  }
  let clase = null, metodo = null, profClase = -1;
  pila.forEach((f, k) => {
    let m;
    if ((m = /\b(?:class|interface)\s+([A-Za-z_$][\w$]*)/.exec(f.cab))) { clase = m[1]; metodo = null; profClase = k; }
    else if (!metodo && k === profClase + 1 && (m = RE_CAB.exec(f.cab)) && !NO_METODO.has(m[3]) && !NO_METODO.has(m[2] || '')) {
      const params = m[4].split(',').map(s => s.trim()).filter(Boolean).map(s => {
        const q = /^(?:final\s+)?(.+?)\s+([\w$]+)$/.exec(s);
        return q ? { tipo: q[1].replace(/\s+/g, ''), nombre: q[2] } : null;
      }).filter(Boolean);
      metodo = { nombre: m[3], tipo: m[2] ? 'metodo' : m[3] === clase ? 'ctor' : 'metodo', estatico: /\bstatic\b/.test(m[1]), params, ini: f.ini };
    }
  });
  const zona = !pila.length ? 'top' : metodo ? 'metodo' : pila.length - 1 === profClase ? 'clase' : 'metodo';
  const locales = [];
  if (metodo) {
    locales.push(...metodo.params);
    const cuerpo = blankStrings(blankComments(txt.slice(metodo.ini, pos)));
    let m; RE_LOCAL.lastIndex = 0;
    while ((m = RE_LOCAL.exec(cuerpo))) if (!['return', 'new', 'else'].includes(m[1])) locales.push({ tipo: m[1].replace(/\s+/g, ''), nombre: m[2] });
  }
  const ini = txt.lastIndexOf('\n', pos - 1) + 1, fin = txt.indexOf('\n', pos);
  return {
    enTexto: !!st, enComentario: st === 'l' || st === 'b', clase, metodo, zona, locales, pos,
    prefijoLinea: txt.slice(ini, pos), sufijoLinea: txt.slice(pos, fin < 0 ? txt.length : fin),
  };
}

const campoDe = (C, cls, n) => C[cls]?.campos.find(f => f.nombre === n);
const metodoDe = (C, cls, n) => C[cls]?.metodos.find(f => f.nombre === n);
export const firmaTxt = m => `${m.nombre}(${m.params.map(p => p.tipo + ' ' + p.nombre).join(', ')})`;

/** Tipo de una expresión como robot, this, robot.nombre o System.out */
export function resolver(expr, ctx, C) {
  const segs = expr.split('.');
  let cur = null;
  for (let k = 0; k < segs.length; k++) {
    const llamada = /\(.*\)$/.test(segs[k]), s = segs[k].replace(/\(.*\)$/, '');
    if (k === 0) {
      if (s === 'this') { if (!ctx.clase) return null; cur = { t: ctx.clase, est: false }; }
      else if (llamada) { const m = metodoDe(C, ctx.clase, s); if (!m) return null; cur = { t: m.ret, est: false }; }
      else {
        const v = [...ctx.locales].reverse().find(x => x.nombre === s);
        if (v) cur = { t: v.tipo, est: false };
        else {
          const f = campoDe(C, ctx.clase, s);
          if (f) cur = { t: f.tipo, est: false };
          else if (C[s] || ['System', 'Math', 'Integer', 'Collections'].includes(s)) cur = { t: s, est: true };
          else return null;
        }
      }
    } else {
      if (cur.t === 'System' && cur.est && s === 'out') { cur = { t: 'PrintStream', est: false }; continue; }
      if (llamada) { const m = metodoDe(C, tipoBase(cur.t), s); if (!m) return null; cur = { t: m.ret, est: false }; }
      else { const f = campoDe(C, tipoBase(cur.t), s); if (!f) return null; cur = { t: f.tipo, est: false }; }
    }
  }
  return cur;
}

/* Una sugerencia: {label, kind, detail, doc, insert | plantilla} */
const llamadaDe = m => (m.params.length ? `${m.nombre}(\${})` : `${m.nombre}()`);
export function miembrosDe(r, ctx, C) {
  const b = tipoBase(r.t);
  if (/\[\]$/.test(r.t)) return [{ label: 'length', kind: 'atributo', detail: 'int', doc: 'Cantidad de elementos del arreglo.' }];
  if (C[b]) {
    const c = C[b], propio = ctx.clase === b, out = [];
    for (const f of c.campos) {
      if (f.estatico !== r.est || (f.vis === 'private' && !propio)) continue;
      out.push({ label: f.nombre, kind: 'atributo', detail: f.tipo, doc: `Atributo ${VIS[f.vis]} de ${b}.` });
    }
    for (const m of c.metodos) {
      if (m.estatico !== r.est || (m.vis === 'private' && !propio)) continue;
      out.push({ label: m.nombre, kind: 'metodo', detail: `${firmaTxt(m)} : ${m.ret}`, doc: `Método ${VIS[m.vis]} de ${b}.`, plantilla: llamadaDe(m) });
    }
    return out;
  }
  return (STD[b + (r.est ? '#' : '')] || []).map(([label, k, detail, doc, args]) => ({
    label, kind: k === 'm' ? 'metodo' : 'atributo', detail, doc, plantilla: k === 'm' ? (args ? `${label}(\${})` : `${label}()`) : undefined,
  }));
}

export { dinamica };
export function plantillaCtor(ctx, C) {
  const c = C[ctx.clase], nom = ctx.clase || 'Clase';
  const fs = c ? c.campos.filter(f => !f.estatico) : [];
  if (!fs.length) return `public ${nom}() {\n\t\${}\n}`;
  return `public ${nom}(${fs.map(f => f.tipo + ' ' + f.nombre).join(', ')}) {\n${fs.map(f => `\tthis.${f.nombre} = ${f.nombre};`).join('\n')}\n}`;
}

export function plantillaGetters(ctx, C) {
  const c = C[ctx.clase];
  if (!c) return '${}';
  const may = s => s[0].toUpperCase() + s.slice(1);
  const fs = c.campos.filter(f => !f.estatico && f.vis === 'private' && !c.metodos.some(m => m.nombre === (f.tipo === 'boolean' ? 'is' : 'get') + may(f.nombre)));
  if (!fs.length) return '${}';
  return fs.map(f => `public ${f.tipo} ${f.tipo === 'boolean' ? 'is' : 'get'}${may(f.nombre)}() {\n\treturn ${f.nombre};\n}`).join('\n\n');
}
const dinamica = (p, ctx, C) => (p.dinamico === 'ctor' ? plantillaCtor(ctx, C) : p.dinamico === 'getters' ? plantillaGetters(ctx, C) : p.plantilla);

export function generales(ctx, C, soloClases) {
  const clases = Object.values(C).map(c => {
    const k = c.ctors[0];
    return {
      label: c.nombre, kind: 'clase', detail: k ? `${c.nombre}(${k.params.map(p => p.tipo).join(', ')})` : 'clase', doc: `Clase ${c.nombre} de tu proyecto.`,
      plantilla: soloClases ? (c.ctors.some(x => x.params.length) ? `${c.nombre}(\${})` : `${c.nombre}()`) : undefined,
    };
  });
  if (soloClases) return [...clases, { label: 'ArrayList', kind: 'clase', detail: 'ArrayList<>()', doc: DOCS.ArrayList, plantilla: 'ArrayList<>()' }];
  const z = ctx.zona, out = [];
  if (z === 'metodo') {
    const vistos = new Set();
    for (const v of [...ctx.locales].reverse()) {
      if (vistos.has(v.nombre)) continue;
      vistos.add(v.nombre);
      out.push({ label: v.nombre, kind: 'variable', detail: v.tipo, doc: 'Variable local o parámetro.' });
    }
    const c = C[ctx.clase], est = ctx.metodo?.estatico;
    if (c) {
      for (const f of c.campos) if (!vistos.has(f.nombre) && (!est || f.estatico)) out.push({ label: f.nombre, kind: 'atributo', detail: f.tipo, doc: `Atributo de ${c.nombre}.` });
      for (const m of c.metodos) if (!est || m.estatico) out.push({ label: m.nombre, kind: 'metodo', detail: `${firmaTxt(m)} : ${m.ret}`, doc: `Método de ${c.nombre}.`, plantilla: llamadaDe(m) });
    }
    out.push({ label: 'System', kind: 'clase', detail: 'java.lang', doc: DOCS.System }, { label: 'Math', kind: 'clase', detail: 'java.lang', doc: DOCS.Math });
  }
  if (z !== 'top') out.push(...clases, ...TIPOS.map(t => ({ label: t, kind: 'tipo', detail: 'tipo', doc: DOCS[t] })));
  for (const k of CLAVES[z]) out.push({ label: k, kind: 'clave', detail: SNIP_CLAVE[k] ? 'bloque' : '', doc: DOCS[k] || '', plantilla: SNIP_CLAVE[k] });
  for (const p of PLANTILLAS) if (p.zona === z) out.push({ ...p, kind: 'plantilla', plantilla: dinamica(p, ctx, C) });
  return out;
}

/** Lista de sugerencias para la posición, o null si no conviene mostrarla. */
export function sugerencias(txt, pos, C, explicito) {
  const ctx = contexto(txt, pos);
  if (ctx.enTexto) return null;
  const pref = ctx.prefijoLinea;
  if (/\/\//.test(blankStrings(pref))) return null;
  let m;
  if ((m = /([\w$]+(?:\([^()]*\))?(?:\.[\w$]+(?:\([^()]*\))?)*)\.([\w$]*)$/.exec(pref))) {
    if (/^\d/.test(m[1])) return null;
    const r = resolver(m[1], ctx, C);
    if (!r) return null;
    return { from: pos - m[2].length, items: miembrosDe(r, ctx, C) };
  }
  if ((m = /\bnew\s+([\w$]*)$/.exec(pref))) return { from: pos - m[1].length, items: generales(ctx, C, true).filter(it => C[it.label]?.tipo !== 'interface') };
  if ((m = /\bimplements\s+(?:[\w$<>]+\s*,\s*)*([\w$]*)$/.exec(pref))) {
    const ints = Object.values(C).filter(c => c.tipo === 'interface').map(c => ({ label: c.nombre, kind: 'clase', detail: 'interfaz', doc: `Contrato con ${c.metodos.map(x => x.nombre + '()').join(', ') || 'ningún método'}.` }));
    ints.push({ label: 'Comparable', kind: 'clase', detail: 'interfaz de Java', doc: DOCS.Comparable, plantilla: `Comparable<\${1:${ctx.clase || 'T'}}>` });
    return { from: pos - m[1].length, items: ints };
  }
  m = /[\w$]+$/.exec(pref);
  const prefijo = m ? m[0] : '';
  if (/^\d/.test(prefijo)) return null;
  if (!explicito && !prefijo) return null;
  // Si está nombrando algo nuevo (String nom…, public void avan…), no estorbar
  if (!explicito && /(?:^|[\s(,])(?:int|double|float|long|short|byte|boolean|char|void|String|[A-Z][\w$]*(?:<[^>]*>)?(?:\[\])*)\s+[\w$]*$/.test(pref) && !/\b(?:new|return|else)\s+[\w$]*$/.test(pref)) return null;
  if (!explicito && /\bclass\s+[\w$]*$/.test(pref)) return null;
  return { from: pos - prefijo.length, items: generales(ctx, C, false) };
}

/* ---------- Sugerencia en gris (inline, al estilo Copilot) ---------- */
function argsDe(C, cls) {
  const c = C[cls], k = c && (c.ctors.find(x => x.params.length) || c.ctors[0]);
  if (!k) return '';
  return k.params.map(p => {
    const b = tipoBase(p.tipo);
    return b === 'String' ? '""' : b === 'boolean' ? 'false' : b === 'char' ? "' '" : ['int', 'double', 'long', 'float', 'short', 'byte'].includes(b) ? '0' : 'null';
  }).join(', ');
}
function atrasDe(txt, ini) {
  const k = txt.indexOf('"', ini), q = txt.indexOf('(', ini);
  if (k >= 0 && (q < 0 || k > q)) return txt.length - (k + 1);
  if (q >= 0) return txt.length - (q + 1);
  return 0;
}
function llaveCierre(txt, ini) {
  const s = blankStrings(blankComments(txt));
  let d = 1;
  for (let i = ini; i < s.length; i++) { if (s[i] === '{') d++; else if (s[i] === '}') { d--; if (!d) return i; } }
  return s.length;
}
export function llavesAbiertas(txt) {
  const s = blankStrings(blankComments(txt));
  return (s.match(/\{/g) || []).length - (s.match(/\}/g) || []).length;
}

/** Devuelve {texto, atras} o null. atras = cuántos caracteres retrocede el cursor después de aceptar. */
export function sugerenciaLocal(txt, pos, C) {
  const ctx = contexto(txt, pos);
  const suf = ctx.sufijoLinea.trim();
  if (ctx.enTexto || suf.replace(/^[)\]]+;?$/, '')) return null;
  const p = ctx.prefijoLinea, t = p.trim();
  if (/\bfor\s*\($/.test(p)) return { texto: suf ? 'int i = 0; i < 10; i++' : 'int i = 0; i < 10; i++) {}', atras: suf ? 0 : 1 };
  if (suf) return null;
  let m;
  if (/\/\//.test(blankStrings(p))) return null;
  // Constructor: guardar cada parámetro en su atributo
  if (ctx.metodo?.tipo === 'ctor' && C[ctx.clase]) {
    const cuerpo = blankComments(txt.slice(ctx.metodo.ini, llaveCierre(txt, ctx.metodo.ini)));
    const pend = ctx.metodo.params.filter(q => campoDe(C, ctx.clase, q.nombre) && !new RegExp(`this\\s*\\.\\s*${q.nombre}\\s*=`).test(cuerpo));
    if (pend.length) {
      if (!t) return { texto: `this.${pend[0].nombre} = ${pend[0].nombre};` };
      if ((m = /^this\.([\w$]*)$/.exec(t))) { const q = pend.find(x => x.nombre.startsWith(m[1])); if (q) return { texto: `${q.nombre.slice(m[1].length)} = ${q.nombre};` }; }
    }
  }
  // Métodos que faltan para cumplir una interfaz
  if (ctx.zona === 'clase' && !t && C[ctx.clase]?.tipo === 'clase') {
    const c = C[ctx.clase];
    for (const nomI of c.implementa || []) {
      const I = C[nomI.replace(/<.*>/, '')];
      const falta = I?.metodos.find(am => am.abstracto && !c.metodos.some(x => x.nombre === am.nombre && x.params.length === am.params.length));
      if (falta) {
        const cuerpo = falta.ret === 'void' ? '' : falta.ret === 'boolean' ? 'return false;' : ['int', 'double', 'long', 'float'].includes(falta.ret) ? 'return 0;' : 'return null;';
        const s = `@Override\n${p}public ${falta.ret} ${falta.nombre}(${falta.params.map(q => q.tipo + ' ' + q.nombre).join(', ')}) {\n${p}    ${cuerpo}\n${p}}`;
        return { texto: s, atras: p.length + 2 };
      }
    }
  }
  // System.out.println();
  const obj = 'System.out.println();';
  for (let k = obj.length - 3; k >= 7; k--) {
    const s = obj.slice(0, k);
    if (p.endsWith(s) && !/[\w$.]/.test(p[p.length - s.length - 1] || '')) return { texto: obj.slice(k), atras: 2 };
  }
  // Tipo nombre = new …
  if ((m = /\b([A-Z][\w$]*)(<[^>]*>)?\s+[\w$]+\s*=\s*new\s*$/.exec(p))) {
    const sp = p.endsWith(' ') ? '' : ' ';
    if (m[2]) return { texto: sp + `${m[1]}<>();` };
    if (C[m[1]]) { const s = sp + `${m[1]}(${argsDe(C, m[1])});`; return { texto: s, atras: atrasDe(s, 0) }; }
  }
  // "Robot ␣" → robot = new Robot("", "");
  if (ctx.zona === 'metodo' && (m = /^\s*([A-Z][\w$]*)\s$/.exec(p)) && C[m[1]] && m[1] !== 'Main') {
    const base = m[1][0].toLowerCase() + m[1].slice(1), usados = new Set(ctx.locales.map(v => v.nombre));
    let n = base, k = 2;
    while (usados.has(n)) n = base + k++;
    const s = `${n} = new ${m[1]}(${argsDe(C, m[1])});`;
    return { texto: s, atras: atrasDe(s, s.indexOf('(')) };
  }
  if (ctx.zona === 'top' && /^(?:public\s+)?class\s+[A-Z][\w$]*$/.test(t)) return { texto: ' {}', atras: 1 };
  if (ctx.zona === 'clase' && /^(?:(?:public|private|protected|static|final)\s+)*(?:[\w$<>[\]]+\s+)?[\w$]+\s*\([^()]*\)$/.test(t)) return { texto: ' {}', atras: 1 };
  // ; al final de una instrucción
  if (ctx.zona === 'metodo' && t && !/^(if|for|while|switch|else|do|try|catch|case|default)\b/.test(t) && !/[;{}]$/.test(t)) {
    const sin = blankStrings(t), ab = (sin.match(/\(/g) || []).length, ce = (sin.match(/\)/g) || []).length;
    if (ab === ce && (/\)$/.test(t) || /(?:\+\+|--)$/.test(t) || /^return\b.+[\w")\]]$/.test(t) || /^[\w$.[\]<>]+\s+[\w$]+\s*=\s*.*[\w")\]]$/.test(t) || /^[\w$.[\]]+\s*[+\-*/]?=\s*.*[\w")\]]$/.test(t))) return { texto: ';' };
  }
  if (ctx.zona === 'clase' && /^(?:(?:private|public|protected|static|final)\s+)*(?:int|double|float|long|boolean|char|String|[A-Z][\w$]*(?:<[^>]*>)?(?:\[\])?)\s+[a-z_$][\w$]*$/.test(t)) return { texto: ';' };
  return null;
}

/* ---------- Ayuda de parámetros ---------- */
export function firmaEn(txt, pos, C) {
  const ctx = contexto(txt, pos);
  if (ctx.enComentario) return null;
  const s = blankStrings(ctx.prefijoLinea);
  let d = 0, k = s.length - 1, comas = 0;
  for (; k >= 0; k--) { const ch = s[k]; if (ch === ')') d++; else if (ch === '(') { if (!d) break; d--; } else if (ch === ',' && !d) comas++; }
  if (k < 0) return null;
  const antes = ctx.prefijoLinea.slice(0, k);
  let m;
  const de = (titulo, params) => ({ titulo, params: params.map(p => p.tipo + ' ' + p.nombre), activo: comas });
  if ((m = /\bnew\s+([A-Z][\w$]*)\s*$/.exec(antes))) {
    const c = C[m[1]];
    if (!c) return null;
    const ks = c.ctors.length ? c.ctors : [{ params: [] }];
    return de(m[1], (ks.find(x => x.params.length > comas) || ks[0]).params);
  }
  if ((m = /([\w$]+(?:\.[\w$]+)*)\.([\w$]+)\s*$/.exec(antes))) {
    const r = resolver(m[1], ctx, C);
    if (!r) return null;
    const b = tipoBase(r.t);
    if (C[b]) { const mt = C[b].metodos.find(x => x.nombre === m[2]); return mt ? de(m[2], mt.params) : null; }
    const std = (STD[b + (r.est ? '#' : '')] || []).find(x => x[0] === m[2]);
    return std ? { titulo: std[2], params: [], activo: -1, texto: true } : null;
  }
  if ((m = /(?:^|[^\w$.])([\w$]+)\s*$/.exec(antes)) && !NO_METODO.has(m[1])) {
    const mt = metodoDe(C, ctx.clase, m[1]);
    return mt ? de(m[1], mt.params) : null;
  }
  return null;
}
