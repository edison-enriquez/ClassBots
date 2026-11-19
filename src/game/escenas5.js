/* Escenas de MVC: tres puestos en fila, CONTROL, MODELO y VISTAS (un monitor por cada vista creada).
   Los cables se encienden cuando la orden llega al modelo y cuando el modelo notifica a cada vista.
   - escenaHMI (misión MVC en Java · El panel de control): los botones del operador, el tanque con su
     nivel y los indicadores del panel.
   - escenaMando (misión MVC con Kotlin): el pupitre, el robot con energía y posición y sus pantallas. */
import { W, P, texto } from './sprites.js';
import { dibujarRobot, barra, linea } from './dibujo.js';
import { suelo, muro, placa, bocadillo, plataforma, monitorPared } from './rpg.js';

const X_CONTROL = 30, X_MODELO = 96, X_VISTAS = 141, PISO = 84;
const MON_W = 48, MON_H = 19;
const corto = (s, n) => String(s).slice(0, n);
const sinComillas = s => String(s ?? '').trim().replace(/^"(.*)"$/, '$1');
const etiquetaVista = cls => String(cls).replace(/^Vista/, '') || cls;

/* Clases que cumplen el contrato de vista (implementan una interfaz que se llame Vista…) */
function clasesVista(modelo) {
  return new Set(Object.values(modelo?.clases || {})
    .filter(c => c.tipo !== 'interface' && (c.implementa || []).some(i => /^Vista/.test(i.replace(/<.*>/, ''))))
    .map(c => c.nombre));
}

/* Qué clase es el modelo y con qué métodos llegan las órdenes en cada escena (`textual` recibe la orden como texto) */
const SALA_ROBOT = { modelo: 'Robot', ordenes: ['orden', 'piloto'], textual: 'orden' };
const SALA_TANQUE = { modelo: 'Tanque', ordenes: ['pulsar', 'ciclos'], textual: 'pulsar' };

/* Estado de la sala en el cuadro i: vistas creadas y lo último que mostró cada una, última orden y último cambio del modelo.
   De mostrar(nombre, valor, cuenta) se guardan el valor de la barra (energía o nivel) y la cuenta (posición o cargas). */
function estadoSala(frames, i, modelo, cfg = SALA_ROBOT) {
  const esVista = clasesVista(modelo);
  const vistas = [], porId = new Map();
  let orden = null, cambio = null, lanza = null, print = null, controles = 0;
  for (let k = 0; k <= Math.min(i, frames.length - 1); k++) {
    const f = frames[k];
    if (f.tipo === 'crear') {
      if (esVista.has(f.cls) && vistas.length < 3) { const v = { id: f.quien, cls: f.cls, k: -1 }; vistas.push(v); porId.set(f.quien, v); }
      if (/^Controlador/.test(f.cls)) controles++;
      continue;
    }
    if (f.tipo === 'print') { print = { k, txt: f.cap.replace(/^System\.out\.println → /, '') }; continue; }
    if (f.tipo === 'lanza') { lanza = { k, msg: f.msg }; continue; }
    if (f.tipo !== 'llamada') continue;
    const cls = f.objetos?.find(o => o.id === f.quien)?.cls || '';
    const args = (/\((.*)\)$/.exec(f.cap)?.[1] || '').split(', ');
    const v = porId.get(f.quien);
    if (v && f.metodo === 'mostrar') Object.assign(v, { k, aviso: null, nombre: sinComillas(args[0]), valor: +args[1], cuenta: +args[2] });
    else if (v && f.metodo === 'aviso') Object.assign(v, { k, aviso: sinComillas(args.join(', ')) });
    else if (/^Controlador/.test(cls) || cfg.ordenes.includes(f.metodo)) orden = { k, auto: f.metodo !== cfg.textual, txt: f.metodo === cfg.textual ? sinComillas(args[0]) : `${f.metodo}(${args.join(', ')})` };
    else if (cls === cfg.modelo && f.metodo !== 'suscribir' && !/^get/.test(f.metodo)) cambio = { k, metodo: f.metodo };
  }
  return { vistas, orden, cambio, lanza, print, controles, esVista };
}

