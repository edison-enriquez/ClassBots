/* Resaltado estático para los ejemplos de la lección */
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const RE = /(\/\/[^\n]*)|("(?:\\.|[^"\\\n])*")|\b(public|private|protected|class|interface|implements|extends|abstract|static|void|new|return|if|else|for|while|this|final|true|false|null)\b|\b(int|double|boolean|char|String|long|float)\b|\b(\d+(?:\.\d+)?)\b|\b([A-Z][\w$]*)\b/g;
export function resaltar(src) {
  let out = '', last = 0, m;
  RE.lastIndex = 0;
  while ((m = RE.exec(src))) {
    out += esc(src.slice(last, m.index));
    const c = m[1] ? 'com' : m[2] ? 'str' : m[3] ? 'kw' : m[4] ? 'ty' : m[5] ? 'num' : 'cl';
    out += `<span class="t-${c}">${esc(m[0])}</span>`;
    last = m.index + m[0].length;
  }
  return out + esc(src.slice(last));
}
export { esc };
