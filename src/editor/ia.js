/* Proveedor de sugerencias con IA.
   1) Si existe VITE_AI_URL, hace POST {prompt} y espera {text}. Así el
      despliegue en GitHub Pages puede usar tu propio backend sin exponer claves.
   2) Si la página corre dentro de un artifact de Claude, usa claude.use("sample").
   3) Si no hay ninguno, la IA queda desactivada y el asistente básico sigue. */

let proveedorPromesa = null;

export function obtenerProveedorIA() {
  if (proveedorPromesa) return proveedorPromesa;
  proveedorPromesa = (async () => {
    const url = import.meta.env?.VITE_AI_URL;
    if (url) {
      return {
        nombre: 'servidor',
        async sugerir(prompt, { signal, onText }) {
          const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }), signal });
          if (!r.ok) throw { code: r.status === 429 ? 'rate_limited' : 'upstream_error' };
          const j = await r.json();
          const t = j.text ?? j.completion ?? j.choices?.[0]?.message?.content ?? '';
          onText?.(t);
          return t;
        },
      };
    }
    try {
      const s = globalThis.claude?.use ? await globalThis.claude.use('sample') : null;
      if (s) {
        return {
          nombre: 'claude',
          sugerir: (prompt, { signal, onText }) => s(prompt, { modelTier: 'quick', signal, onText: ({ text }) => onText?.(text) }).then(r => r.text),
        };
      }
    } catch { /* sin IA */ }
    return null;
  })();
  return proveedorPromesa;
}

const sinHtml = h => h.replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, ' ');

export function promptIA({ nivel, archivos, activo, texto, pos }) {
  let s = 'Eres el autocompletado en línea de un editor de Java, como GitHub Copilot, dentro de «ClassBots», un juego para aprender programación orientada a objetos.\n';
  s += `Nivel actual: «${nivel.titulo}» (concepto: ${nivel.concepto}).\nTarea del nivel:\n${nivel.tareas.map(t => '- ' + sinHtml(t)).join('\n')}\n\n`;
  s += `Archivos del proyecto. El cursor del estudiante está donde aparece ⟦CURSOR⟧ en ${activo}.\n\n`;
  for (const a of nivel.archivos) {
    const src = a === activo ? texto.slice(0, pos) + '⟦CURSOR⟧' + texto.slice(pos) : archivos[a] || '';
    s += `=== ${a} ===\n${src.slice(0, 9000)}\n\n`;
  }
  s += 'Instrucciones:\n- Responde SOLO con el texto que se debe insertar exactamente en ⟦CURSOR⟧. No repitas nada de lo que ya está antes o después del cursor.\n- Sin explicaciones, sin comentarios y sin bloques de markdown.\n- Termina la línea actual y, si tiene sentido, continúa hasta 6 líneas más, con indentación de 4 espacios coherente con el código.\n- Usa solo lo que este taller ejecuta: clases, atributos, constructores, métodos, if, for, while, ArrayList y System.out.println. Nada de herencia ni interfaces todavía.\n- Si no hay nada útil que sugerir, responde exactamente <vacío>.';
  return s;
}

export function limpiarIA(text, prefijoLinea) {
  let t = String(text || '').replace(/\r/g, '').replace(/^\s*```[\w]*\n?/, '').replace(/\n?```\s*$/, '');
  if (/^<?vac[ií]o>?$/i.test(t.trim())) return '';
  t = t.replace(/⟦CURSOR⟧/g, '').replace(/\t/g, '    ');
  const tp = prefijoLinea.trim();
  if (tp && t.startsWith(prefijoLinea)) t = t.slice(prefijoLinea.length);
  else if (tp && t.trimStart().startsWith(tp)) t = t.trimStart().slice(tp.length);
  return t.replace(/\s+$/, '').split('\n').slice(0, 8).join('\n');
}

export const MENSAJES_IA = {
  not_granted: 'La IA no está disponible aquí. Volví al asistente básico.',
  sampling_disabled: 'La IA no está disponible para esta cuenta. Volví al asistente básico.',
  rate_limited: 'Demasiadas solicitudes seguidas. Espera un momento y vuelve a intentarlo.',
  session_expired: 'Tu sesión expiró. Vuelve a iniciar sesión.',
};
export const IA_PERMANENTE = new Set(['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed']);
