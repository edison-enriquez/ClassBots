/* Diagnóstico: errores del "compilador" del taller + advertencias de buenas prácticas.
   Cada problema puede traer una corrección rápida (fix) que transforma la línea. */
import { parsePrograma, blankComments, blankStrings } from '../engine/motor.js';
import { problemasSangria } from './formato.js';

export function arreglo(msg) {
  let m;
  if (/falta ; al final/.test(msg)) return l => l.replace(/^(.*?)(\s*\/\/.*)?$/, (x, a, b) => a.replace(/\s+$/, '') + ';' + (b || ''));
  if ((m = /No encuentro el tipo «?([\w$]+)»?\. ¿Querías escribir ([\w$]+)\?/.exec(msg))) return l => l.replace(new RegExp(`\\b${m[1]}\\b`), m[2]);
  if ((m = /No encuentro el tipo ([\w$]+)\. Para enteros usa int/.exec(msg))) return l => l.replace(new RegExp(`\\b${m[1]}\\b`), 'int');
  if (/es String, con S mayúscula/.test(msg)) return l => l.replace(/\bstring\b/, 'String');
  if (/class se escribe en minúscula/.test(msg)) return l => l.replace(/\bClass\b/, 'class');
  if ((m = /El método ([\w$]+) necesita un tipo de retorno/.exec(msg))) return l => l.replace(new RegExp(`\\b${m[1]}\\s*\\(`), `void ${m[1]}(`);
  if ((m = /quita «([^»]+)»/.exec(msg))) return l => l.replace(new RegExp(`\\b${m[1].replace(/[[\]]/g, '\\$&')}\\s+(?=[\\w$]+\\s*\\()`), '');
  return null;
}

export function advertencias(files, res) {
  const out = [], metodos = new Set();
  for (const c of Object.values(res.clases)) c.metodos.forEach(m => metodos.add(m.nombre));
  for (const [archivo, src] of Object.entries(files)) {
    const sinCom = blankComments(src).split('\n'), sinStr = blankStrings(blankComments(src)).split('\n');
    sinCom.forEach((l, i) => {
      const linea = i + 1, s = sinStr[i];
      let m;
      if ((m = /^\s*([A-Za-z_$][\w$]*)\s*=\s*\1\s*;/.exec(s)))
        out.push({ archivo, linea, sev: 'warn', msg: `Asignas ${m[1]} a sí mismo y no cambia nada. Para guardar el parámetro en el atributo escribe this.${m[1]} = ${m[1]};`, fix: x => x.replace(/^(\s*)/, '$1this.') });
      else if ((m = /\b(if|while)\s*\(([^()]*)\)/.exec(s)) && /(?<![=!<>])=(?!=)/.test(m[2]))
        out.push({ archivo, linea, sev: 'err', msg: 'En una condición se compara con ==. Un solo = asigna un valor.', fix: x => x.replace(/\b(if|while)\s*\(([^()]*)\)/, (a, k, inner) => a.replace(inner, inner.replace(/(?<![=!<>])=(?!=)/, '=='))) });
      else if (/[\w$)\]]\s*==\s*"|"\s*==\s*[\w$(]/.test(l))
        out.push({ archivo, linea, sev: 'warn', msg: 'Para comparar textos usa .equals(...). == revisa si son el mismo objeto, no si dicen lo mismo.', fix: x => x.replace(/([\w$.]+(?:\(\))?)\s*==\s*("(?:\\.|[^"\\])*")/, '$1.equals($2)') });
      else if ((m = /\.\s*([\w$]+)\s*;/.exec(s)) && metodos.has(m[1]) && !/\b(?:int|double|String|boolean)\s/.test(s))
        out.push({ archivo, linea, sev: 'err', msg: `Para llamar al método ${m[1]} hacen falta paréntesis: ${m[1]}()`, fix: x => x.replace(new RegExp(`\\.\\s*${m[1]}\\s*;`), `.${m[1]}();`) });
      else if (/\bwhile\s*\(\s*true\s*\)/.test(s))
        out.push({ archivo, linea, sev: 'warn', msg: 'Este bucle no termina nunca a menos que uses break o return dentro.' });
    });
  }
  for (const c of Object.values(res.clases)) {
    if (/^[a-z]/.test(c.nombre)) out.push({ archivo: c.archivo, linea: c.linea, sev: 'warn', msg: `Por convención, el nombre de una clase empieza con mayúscula: ${c.nombre[0].toUpperCase() + c.nombre.slice(1)}.` });
    for (const m of c.metodos) if (/^[A-Z]/.test(m.nombre)) out.push({ archivo: c.archivo, linea: m.linea, sev: 'warn', msg: `Por convención, los métodos empiezan con minúscula: ${m.nombre[0].toLowerCase() + m.nombre.slice(1)}.` });
  }
  return out;
}

/* Clases de cada archivo por separado: sirven para autocompletar aunque otro archivo tenga errores */
export function clasesPorArchivo(files) {
  const out = {};
  for (const [a, src] of Object.entries(files)) {
    const r = parsePrograma({ [a]: src });
    if (!r.errores.some(e => /llave/.test(e.msg))) out[a] = r.clases;
  }
  return out;
}

export function diagnosticar(files) {
  const modelo = parsePrograma(files);
  const porArchivo = {};
  const put = (a, l, o) => {
    const m = porArchivo[a] || (porArchivo[a] = new Map());
    const prev = m.get(l);
    if (!prev || (prev.sev === 'warn' && o.sev === 'err')) m.set(l, { ...o, linea: l, archivo: a });
  };
  const errores = [];
  modelo.errores.forEach(e => { put(e.archivo, e.linea, { sev: 'err', msg: e.msg, fix: arreglo(e.msg) }); errores.push(e); });
  advertencias(files, modelo).forEach(w => { put(w.archivo, w.linea, w); if (w.sev === 'err') errores.push(w); });
  // La sangría va al final: si la línea ya tiene otro problema, se muestra ese
  for (const [a, src] of Object.entries(files)) problemasSangria(a, src).forEach(w => put(a, w.linea, w));
  errores.sort((a, b) => (a.archivo === b.archivo ? a.linea - b.linea : a.archivo < b.archivo ? -1 : 1));
  const lista = Object.values(porArchivo).flatMap(m => [...m.values()]).sort((a, b) => (a.archivo === b.archivo ? a.linea - b.linea : a.archivo < b.archivo ? -1 : 1));
  return { modelo, errores, porArchivo, lista };
}
