/* Conexión al servidor del aula en vivo: reconecta sola y reenvía lo pendiente hasta que el
   servidor confirma (cada «clave» guarda solo su último sobre, así que reenviar es inofensivo). */
import { deflate, inflate } from 'pako';

/* Acepta «api.ejemplo.com», «https://api.ejemplo.com» o «wss://api.ejemplo.com/aula» */
export function urlAula(u) {
  let s = String(u || '').trim().replace(/\/+$/, '');
  if (!s) return '';
  s = s.replace(/^http(s?):\/\//, 'ws$1://');
  if (!/^wss?:\/\//.test(s)) s = 'wss://' + s;
  if (!/\/aula$/.test(s)) s += '/aula';
  return s;
}

const aB64 = b => { let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(s); };
export const comprimir = obj => ({ z: aB64(deflate(JSON.stringify(obj))) });
export const descomprimir = x => (x && typeof x.z === 'string' ? JSON.parse(inflate(Uint8Array.from(atob(x.z), c => c.charCodeAt(0)), { to: 'string' })) : x);

/* Cierres definitivos: no tiene sentido reintentar */
const DEFINITIVOS = { 4002: 'clase inválida', 4003: 'contraseña no válida para esta clase', 4004: 'la clase está llena' };

export function conectarAula({ url, saludo, alMensaje, alEstado }) {
  let ws = null, cerrado = false, intento = 0, t = null, listo = false, n = 0;
  const pendientes = new Map();
  const estado = (e, x) => alEstado?.(e, x);
  const mandar = m => { if (listo && ws?.readyState === 1) { ws.send(JSON.stringify(m)); return true; } return false; };
  const programar = () => {
    clearTimeout(t);
    const ms = Math.min(30000, 1000 * 2 ** intento++) * (0.7 + Math.random() * 0.6);
    t = setTimeout(abrir, ms);
  };
  function abrir() {
    if (cerrado) return;
    estado('conectando');
    try { ws = new WebSocket(url); } catch { estado('desconectado'); programar(); return; }
    ws.onmessage = async ev => {
      let m; try { m = JSON.parse(ev.data); } catch { return; }
      if (m.t === 'reto') {
        try { ws.send(JSON.stringify(await saludo(m.reto))); } catch (e) { cerrado = true; estado('rechazado', e.message); ws.close(); }
        return;
      }
      if (m.t === 'listo') { listo = true; intento = 0; estado('conectado', m); for (const x of pendientes.values()) mandar(x); }
      if (m.t === 'ack') { const p = pendientes.get(m.clave); if (p && p.n === m.n) pendientes.delete(m.clave); }
      alMensaje?.(m);
    };
    ws.onclose = ev => {
      listo = false;
      if (cerrado) return;
      if (DEFINITIVOS[ev.code]) { cerrado = true; estado('rechazado', DEFINITIVOS[ev.code]); return; }
      estado('desconectado'); programar();
    };
    ws.onerror = () => { /* onclose se encarga */ };
  }
  // Al volver la red, reintentar enseguida
  const enLinea = () => { if (!listo && !cerrado) { intento = 0; clearTimeout(t); if (ws?.readyState !== 0) abrir(); } };
  window.addEventListener('online', enLinea);
  abrir();
  return {
    enviarSobre(clave, sobre) { const m = { t: 'sobre', clave, sobre, n: ++n }; pendientes.set(clave, m); mandar(m); },
    enviar: mandar,
    cerrar() { cerrado = true; clearTimeout(t); window.removeEventListener('online', enLinea); ws?.close(); },
  };
}
