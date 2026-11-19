/* Escenas de MVC.
   - escenaHMI (misión MVC en Java · El panel de control): la pantalla HMI que ve el operador, con botones
     que se pueden pulsar. Solo se ve la vista; el reparto entre clases está en la pestaña UML.
   - escenaMando (misión MVC con Kotlin): tres puestos en fila, CONTROL, MODELO y VISTAS, con cables que
     se encienden cuando la orden llega al modelo y cuando el modelo notifica a cada vista. */
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

/* ---------- El panel HMI del tanque (misión MVC en Java) ----------
   La escena ES la vista: la pantalla que ve el operador. Solo muestra lo que las vistas del estudiante
   recibieron del modelo (si ninguna está suscrita, el panel no tiene datos), y sus botones son de verdad:
   al pulsarlos, PixelStage llama al controlador del programa que se acaba de ejecutar. La arquitectura
   (quién conoce a quién) se ve en la pestaña UML, no aquí. */

/* Botones del panel en coordenadas del lienzo. `metodo` es lo que se llama en el controlador del estudiante. */
export const BOTONES_HMI = [
  { id: 'BOMBEAR', x: 6, y: 90, w: 42, h: 16, metodo: 'pulsar', arg: 'BOMBEAR', color: '#4ade80' },
  { id: 'VACIAR', x: 52, y: 90, w: 42, h: 16, metodo: 'pulsar', arg: 'VACIAR', color: '#ffcc33' },
  { id: 'PURGAR', x: 98, y: 90, w: 42, h: 16, metodo: 'pulsar', arg: 'PURGAR', color: '#b9a4e8' },
  { id: 'AUTO', x: 144, y: 90, w: 42, h: 16, metodo: 'ciclos', arg: 1, color: '#7cd4ff' },
];

/* Lo que el panel sabe en el cuadro i: qué mostró cada vista, el último dato recibido, el aviso vigente y el último botón */
function estadoPanel(frames, i, modelo) {
  const esVista = clasesVista(modelo);
  const vistas = [], porId = new Map();
  let dato = null, aviso = null, boton = null, hablando = null, lanza = null;
  for (let k = 0; k <= Math.min(i, frames.length - 1); k++) {
    const f = frames[k];
    if (f.tipo === 'crear') {
      if (esVista.has(f.cls) && vistas.length < 3) { const v = { id: f.quien, cls: f.cls, k: -1, texto: null }; vistas.push(v); porId.set(f.quien, v); }
      continue;
    }
    if (f.tipo === 'lanza') { lanza = { k, msg: f.msg }; continue; }
    // Lo que se imprime justo después de mostrar(...) o aviso(...) es lo que esa vista dibuja en el panel
    if (f.tipo === 'print') {
      const txt = f.cap.replace(/^System\.out\.println → /, '');
      if (hablando?.aviso) aviso = { k, txt };
      else if (hablando) hablando.v.texto = txt;
      continue;
    }
    if (f.tipo !== 'llamada') continue;
    const cls = f.objetos?.find(o => o.id === f.quien)?.cls || '';
    const args = (/\((.*)\)$/.exec(f.cap)?.[1] || '').split(', ');
    const v = porId.get(f.quien);
    if (v && f.metodo === 'mostrar') {
      Object.assign(v, { k, texto: null, valor: +args[1], cuenta: +args[2] });
      dato = { k, etiqueta: sinComillas(args[0]), nivel: +args[1], cargas: +args[2] };
      aviso = null; hablando = { v };
    } else if (v && f.metodo === 'aviso') {
      v.k = k; aviso = { k, txt: 'Aviso: ' + sinComillas(args.join(', ')) }; hablando = { v, aviso: true };
    } else {
      hablando = null;
      if (/^Controlador/.test(cls) || SALA_TANQUE.ordenes.includes(f.metodo)) boton = { k, auto: f.metodo !== SALA_TANQUE.textual, id: f.metodo === SALA_TANQUE.textual ? sinComillas(args[0]).toUpperCase() : 'AUTO' };
    }
  }
  return { vistas, dato, aviso, boton, lanza, esVista };
}

