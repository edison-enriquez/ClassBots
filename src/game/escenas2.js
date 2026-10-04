/* Escenas de los mundos 2 a 4: la bóveda, las conexiones entre objetos y la estación universal */
import { W, H, P, sprite, texto, mezclar, colorDe, CANDADO, CANDADO_ABIERTO, BANDERA, EDIFICIO, LLAVE, LINTERNA, DRON, CAJA, ENCHUFE, BATERIA } from './sprites.js';
import { dibujarRobot, barra, linea, rombo, punta, rayo, cartel } from './dibujo.js';
import { suelo, muro, antorcha, operaria, cristal, monitorPared, maceta, sombra, PALETA_OXIDO, bocadillo } from './rpg.js';
import { relaciones } from '../engine/motor.js';

const PISO = 88;
const nombreDe = o => (o?.f?.nombre != null ? String(o.f.nombre) : null);
const numerico = (o, claves) => { for (const k of claves) if (typeof o?.f?.[k] === 'number') return o.f[k]; return null; };
const refsDe = v => (v?.ref ? [v.ref] : v?.lista ? v.lista.filter(x => x?.ref).map(x => x.ref) : []);

/* Efectos que se disparan al entrar a un cuadro de la reproducción */
export function alEntrarEscena(escena, frames, i, s, now, modelo) {
  const fr = frames[i];
  if (!fr) return;
  if (escena === 'boveda') {
    if (fr.tipo === 'llamada' && /^(set|consumir)/.test(fr.metodo || '')) {
      let aceptada = false;
      for (let j = i + 1; j < frames.length; j++) {
        const g = frames[j];
        if (['set', 'energia', 'x'].includes(g.tipo) && g.quien === fr.quien) { aceptada = true; break; }
        if (['llamada', 'print', 'crear', 'add'].includes(g.tipo)) break;
      }
      s.fx = { tipo: aceptada ? 'ok' : 'bloqueo', id: fr.quien, t0: now, txt: fr.cap.split('.').slice(1).join('.') };
    }
    if ((fr.tipo === 'energia' || fr.tipo === 'set') && fr.campo === 'energia' && typeof fr.valor === 'number' && (fr.valor > 100 || fr.valor < 0)) s.fx = { tipo: 'sobrecarga', id: fr.quien, t0: now };
  }
  if (escena === 'conexiones' && fr.tipo === 'llamada' && fr.argIds?.some(Boolean)) {
    const cls = id => fr.objetos?.find(o => o.id === id)?.cls;
    const deps = new Set(relaciones(modelo || { clases: {} }).filter(r => r.tipo === 'dependencia').map(r => r.de + '>' + r.a));
    const objs = fr.argIds.filter(id => id && deps.has(cls(fr.quien) + '>' + cls(id)));
    if (objs.length) s.fx = { tipo: 'usa', de: fr.quien, objs, t0: now };
  }
  if (escena === 'estacion' && fr.tipo === 'llamada') {
    if (fr.metodo === 'recargar') s.fx = { tipo: 'carga', id: fr.quien, t0: now };
    if (fr.metodo === 'cargarTodo') s.flash = now;
  }
}

