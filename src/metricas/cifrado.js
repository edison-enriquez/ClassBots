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