function fondo(ctx, now) {
  muro(ctx, 30, 'metal');
  suelo(ctx, 'metal', 0, 30, W, 112);
  placa(ctx, 96, 13, 'SALA DE MANDO', '#9fe8ff');
  monitorPared(ctx, 8, 12, now, '#7cd4ff');
  monitorPared(ctx, 166, 12, now, '#4ade80');
  // Franjas de piso que separan los tres puestos
  for (const x of [63, 128]) for (let y = 34; y < 100; y += 6) { ctx.fillStyle = 'rgba(159,232,255,.18)'; ctx.fillRect(x, y, 1, 3); }
  texto(ctx, 'CONTROL', X_CONTROL, 104, '#ffcc33', { centrar: true, sombra: P.ink });
  texto(ctx, 'MODELO', X_MODELO, 104, '#9fe8ff', { centrar: true, sombra: P.ink });
  texto(ctx, 'VISTAS', X_VISTAS + MON_W / 2, 104, P.green, { centrar: true, sombra: P.ink });
}

/* Pupitre del controlador con una palanca que se mueve al dar una orden */
function pupitre(ctx, activo, now) {
  const x = X_CONTROL - 17, y = 66;
  ctx.fillStyle = P.ink; ctx.fillRect(x, y, 34, 18);
  ctx.fillStyle = '#4c5378'; ctx.fillRect(x + 1, y + 1, 32, 16);
  ctx.fillStyle = '#5f6890'; ctx.fillRect(x + 1, y + 1, 32, 2);
  const botones = ['#ff5470', '#ffcc33', '#4ade80'];
  botones.forEach((c, k) => { ctx.fillStyle = P.ink; ctx.fillRect(x + 4 + k * 7, y + 7, 5, 5); ctx.fillStyle = activo && k === Math.floor(now / 150) % 3 ? '#ffffff' : c; ctx.fillRect(x + 5 + k * 7, y + 8, 3, 3); });
  // Palanca
  const inclina = activo ? 3 : 0;
  ctx.fillStyle = P.ink; ctx.fillRect(x + 26, y + 6, 3, 8);
  linea(ctx, x + 27, y + 7, x + 27 + inclina, y - 1, P.steel);
  ctx.fillStyle = activo ? '#ff5470' : '#b0384f'; ctx.fillRect(x + 26 + inclina, y - 3, 3, 3);
}

/* Monitor de una vista: su nombre, lo último que mostró o el aviso en rojo */
function monitor(ctx, x, y, v, activo, now, fantasma = false, letra = 'P') {
  ctx.globalAlpha = fantasma ? 0.45 : 1;
  ctx.fillStyle = activo ? '#ffffff' : P.ink; ctx.fillRect(x, y, MON_W, MON_H);
  ctx.fillStyle = '#0e1a12'; ctx.fillRect(x + 1, y + 1, MON_W - 2, MON_H - 2);
  ctx.fillStyle = '#1d3a2a'; ctx.fillRect(x + 1, y + 1, MON_W - 2, 7);
  texto(ctx, corto(etiquetaVista(v.cls), 11), x + 3, y + 2, '#9fe8ff');
  if (v.aviso != null) {
    texto(ctx, corto('! ' + v.aviso, 11), x + 3, y + 10, P.red);
  } else if (typeof v.valor === 'number' && !Number.isNaN(v.valor)) {
    texto(ctx, `${letra}${v.cuenta}`, x + 3, y + 10, P.white);
    barra(ctx, x + 13, y + 11, 17, v.valor);
    texto(ctx, String(v.valor), x + MON_W - 3 - String(v.valor).length * 4 + 1, y + 10, P.green);
  } else {
    texto(ctx, fantasma ? 'SIN CONECTAR' : '...', x + 3, y + 10, '#5d7a6a');
  }
  ctx.globalAlpha = 1;
}

