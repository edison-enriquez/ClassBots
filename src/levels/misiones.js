/* Misiones especiales: ramales opcionales del mapa que amplían el mundo donde se cuelgan
   (la clase Object, MVC con Kotlin y las Expediciones de diseño libre).
   Cada misión cierra con un mini-jefe con un caso oculto de extensión, y su recompensa tiene efecto:
   una entrada en el Códice (Guía) y equipo visible en el robot.
   Los patrones de diseño y MVC ya no son ramales: son los capítulos del Mundo 8 (mundo8.js). */
import { OBJECT } from './mision-object.js';
import { EXPEDICION_CENTRAL } from './expedicion-central.js';
import { KOTLIN } from './mision-kotlin.js';

/* Las Expediciones (diseño libre) viajan como ramales: las marcadas oculta solo existen en modo profesor */
export const MISIONES = [OBJECT, KOTLIN, EXPEDICION_CENTRAL];
export const misionVisible = (mision, profesor = false) => !mision.oculta || !!profesor;

/* Cada paso es un capítulo jugable con los datos de su misión */
export const PASOS = MISIONES.flatMap(m => m.pasos.map((p, k) => ({
  ...p, mision: true, expedicion: !!m.expedicion, misionId: m.id, misionCorto: m.corto, corto: p.corto || m.corto, mundo: m.mundo, enMundo: k, totalMundo: m.pasos.length, recompensa: m.recompensa, ultimo: k === m.pasos.length - 1,
})));
export const MISIONES_ESPECIALES = MISIONES;
/* requiereMision: otra misión que hay que completar antes (hoy ninguna la usa: la de Kotlin sigue al patrón MVC, que es un capítulo) */
export const misionDisponible = (mision, hechos, profesor = false, misionesHechas = []) => misionVisible(mision, profesor)
  && (profesor || (mision.requiere.every(id => hechos.includes(id)) && (!mision.requiereMision || misionesHechas.includes(mision.requiereMision))));
export const misionCompletada = (mision, pasosHechos = [], misionesHechas = []) => misionesHechas.includes(mision.id) || mision.pasos.every(p => pasosHechos.includes(p.id));
export const pasoAbierto = (paso, pasosHechos = [], profesor = false) => {
  const m = MISIONES.find(x => x.id === paso.misionId);
  const k = m.pasos.findIndex(p => p.id === paso.id);
  return profesor || k === 0 || pasosHechos.includes(m.pasos[k - 1].id) || pasosHechos.includes(paso.id);
};
