/* Cifrado de las métricas con la llave pública del profesor (RSA-OAEP 3072 + AES-GCM 256).
   El juego solo contiene la llave PÚBLICA: puede cifrar, pero no descifrar. Solo quien tenga la
   llave PRIVADA (el profesor, en su panel) puede leer las métricas. */
import { LLAVE_PUBLICA_POR_DEFECTO } from './llaveProfesor.js';

const RSA = { name: 'RSA-OAEP', hash: 'SHA-256' };
const sutil = () => {
  const s = globalThis.crypto?.subtle;
  if (!s) throw new Error('Este navegador no permite cifrar (se necesita https o un navegador actualizado).');
  return s;
};
const aB64 = buf => { let s = ''; const b = new Uint8Array(buf); for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(s); };
const deB64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

/* Llave pública configurada al compilar (VITE_LLAVE_PROFESOR) o la que trae el repositorio */
export function llavePublica() {
  let env = null;
  try { env = import.meta.env?.VITE_LLAVE_PROFESOR; } catch { /* fuera de Vite */ }
  if (env) { try { return JSON.parse(env); } catch { /* valor inválido: usar la de por defecto */ } }
  return LLAVE_PUBLICA_POR_DEFECTO;
}
/* Huella corta para reconocer la llave (se muestra al profesor y va en cada sobre) */
export async function huella(jwk) {
  const h = await sutil().digest('SHA-256', new TextEncoder().encode(jwk.n + '.' + jwk.e));
  return aB64(h).replace(/[^A-Za-z0-9]/g, '').slice(0, 10);
}

export async function generarLlaves() {
  const par = await sutil().generateKey({ ...RSA, modulusLength: 3072, publicExponent: new Uint8Array([1, 0, 1]) }, true, ['encrypt', 'decrypt']);
  const publica = await sutil().exportKey('jwk', par.publicKey), privada = await sutil().exportKey('jwk', par.privateKey);
  const limpia = ({ kty, n, e, alg }) => ({ kty, n, e, alg });
  return { publica: limpia(publica), privada, huella: await huella(publica) };
}

export async function cifrar(objeto, publicaJwk = llavePublica()) {
  const s = sutil();
  const pub = await s.importKey('jwk', { ...publicaJwk, ext: true, key_ops: ['encrypt'] }, RSA, false, ['encrypt']);
  const aes = await s.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt']);
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const datos = await s.encrypt({ name: 'AES-GCM', iv }, aes, new TextEncoder().encode(JSON.stringify(objeto)));
  const clave = await s.encrypt(RSA, pub, await s.exportKey('raw', aes));
  return { v: 1, alg: 'RSA-OAEP-256+A256GCM', llave: await huella(publicaJwk), k: aB64(clave), iv: aB64(iv), d: aB64(datos) };
}

export async function descifrar(sobre, privadaJwk) {
  const s = sutil();
  const priv = await s.importKey('jwk', { ...privadaJwk, ext: true, key_ops: ['decrypt'] }, RSA, false, ['decrypt']);
  const raw = await s.decrypt(RSA, priv, deB64(sobre.k));
  const aes = await s.importKey('raw', raw, { name: 'AES-GCM' }, false, ['decrypt']);
  const plano = await s.decrypt({ name: 'AES-GCM', iv: deB64(sobre.iv) }, aes, deB64(sobre.d));
  return JSON.parse(new TextDecoder().decode(plano));
}

/* ======================================================================
   Clases: cada profesor crea la suya sin tocar el repositorio.
   - Se genera un par ECDH P-256 para la clase.
   - La llave privada se guarda cifrada con la contraseña del profesor (PBKDF2 600 000 + AES-GCM).
   - El «enlace de clase» lleva la pública y la privada cifrada: los estudiantes cifran con la
     pública y sus archivos llevan la clase consigo. El profesor solo necesita su contraseña:
     el panel reconstruye la llave correcta desde los propios archivos.
   ====================================================================== */
