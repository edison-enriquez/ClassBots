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
