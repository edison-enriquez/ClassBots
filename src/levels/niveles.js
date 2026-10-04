/* Catálogo de mundos y capítulos */
import { MUNDO1 } from './mundo1.js';
import { MUNDO2 } from './mundo2.js';
import { MUNDO3 } from './mundo3.js';
import { MUNDO4 } from './mundo4.js';
import { MUNDO5 } from './mundo5.js';

export const MUNDOS = [
  { id: 1, nombre: 'El Taller', tema: 'clases y objetos', niveles: MUNDO1 },
  { id: 2, nombre: 'La Bóveda', tema: 'encapsulamiento', niveles: MUNDO2 },
  { id: 3, nombre: 'Las Conexiones', tema: 'relaciones entre clases', niveles: MUNDO3 },
  { id: 4, nombre: 'Contratos', tema: 'interfaces', niveles: MUNDO4 },
  { id: 5, nombre: 'El Árbol', tema: 'herencia y clases abstractas', niveles: MUNDO5 },
  { id: 6, nombre: 'La Arena', tema: 'polimorfismo' },
  { id: 7, nombre: 'La Fábrica', tema: 'patrones creacionales' },
  { id: 8, nombre: 'La Ciudad', tema: 'patrones estructurales' },
  { id: 9, nombre: 'La Torre de Control', tema: 'patrones de comportamiento' },
];

export const NIVELES = MUNDOS.flatMap(m => (m.niveles || []).map((n, k) => ({ ...n, mundo: m.id, enMundo: k, totalMundo: m.niveles.length })));
