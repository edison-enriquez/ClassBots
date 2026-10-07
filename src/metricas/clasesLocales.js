import { abrirClase } from './cifrado.js';

/* Clases guardadas en este navegador y llaves abiertas en esta pestaña (solo el profesor las usa) */
export const CLAVE_CLASES_ABIERTAS = 'classbots-clases-abiertas';
export const CLAVE_MIS_CLASES = 'classbots-mis-clases';
export const CLAVE_PROFE = 'classbots-profe';
export const leerJSON = (alm, k, def) => { try { return JSON.parse(alm.getItem(k) || 'null') ?? def; } catch { return def; } };
export const guardarJSON = (alm, k, v) => { try { alm.setItem(k, JSON.stringify(v)); } catch { /* nada */ } };
export const misClases = () => leerJSON(localStorage, CLAVE_MIS_CLASES, []);
export const guardarMiClase = c => { const l = misClases().filter(x => x.id !== c.id); guardarJSON(localStorage, CLAVE_MIS_CLASES, [...l, c]); };
export const clasesAbiertas = () => leerJSON(sessionStorage, CLAVE_CLASES_ABIERTAS, {});
export const abrirEnSesion = (id, priv) => { const n = { ...clasesAbiertas(), [id]: priv }; guardarJSON(sessionStorage, CLAVE_CLASES_ABIERTAS, n); return n; };
/* El modo profesor vive solo en esta pestaña: en un equipo compartido no queda activo para el siguiente */
export const profeEnSesion = () => { try { return sessionStorage.getItem(CLAVE_PROFE) === '1'; } catch { return false; } };
export const ponerProfeEnSesion = v => { try { if (v) sessionStorage.setItem(CLAVE_PROFE, '1'); else { sessionStorage.removeItem(CLAVE_PROFE); } } catch { /* nada */ } };

/* Abre una clase y, con la misma contraseña, las clases anteriores que reemplazó (sus archivos viejos
   siguen cifrados para ellas). Devuelve { id: llavePrivada }. */
export async function abrirConAnteriores(clase, contrasena, conocidas = misClases()) {
  const r = { [clase.id]: await abrirClase(clase, contrasena) };
  let c = clase;
  for (let k = 0; c?.reemplaza && k < 5; k++) {
    const v = conocidas.find(x => x.id === c.reemplaza);
    if (!v) break;
    try { r[v.id] = await abrirClase(v, contrasena); } catch { break; }
    c = v;
  }
  return r;
}
/* Guarda la clase actualizada y marca la anterior como reemplazada */
export function guardarActualizada(vieja, nueva) {
  const l = misClases().filter(x => x.id !== vieja.id && x.id !== nueva.id);
  const marcada = nueva.id === vieja.id ? [] : [{ ...vieja, reemplazadaPor: nueva.id }];
  guardarJSON(localStorage, CLAVE_MIS_CLASES, [...l, ...marcada, nueva]);
}
