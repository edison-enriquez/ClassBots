/* Conexión del profesor con sus aulas en vivo. Vive en la app (no en el panel), así sigue activa
   cuando el profesor cierra el panel o entra a la vista de un estudiante.
   - Una conexión por clase abierta que tenga servidor de aula.
   - Guarda el último estado en vivo y el último archivo de avance de cada estudiante (descifrados aquí).
   - Programación en pareja (una sesión a la vez) y órdenes firmadas, como habilitar un capítulo. */
import { useSyncExternalStore } from 'react';
import { conectarAula, urlAula, descomprimir } from './conexion.js';
import { abrirSobre, firmarReto, firmarTexto, tieneAula } from '../metricas/cifrado.js';
import { leerArchivo } from '../metricas/metricas.js';
import { crearInvitacion, llaveSesion, crearCanal, COLORES } from './pareja.js';

export const textoHabilitar = (claseId, alumno, nivel, t) => `classbots-habilitar|${claseId}|${alumno}|${nivel}|${t}`;
const identidad = c => ({ id: c.id, pub: c.pub, firma: c.firma });

export class AulaDocente {
  constructor() {
    this.salas = new Map(); // claseId → { clase, priv, conn, estado, detalle, alumnos: { id: { conectado, vivo, vivoT, archivo, archivoT } } }
    this.pareja = null;      // { claseId, alumno, nombre, s, par, estado: 'invitando' | 'activa', canal, archivos, activo, nivel }
    this.aviso = null;       // { txt, t }
    this.oyentes = new Set();
    this.foto = { v: 0 };
  }
  /* ---- suscripción para React ---- */
  suscribir = f => { this.oyentes.add(f); return () => this.oyentes.delete(f); };
  instantanea = () => this.foto;
  cambio() { this.foto = { v: this.foto.v + 1 }; for (const f of this.oyentes) f(); }
  avisar(txt) { this.aviso = { txt, t: Date.now() }; this.cambio(); }

  /* Abre o cierra conexiones según las clases abiertas: lista de { clase, priv } */
  sincronizar(lista) {
    const quiero = new Map(lista.filter(x => tieneAula(x.clase) && x.priv?.firma).map(x => [x.clase.id, x]));
    for (const [id, s] of this.salas) if (!quiero.has(id)) { s.conn.cerrar(); this.salas.delete(id); }
    for (const [id, { clase, priv }] of quiero) if (!this.salas.has(id)) this.abrir(clase, priv);
    this.cambio();
  }
  cerrarTodo() { this.terminarPareja('', true); for (const s of this.salas.values()) s.conn.cerrar(); this.salas.clear(); this.cambio(); }

  abrir(clase, priv) {
    const sala = { clase, priv, estado: 'conectando', detalle: '', alumnos: {} };
    this.salas.set(clase.id, sala);
    const llaves = { clases: { [clase.id]: priv } };
    const poner = (id, f) => { sala.alumnos[id] = f(sala.alumnos[id] || { conectado: false }); this.cambio(); };
    const abrirSobreDe = async ({ alumno, clave, recibido, sobre }) => {
      try {
        const d = await abrirSobre(sobre, llaves);
        if (clave === 'vivo') poner(alumno, a => (a.vivoT > d.t ? a : { ...a, vivo: d, vivoT: d.t, recibido }));
        if (clave === 'archivo') {
          const arch = { ...leerArchivo(JSON.stringify(descomprimir(d))), archivo: 'aula en vivo' };
          poner(alumno, a => ({ ...a, archivo: arch, archivoT: recibido }));
        }
      } catch { /* sobre ilegible */ }
    };
    sala.conn = conectarAula({
      url: urlAula(clase.aula),
      saludo: async reto => ({ t: 'hola', rol: 'profesor', clase: identidad(clase), firma: await firmarReto(priv, clase.id, reto) }),
      alEstado: (e, x) => {
        sala.estado = e; sala.detalle = typeof x === 'string' ? x : '';
        if (e !== 'conectado') for (const a of Object.values(sala.alumnos)) a.conectado = false;
        this.cambio();
      },
      alMensaje: m => {
        if (m.t === 'listo') { for (const id of m.presentes || []) poner(id, a => ({ ...a, conectado: true })); if (this.pareja?.claseId === clase.id) this.pareja.canal?.enviarTodo(); }
        if (m.t === 'historial') m.filas.forEach(abrirSobreDe);
        if (m.t === 'sobre') abrirSobreDe(m);
        if (m.t === 'presencia') poner(m.alumno, a => ({ ...a, conectado: m.conectado, desde: m.t2 }));
        if (m.t === 'pareja') this.alPareja(clase.id, m.alumno, m.d);
      },
    });
  }

