/* Servidor del aula en vivo de ClassBots.
   - Una sala por clase. Los estudiantes envían sobres cifrados con la llave de su clase; el servidor
     los guarda (SQLite) y los reenvía al profesor conectado. Nunca puede leerlos.
   - El profesor demuestra que tiene la contraseña de la clase firmando un reto con la llave de firma
     de la clase (ECDSA P-256). El id de la clase se deriva de sus llaves públicas, así que nadie
     puede presentar otras llaves con el mismo id.
   - Sin dependencias nativas: node:sqlite + ws. */
import http from 'node:http';
import { createHash, createPublicKey, randomBytes, verify } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { WebSocketServer } from 'ws';

const B64U = /^[A-Za-z0-9_-]+$/;
const esB64u = (s, max = 64) => typeof s === 'string' && s.length > 0 && s.length <= max && B64U.test(s);
const esPunto = p => p && esB64u(p.x, 43) && esB64u(p.y, 43);
const CLAVES = new Set(['vivo', 'archivo']);

export const idDeClase = (pub, firma) => createHash('sha256').update(`${pub.x}.${pub.y}.${firma.x}.${firma.y}`).digest('base64url').slice(0, 16);
export const textoReto = (claseId, reto) => `classbots-aula|${claseId}|${reto}`;

/* La clase es válida si su id corresponde a sus llaves públicas */
export function claseValida(c) {
  return !!(c && typeof c === 'object' && esB64u(c.id, 16) && esPunto(c.pub) && esPunto(c.firma) && idDeClase(c.pub, c.firma) === c.id);
}
export function firmaValida(clase, reto, firma) {
  try {
    const key = createPublicKey({ key: { kty: 'EC', crv: 'P-256', x: clase.firma.x, y: clase.firma.y }, format: 'jwk' });
    return verify('sha256', Buffer.from(textoReto(clase.id, reto)), { key, dsaEncoding: 'ieee-p1363' }, Buffer.from(String(firma), 'base64url'));
  } catch { return false; }
}
function sobreValido(s, claseId) {
  return !!(s && typeof s === 'object' && s.v === 2 && s.clase === claseId && esPunto(s.e) && typeof s.iv === 'string' && typeof s.d === 'string' && s.iv.length <= 32);
}

function abrirBase(ruta) {
  if (ruta !== ':memory:') mkdirSync(dirname(ruta), { recursive: true });
  const db = new DatabaseSync(ruta);
  db.exec(`PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS sobres (clase TEXT NOT NULL, alumno TEXT NOT NULL, clave TEXT NOT NULL, recibido INTEGER NOT NULL, datos TEXT NOT NULL, PRIMARY KEY (clase, alumno, clave));
    CREATE INDEX IF NOT EXISTS sobres_recibido ON sobres (recibido);`);
  return {
    guardar: db.prepare('INSERT INTO sobres (clase, alumno, clave, recibido, datos) VALUES (?, ?, ?, ?, ?) ON CONFLICT (clase, alumno, clave) DO UPDATE SET recibido = excluded.recibido, datos = excluded.datos'),
    existe: db.prepare('SELECT 1 FROM sobres WHERE clase = ? AND alumno = ? LIMIT 1'),
    alumnos: db.prepare('SELECT COUNT(DISTINCT alumno) AS n FROM sobres WHERE clase = ?'),
    historial: db.prepare('SELECT alumno, clave, recibido, datos FROM sobres WHERE clase = ? ORDER BY recibido'),
    purgar: db.prepare('DELETE FROM sobres WHERE recibido < ?'),
    cerrar: () => db.close(),
  };
}