/* Sinóptico: el tanque con el nivel que llegó a las vistas y la marca del enclavamiento (70 %) */
function sinoptico(ctx, dato, activo, now) {
  const X = 4, Y = 16, WD = 58, HT = 70;
  ctx.fillStyle = P.ink; ctx.fillRect(X, Y, WD, HT);
  ctx.fillStyle = '#101a2c'; ctx.fillRect(X + 1, Y + 1, WD - 2, HT - 2);
  texto(ctx, dato ? corto(dato.etiqueta, 8) : 'TANQUE', X + 4, Y + 3, '#9fe8ff');
  const x = X + 6, y = Y + 12, w = 24, h = 52, nivel = dato ? Math.max(0, Math.min(100, dato.nivel)) : 0;
  ctx.fillStyle = activo ? '#ffffff' : '#8d93b8'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#0a1120'; ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
  const alto = Math.round(((h - 4) * nivel) / 100);
  ctx.fillStyle = nivel > 70 ? '#ffb347' : '#3aa7e0'; ctx.fillRect(x + 2, y + h - 2 - alto, w - 4, alto);
  if (alto > 1) { ctx.fillStyle = '#cfefff'; ctx.fillRect(x + 2, y + h - 2 - alto, w - 4, 1 + (activo ? Math.floor(now / 120) % 2 : 0)); }
  const yLim = y + h - 2 - Math.round(((h - 4) * 70) / 100);
  for (let px = x + 2; px < x + w - 2; px += 4) { ctx.fillStyle = '#ff5470'; ctx.fillRect(px, yLim, 2, 1); }
  texto(ctx, '70', x + w + 3, yLim - 2, '#ff8fa3');
  if (!dato) { texto(ctx, 'SIN', x + w + 3, y + 22, '#5d7a6a'); texto(ctx, 'DATO', x + w + 3, y + 30, '#5d7a6a'); return; }
  texto(ctx, `${dato.nivel}%`, x + w + 3, y + 22, P.white);
  texto(ctx, 'CARGA', x + w + 3, y + 34, '#7a83a8');
  texto(ctx, String(dato.cargas), x + w + 3, y + 42, P.gold);
}