  /* ---- consultas ---- */
  sala(id) { return this.salas.get(id); }
  alumno(claseId, id) { return this.salas.get(claseId)?.alumnos[id] || null; }
  /* Archivos de avance que llegaron por el aula (para las tablas del panel) */
  archivos() { const r = []; for (const s of this.salas.values()) for (const a of Object.values(s.alumnos)) if (a.archivo) r.push(a.archivo); return r; }

  /* ---- acciones ---- */
  mensaje(claseId, para, texto) { return !!this.salas.get(claseId)?.conn.enviar({ t: 'mensaje', para, texto }); }
  enviarA(claseId, alumno, d) { return !!this.salas.get(claseId)?.conn.enviar({ t: 'pareja', para: alumno, d }); }

  /* Habilitar un capítulo a un estudiante (orden firmada con la llave de la clase) */
  async habilitar(claseId, alumno, nivel) {
    const s = this.salas.get(claseId); if (!s) return false;
    const t = Date.now();
    const firma = await firmarTexto(s.priv, textoHabilitar(claseId, alumno, nivel, t));
    return this.enviarA(claseId, alumno, { tipo: 'habilitar', nivel, t, firma });
  }

  async invitar(claseId, alumno, nombre) {
    if (this.pareja) this.terminarPareja('', true);
    const s = this.salas.get(claseId); if (!s) return;
    const { par, mensaje } = await crearInvitacion(s.clase, s.priv, alumno);
    this.pareja = { claseId, alumno, nombre, s: mensaje.s, par, estado: 'invitando' };
    this.cambio();
    if (!this.enviarA(claseId, alumno, mensaje)) this.terminarPareja('Sin conexión con el aula: no se envió la invitación.');
  }
  terminarPareja(motivo, avisarAlOtro) {
    const p = this.pareja; if (!p) return;
    if (avisarAlOtro) this.enviarA(p.claseId, p.alumno, { tipo: 'fin', s: p.s });
    p.canal?.cerrar();
    this.pareja = null;
    if (motivo) this.avisar(motivo); else this.cambio();
  }
  async alPareja(claseId, alumno, d) {
    const p = this.pareja;
    if (!d || !p || p.claseId !== claseId || d.s !== p.s || (alumno && alumno !== p.alumno)) return;
    const n = p.nombre.split(' ')[0];
    if (d.tipo === 'acepta' && p.estado === 'invitando') {
      const s = this.salas.get(claseId);
      const llave = await llaveSesion(p.par.priv, d.pub, p.s);
      const canal = crearCanal({ llave, sesion: p.s, enviar: x => this.enviarA(claseId, p.alumno, x), usuario: { name: s.clase.docente ? s.clase.docente.split(' ')[0] : 'Profe', color: COLORES.profe } });
      this.pareja = { ...p, estado: 'activa', canal, archivos: Array.isArray(d.archivos) ? d.archivos : [], activo: d.activo, nivel: d.nivel };
      this.aviso = null;
      this.cambio();
      canal.enviarTodo();
      return;
    }
    if (d.tipo === 'rechaza') this.terminarPareja(`${n} prefirió no programar en pareja ahora.`);
    else if (d.tipo === 'ocupado') this.terminarPareja(`${n} ya está en otra sesión en pareja.`);
    else if (d.tipo === 'ausente') this.terminarPareja(`${n} no está conectado en este momento.`);
    else if (d.tipo === 'fin') this.terminarPareja(d.razon === 'capitulo' ? `${n} cambió de capítulo: la sesión en pareja terminó.` : d.razon === 'salio' ? `${n} cerró la página: la sesión en pareja terminó.` : `${n} terminó la sesión en pareja.`);
    else p.canal?.recibir(d);
  }
}

/* Hook: vuelve a dibujar el componente cuando cambia algo en las aulas */
export function useDocente(docente) {
  useSyncExternalStore(docente ? docente.suscribir : noop, docente ? docente.instantanea : cero);
  return docente;
}
const noop = () => () => {};
const cero = () => 0;
