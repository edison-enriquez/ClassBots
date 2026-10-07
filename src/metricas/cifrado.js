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
const ECDSA = { name: 'ECDSA', namedCurve: 'P-256' };
export const b64u = buf => aB64(buf).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export const deB64u = s => deB64(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
const ITER = 600000;

async function llaveDeContrasena(contrasena, sal) {
  const base = await sutil().importKey('raw', new TextEncoder().encode(contrasena), 'PBKDF2', false, ['deriveKey']);
  return sutil().deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: sal, iterations: ITER }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
/* El id de la clase se deriva de sus llaves públicas: así nadie puede hacer pasar otras llaves por
   la misma clase (el servidor del aula lo comprueba) */
export async function idDeClase(pub, firma) {
  const h = await sutil().digest('SHA-256', new TextEncoder().encode(`${pub.x}.${pub.y}.${firma.x}.${firma.y}`));
  return b64u(h).slice(0, 16);
}
/* Servidor del aula en vivo configurado al compilar (VITE_AULA_URL); vacío si no hay */
export function aulaPorDefecto() {
  try { return import.meta.env?.VITE_AULA_URL || ''; } catch { return ''; }
}
export async function crearClase({ nombre, docente = '', contrasena, aula = aulaPorDefecto() }) {
  if (!contrasena || contrasena.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');
  const s = sutil();
  const par = await s.generateKey(ECDH, true, ['deriveBits']);
  const firma = await s.generateKey(ECDSA, true, ['sign', 'verify']);
  const jwk = await s.exportKey('jwk', par.privateKey), fjwk = await s.exportKey('jwk', firma.privateKey);
  const sal = globalThis.crypto.getRandomValues(new Uint8Array(16)), iv = globalThis.crypto.getRandomValues(new Uint8Array(12)), fiv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const aes = await llaveDeContrasena(contrasena, sal);
  const cif = await s.encrypt({ name: 'AES-GCM', iv }, aes, new TextEncoder().encode(jwk.d));
  const fcif = await s.encrypt({ name: 'AES-GCM', iv: fiv }, aes, new TextEncoder().encode(fjwk.d));
  const pub = { x: jwk.x, y: jwk.y }, fpub = { x: fjwk.x, y: fjwk.y };
  return {
    v: 1, id: await idDeClase(pub, fpub), nombre: String(nombre || 'Mi clase').slice(0, 60), docente: String(docente).slice(0, 60), creada: new Date().toISOString(),
    pub, firma: fpub, llave: { sal: b64u(sal), iv: b64u(iv), d: b64u(cif), fiv: b64u(fiv), f: b64u(fcif) },
    ...(aula ? { aula: String(aula).trim().slice(0, 200) } : {}),
  };
}
/* Con la contraseña correcta devuelve la llave privada de la clase (y la de firma, si la clase la tiene) */
export async function abrirClase(clase, contrasena) {
  try {
    const aes = await llaveDeContrasena(contrasena, deB64u(clase.llave.sal));
    const abre = async (iv, d) => new TextDecoder().decode(await sutil().decrypt({ name: 'AES-GCM', iv: deB64u(iv) }, aes, deB64u(d)));
    const d = await abre(clase.llave.iv, clase.llave.d);
    const priv = { kty: 'EC', crv: 'P-256', x: clase.pub.x, y: clase.pub.y, d };
    if (clase.firma && clase.llave.f) priv.firma = { x: clase.firma.x, y: clase.firma.y, d: await abre(clase.llave.fiv, clase.llave.f) };
    return priv;
  } catch { throw new Error('Contraseña incorrecta para la clase «' + clase.nombre + '».'); }
}
/* El profesor prueba ante el servidor del aula que tiene la contraseña: firma el reto que este le envía */
export const textoReto = (claseId, reto) => `classbots-aula|${claseId}|${reto}`;
export async function firmarTexto(priv, texto) {
  if (!priv?.firma) throw new Error('Esta clase no tiene llave de firma (créala de nuevo para usar el aula en vivo).');
  const k = await sutil().importKey('jwk', { kty: 'EC', crv: 'P-256', ...priv.firma, ext: true }, ECDSA, false, ['sign']);
  return b64u(await sutil().sign({ name: 'ECDSA', hash: 'SHA-256' }, k, new TextEncoder().encode(texto)));
}
export const firmarReto = (priv, claseId, reto) => firmarTexto(priv, textoReto(claseId, reto));
/* Cualquiera con la clase (estudiantes incluidos) puede comprobar que algo lo firmó su profesor */
export async function verificarTexto(clase, texto, firma) {
  try {
    const k = await sutil().importKey('jwk', { kty: 'EC', crv: 'P-256', x: clase.firma.x, y: clase.firma.y, ext: true }, ECDSA, false, ['verify']);
    return await sutil().verify({ name: 'ECDSA', hash: 'SHA-256' }, k, deB64u(firma), new TextEncoder().encode(texto));
  } catch { return false; }
}
/* Solo lo público de la clase (lo que viaja en el enlace y en los archivos) */
export const clasePublica = c => (c ? { v: c.v, id: c.id, nombre: c.nombre, docente: c.docente, creada: c.creada, pub: c.pub, ...(c.firma ? { firma: c.firma } : {}), llave: c.llave, ...(c.aula ? { aula: c.aula } : {}), ...(c.reemplaza ? { reemplaza: c.reemplaza } : {}) } : null);
/* Actualiza una clase al aula en vivo con la misma contraseña.
   - Si ya tiene llave de firma, es la misma clase (mismo id): solo se le pone el servidor.
   - Si es anterior (sin llave de firma), se crea una nueva con el mismo nombre que la reemplaza:
     el panel abre las dos con la contraseña, así los archivos viejos se siguen leyendo. */
export async function actualizarClase(vieja, contrasena, aula = aulaPorDefecto()) {
  await abrirClase(vieja, contrasena);
  if (!aula) throw new Error('Falta la dirección del servidor del aula.');
  if (vieja.firma && vieja.llave?.f) return { ...clasePublica(vieja), aula: String(aula).trim().slice(0, 200) };
  const nueva = await crearClase({ nombre: vieja.nombre, docente: vieja.docente, contrasena, aula });
  return { ...nueva, reemplaza: vieja.id };
}
/* La clase puede usar el aula en vivo si tiene servidor y llave de firma */
export const tieneAula = c => !!(c?.aula && c.firma && c.llave?.f);
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