/* Un indicador del panel por cada vista: su nombre y lo que imprimió (los # se dibujan como bloques de una barra) */
function indicador(ctx, x, y, w, v, activo, apagado) {
  ctx.globalAlpha = apagado ? 0.45 : 1;
  ctx.fillStyle = activo ? '#ffffff' : P.ink; ctx.fillRect(x, y, w, 16);
  ctx.fillStyle = '#0e1a12'; ctx.fillRect(x + 1, y + 1, w - 2, 14);
  ctx.fillStyle = '#1d3a2a'; ctx.fillRect(x + 1, y + 1, w - 2, 6);
  texto(ctx, corto(etiquetaVista(v.cls).toUpperCase(), 14), x + 3, y + 2, '#9fe8ff');
  const max = Math.floor((w - 6) / 4);
  if (apagado) texto(ctx, 'SIN CONECTAR', x + 3, y + 9, '#5d7a6a');
  else if (v.texto == null) texto(ctx, v.k < 0 ? '...' : '(NO IMPRIME)', x + 3, y + 9, '#5d7a6a');
  else {
    const m = /^(.*?)(#+)\s*$/.exec(v.texto);
    if (m) {
      const pre = corto(m[1].toUpperCase(), 8);
      texto(ctx, pre, x + 3, y + 9, P.white);
      const bx = x + 3 + pre.length * 4 + 1;
      for (let k = 0; k < Math.min(m[2].length, Math.floor((x + w - 3 - bx) / 6)); k++) { ctx.fillStyle = k >= 7 ? '#ffb347' : P.green; ctx.fillRect(bx + k * 6, y + 9, 5, 5); }
    } else texto(ctx, corto(v.texto.toUpperCase(), max), x + 3, y + 9, P.white);
  }
  ctx.globalAlpha = 1;
}

function botonHMI(ctx, b, { activo, hundido }) {
  ctx.fillStyle = P.ink; ctx.fillRect(b.x, b.y, b.w, b.h);
  const dy = hundido ? 2 : 0;
  if (!hundido) { ctx.fillStyle = activo ? '#2a3554' : '#1b2238'; ctx.fillRect(b.x + 1, b.y + b.h - 4, b.w - 2, 3); }
  ctx.fillStyle = hundido ? '#ffffff' : activo ? b.color : '#3a4160'; ctx.fillRect(b.x + 1, b.y + 1 + dy, b.w - 2, b.h - 5);
  if (activo && !hundido) { ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(b.x + 1, b.y + 1, b.w - 2, 1); }
  texto(ctx, b.id, b.x + b.w / 2, b.y + 4 + dy, activo || hundido ? P.ink : '#7a83a8', { centrar: true });
}

/* `acciones` dice qué métodos tiene el controlador vivo ({ pulsar, ciclos }); `s.pulso` es el último botón tocado con el ratón */
export function escenaHMI(ctx, { modelo, s, now, acciones = {} }) {
  ctx.fillStyle = '#0b0f1c'; ctx.fillRect(0, 0, W, 112);
  ctx.fillStyle = '#1c2540'; ctx.fillRect(0, 0, W, 13);
  ctx.fillStyle = '#2f3b63'; ctx.fillRect(0, 12, W, 1);
  const frames = s.frames || [];
  const i = s.i ?? -1;
  const est = estadoPanel(frames, i, modelo);
  const reciente = (x, n = 1) => !!x && i - x.k <= n;
  const fin = frames.length > 0 && i >= frames.length - 1 && s.p >= 1;

  // Barra de título: nombre del panel y modo de mando
  texto(ctx, 'PANEL HMI', 5, 4, '#9fe8ff');
  const auto = !!est.boton?.auto;
  ctx.fillStyle = auto ? '#7cd4ff' : frames.length ? P.green : '#3a4160'; ctx.fillRect(W - 49, 4, 5, 5);
  texto(ctx, !frames.length ? 'APAGADO' : auto ? 'AUTO' : 'MANUAL', W - 41, 4, frames.length ? P.white : '#7a83a8');

  sinoptico(ctx, est.dato, reciente(est.dato), now);

  // Indicadores: las vistas creadas en la ejecución o, antes de ejecutar, las clases de vista que existen
  const lista = est.vistas.length ? est.vistas : [...est.esVista].slice(0, 3).map(cls => ({ cls, k: -1 }));
  const apagado = !est.vistas.length;
  lista.forEach((v, k) => indicador(ctx, 66, 16 + k * 18, 122, v, !apagado && v.k >= 0 && i - v.k <= 1, apagado));
  if (!lista.length) indicador(ctx, 66, 16, 122, { cls: 'Vista?' }, false, true);

  // Franja de avisos
  const error = s.errorVivo, alarma = error ? { txt: error } : est.aviso;
  const parpadea = alarma && (error || reciente(est.aviso, 3)) && Math.floor(now / 200) % 2;
  ctx.fillStyle = P.ink; ctx.fillRect(66, 72, 122, 14);
  ctx.fillStyle = alarma ? (parpadea ? '#b0203a' : '#6e1627') : '#0e1a12'; ctx.fillRect(67, 73, 120, 12);
  if (alarma) {
    // Señal de aviso y el mensaje, sin el prefijo «Aviso:» que ya da la franja
    ctx.fillStyle = '#ffd9df'; ctx.fillRect(70, 76, 1, 4); ctx.fillRect(70, 81, 1, 1);
    texto(ctx, corto(alarma.txt.replace(/^Aviso:\s*/i, '').toUpperCase(), 28), 74, 77, '#ffd9df');
  }
  else if (!frames.length) texto(ctx, 'EJECUTA PARA ENCENDER', 70, 77, '#7a83a8');
  else if (fin && (acciones.pulsar || acciones.ciclos)) texto(ctx, 'EN VIVO: PULSA UN BOTON', 70, 77, Math.floor(now / 500) % 2 ? P.green : '#3d6b50');
  else texto(ctx, 'SIN AVISOS', 70, 77, '#3d6b50');

  // Botones: se hunden cuando los pulsa el programa (Main) o el ratón
  for (const b of BOTONES_HMI) {
    const porCodigo = reciente(est.boton) && est.boton.id === b.id;
    const porRaton = s.pulso?.id === b.id && now - s.pulso.t < 220;
    botonHMI(ctx, b, { activo: !!acciones[b.metodo], hundido: porCodigo || porRaton });
  }
}