export function escenaMando(ctx, { modelo, fr, s, now }) {
  fondo(ctx, now);
  const frames = s.frames || [];
  const i = s.i ?? -1;
  const est = estadoSala(frames, i, modelo);
  const reciente = (x, n = 1) => x && i - x.k <= n;

  // --- Puesto de control ---
  pupitre(ctx, reciente(est.orden), now);
  if (est.orden) bocadillo(ctx, X_CONTROL, 46, corto(est.orden.txt.toUpperCase(), 10), reciente(est.orden) ? P.gold : '#c9cee8');

  // --- Modelo ---
  const robot = fr?.robots?.[0];
  plataforma(ctx, X_MODELO, PISO + 2, reciente(est.cambio));
  if (robot) {
    const fallo = est.lanza && i - est.lanza.k <= 2;
    if (fallo) { ctx.fillStyle = `rgba(255,84,112,${Math.floor(now / 120) % 2 ? 0.35 : 0.15})`; ctx.fillRect(X_MODELO - 14, PISO - 30, 28, 32); }
    dibujarRobot(ctx, X_MODELO, PISO, { ...robot, color: 'azul' }, now, { caminando: reciente(est.cambio) && est.cambio.metodo === 'avanzar' });
    if (typeof robot.posicion === 'number') texto(ctx, `POS ${robot.posicion}`, X_MODELO, PISO + 6, P.white, { centrar: true, sombra: P.ink });
    if (fallo) texto(ctx, '!', X_MODELO + 10, PISO - 22, P.red, { sombra: P.ink });
    // Sin vistas, el robot imprime solo: el texto le sale de la cabeza
    if (!est.vistas.length && est.print && fr?.tipo === 'print') bocadillo(ctx, X_MODELO, 36, corto(est.print.txt, 14), P.white);
  } else {
    dibujarRobot(ctx, X_MODELO, PISO, {}, now, { fantasma: true });
  }

  // --- Cable control → modelo ---
  const ordenViva = reciente(est.orden) || reciente(est.cambio);
  linea(ctx, X_CONTROL + 17, 74, X_MODELO - 11, 74, ordenViva ? P.gold : '#7a83a8', { punteada: !ordenViva });

  // --- Vistas: las creadas en la ejecución o, antes de ejecutar, las clases que existen ---
  const lista = est.vistas.length ? est.vistas : [...est.esVista].slice(0, 3).map(cls => ({ cls }));
  const fantasma = !est.vistas.length;
  lista.forEach((v, k) => {
    const y = 34 + k * (MON_H + 4);
    const activo = !fantasma && v.k >= 0 && i - v.k <= 1;
    linea(ctx, X_MODELO + 11, 70, X_VISTAS - 1, y + MON_H / 2, activo ? (v.aviso != null ? P.red : P.green) : '#7a83a8', { punteada: !activo });
    monitor(ctx, X_VISTAS, y, v, activo, now, fantasma);
  });
  if (!lista.length) {
    monitor(ctx, X_VISTAS, 34, { cls: 'VISTA ?' }, false, now, true);
  }

  if (!frames.length) bocadillo(ctx, 96, 34, 'EJECUTA PARA ENCENDER', P.white);
}

/* ---------- El panel HMI del tanque ---------- */

