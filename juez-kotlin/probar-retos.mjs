/* Corre la solución de referencia de cada reto en el worker (sin Docker) y comprueba que
   todo pasa y que hay captura cuando el reto la pide. Uso: node probar-retos.mjs [reto…] */
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { crearWorker } from './servidor.mjs';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const retosDir = path.join(aqui, 'retos');
const pedidos = process.argv.slice(2);
const retos = (await readdir(retosDir)).filter(r => !pedidos.length || pedidos.includes(r)).sort();
const w = crearWorker({ plantilla: path.join(aqui, 'plantilla'), retosDir, trabajo: process.env.TRABAJO || path.join(aqui, 'trabajo'), slots: 1, casa: process.env.GRADLE_USER_HOME || null, casaBase: process.env.CASA_BASE || null });
await w.preparar();
let malos = 0;
for (const reto of retos) {
  const dir = path.join(retosDir, reto, 'solucion');
  const archivos = {};
  for (const n of await readdir(dir)) archivos[n] = await readFile(path.join(dir, n), 'utf8');
  const r = await w.evaluar({ reto, archivos });
  const fallos = r.casos.filter(c => !c.ok);
  console.log(`${reto}: compiló=${r.compilo} casos=${r.casos.length} ok=${r.casos.length - fallos.length} ocultos=${r.casos.filter(c => c.oculto).length} captura=${!!r.captura} ${r.ms} ms`);
  for (const e of r.errores) console.log(`  error ${e.archivo}:${e.linea}:${e.columna} ${e.msg}`);
  for (const c of fallos) console.log(`  FALLA ${c.clase} · ${c.nombre}: ${c.mensaje}`);
  if (r.fallo) console.log('  ' + r.fallo);
  if (r.captura && process.env.CAPTURAS) { await mkdir(process.env.CAPTURAS, { recursive: true }); await writeFile(path.join(process.env.CAPTURAS, `${reto}.png`), Buffer.from(r.captura.split(',')[1], 'base64')); }
  if (!r.compilo || fallos.length || !r.casos.length) malos++;
}
process.exit(malos ? 1 : 0);
