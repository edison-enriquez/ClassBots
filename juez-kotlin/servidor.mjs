/* Juez de Kotlin de ClassBots.
   Dos modos en el mismo archivo (variable MODO):
   - api:    recibe los envíos del juego, los pone en cola y entrega el resultado. Nunca ejecuta código
             del estudiante. Es el único contenedor con puerto publicado (127.0.0.1) y sin salida a internet.
   - worker: compila y prueba el Kotlin del estudiante con Gradle + Robolectric dentro de una red interna
             sin salida, y devuelve los casos, los errores de compilación y una captura de la pantalla.
   Sin dependencias: solo módulos de Node. */
import http from 'node:http';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { cp, mkdir, readdir, readFile, rm, writeFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const PAQUETE = 'com.classbots.taller';
const RUTA_PAQUETE = PAQUETE.replace(/\./g, '/');
export const LIMITES = { archivos: 12, bytesArchivo: 30_000, bytesCuerpo: 250_000 };
const NOMBRE_KT = /^[A-Z][A-Za-z0-9]{0,40}\.kt$/;
const ID_RETO = /^[a-z0-9][a-z0-9-]{0,40}$/;

/* ---------- Validación del envío (pura, se prueba sin Gradle) ---------- */
export function validarEnvio(cuerpo, retos) {
  if (!cuerpo || typeof cuerpo !== 'object') return 'Cuerpo inválido.';
  const { reto, archivos } = cuerpo;
  if (typeof reto !== 'string' || !ID_RETO.test(reto) || !retos.includes(reto)) return 'Reto desconocido.';
  if (!archivos || typeof archivos !== 'object' || Array.isArray(archivos)) return 'Faltan los archivos.';
  const nombres = Object.keys(archivos);
  if (!nombres.length || nombres.length > LIMITES.archivos) return `Envía entre 1 y ${LIMITES.archivos} archivos.`;
  for (const n of nombres) {
    if (!NOMBRE_KT.test(n)) return `Nombre de archivo no permitido: ${n.slice(0, 50)}`;
    if (typeof archivos[n] !== 'string') return `${n} debe ser texto.`;
    if (Buffer.byteLength(archivos[n]) > LIMITES.bytesArchivo) return `${n} es demasiado grande.`;
  }
  return null;
}

/* Todo archivo va en el paquete del taller: si falta la línea package se agrega (y se corrige la numeración) */
export function prepararFuente(texto) {
  const m = /^\s*package\s+([\w.]+)/m.exec(texto.replace(/\/\*[\s\S]*?\*\//g, s => s.replace(/[^\n]/g, ' ')).replace(/\/\/.*$/gm, ''));
  if (m && m[1] !== PAQUETE) return { error: `El paquete debe ser ${PAQUETE} (encontré ${m[1]}).` };
  return m ? { texto, desfase: 0 } : { texto: `package ${PAQUETE}\n${texto}`, desfase: 1 };
}

/* Errores del compilador de Kotlin: «e: file:///…/Robot.kt:20:21 mensaje» */
export function parsearErrores(salida, desfases = {}) {
  const errores = [];
  for (const linea of salida.split('\n')) {
    const m = /^e: (?:file:\/\/)?\S*?\/([A-Za-z0-9]+\.kt):(\d+):(\d+) (.*)$/.exec(linea.trim());
    if (!m) continue;
    const d = desfases[m[1]] || 0;
    const e = { archivo: m[1], linea: Math.max(1, +m[2] - d), columna: +m[3], msg: m[4] };
    if (!errores.some(x => x.archivo === e.archivo && x.linea === e.linea && x.msg === e.msg)) errores.push(e);
  }
  return errores.slice(0, 30);
}

const ENTIDADES = { '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&amp;': '&' };
const desxml = s => s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&(lt|gt|quot|apos|amp);/g, e => ENTIDADES[e]);

/* Resultados JUnit (XML de Gradle). Las clases que terminan en «OcultoTest» son casos ocultos. */
export function parsearJUnit(xml) {
  const casos = [];
  const re = /<testcase\s+name="([^"]*)"\s+classname="([^"]*)"[^>]*?(\/>|>([\s\S]*?)<\/testcase>)/g;
  let m;
  while ((m = re.exec(xml))) {
    const cuerpo = m[4] || '';
    const f = /<(failure|error)\s+message="([^"]*)"/.exec(cuerpo);
    const omitido = /<skipped/.test(cuerpo);
    const clase = m[2].split('.').pop();
    let mensaje = f ? desxml(f[2]) : null;
    if (mensaje) {
      mensaje = mensaje.replace(/^java\.lang\.AssertionError:\s*/, '').replace(/^(Failed: assert\w+\.\s*)/, '');
      mensaje = mensaje.split('\n').filter(l => !/^\s*(Reason:|at |Semantics|Node #|\|)/.test(l)).slice(0, 3).join(' ').trim().slice(0, 400);
    }
    casos.push({ nombre: desxml(m[1]).replace(/\(\)$/, ''), clase, oculto: /OcultoTest$/.test(clase), ok: !f && !omitido, mensaje });
  }
  return casos;
}

/* ---------- Worker: ejecuta Gradle en una copia de la plantilla ---------- */
function correr(cmd, args, { cwd, env, ms }) {
  return new Promise(res => {
    const p = spawn(cmd, args, { cwd, env: { ...process.env, ...env }, detached: true });
    let salida = '';
    const tomar = d => { if (salida.length < 400_000) salida += d; };
    p.stdout.on('data', tomar); p.stderr.on('data', tomar);
    const t = setTimeout(() => { try { process.kill(-p.pid, 'SIGKILL'); } catch { /* ya terminó */ } res({ codigo: -1, salida, tiempoAgotado: true }); }, ms);
    p.on('close', codigo => { clearTimeout(t); res({ codigo, salida, tiempoAgotado: false }); });
    p.on('error', e => { clearTimeout(t); res({ codigo: -1, salida: salida + `\nerror: no pude iniciar ${cmd}: ${e.message}`, tiempoAgotado: false }); });
  });
}

export function crearWorker({ plantilla, retosDir, trabajo, slots = 2, gradleMs = 150_000 }) {
  const libres = Array.from({ length: slots }, (_, i) => path.join(trabajo, `slot${i + 1}`));
  const espera = [];
  const tomarSlot = () => (libres.length ? Promise.resolve(libres.pop()) : new Promise(r => espera.push(r)));
  const soltarSlot = s => (espera.length ? espera.shift()(s) : libres.push(s));

  async function preparar() {
    for (const s of [...libres]) if (!existsSync(path.join(s, 'gradlew'))) { await mkdir(s, { recursive: true }); await cp(plantilla, s, { recursive: true }); }
  }

  async function evaluar({ reto, archivos }) {
    const slot = await tomarSlot();
    const t0 = Date.now();
    try {
      const main = path.join(slot, 'app/src/main/java', RUTA_PAQUETE), test = path.join(slot, 'app/src/test/java', RUTA_PAQUETE);
      await rm(main, { recursive: true, force: true }); await rm(test, { recursive: true, force: true });
      await mkdir(main, { recursive: true }); await mkdir(test, { recursive: true });
      await rm(path.join(slot, 'captura.png'), { force: true });
      await rm(path.join(slot, 'app/build/test-results'), { recursive: true, force: true });
      const desfases = {};
      for (const [n, texto] of Object.entries(archivos)) {
        const f = prepararFuente(texto);
        if (f.error) return { estado: 'listo', compilo: false, errores: [{ archivo: n, linea: 1, columna: 1, msg: f.error }], casos: [], ms: Date.now() - t0 };
        desfases[n] = f.desfase;
        await writeFile(path.join(main, n), f.texto);
      }
      // Archivos sellados del reto (pisan los del estudiante) y las pruebas
      const dirReto = path.join(retosDir, reto);
      for (const [sub, destino] of [['fijos', main], ['pruebas', test]]) {
        const d = path.join(dirReto, sub);
        if (existsSync(d)) for (const n of await readdir(d)) if (n.endsWith('.kt')) { await cp(path.join(d, n), path.join(destino, n)); delete desfases[n]; }
      }
      const r = await correr(path.join(slot, 'gradlew'), ['testDebugUnitTest', '--offline', '--console=plain', '-q', '--continue'], { cwd: slot, ms: gradleMs });
      if (r.tiempoAgotado) {
        await correr(path.join(slot, 'gradlew'), ['--stop'], { cwd: slot, ms: 20_000 });
        return { estado: 'listo', compilo: true, errores: [], casos: [], tiempoAgotado: true, ms: Date.now() - t0 };
      }
      const errores = parsearErrores(r.salida, desfases);
      const casos = [];
      const dirRes = path.join(slot, 'app/build/test-results/testDebugUnitTest');
      if (existsSync(dirRes)) for (const n of (await readdir(dirRes)).sort()) if (n.endsWith('.xml')) casos.push(...parsearJUnit(await readFile(path.join(dirRes, n), 'utf8')));
      let captura = null;
      const png = path.join(slot, 'captura.png');
      if (existsSync(png) && (await stat(png)).size < 2_000_000) captura = 'data:image/png;base64,' + (await readFile(png)).toString('base64');
      const sinCasos = !errores.length && !casos.length && r.codigo !== 0;
      // Gradle corta las pruebas a los 60 s (ciclo infinito, espera sin fin…) y no deja resultados
      const agotado = sinCasos && /timed? ?out|timeout/i.test(r.salida);
      const fallo = sinCasos && !agotado ? r.salida.split('\n').filter(l => /error|exception|failed/i.test(l)).slice(0, 5).join('\n').slice(0, 800) : null;
      return { estado: 'listo', compilo: !errores.length, errores, casos, captura, ms: Date.now() - t0, ...(agotado ? { tiempoAgotado: true } : {}), ...(fallo ? { fallo } : {}) };
    } finally {
      soltarSlot(slot);
    }
  }
  return { preparar, evaluar };
}

/* ---------- Utilidades HTTP ---------- */
function leerCuerpo(req, max) {
  return new Promise((res, rej) => {
    let n = 0; const partes = [];
    req.on('data', d => { n += d.length; if (n > max) { rej(Object.assign(new Error('grande'), { codigo: 413 })); req.destroy(); } else partes.push(d); });
    req.on('end', () => { try { res(JSON.parse(Buffer.concat(partes).toString('utf8') || 'null')); } catch { rej(Object.assign(new Error('json'), { codigo: 400 })); } });
    req.on('error', rej);
  });
}
const json = (res, codigo, obj, extra = {}) => { res.writeHead(codigo, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra }); res.end(JSON.stringify(obj)); };

/* ---------- API pública: cola en memoria ---------- */
export function crearApi({ retos, origenes = [], evaluar, simultaneos = 2, maxCola = 80, vidaMs = 15 * 60_000 }) {
  const trabajos = new Map(); // id → { estado, clave, t, resultado }
  const cola = [];
  const activos = new Map(); // clave (ip|alumno) → id
  let corriendo = 0;

  const posicion = id => { const k = cola.indexOf(id); return k < 0 ? 0 : k + 1; };
  async function siguiente() {
    while (corriendo < simultaneos && cola.length) {
      const id = cola.shift(), tr = trabajos.get(id);
      if (!tr) continue;
      corriendo++; tr.estado = 'corriendo'; tr.inicio = Date.now();
      evaluar(tr.envio).then(r => { tr.resultado = r; tr.estado = 'listo'; })
        .catch(e => { tr.estado = 'error'; tr.resultado = { mensaje: 'El juez no pudo evaluar este intento.', detalle: String(e.message || e).slice(0, 200) }; })
        .finally(() => { corriendo--; tr.envio = null; tr.fin = Date.now(); if (activos.get(tr.clave) === id) activos.delete(tr.clave); siguiente(); });
    }
  }
  const limpieza = setInterval(() => { const ahora = Date.now(); for (const [id, tr] of trabajos) if (tr.fin && ahora - tr.fin > vidaMs) trabajos.delete(id); }, 60_000);
  limpieza.unref();

  const servidor = http.createServer(async (req, res) => {
    const origen = req.headers.origin || '';
    const permitido = !origenes.length || origenes.includes(origen);
    const cors = origen && permitido ? { 'access-control-allow-origin': origen, vary: 'Origin' } : {};
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/salud') return json(res, 200, { ok: true, cola: cola.length, corriendo, retos }, cors);
    if (!url.pathname.startsWith('/kotlin/')) return json(res, 404, { error: 'no existe' });
    if (req.method === 'OPTIONS') { res.writeHead(204, { ...cors, 'access-control-allow-methods': 'GET, POST', 'access-control-allow-headers': 'content-type', 'access-control-max-age': '600' }); return res.end(); }
    if (origen && !permitido) return json(res, 403, { error: 'Origen no permitido.' });
    const ip = String(req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();

    if (req.method === 'POST' && url.pathname === '/kotlin/evaluar') {
      let cuerpo;
      try { cuerpo = await leerCuerpo(req, LIMITES.bytesCuerpo); } catch (e) { return json(res, e.codigo || 400, { error: e.codigo === 413 ? 'Envío demasiado grande.' : 'JSON inválido.' }, cors); }
      const malo = validarEnvio(cuerpo, retos);
      if (malo) return json(res, 400, { error: malo }, cors);
      const alumno = typeof cuerpo.alumno === 'string' ? cuerpo.alumno.slice(0, 64) : '';
      const clave = `${ip}|${alumno}`;
      const previo = activos.get(clave);
      if (previo && trabajos.get(previo)) return json(res, 202, { id: previo, estado: trabajos.get(previo).estado, posicion: posicion(previo), repetido: true }, cors);
      if (cola.length >= maxCola) return json(res, 503, { error: 'El juez está lleno. Intenta en un minuto.' }, { ...cors, 'retry-after': '60' });
      const id = randomBytes(12).toString('base64url');
      trabajos.set(id, { estado: 'cola', clave, t: Date.now(), envio: { reto: cuerpo.reto, archivos: cuerpo.archivos } });
      activos.set(clave, id); cola.push(id);
      siguiente();
      return json(res, 202, { id, estado: trabajos.get(id).estado, posicion: posicion(id) }, cors);
    }
    const m = /^\/kotlin\/estado\/([A-Za-z0-9_-]{16})$/.exec(url.pathname);
    if (req.method === 'GET' && m) {
      const tr = trabajos.get(m[1]);
      if (!tr) return json(res, 404, { error: 'Ese intento ya no existe.' }, cors);
      return json(res, 200, { estado: tr.estado, posicion: posicion(m[1]), ...(tr.resultado ? { resultado: tr.resultado } : {}) }, cors);
    }
    return json(res, 404, { error: 'no existe' }, cors);
  });
  return { servidor, trabajos, cola };
}

/* ---------- Arranque ---------- */
async function principal() {
  const env = process.env;
  const retosDir = path.resolve(env.RETOS || './retos');
  const retos = (await readdir(retosDir, { withFileTypes: true })).filter(d => d.isDirectory() && existsSync(path.join(retosDir, d.name, 'pruebas'))).map(d => d.name).sort();
  const puerto = +(env.PUERTO || 8788), host = env.HOST || '0.0.0.0';

  if ((env.MODO || 'api') === 'worker') {
    const slots = +(env.SLOTS || 2);
    const w = crearWorker({ plantilla: path.resolve(env.PLANTILLA || './plantilla'), retosDir, trabajo: path.resolve(env.TRABAJO || './trabajo'), slots });
    await w.preparar();
    // Calentar cada copia con una solución de referencia: el primer estudiante no espera la compilación en frío
    const ref = retos.find(r => existsSync(path.join(retosDir, r, 'solucion')) && r.includes('pantalla')) || retos[0];
    if (env.CALENTAR && ref) {
      const dir = path.join(retosDir, ref, 'solucion'), archivos = {};
      for (const n of await readdir(dir)) archivos[n] = await readFile(path.join(dir, n), 'utf8');
      const t0 = Date.now();
      const rs = await Promise.all(Array.from({ length: slots }, () => w.evaluar({ reto: ref, archivos })));
      console.log(`calentado con ${ref} en ${Date.now() - t0} ms: ${rs.map(r => `${r.casos.filter(c => c.ok).length}/${r.casos.length}`).join(', ')}`);
    }
    http.createServer(async (req, res) => {
      if (req.url === '/salud') return json(res, 200, { ok: true, retos });
      if (req.method !== 'POST' || req.url !== '/correr') return json(res, 404, { error: 'no existe' });
      try {
        const cuerpo = await leerCuerpo(req, LIMITES.bytesCuerpo);
        const malo = validarEnvio(cuerpo, retos);
        if (malo) return json(res, 400, { error: malo });
        json(res, 200, await w.evaluar(cuerpo));
      } catch (e) { json(res, 500, { error: String(e.message || e).slice(0, 200) }); }
    }).listen(puerto, host, () => console.log(`juez worker en ${host}:${puerto} · retos: ${retos.join(', ')}`));
    return;
  }

  const workerUrl = env.WORKER_URL || 'http://worker:8789/correr';
  const evaluar = envio => new Promise((resolve, reject) => {
    const datos = Buffer.from(JSON.stringify(envio));
    const r = http.request(workerUrl, { method: 'POST', headers: { 'content-type': 'application/json', 'content-length': datos.length }, timeout: 240_000 }, res => {
      const partes = []; res.on('data', d => partes.push(d));
      res.on('end', () => { try { const j = JSON.parse(Buffer.concat(partes).toString('utf8')); res.statusCode === 200 ? resolve(j) : reject(new Error(j.error || `worker ${res.statusCode}`)); } catch (e) { reject(e); } });
    });
    r.on('timeout', () => r.destroy(new Error('el worker no respondió a tiempo'))); r.on('error', reject);
    r.end(datos);
  });
  const origenes = (env.ORIGENES || 'https://classbots.eehub.ing').split(',').map(s => s.trim()).filter(Boolean);
  const { servidor } = crearApi({ retos, origenes, evaluar, simultaneos: +(env.SIMULTANEOS || 2), maxCola: +(env.MAX_COLA || 80) });
  servidor.listen(puerto, host, () => console.log(`juez api en ${host}:${puerto} · orígenes: ${origenes.join(', ')} · retos: ${retos.join(', ')}`));
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) principal();
