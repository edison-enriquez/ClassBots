/* Escena de la misión MVC · La sala de mando.
   Tres puestos en fila: el CONTROL (pupitre con la última orden), el MODELO (el robot sobre su
   plataforma, con energía y posición) y las VISTAS (un monitor por cada vista creada).
   Los cables se encienden cuando la orden llega al modelo y cuando el modelo notifica a cada vista. */
import { W, P, texto } from './sprites.js';
import { dibujarRobot, barra, linea } from './dibujo.js';
import { suelo, muro, placa, bocadillo, plataforma, monitorPared } from './rpg.js';

const X_CONTROL = 30, X_MODELO = 96, X_VISTAS = 141, PISO = 84;
const MON_W = 48, MON_H = 19;
const corto = (s, n) => String(s).slice(0, n);
const sinComillas = s => String(s ?? '').trim().replace(/^"(.*)"$/, '$1');
const etiquetaVista = cls => String(cls).replace(/^Vista/, '') || cls;

/* Clases que cumplen el contrato de vista (implementan VistaRobot o una interfaz que se llame Vista…) */
function clasesVista(modelo) {
  return new Set(Object.values(modelo?.clases || {})
    .filter(c => c.tipo !== 'interface' && (c.implementa || []).some(i => /^Vista/.test(i.replace(/<.*>/, ''))))
    .map(c => c.nombre));
}

/* Estado de la sala en el cuadro i: vistas creadas y lo último que mostró cada una, última orden y último cambio del modelo */
function estadoSala(frames, i, modelo) {
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
    if (v && f.metodo === 'mostrar') Object.assign(v, { k, aviso: null, nombre: sinComillas(args[0]), energia: +args[1], posicion: +args[2] });
    else if (v && f.metodo === 'aviso') Object.assign(v, { k, aviso: sinComillas(args.join(', ')) });
    else if (/^Controlador/.test(cls) || ['orden', 'piloto'].includes(f.metodo)) orden = { k, txt: f.metodo === 'orden' ? sinComillas(args[0]) : `${f.metodo}(${args.join(', ')})` };
    else if (cls === 'Robot' && f.metodo !== 'suscribir' && !/^get/.test(f.metodo)) cambio = { k, metodo: f.metodo };
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
function monitor(ctx, x, y, v, activo, now, fantasma = false) {
  ctx.globalAlpha = fantasma ? 0.45 : 1;
  ctx.fillStyle = activo ? '#ffffff' : P.ink; ctx.fillRect(x, y, MON_W, MON_H);
  ctx.fillStyle = '#0e1a12'; ctx.fillRect(x + 1, y + 1, MON_W - 2, MON_H - 2);
  ctx.fillStyle = '#1d3a2a'; ctx.fillRect(x + 1, y + 1, MON_W - 2, 7);
  texto(ctx, corto(etiquetaVista(v.cls), 11), x + 3, y + 2, '#9fe8ff');
  if (v.aviso != null) {
    texto(ctx, corto('! ' + v.aviso, 11), x + 3, y + 10, P.red);
  } else if (typeof v.energia === 'number' && !Number.isNaN(v.energia)) {
    texto(ctx, `P${v.posicion}`, x + 3, y + 10, P.white);
    barra(ctx, x + 13, y + 11, 17, v.energia);
    texto(ctx, String(v.energia), x + MON_W - 3 - String(v.energia).length * 4 + 1, y + 10, P.green);
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