export function crearServidor(op = {}) {
  const cfg = {
    puerto: 8787, host: '127.0.0.1', bd: './datos/aula.db', origenes: [], maxAlumnos: 300, maxBytes: 1 << 20,
    diasRetencion: 180, conexionesPorIp: 300, ...op,
  };
  const bd = abrirBase(cfg.bd);
  const salas = new Map(); // id → { clase, alumnos: Map<alumno, Set<ws>>, profes: Set<ws> }
  const porIp = new Map();
  const sala = id => { let s = salas.get(id); if (!s) { s = { alumnos: new Map(), profes: new Set() }; salas.set(id, s); } return s; };
  const limpiarSala = id => { const s = salas.get(id); if (s && !s.alumnos.size && !s.profes.size) salas.delete(id); };
  const enviar = (ws, m) => { if (ws.readyState === 1) ws.send(JSON.stringify(m)); };
  const aProfes = (id, m) => { const s = salas.get(id); if (s) for (const p of s.profes) enviar(p, m); };

  const servidor = http.createServer((req, res) => {
    if (req.url === '/salud') { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ ok: true, salas: salas.size })); return; }
    res.writeHead(404, { 'content-type': 'text/plain' }); res.end('ClassBots aula');
  });
  const wss = new WebSocketServer({ noServer: true, maxPayload: cfg.maxBytes });

  servidor.on('upgrade', (req, socket, head) => {
    const origen = req.headers.origin || '';
    const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    const url = new URL(req.url, 'http://x');
    const rechazar = c => { socket.write(`HTTP/1.1 ${c}\r\n\r\n`); socket.destroy(); };
    if (url.pathname !== '/aula') return rechazar('404 Not Found');
    if (cfg.origenes.length && !cfg.origenes.includes(origen)) return rechazar('403 Forbidden');
    if ((porIp.get(ip) || 0) >= cfg.conexionesPorIp) return rechazar('429 Too Many Requests');
    wss.handleUpgrade(req, socket, head, ws => { ws.ip = ip; wss.emit('connection', ws); });
  });

  wss.on('connection', ws => {
    porIp.set(ws.ip, (porIp.get(ws.ip) || 0) + 1);
    ws.vivo = true; ws.on('pong', () => { ws.vivo = true; });
    ws.reto = randomBytes(24).toString('base64url');
    ws.fichas = 40; ws.ultimaRecarga = Date.now(); ws.excesos = 0;
    const temporizador = setTimeout(() => { if (!ws.rol) ws.close(4001, 'sin saludo'); }, 30000);
    enviar(ws, { t: 'reto', reto: ws.reto });

    ws.on('message', (bruto, binario) => {
      // Límite de frecuencia: 40 mensajes de ráfaga, 4 por segundo sostenidos
      const ahora = Date.now();
      ws.fichas = Math.min(40, ws.fichas + ((ahora - ws.ultimaRecarga) / 1000) * 4); ws.ultimaRecarga = ahora;
      if (ws.fichas < 1) { if (++ws.excesos > 20) ws.close(1008, 'demasiados mensajes'); return; }
      ws.fichas -= 1;
      if (binario) return;
      let m; try { m = JSON.parse(bruto.toString()); } catch { return; }
      if (!m || typeof m !== 'object') return;

      if (m.t === 'hola' && !ws.rol) {
        if (!claseValida(m.clase)) return ws.close(4002, 'clase inválida');
        const id = m.clase.id;
        if (m.rol === 'profesor') {
          if (!firmaValida(m.clase, ws.reto, m.firma)) { enviar(ws, { t: 'error', motivo: 'firma' }); return ws.close(4003, 'firma inválida'); }
          ws.rol = 'profesor'; ws.clase = id; sala(id).profes.add(ws);
          clearTimeout(temporizador);
          const s = salas.get(id);
          enviar(ws, { t: 'listo', rol: 'profesor', presentes: [...s.alumnos.keys()] });
          const filas = bd.historial.all(id);
          for (let k = 0; k < filas.length; k += 50) {
            enviar(ws, { t: 'historial', filas: filas.slice(k, k + 50).map(f => ({ alumno: f.alumno, clave: f.clave, recibido: f.recibido, sobre: JSON.parse(f.datos) })), fin: k + 50 >= filas.length });
          }
          if (!filas.length) enviar(ws, { t: 'historial', filas: [], fin: true });
          return;
        }
        if (m.rol === 'estudiante' && esB64u(m.alumno, 40)) {
          if (!bd.existe.get(id, m.alumno) && bd.alumnos.get(id).n >= cfg.maxAlumnos) { enviar(ws, { t: 'error', motivo: 'clase llena' }); return ws.close(4004, 'clase llena'); }
          ws.rol = 'estudiante'; ws.clase = id; ws.alumno = m.alumno;
          clearTimeout(temporizador);
          const s = sala(id);
          if (!s.alumnos.has(m.alumno)) s.alumnos.set(m.alumno, new Set());
          const primero = !s.alumnos.get(m.alumno).size;
          s.alumnos.get(m.alumno).add(ws);
          enviar(ws, { t: 'listo', rol: 'estudiante', profesor: s.profes.size > 0 });
          if (primero) aProfes(id, { t: 'presencia', alumno: m.alumno, conectado: true, t2: ahora });
          return;
        }
        return ws.close(4002, 'saludo inválido');
      }

      if (ws.rol === 'estudiante' && m.t === 'sobre') {
        if (!CLAVES.has(m.clave) || !sobreValido(m.sobre, ws.clase)) return;
        bd.guardar.run(ws.clase, ws.alumno, m.clave, ahora, JSON.stringify(m.sobre));
        enviar(ws, { t: 'ack', clave: m.clave, n: m.n });
        aProfes(ws.clase, { t: 'sobre', alumno: ws.alumno, clave: m.clave, recibido: ahora, sobre: m.sobre });
        return;
      }

      if (ws.rol === 'profesor' && m.t === 'mensaje') {
        const texto = String(m.texto || '').trim().slice(0, 500);
        if (!texto) return;
        const s = salas.get(ws.clase); let n = 0;
        for (const [alumno, socks] of s.alumnos) {
          if (m.para !== '*' && m.para !== alumno) continue;
          for (const x of socks) { enviar(x, { t: 'mensaje', texto, enviado: ahora }); n++; }
        }
        enviar(ws, { t: 'enviado', para: m.para, n });
      }
    });

    ws.on('close', () => {
      clearTimeout(temporizador);
      const n = (porIp.get(ws.ip) || 1) - 1; if (n) porIp.set(ws.ip, n); else porIp.delete(ws.ip);
      const s = ws.clase && salas.get(ws.clase);
      if (!s) return;
      if (ws.rol === 'profesor') s.profes.delete(ws);
      if (ws.rol === 'estudiante') {
        const socks = s.alumnos.get(ws.alumno);
        socks?.delete(ws);
        if (socks && !socks.size) { s.alumnos.delete(ws.alumno); aProfes(ws.clase, { t: 'presencia', alumno: ws.alumno, conectado: false, t2: Date.now() }); }
      }
      limpiarSala(ws.clase);
    });
  });

  // Conexiones muertas (equipos que se suspendieron) y datos viejos
  const latido = setInterval(() => { for (const ws of wss.clients) { if (!ws.vivo) { ws.terminate(); continue; } ws.vivo = false; ws.ping(); } }, 30000);
  const purga = () => { if (cfg.diasRetencion > 0) bd.purgar.run(Date.now() - cfg.diasRetencion * 864e5); };
  purga();
  const tPurga = setInterval(purga, 6 * 3600e3);

  return {
    escuchar: () => new Promise(r => servidor.listen(cfg.puerto, cfg.host, () => r(servidor.address().port))),
    cerrar: () => new Promise(r => { clearInterval(latido); clearInterval(tPurga); for (const ws of wss.clients) ws.terminate(); wss.close(); servidor.close(() => { bd.cerrar(); r(); }); }),
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const env = process.env;
  const s = crearServidor({
    puerto: +(env.PUERTO || 8787), host: env.HOST || '0.0.0.0', bd: env.BD || '/datos/aula.db',
    origenes: (env.ORIGENES || '').split(',').map(x => x.trim()).filter(Boolean),
    maxAlumnos: +(env.MAX_ALUMNOS || 300), diasRetencion: +(env.DIAS_RETENCION || 180),
  });
  const puerto = await s.escuchar();
  console.log(`Aula de ClassBots escuchando en el puerto ${puerto}${env.ORIGENES ? ` · orígenes: ${env.ORIGENES}` : ' · sin restricción de origen'}`);
  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => s.cerrar().then(() => process.exit(0)));
}
