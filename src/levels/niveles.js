/* Catálogo de mundos y capítulos */
import { MUNDO1 } from './mundo1.js';
import { MUNDO2 } from './mundo2.js';
import { MUNDO3 } from './mundo3.js';
import { MUNDO4 } from './mundo4.js';
import { MUNDO5 } from './mundo5.js';
import { MUNDO6 } from './mundo6.js';
import { MUNDO7 } from './mundo7.js';
import { MUNDO8 } from './mundo8.js';

export const MUNDOS = [
  { id: 1, nombre: 'El Taller', tema: 'clases y objetos', niveles: MUNDO1 },
  { id: 2, nombre: 'La Bóveda', tema: 'encapsulamiento', niveles: MUNDO2 },
  { id: 3, nombre: 'Las Conexiones', tema: 'relaciones entre clases', niveles: MUNDO3 },
  { id: 4, nombre: 'Contratos', tema: 'interfaces', niveles: MUNDO4 },
  { id: 5, nombre: 'El Árbol', tema: 'herencia y clases abstractas', niveles: MUNDO5 },
  { id: 6, nombre: 'La Arena', tema: 'polimorfismo', niveles: MUNDO6 },
  { id: 7, nombre: 'La Sala de Averías', tema: 'manejo de errores (excepciones)', niveles: MUNDO7 },
  { id: 8, nombre: 'La Forja', tema: 'patrones de diseño', niveles: MUNDO8 },
];

export const NIVELES = MUNDOS.flatMap(m => (m.niveles || []).map((n, k) => ({ ...n, mundo: m.id, enMundo: k, totalMundo: m.niveles.length })));

/* Los patrones del Mundo 8 fueron misiones-ramal: lo que un avance antiguo guardó como pasos de misión
   (pasosHechos) cuenta ahora como capítulos superados. Los ids no cambiaron. */
const IDS = new Set(NIVELES.map(n => n.id));
export const capitulosHechos = (hechos, pasosHechos) => [...new Set([...(Array.isArray(hechos) ? hechos : []), ...(Array.isArray(pasosHechos) ? pasosHechos : [])])].filter(id => IDS.has(id));
