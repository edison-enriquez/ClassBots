/* Mundo 8 · La Forja: patrones de diseño.
   Cada patrón es un tramo de tres o cuatro capítulos y sigue tres reglas:
   1. Empieza con código que huele mal y el estudiante lo refactoriza.
   2. Tiene un caso oculto de extensión: algo nuevo entra sin tocar lo existente.
   3. Cierra con un mini-jefe, y su recompensa tiene efecto: una entrada en el Códice de patrones (Guía)
      y equipo visible en los robots de todas las escenas.
   Los seis nacieron como misiones-ramal. Conservan sus ids (mision-plantilla, plantilla-1, …) para que
   el avance, el código y las métricas que los estudiantes ya guardaron sigan valiendo. */
import { PLANTILLA } from './patron-plantilla.js';
import { STRATEGY } from './patron-strategy.js';
import { OBSERVER } from './patron-observer.js';
import { DECORATOR } from './patron-decorator.js';
import { FACTORY } from './patron-factory.js';
import { MVC } from './patron-mvc.js';

/* El orden va de lo más cercano a los mundos anteriores a lo más nuevo: herencia (Template Method),
   composición y polimorfismo (Strategy, Observer, Decorator) y quién crea los objetos (Factory Method).
   MVC va al final porque se arma con los otros cinco (su campo `reune` dice qué papel cumple cada uno). */
const sigla = corto => (corto.includes(' ') ? corto.split(' ').map(w => w[0]).join('') : corto.length <= 3 ? corto : corto.slice(0, 2)).toUpperCase();
export const PATRONES = [PLANTILLA, STRATEGY, OBSERVER, DECORATOR, FACTORY, MVC].map(p => ({ ...p, patron: true, mundo: 8, sigla: sigla(p.corto) }));
/* El papel que cumple un patrón dentro de MVC (o null si el patrón no participa) */
export const papelEnMVC = id => MVC.reune.find(r => r.id === id)?.papel || null;

/* Cada paso de un patrón es un capítulo del mundo, con los datos de su patrón */
export const MUNDO8 = PATRONES.flatMap(p => p.pasos.map((paso, k) => ({
  ...paso, patron: p.id, patronCorto: p.corto, patronTitulo: p.titulo, pasoPatron: k, pasosPatron: p.pasos.length,
  cierraPatron: k === p.pasos.length - 1, recompensa: p.recompensa,
})));

/* Un patrón queda dominado al superar su mini-jefe (igual que antes se cerraba la misión) */
export const patronCompleto = (patron, hechos = []) => hechos.includes(patron.pasos.at(-1).id);
export const patronDe = nivel => (nivel?.patron ? PATRONES.find(p => p.id === nivel.patron) : null);
