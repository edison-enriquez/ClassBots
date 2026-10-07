/* Programación en pareja (profesor ↔ estudiante) sobre el aula en vivo.
   - Documento compartido con Yjs (un Y.Text por archivo) y cursores con awareness.
   - Cifrado de punta a punta: cada sesión acuerda una llave AES-GCM con ECDH efímero; el servidor solo
     reenvía bytes cifrados. La invitación va firmada con la llave de firma de la clase, así el
     estudiante sabe que viene de su profesor (y no del servidor ni de otro estudiante).
   - Solo empieza si el estudiante acepta, y cualquiera de los dos la puede terminar. */
import * as Y from 'yjs';
import { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate, removeAwarenessStates } from 'y-protocols/awareness';
import { b64u, deB64u, firmarTexto, verificarTexto } from '../metricas/cifrado.js';

const ECDH = { name: 'ECDH', namedCurve: 'P-256' };
const sutil = () => globalThis.crypto.subtle;
export const textoInvitacion = (claseId, alumno, sesion, pub) => `classbots-pareja|${claseId}|${alumno}|${sesion}|${pub.x}.${pub.y}`;
export const COLORES = { profe: '#ffcc33', estudiante: '#7cd4ff' };

export async function parEfimero() {
  const p = await sutil().generateKey(ECDH, true, ['deriveBits']);
  const j = await sutil().exportKey('jwk', p.publicKey);
  return { priv: p.privateKey, pub: { x: j.x, y: j.y } };
}
export async function llaveSesion(priv, pub, sesion) {
  const otra = await sutil().importKey('jwk', { kty: 'EC', crv: 'P-256', x: pub.x, y: pub.y, ext: true }, ECDH, false, []);
  const bits = await sutil().deriveBits({ name: 'ECDH', public: otra }, priv, 256);
  const hk = await sutil().importKey('raw', bits, 'HKDF', false, ['deriveKey']);
  return sutil().deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: new TextEncoder().encode(sesion), info: new TextEncoder().encode('classbots-pareja') }, hk, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function cifrar(k, u8) {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  return { iv: b64u(iv), d: b64u(new Uint8Array(await sutil().encrypt({ name: 'AES-GCM', iv }, k, u8))) };
}
const descifrar = async (k, x) => new Uint8Array(await sutil().decrypt({ name: 'AES-GCM', iv: deB64u(x.iv) }, k, deB64u(x.d)));

/* Invitación del profesor: llave efímera firmada con la llave de la clase */
export async function crearInvitacion(clase, priv, alumno) {
  const sesion = b64u(globalThis.crypto.getRandomValues(new Uint8Array(9)));
  const par = await parEfimero();
  const firma = await firmarTexto(priv, textoInvitacion(clase.id, alumno, sesion, par.pub));
  return { par, mensaje: { tipo: 'invita', s: sesion, pub: par.pub, firma } };
}
export const invitacionValida = (clase, alumno, d) =>
  !!(d && typeof d.s === 'string' && d.pub?.x && d.pub?.y && typeof d.firma === 'string') && verificarTexto(clase, textoInvitacion(clase.id, alumno, d.s, d.pub), d.firma);

/* Canal cifrado que mantiene sincronizados un Y.Doc y su awareness con el otro lado.
   enviar(d) manda un objeto por el aula; recibir(d) procesa lo que llega del otro lado. */
export function crearCanal({ llave, sesion, enviar, doc = new Y.Doc(), usuario }) {
  const awareness = new Awareness(doc);
  awareness.setLocalStateField('user', usuario);
  let cola = [], t = null, cerrado = false;
  const vaciar = async () => {
    t = null;
    if (!cola.length || cerrado) return;
    const u = cola.length === 1 ? cola[0] : Y.mergeUpdates(cola);
    cola = [];
    enviar({ tipo: 'y', s: sesion, ...(await cifrar(llave, u)) });
  };
  const alActualizar = (u, origen) => {
    if (origen === 'remoto' || cerrado) return;
    cola.push(u);
    if (!t) t = setTimeout(vaciar, 120);
  };
  doc.on('update', alActualizar);
  let tAw = null;
  const alAwareness = ({ added, updated, removed }, origen) => {
    if (origen === 'remoto' || cerrado) return;
    const ids = [...added, ...updated, ...removed];
    clearTimeout(tAw);
    tAw = setTimeout(async () => { if (!cerrado) enviar({ tipo: 'aw', s: sesion, ...(await cifrar(llave, encodeAwarenessUpdate(awareness, ids))) }); }, 80);
  };
  awareness.on('update', alAwareness);
  return {
    doc, awareness, sesion,
    /* Estado completo: al empezar y al reconectar */
    async enviarTodo() {
      if (cerrado) return;
      enviar({ tipo: 'y', s: sesion, ...(await cifrar(llave, Y.encodeStateAsUpdate(doc))) });
      enviar({ tipo: 'aw', s: sesion, ...(await cifrar(llave, encodeAwarenessUpdate(awareness, [doc.clientID]))) });
    },
    async recibir(d) {
      if (cerrado || d.s !== sesion) return;
      try {
        const u = await descifrar(llave, d);
        if (d.tipo === 'y') Y.applyUpdate(doc, u, 'remoto');
        if (d.tipo === 'aw') applyAwarenessUpdate(awareness, u, 'remoto');
      } catch { /* mensaje dañado o de otra sesión */ }
    },
    cerrar() {
      if (cerrado) return;
      cerrado = true; clearTimeout(t); clearTimeout(tAw);
      doc.off('update', alActualizar); awareness.off('update', alAwareness);
      removeAwarenessStates(awareness, [doc.clientID], 'local');
      awareness.destroy();
    },
  };
}

/* Documento inicial del estudiante: un Y.Text por archivo con su código actual */
export function docDesdeArchivos(files) {
  const doc = new Y.Doc();
  doc.transact(() => { for (const [f, txt] of Object.entries(files)) doc.getText(f).insert(0, txt || ''); });
  return doc;
}
export const archivosDeDoc = (doc, nombres) => Object.fromEntries(nombres.map(f => [f, doc.getText(f).toString()]));
/* Reemplaza el contenido de los archivos (Reiniciar, Mostrar la respuesta) dentro de la sesión */
export function reemplazarEnDoc(doc, files) {
  doc.transact(() => {
    for (const [f, txt] of Object.entries(files)) {
      const y = doc.getText(f);
      if (y.toString() === txt) continue;
      y.delete(0, y.length); y.insert(0, txt || '');
    }
  });
}