/* Botonera del operador: BOMBEAR (B), VACIAR (V) y la lámpara de AUTO */
function botonera(ctx, orden, activo, now) {
  const x = X_CONTROL - 18, y = 62;
  ctx.fillStyle = P.ink; ctx.fillRect(x, y, 36, 22);
  ctx.fillStyle = '#4c5378'; ctx.fillRect(x + 1, y + 1, 34, 20);
  ctx.fillStyle = '#5f6890'; ctx.fillRect(x + 1, y + 1, 34, 2);
  const pulsado = activo && !orden.auto ? orden.txt.toUpperCase() : '';
  [['B', 'BOMBEAR', '#4ade80'], ['V', 'VACIAR', '#ffcc33']].forEach(([letra, nombre, color], k) => {
    const bx = x + 4 + k * 15, hundido = pulsado === nombre;
    ctx.fillStyle = P.ink; ctx.fillRect(bx, y + 5, 13, 10);
    ctx.fillStyle = hundido ? '#ffffff' : color; ctx.fillRect(bx + 1, y + 6 + (hundido ? 1 : 0), 11, 8 - (hundido ? 1 : 0));
    texto(ctx, letra, bx + 5, y + 8, P.ink);
  });
  // Lámpara de modo automático: encendida mientras manda un controlador sin operador
  const auto = !!orden?.auto;
  ctx.fillStyle = P.ink; ctx.fillRect(x + 4, y + 16, 5, 4);
  ctx.fillStyle = auto ? (activo && Math.floor(now / 150) % 2 ? '#ffffff' : '#7cd4ff') : '#2a3554'; ctx.fillRect(x + 5, y + 17, 3, 2);
  texto(ctx, 'AUTO', x + 11, y + 16, auto ? '#9fe8ff' : '#7a83a8');
}

/* El proceso: un tanque con su nivel, la marca del enclavamiento (70 %), la bomba y el desagüe */
function tanque(ctx, t, { cambio, fallo, fantasma }, now) {
  const x = X_MODELO - 14, y = 42, w = 28, h = 40, nivel = Math.max(0, Math.min(100, t?.nivel ?? 0));
  ctx.globalAlpha = fantasma ? 0.45 : 1;
  // Bomba (izquierda) y desagüe (derecha)
  const bombea = cambio === 'bombear', vacia = cambio === 'vaciar';
  ctx.fillStyle = P.ink; ctx.fillRect(x - 9, y + h - 9, 10, 9);
  ctx.fillStyle = bombea ? '#4ade80' : '#3d6b50'; ctx.fillRect(x - 8, y + h - 8, 8, 7);
  ctx.fillStyle = P.ink; ctx.fillRect(x - 5 + (bombea ? Math.floor(now / 90) % 3 - 1 : 0), y + h - 6, 2, 3);
  ctx.fillStyle = P.ink; ctx.fillRect(x + w - 1, y + h - 5, 8, 5);
  ctx.fillStyle = '#8d93b8'; ctx.fillRect(x + w, y + h - 4, 6, 3);
  if (vacia) { ctx.fillStyle = '#7cd4ff'; ctx.fillRect(x + w + 3, y + h + 1 + Math.floor(now / 90) % 3, 2, 2); }
  // Cuerpo del tanque
  ctx.fillStyle = P.ink; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#1a2233'; ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
  const alto = Math.round(((h - 4) * nivel) / 100);
  ctx.fillStyle = fallo ? '#ff5470' : '#3aa7e0'; ctx.fillRect(x + 2, y + h - 2 - alto, w - 4, alto);
  if (alto > 1) { ctx.fillStyle = fallo ? '#ffc0cb' : '#9fe8ff'; ctx.fillRect(x + 2, y + h - 2 - alto, w - 4, 1 + (bombea ? Math.floor(now / 120) % 2 : 0)); }
  // Marca del enclavamiento: por encima de 70 no se bombea
  const yLim = y + h - 2 - Math.round(((h - 4) * 70) / 100);
  for (let px = x + 2; px < x + w - 2; px += 4) { ctx.fillStyle = '#ff5470'; ctx.fillRect(px, yLim, 2, 1); }
  ctx.fillStyle = '#5f6890'; ctx.fillRect(x + 2, y + 2, 2, h - 4);
  ctx.globalAlpha = 1;
  if (fantasma) return;
  texto(ctx, `${nivel}%`, X_MODELO, y - 8, fallo ? P.red : P.white, { centrar: true, sombra: P.ink });
  if (typeof t.cargas === 'number') texto(ctx, `CARGAS ${t.cargas}`, X_MODELO, PISO + 6, P.white, { centrar: true, sombra: P.ink });
  if (fallo) texto(ctx, '!', x + w + 3, y + 2, P.red, { sombra: P.ink });
}

