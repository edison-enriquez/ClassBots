/* Catálogo de mundos y capítulos */
import { MUNDO1 } from './mundo1.js';
import { MUNDO2 } from './mundo2.js';
import { MUNDO3 } from './mundo3.js';
import { MUNDO4 } from './mundo4.js';
import { MUNDO5 } from './mundo5.js';
import { MUNDO6 } from './mundo6.js';
import { MUNDO7 } from './mundo7.js';
import { MUNDO8, PATRONES, patronCompleto } from './mundo8.js';

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

/* Qué capítulo se puede abrir. La ruta es secuencial (cada capítulo pide el anterior), salvo en el mundo de
   patrones, que va en orden libre:
   - el primer paso de cada patrón se abre al superar el capítulo anterior al mundo (el jefe del Mundo 7);
   - dentro de un patrón se sigue paso a paso;
   - un patrón que reúne a otros (MVC, campo `reune`) se abre cuando están todos dominados. */
const INICIO_PATRONES = NIVELES.findIndex(n => n.patron);
const pasoPatronAnterior = k => NIVELES[k - 1]?.patron === NIVELES[k].patron;
export function capituloAbierto(k, hechos = []) {
  const n = NIVELES[k];
  if (!n) return false;
  if (k === 0 || hechos.includes(n.id)) return true;
  if (!n.patron || pasoPatronAnterior(k)) return hechos.includes(NIVELES[k - 1].id);
  const p = PATRONES.find(x => x.id === n.patron);
  if (p?.reune?.length) return p.reune.every(r => patronCompleto(PATRONES.find(x => x.id === r.id), hechos));
  return INICIO_PATRONES <= 0 || hechos.includes(NIVELES[INICIO_PATRONES - 1].id);
}
/* Por qué un capítulo cerrado está cerrado, para los títulos de los botones */
export function requisitoCapitulo(k, hechos = []) {
  const n = NIVELES[k];
  if (!n || capituloAbierto(k, hechos)) return '';
  if (!n.patron || pasoPatronAnterior(k)) return 'Supera el capítulo anterior para abrirlo';
  const p = PATRONES.find(x => x.id === n.patron);
  if (p?.reune?.length) {
    const faltan = PATRONES.filter(x => p.reune.some(r => r.id === x.id) && !patronCompleto(x, hechos)).map(x => x.corto);
    return `Domina ${faltan.length === 1 ? faltan[0] : `los patrones que faltan (${faltan.join(', ')})`} para abrirlo`;
  }
  return `Supera «${NIVELES[INICIO_PATRONES - 1].titulo}» (jefe del Mundo ${NIVELES[INICIO_PATRONES - 1].mundo}) para abrirlo`;
}
/* A dónde lleva «Siguiente» al superar el capítulo k: el que sigue en la ruta si está abierto; en el mundo de
   patrones, el primer capítulo abierto y sin superar de ese mundo (empezando por los que vienen después) */
export function siguienteCapitulo(k, hechos = []) {
  const n = NIVELES[k];
  const sig = NIVELES[k + 1];
  if (!n?.patron) return sig ? k + 1 : null;
  if (sig && sig.patron === n.patron && capituloAbierto(k + 1, hechos)) return k + 1;
  const delMundo = NIVELES.map((x, j) => j).filter(j => NIVELES[j].mundo === n.mundo);
  const orden = [...delMundo.filter(j => j > k), ...delMundo.filter(j => j < k)];
  const pendiente = orden.find(j => !hechos.includes(NIVELES[j].id) && capituloAbierto(j, hechos));
  if (pendiente != null) return pendiente;
  return sig && capituloAbierto(k + 1, hechos) ? k + 1 : null;
}
