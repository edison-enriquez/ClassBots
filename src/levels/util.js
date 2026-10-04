/* Utilidades para escribir capítulos y casos de prueba */
import { JavaError, relaciones } from '../engine/motor.js';

export const robots = rt => rt.registro.filter(r => r.cls === 'Robot').map(r => r.raw);
export const objetos = (rt, cls) => rt.registro.filter(r => r.cls === cls).map(r => r.raw);
export const fmt = v => (typeof v === 'string' ? JSON.stringify(v) : v === null || v === undefined ? 'null' : typeof v === 'object' ? '(objeto)' : String(v));
export const caso = (ok, esperado, obtenido, detalle) => ({ ok: !!ok, esperado, obtenido, detalle });
export const corrMain = C => {
  if (!C.Main) throw new JavaError('Falta la clase Main. Está en la pestaña Main.java.');
  C.Main.main([]);
};
export const previoMain = m => {
  const M = m.clases.Main;
  if (!M) return 'Falta la clase Main en Main.java.';
  const mm = M.metodos.find(x => x.nombre === 'main');
  if (!mm || !mm.estatico || mm.ret !== 'void' || mm.params.length !== 1)
    return 'El punto de entrada debe ser exactamente: public static void main(String[] args)';
  return null;
};
export const previoRobot = (m, req = {}) => {
  const c = m.clases.Robot;
  if (!c) return 'No encuentro la clase Robot.';
  if (req.ctor && !c.ctors.some(k => k.params.length === 2 && k.params.every(p => p.tipo === 'String')))
    return c.ctors.length ? 'El constructor debe recibir dos parámetros String: nombre y color.' : 'Robot todavía no tiene constructor. Escribe public Robot(String nombre, String color) { ... }';
  for (const f of req.campos || []) {
    const x = c.campos.find(k => k.nombre === f[0]);
    if (!x) return `Falta el atributo ${f[1]} ${f[0]}.`;
    if (x.tipo !== f[1]) return `${f[0]} debe ser ${f[1]}.`;
  }
  for (const mt of req.metodos || []) {
    if (!c.metodos.some(k => k.nombre === mt && k.params.length === 0)) return `Falta el método public void ${mt}() sin parámetros.`;
  }
  return null;
};

/* Requisitos de estructura: devuelven un mensaje si falta algo, o null */
export function exigir(m, reqs) {
  for (const r of reqs) {
    const c = m.clases[r.clase];
    if (!c) return `Falta ${r.interfaz ? 'la interfaz' : 'la clase'} ${r.clase}${r.archivo !== false ? ` en ${r.clase}.java` : ''}.`;
    if (r.interfaz && c.tipo !== 'interface') return `${r.clase} debe ser una interfaz: public interface ${r.clase} { ... }`;
    for (const [n, params] of r.metodos || []) {
      if (!c.metodos.some(x => x.nombre === n && (params == null || x.params.length === params))) return `${r.clase} necesita el método ${n}(${params ? '…' : ''}).`;
    }
    for (const n of r.campos || []) if (!c.campos.some(x => x.nombre === n)) return `${r.clase} necesita el atributo ${n}.`;
    if (r.ctor != null && !c.ctors.some(k => k.params.length === r.ctor)) return `${r.clase} necesita un constructor con ${r.ctor} parámetro(s).`;
    for (const i of r.implementa || []) if (!c.implementa.some(x => x.replace(/<.*>/, '') === i)) return `${r.clase} debe declarar implements ${i}.`;
  }
  return null;
}

/* Caso de prueba sobre la relación UML detectada entre dos clases */
const NOMBRE_REL = { composicion: 'composición', agregacion: 'agregación', asociacion: 'asociación', dependencia: 'dependencia', realizacion: 'realización', herencia: 'herencia' };
export function casoRelacion(de, a, tipo, opts = {}) {
  return {
    nombre: opts.nombre || `${de} → ${a} es una ${NOMBRE_REL[tipo]}`, oculto: opts.oculto,
    prueba: ({ modelo }) => {
      const r = relaciones(modelo).find(x => x.de === de && x.a === a);
      return caso(r?.tipo === tipo, NOMBRE_REL[tipo], r ? NOMBRE_REL[r.tipo] : 'ninguna relación', r && r.tipo !== tipo ? r.razon : '');
    },
  };
}
export const sinTexto = (files, archivo, re) => !re.test((files[archivo] || '').replace(/\/\/.*$/gm, ''));
export { JavaError };
