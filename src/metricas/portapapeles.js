/* Recuerda lo que se copió dentro de ClassBots (editor, lección, ejemplos) para distinguir
   un pegado interno de uno traído desde fuera (otra web, un chat de IA, otro archivo). */
const copiados = [];
const norma = t => String(t || '').replace(/\s+/g, '');
export function recordarCopia(texto) {
  const n = norma(texto);
  if (n.length < 2) return;
  copiados.push(n);
  if (copiados.length > 50) copiados.shift();
}
export function esInterno(texto) {
  const n = norma(texto);
  if (n.length < 2) return true;
  return copiados.some(c => c.includes(n));
}
if (typeof document !== 'undefined') {
  const copia = () => { try { recordarCopia(document.getSelection()?.toString()); } catch { /* nada */ } };
  document.addEventListener('copy', copia, true);
  document.addEventListener('cut', copia, true);
}