/* ---------- Bóveda ---------- */
export function escenaBoveda(ctx, { modelo, fr, s, now }) {
  // Sala de piedra en vista cenital: muro al fondo, alfombra hacia la bóveda
  muro(ctx, 34, 'piedra');
  suelo(ctx, 'piedra', 0, 34, W, H);
  suelo(ctx, 'alfombra', 48, 64, 160, 96);
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(0, 34, W, 3);
  antorcha(ctx, 6, 10, now); antorcha(ctx, 140, 10, now);
  // Puerta de la bóveda empotrada en el muro
  const cx = 170, cy = 19, R = 15;
  ctx.fillStyle = P.ink; ctx.fillRect(cx - R - 3, cy - R - 3, 2 * R + 6, 2 * R + 6);
  ctx.fillStyle = '#2c3048'; ctx.fillRect(cx - R - 2, cy - R - 2, 2 * R + 4, 2 * R + 4);
  for (let yy = -R; yy <= R; yy++) for (let xx = -R; xx <= R; xx++) {
    const d = Math.hypot(xx, yy);
    if (d > R) continue;
    ctx.fillStyle = d > R - 1.5 ? P.ink : d > R - 4 ? '#8b93b8' : d > R - 5 ? '#3d4466' : '#6d7499';
    ctx.fillRect(cx + xx, cy + yy, 1, 1);
  }
  const giro = now / 3000;
  for (let k = 0; k < 6; k++) { const a = giro + k * Math.PI / 3; linea(ctx, cx, cy, cx + Math.cos(a) * 8, cy + Math.sin(a) * 8, '#d6dbf0'); }
  ctx.fillStyle = P.gold; ctx.fillRect(cx - 2, cy - 2, 5, 5);
  // Cofres junto a la bóveda
  for (const x of [168, 182]) { ctx.fillStyle = P.ink; ctx.fillRect(x - 5, 76, 11, 9); ctx.fillStyle = '#9a5a26'; ctx.fillRect(x - 4, 77, 9, 7); ctx.fillStyle = P.gold; ctx.fillRect(x - 4, 79, 9, 1); ctx.fillRect(x, 80, 1, 2); }
  // Panel de atributos: candados según la visibilidad declarada
  const c = modelo?.clases?.Robot;
  const campos = c ? c.campos.filter(f => !f.estatico) : [];
  if (campos.length) {
    const ancho = campos.reduce((sum, f) => sum + Math.max(9, Math.min(f.nombre.length, 8) * 4 + 1) + 4, 0) + 4;
    let x = Math.round((150 - ancho) / 2) + 2;
    ctx.fillStyle = P.ink; ctx.fillRect(x - 3, 3, ancho, 22); ctx.fillStyle = '#6b4423'; ctx.fillRect(x - 2, 4, ancho - 2, 20);
    for (const f of campos) {
      const priv = f.vis === 'private', w = Math.max(9, Math.min(f.nombre.length, 8) * 4 + 1);
      sprite(ctx, priv ? CANDADO : CANDADO_ABIERTO, x + Math.round((w - 7) / 2), 5, { k: '#c9cee8', Y: P.gold, R: P.red });
      texto(ctx, f.nombre.slice(0, 8), x + w / 2, 15, priv ? P.gold : P.red, { centrar: true });
      x += w + 4;
    }
  } else texto(ctx, 'LA BOVEDA', 74, 14, '#c9cee8', { centrar: true, sombra: P.ink });
  // Óxido acecha a la izquierda
  const fx = s.fx && now - s.fx.t0 < 700 ? s.fx : null;
  const ataca = fx && (fx.tipo === 'bloqueo' || fx.tipo === 'sobrecarga');
  const ox = 22 + (ataca ? 6 : 0) + (Math.floor(now / 400) % 2);
  dibujarRobot(ctx, ox, PISO, { nombre: 'OXIDO', id: 99 }, now, { paleta: PALETA_OXIDO(now), sinBarra: true, dir: 'der', caminando: !!ataca });
  // Robots de la ejecución (o una vista previa antes de ejecutar)
  const robots = (fr?.robots || []).slice(0, 3);
  const lista = robots.length ? robots : c ? [{ id: 1, nombre: 'Tornillo', color: 'azul', energia: 100 }] : [];
  lista.forEach((r, k) => {
    const x = Math.round(70 + (k + 0.5) * (70 / lista.length));
    const mio = fx && fx.id === r.id;
    if (mio && fx.tipo === 'bloqueo') {
      rayo(ctx, ox + 6, PISO - 8, x - 8, PISO - 8, P.red, Math.floor(now / 60));
      ctx.fillStyle = 'rgba(74,222,128,.35)'; ctx.fillRect(x - 11, PISO - 20, 22, 22);
      ctx.fillStyle = P.green; ctx.fillRect(x - 11, PISO - 20, 22, 1); ctx.fillRect(x - 11, PISO + 1, 22, 1);
      bocadillo(ctx, x, PISO - 40, 'BLOQUEADO', P.green);
    }
    if (mio && fx.tipo === 'ok') bocadillo(ctx, x, PISO - 40, 'ACEPTADO', P.gold);
    if (mio && fx.tipo === 'sobrecarga') {
      rayo(ctx, ox + 6, PISO - 8, x - 8, PISO - 8, P.red, Math.floor(now / 60));
      ctx.fillStyle = 'rgba(255,84,112,.4)'; ctx.fillRect(x - 11, PISO - 20, 22, 22);
      bocadillo(ctx, x, PISO - 40, 'SOBRECARGA', P.red);
    }
    const serie = typeof r.serie === 'number' ? `#${r.serie}` : null;
    dibujarRobot(ctx, x, PISO, r, now, { sub: serie, dir: 'izq', salto: mio && fx.tipo === 'ok' ? 2 : 0 });
  });
  if (!c) bocadillo(ctx, 96, 46, 'DECLARA LA CLASE ROBOT', '#c9cee8');
}