export function escenaHMI(ctx, { modelo, fr, s, now }) {
  muro(ctx, 30, 'metal');
  suelo(ctx, 'metal', 0, 30, W, 112);
  placa(ctx, 96, 13, 'PANEL HMI', '#9fe8ff');
  monitorPared(ctx, 8, 12, now, '#7cd4ff');
  monitorPared(ctx, 166, 12, now, '#4ade80');
  for (const x of [63, 128]) for (let y = 34; y < 100; y += 6) { ctx.fillStyle = 'rgba(159,232,255,.18)'; ctx.fillRect(x, y, 1, 3); }
  texto(ctx, 'CONTROL', X_CONTROL, 104, '#ffcc33', { centrar: true, sombra: P.ink });
  texto(ctx, 'MODELO', X_MODELO, 104, '#9fe8ff', { centrar: true, sombra: P.ink });
  texto(ctx, 'VISTAS', X_VISTAS + MON_W / 2, 104, P.green, { centrar: true, sombra: P.ink });

  const frames = s.frames || [];
  const i = s.i ?? -1;
  const est = estadoSala(frames, i, modelo, SALA_TANQUE);
  const reciente = (x, n = 1) => x && i - x.k <= n;

  // --- Botonera del operador ---
  botonera(ctx, est.orden, reciente(est.orden), now);
  if (est.orden) bocadillo(ctx, X_CONTROL, 46, corto(est.orden.txt.toUpperCase(), 10), reciente(est.orden) ? P.gold : '#c9cee8');

  // --- Modelo: el tanque ---
  const obj = fr?.objetos?.find(o => o.cls === SALA_TANQUE.modelo);
  const fallo = !!est.lanza && i - est.lanza.k <= 2;
  plataforma(ctx, X_MODELO, PISO + 2, reciente(est.cambio));
  if (fallo) { ctx.fillStyle = `rgba(255,84,112,${Math.floor(now / 120) % 2 ? 0.35 : 0.15})`; ctx.fillRect(X_MODELO - 18, 38, 36, 48); }
  tanque(ctx, obj?.f, { cambio: reciente(est.cambio) ? est.cambio.metodo : null, fallo, fantasma: !obj }, now);
  // Sin vistas, el tanque imprime solo: el texto le sale de adentro
  if (obj && !est.vistas.length && est.print && fr?.tipo === 'print') bocadillo(ctx, X_MODELO, 30, corto(est.print.txt, 16), P.white);

  // --- Cable control → modelo ---
  const ordenViva = reciente(est.orden) || reciente(est.cambio);
  linea(ctx, X_CONTROL + 18, 74, X_MODELO - 23, 74, ordenViva ? P.gold : '#7a83a8', { punteada: !ordenViva });

  // --- Indicadores: los creados en la ejecución o, antes de ejecutar, las clases que existen ---
  const lista = est.vistas.length ? est.vistas : [...est.esVista].slice(0, 3).map(cls => ({ cls }));
  const sinConectar = !est.vistas.length;
  lista.forEach((v, k) => {
    const y = 34 + k * (MON_H + 4);
    const activo = !sinConectar && v.k >= 0 && i - v.k <= 1;
    linea(ctx, X_MODELO + 21, 70, X_VISTAS - 1, y + MON_H / 2, activo ? (v.aviso != null ? P.red : P.green) : '#7a83a8', { punteada: !activo });
    monitor(ctx, X_VISTAS, y, v, activo, now, sinConectar, 'C');
  });
  if (!lista.length) monitor(ctx, X_VISTAS, 34, { cls: 'VISTA ?' }, false, now, true, 'C');

  if (!frames.length) bocadillo(ctx, 96, 34, 'EJECUTA PARA ENCENDER', P.white);
}
