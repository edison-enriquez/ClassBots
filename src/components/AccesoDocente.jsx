import { useState } from 'react';
import { crearClase, abrirClase, decodificarClase, aulaPorDefecto } from '../metricas/cifrado.js';
import { misClases, guardarMiClase, abrirEnSesion } from '../metricas/clasesLocales.js';

/* Acceso docente (se abre con el gesto secreto). Sin la contraseña de una clase no se activa nada:
   o se abre una clase existente o se crea una nueva. */
export default function AccesoDocente({ claseActual, onListo, onFallo, onCerrar }) {
  const conocidas = [...misClases(), ...(claseActual && !misClases().some(c => c.id === claseActual.id) ? [claseActual] : [])];
  const [modo, setModo] = useState(conocidas.length ? 'entrar' : 'crear');
  const [sel, setSel] = useState(conocidas[0]?.id || '');
  const [codigo, setCodigo] = useState('');
  const [pass, setPass] = useState('');
  const [form, setForm] = useState({ nombre: '', docente: '', contrasena: '', repetir: '', aula: aulaPorDefecto() });
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const entrar = async e => {
    e.preventDefault(); setError('');
    const clase = codigo.trim() ? decodificarClase(codigo) : conocidas.find(c => c.id === sel);
    if (!clase) { setError(codigo.trim() ? 'Ese enlace o código no es de una clase.' : 'Elige una clase o pega su enlace.'); return; }
    setOcupado(true);
    try {
      const priv = await abrirClase(clase, pass);
      guardarMiClase(clase); abrirEnSesion(clase.id, priv);
      onListo(clase, 'entrar');
    } catch (err) { setError(err.message); onFallo(clase); }
    setOcupado(false);
  };
  const crear = async e => {
    e.preventDefault(); setError('');
    if (form.contrasena !== form.repetir) { setError('Las contraseñas no coinciden.'); return; }
    setOcupado(true);
    try {
      const clase = await crearClase(form);
      guardarMiClase(clase); abrirEnSesion(clase.id, await abrirClase(clase, form.contrasena));
      onListo(clase, 'crear');
    } catch (err) { setError(err.message); }
    setOcupado(false);
  };

  return (
    <div className="modal-fondo" role="dialog" aria-modal="true" aria-labelledby="docente-t" onClick={e => { if (e.target === e.currentTarget) onCerrar(); }}>
      <div className="modal rpg-ventana acceso-docente">
        <header className="avance-cab">
          <div><p className="mapa-kicker">ACCESO DOCENTE</p><h2 id="docente-t">Modo profesor</h2></div>
          <button type="button" className="mapa-cerrar" onClick={onCerrar} aria-label="Cerrar">×</button>
        </header>
        <div className="tabs-guia" role="tablist">
          <button type="button" role="tab" aria-selected={modo === 'entrar'} onClick={() => { setModo('entrar'); setError(''); }}>Entrar a mi clase</button>
          <button type="button" role="tab" aria-selected={modo === 'crear'} onClick={() => { setModo('crear'); setError(''); }}>Crear una clase</button>
        </div>
        {modo === 'entrar' ? (
          <form className="acceso-form" onSubmit={entrar}>
            {conocidas.length > 0 && (
              <label className="campo">Clase
                <select value={sel} onChange={e => { setSel(e.target.value); setCodigo(''); }}>
                  {conocidas.map(c => <option key={c.id} value={c.id}>{c.nombre}{c.docente ? ` · ${c.docente}` : ''}</option>)}
                </select>
              </label>
            )}
            <label className="campo">{conocidas.length ? 'O pega el enlace de otra clase' : 'Enlace o código de tu clase'}
              <input value={codigo} onChange={e => setCodigo(e.target.value)} placeholder="https://…/?clase=…" />
            </label>
            <label className="campo">Contraseña de la clase
              <input type="password" autoFocus value={pass} onChange={e => setPass(e.target.value)} autoComplete="current-password" />
            </label>
            {error && <p className="avance-alerta">{error}</p>}
            <button type="submit" className="btn-pri" disabled={!pass || ocupado}>{ocupado ? 'Verificando…' : 'Entrar'}</button>
          </form>
        ) : (
          <form className="acceso-form" onSubmit={crear}>
            <label className="campo">Nombre de la clase<input required value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="POO 2026-2 · Grupo 1" maxLength={60} /></label>
            <label className="campo">Docente<input value={form.docente} onChange={e => setForm({ ...form, docente: e.target.value })} placeholder="Tu nombre" maxLength={60} /></label>
            <label className="campo">Contraseña de la clase<input type="password" required minLength={8} value={form.contrasena} onChange={e => setForm({ ...form, contrasena: e.target.value })} autoComplete="new-password" /></label>
            <label className="campo">Repite la contraseña<input type="password" required minLength={8} value={form.repetir} onChange={e => setForm({ ...form, repetir: e.target.value })} autoComplete="new-password" /></label>
            <details className="campo-aula"><summary>📡 Aula en vivo: {form.aula ? 'activada' : 'sin servidor'}</summary>
              <label className="campo">Servidor del aula<input value={form.aula} onChange={e => setForm({ ...form, aula: e.target.value })} placeholder="wss://api.tu-dominio/aula" maxLength={200} /></label>
              <p className="bienv-nota">Con servidor, verás en vivo el avance y el código de cada estudiante y les podrás enviar mensajes. Vacío: la clase funciona solo con los archivos que entregan.</p>
            </details>
            <p className="bienv-nota">Con esta contraseña entrarás al modo profesor y leerás las métricas de la clase en cualquier computador. No se puede recuperar: usa una frase larga que no compartas.</p>
            {error && <p className="avance-alerta">{error}</p>}
            <button type="submit" className="btn-pri" disabled={ocupado}>{ocupado ? 'Creando…' : 'Crear clase y entrar'}</button>
          </form>
        )}
        <p className="bienv-nota">El modo profesor dura hasta cerrar esta pestaña.</p>
      </div>
    </div>
  );
}