/* ---------- Conexiones: un diagrama de objetos en pixel art ---------- */
export function escenaConexiones(ctx, { modelo, fr, s, now }) {
  // Plaza del pueblo: pasto con un camino de adoquines donde trabajan los robots
  suelo(ctx, 'pasto', 0, 0, W, H);
  suelo(ctx, 'adoquin', 0, 64, W, H);
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(0, 64, W, 1);
  maceta(ctx, 46, 56); maceta(ctx, 150, 56);
  const objs = fr?.objetos || [];
  const tipos = {};
  for (const r of relaciones(modelo || { clases: {} })) tipos[r.de + '>' + r.a] = r.tipo;
  const relDe = (a, b) => tipos[a + '>' + b];
  leyenda(ctx);
  if (!objs.length) {
    dibujarRobot(ctx, W / 2, PISO, {}, now, { fantasma: true });
    bocadillo(ctx, W / 2, 24, 'EJECUTA PARA VER TUS OBJETOS', P.white);
    bocadillo(ctx, W / 2, 38, 'Y COMO SE CONECTAN', P.white);
    return;
  }
  const porId = Object.fromEntries(objs.map(o => [o.id, o]));
  const pos = {};
  // Robots en el piso
  const robots = objs.filter(o => o.cls === 'Robot').slice(0, 5);
  robots.forEach((r, k) => { pos[r.id] = { x: Math.round(64 + (k + 0.5) * (116 / robots.length)), y: PISO, tipo: 'robot' }; });
  // Personas a la izquierda
  objs.filter(o => o.cls === 'Operario').slice(0, 2).forEach((o, k) => { pos[o.id] = { x: 12 + k * 18, y: PISO, tipo: 'persona' }; });
  // Planta arriba a la izquierda
  objs.filter(o => o.cls === 'Planta').slice(0, 1).forEach(o => { pos[o.id] = { x: 18, y: 24, tipo: 'planta' }; });
  // Cuadrillas como banderas sobre sus miembros
  const cuadrillas = objs.filter(o => objs.length && o.cls === 'Cuadrilla').slice(0, 4);
  const usadas = [];
  cuadrillas.forEach((c, k) => {
    const miembros = Object.values(c.f).flatMap(refsDe).filter(id => pos[id]);
    let x = miembros.length ? miembros.reduce((sum, id) => sum + pos[id].x, 0) / miembros.length : 70 + k * 30;
    x = Math.max(56, Math.min(W - 20, x));
    while (usadas.some(u => Math.abs(u - x) < 26)) x += 26;
    usadas.push(x);
    pos[c.id] = { x: Math.round(x), y: 20, tipo: 'bandera' };
  });
  // Herramientas en el tablero de la derecha
  const tools = objs.filter(o => o.cls === 'Herramienta').slice(0, 3);
  tools.forEach((t, k) => { pos[t.id] = { x: W - 12, y: 30 + k * 13, tipo: 'llave' }; });
  if (tools.length) { ctx.fillStyle = P.ink; ctx.fillRect(W - 21, 23, 20, 13 * tools.length + 4); ctx.fillStyle = '#7a4f2a'; ctx.fillRect(W - 20, 24, 18, 13 * tools.length + 2); }
  // Partes que no tienen lugar propio (baterías sueltas, otras clases)
  const sueltos = objs.filter(o => !pos[o.id]);
  // Líneas de relación según los atributos de cada objeto
  const partes = {};
  for (const o of objs) {
    for (const v of Object.values(o.f)) {
      for (const id of refsDe(v)) {
        const t = porId[id];
        if (!t) continue;
        const tipo = relDe(o.cls, t.cls) || 'asociacion';
        if (tipo === 'composicion' && pos[o.id]?.tipo === 'robot') { (partes[o.id] ||= []).push(t); continue; }
        const a = ancla(pos[o.id]), b = ancla(pos[id]);
        if (!a || !b) continue;
        const color = tipo === 'composicion' ? P.gold : tipo === 'agregacion' ? '#9fd8ff' : '#c9cee8';
        linea(ctx, a.x, a.y, b.x, b.y, color);
        if (tipo === 'composicion' || tipo === 'agregacion') rombo(ctx, a.x, a.y, color, tipo === 'composicion');
        else punta(ctx, a.x, a.y, b.x, b.y, color);
      }
    }
  }
  // Dependencia: el objeto usado viaja un momento hacia quien lo usa
  const fx = s.fx && s.fx.tipo === 'usa' && now - s.fx.t0 < 900 ? s.fx : null;
  if (fx && pos[fx.de]) for (const id of fx.objs) {
    const o = porId[id]; if (!o) continue;
    const a = pos[id] ? ancla(pos[id]) : { x: W - 12, y: 30 }, b = ancla(pos[fx.de]);
    linea(ctx, a.x, a.y, b.x, b.y - 4, '#c9cee8', { punteada: true });
    punta(ctx, a.x, a.y, b.x, b.y - 4, '#c9cee8');
    cartel(ctx, (a.x + b.x) / 2, (a.y + b.y) / 2 - 10, 'USA', '#c9cee8');
  }
  // Dibujar objetos
  for (const o of objs) {
    const p = pos[o.id];
    if (!p) continue;
    if (p.tipo === 'robot') {
      const bat = (partes[o.id] || []).find(t => t.cls === 'Bateria');
      const energia = numerico(o, ['energia']) ?? numerico(bat, ['carga']);
      dibujarRobot(ctx, p.x, p.y, { id: o.id, nombre: nombreDe(o), color: o.f.color || 'azul', energia }, now);
      (partes[o.id] || []).forEach((t, k) => {
        const px = p.x + 10, py = p.y - 12 - k * 8;
        if (t.cls === 'Bateria') sprite(ctx, BATERIA, px + 2, py, { k: P.ink, G: P.green });
        else sprite(ctx, CAJA, px + 2, py - 4, { k: P.ink, B: '#8a6a40', H: '#c9a36b', G: P.gold });
        rombo(ctx, px, py + 3, P.gold, true);
      });
    } else if (p.tipo === 'persona') {
      operaria(ctx, p.x, p.y, now);
      if (nombreDe(o)) texto(ctx, nombreDe(o).slice(0, 6), p.x, p.y - 23, P.white, { centrar: true, sombra: P.ink });
    } else if (p.tipo === 'bandera') {
      sombra(ctx, p.x, p.y + 8, 6);
      sprite(ctx, BANDERA, p.x - 2, p.y - 6, { k: P.ink, S: P.steel, F: '#c0392b' });
      if (nombreDe(o)) texto(ctx, nombreDe(o).slice(0, 3), p.x + 8, p.y - 3, P.white, { centrar: true });
    } else if (p.tipo === 'planta') {
      sombra(ctx, p.x, p.y + 2, 26);
      sprite(ctx, EDIFICIO, p.x - 12, p.y - 14, { k: P.ink, S: '#b8a888', W: '#a0402c', Y: P.gold, D: '#5a3a1a' });
    } else if (p.tipo === 'llave') {
      sprite(ctx, LLAVE, p.x - 4, p.y - 4, { k: P.ink, S: '#c9cee8' });
    }
  }
  // Objetos sin lugar fijo: estante inferior derecho
  sueltos.filter(o => !Object.values(partes).flat().includes(o)).slice(0, 4).forEach((o, k) => {
    const x = 150 + k * 10;
    if (o.cls === 'Bateria') sprite(ctx, BATERIA, x, PISO - 8, { k: P.ink, G: P.green });
    else sprite(ctx, CAJA, x, PISO - 11, { k: P.ink, B: '#8a6a40', H: '#c9a36b', G: P.gold });
  });
}
function ancla(p) {
  if (!p) return null;
  if (p.tipo === 'robot') return { x: p.x, y: p.y - 28 };
  if (p.tipo === 'persona') return { x: p.x + 6, y: p.y - 10 };
  if (p.tipo === 'bandera') return { x: p.x - 1, y: p.y + 5 };
  if (p.tipo === 'planta') return { x: p.x + 12, y: p.y - 2 };
  return { x: p.x - 6, y: p.y };
}
function leyenda(ctx) {
  ctx.fillStyle = 'rgba(10,8,20,.85)'; ctx.fillRect(0, H - 9, W, 9);
  const items = [['COMPOS', P.gold, 'lleno'], ['AGREG', '#9fd8ff', 'vacio'], ['ASOC', '#c9cee8', 'flecha'], ['USA', '#c9cee8', 'punto']];
  let x = 6;
  for (const [t, c, m] of items) {
    if (m === 'lleno' || m === 'vacio') rombo(ctx, x + 3, H - 5, c, m === 'lleno');
    else if (m === 'flecha') { linea(ctx, x, H - 5, x + 6, H - 5, c); punta(ctx, x, H - 5, x + 6, H - 5, c); }
    else linea(ctx, x, H - 5, x + 6, H - 5, c, { punteada: true, paso: 2 });
    texto(ctx, t, x + 9, H - 7, c);
    x += 12 + t.length * 4 + 10;
  }
}