const ECDH = { name: 'ECDH', namedCurve: 'P-256' };
const b64u = buf => aB64(buf).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const deB64u = s => deB64(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
const ITER = 600000;

async function llaveDeContrasena(contrasena, sal) {
  const base = await sutil().importKey('raw', new TextEncoder().encode(contrasena), 'PBKDF2', false, ['deriveKey']);
  return sutil().deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: sal, iterations: ITER }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
export async function crearClase({ nombre, docente = '', contrasena }) {
  if (!contrasena || contrasena.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');
  const s = sutil();
  const par = await s.generateKey(ECDH, true, ['deriveBits']);
  const jwk = await s.exportKey('jwk', par.privateKey);
  const sal = globalThis.crypto.getRandomValues(new Uint8Array(16)), iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const cif = await s.encrypt({ name: 'AES-GCM', iv }, await llaveDeContrasena(contrasena, sal), new TextEncoder().encode(jwk.d));
  const id = b64u(globalThis.crypto.getRandomValues(new Uint8Array(6)));
  return { v: 1, id, nombre: String(nombre || 'Mi clase').slice(0, 60), docente: String(docente).slice(0, 60), creada: new Date().toISOString(), pub: { x: jwk.x, y: jwk.y }, llave: { sal: b64u(sal), iv: b64u(iv), d: b64u(cif) } };
}
/* Con la contraseña correcta devuelve la llave privada de la clase; si no, lanza un error */
export async function abrirClase(clase, contrasena) {
  try {
    const d = new TextDecoder().decode(await sutil().decrypt({ name: 'AES-GCM', iv: deB64u(clase.llave.iv) }, await llaveDeContrasena(contrasena, deB64u(clase.llave.sal)), deB64u(clase.llave.d)));
    return { kty: 'EC', crv: 'P-256', x: clase.pub.x, y: clase.pub.y, d };
  } catch { throw new Error('Contraseña incorrecta para la clase «' + clase.nombre + '».'); }
}
/* Solo lo público de la clase (lo que viaja en el enlace y en los archivos) */
export const clasePublica = c => (c ? { v: c.v, id: c.id, nombre: c.nombre, docente: c.docente, creada: c.creada, pub: c.pub, llave: c.llave } : null);
export const codificarClase = c => b64u(new TextEncoder().encode(JSON.stringify(clasePublica(c))));
export function decodificarClase(texto) {
  const t = String(texto || '').trim();
  const m = /[?&#]clase=([\w-]+)/.exec(t);
  try {
    const c = JSON.parse(new TextDecoder().decode(deB64u(m ? m[1] : t)));
    if (c && c.v === 1 && c.id && c.pub?.x && c.pub?.y && c.llave?.d) return c;
  } catch { /* no es un código de clase */ }
  return null;
}
async function derivarAes(privada, publica, sal) {
  const s = sutil();
  const bits = await s.deriveBits({ name: 'ECDH', public: publica }, privada, 256);
  const hk = await s.importKey('raw', bits, 'HKDF', false, ['deriveKey']);
  return s.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: sal, info: new TextEncoder().encode('classbots-metricas') }, hk, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
export async function cifrarParaClase(objeto, clase) {
  const s = sutil();
  const pub = await s.importKey('jwk', { kty: 'EC', crv: 'P-256', x: clase.pub.x, y: clase.pub.y, ext: true }, ECDH, false, []);
  const eph = await s.generateKey(ECDH, true, ['deriveBits']);
  const e = await s.exportKey('jwk', eph.publicKey);
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const aes = await derivarAes(eph.privateKey, pub, new TextEncoder().encode(e.x + e.y));
  const datos = await s.encrypt({ name: 'AES-GCM', iv }, aes, new TextEncoder().encode(JSON.stringify(objeto)));
  return { v: 2, alg: 'ECDH-P256+A256GCM', clase: clase.id, e: { x: e.x, y: e.y }, iv: aB64(iv), d: aB64(datos) };
}
async function descifrarDeClase(sobre, privadaJwk) {
  const s = sutil();
  const priv = await s.importKey('jwk', { ...privadaJwk, ext: true, key_ops: ['deriveBits'] }, ECDH, false, ['deriveBits']);
  const eph = await s.importKey('jwk', { kty: 'EC', crv: 'P-256', x: sobre.e.x, y: sobre.e.y, ext: true }, ECDH, false, []);
  const aes = await derivarAes(priv, eph, new TextEncoder().encode(sobre.e.x + sobre.e.y));
  return JSON.parse(new TextDecoder().decode(await s.decrypt({ name: 'AES-GCM', iv: deB64(sobre.iv) }, aes, deB64(sobre.d))));
}
/* Cifra para la clase del estudiante o, si no tiene, para la llave pública del despliegue */
export const sellarPara = (objeto, clase) => (clase ? cifrarParaClase(objeto, clase) : cifrar(objeto));
/* llaves = { clases: { [id]: privadaJwk }, rsa: privadaJwk } */
export async function abrirSobre(sobre, llaves) {
  if (sobre.v === 2) {
    const k = llaves.clases?.[sobre.clase];
    if (!k) throw Object.assign(new Error('falta la contraseña de la clase'), { clase: sobre.clase });
    return descifrarDeClase(sobre, k);
  }
  if (!llaves.rsa) throw new Error('falta la llave privada del despliegue');
  return descifrar(sobre, llaves.rsa);
}