/* ---------- Estación universal ---------- */
const SPRITES_MAQ = {
  Linterna: (ctx, x, piso, now, o) => { sprite(ctx, LINTERNA, x - 4, piso - 12, { k: P.ink, L: (numerico(o, ['pila', 'carga', 'nivel']) ?? 0) > 0 ? '#fff3a8' : '#5b5b5b', B: '#3b6fd8', G: P.gold }); return piso - 12; },
  Dron: (ctx, x, piso, now) => { const y = piso - 28 + Math.round(Math.sin(now / 200) * 2); sprite(ctx, DRON, x - 8, y, { k: P.ink, B: '#45d483', e: P.white }); return y; },
};
export function escenaEstacion(ctx, { modelo, fr, s, now }) {
  // Laboratorio: muro con monitores y piso de baldosas claras
  muro(ctx, 30, 'laboratorio');
  suelo(ctx, 'laboratorio', 0, 30, W, H);
  monitorPared(ctx, 38, 9, now); monitorPared(ctx, 150, 9, now, '#7fc8ff'); monitorPared(ctx, 171, 9, now, '#ffcc33');
  const objs = fr?.objetos || [];
  const est = objs.find(o => o.cls === 'EstacionCarga');
  const conectados = est ? Object.values(est.f).flatMap(refsDe) : [];
  const flash = s.flash && now - s.flash < 500;
  // Torre de carga
  sombra(ctx, 17, PISO + 2, 28);
  ctx.fillStyle = P.ink; ctx.fillRect(4, 30, 26, PISO - 28);
  ctx.fillStyle = flash ? '#ffe9a3' : '#3a4266'; ctx.fillRect(6, 32, 22, PISO - 32);
  ctx.fillStyle = flash ? '#fff6c8' : '#4c5378'; ctx.fillRect(6, 32, 22, 1);
  cristal(ctx, 17, 32, now, flash);
  texto(ctx, 'CARGA', 17, PISO - 6, flash ? P.ink : P.gold, { centrar: true });
  const nEnch = Math.max(5, conectados.length);
  for (let k = 0; k < Math.min(nEnch, 6); k++) {
    const y = 36 + k * 7, usado = k < conectados.length;
    ctx.fillStyle = usado ? P.green : '#1b1030'; ctx.fillRect(9, y, 4, 4);
    sprite(ctx, ENCHUFE, 18, y - 1, { k: P.ink, Y: usado ? P.gold : '#5a5a7a' });
  }
  // Interfaces del modelo: las que implementa cada clase (para el cartel sobre cada máquina)
  const impl = c => (modelo?.clases?.[c]?.implementa || []).map(x => x.replace(/<.*>/, ''));
  const maquinas = objs.filter(o => o.cls !== 'EstacionCarga' && o.cls !== 'Main');
  if (!maquinas.length) {
    dibujarRobot(ctx, 110, PISO, {}, now, { fantasma: true });
    bocadillo(ctx, 112, 42, 'EJECUTA PARA CONECTAR TUS MAQUINAS', P.white);
    return;
  }
  const lista = [...maquinas.filter(o => conectados.includes(o.id)), ...maquinas.filter(o => !conectados.includes(o.id))].slice(0, 7);
  const paso = Math.min(24, (W - 52) / lista.length);
  const fx = s.fx && s.fx.tipo === 'carga' && now - s.fx.t0 < 600 ? s.fx : null;
  ctx.fillStyle = P.ink; ctx.fillRect(40, PISO + 1, W - 44, 9); ctx.fillStyle = '#2b3160'; ctx.fillRect(41, PISO + 2, W - 46, 7);
  lista.forEach((o, k) => {
    const x = Math.round(46 + (k + 0.5) * paso), enchufada = conectados.includes(o.id);
    const nivel = numerico(o, ['energia', 'pila', 'bateria', 'carga', 'combustible', 'nivel']);
    const mov = typeof o.f.x === 'number' ? Math.min(o.f.x, 6) * 2 : 0;
    let tope;
    if (o.cls === 'Robot') { dibujarRobot(ctx, x + mov, PISO, { id: o.id, nombre: null, color: o.f.color || 'azul', energia: nivel }, now, { sinBarra: true }); tope = PISO - 16; }
    else if (SPRITES_MAQ[o.cls]) tope = SPRITES_MAQ[o.cls](ctx, x + mov, PISO, now, o);
    else { const c = colorDe(['amarillo', 'morado', 'rosado', 'cian', 'naranja'][o.cls.length % 5]); sprite(ctx, CAJA, x - 7, PISO - 11, { k: P.ink, B: c, H: mezclar(c, 0.35), G: P.white }); tope = PISO - 11; }
    if (typeof nivel === 'number') barra(ctx, x - 6, tope - 6, 12, nivel);
    texto(ctx, o.cls.slice(0, 5), x, PISO + 3, enchufada ? P.white : '#c9cee8', { centrar: true, sombra: P.ink });
    const contratos = impl(o.cls);
    if (contratos.includes('Recargable')) sprite(ctx, ENCHUFE, x - 2, tope - 14, { k: P.ink, Y: P.gold });
    if (enchufada) {
      const sy = 37 + conectados.indexOf(o.id) * 7;
      linea(ctx, 23, sy + 1, x - 4, PISO - 4, fx && fx.id === o.id ? '#ffe9a3' : '#5a6290');
      if (fx && fx.id === o.id) rayo(ctx, 23, sy + 1, x - 4, PISO - 6, P.gold, Math.floor(now / 50));
    }
  });
  if (est) bocadillo(ctx, 98, 10, `CONECTADOS: ${conectados.length}`, P.gold);
}
