import { useEffect, useRef, useState } from 'react';
import Avatar from './Avatar.jsx';

/* Menú del usuario en la esquina: identidad, nivel, recompensas, avance y (en modo profesor) el panel */
export default function MenuUsuario({ perfil, nv, xp, pct, mundo, profe, recompensas, onAvance, onDescargar, onPanel, onSalirProfe, onCodice }) {
  const [abierto, setAbierto] = useState(false);
  const [aviso, setAviso] = useState('');
  const raiz = useRef(null), boton = useRef(null);

  useEffect(() => {
    if (!abierto) return undefined;
    const fuera = e => { if (!raiz.current?.contains(e.target)) setAbierto(false); };
    const tecla = e => {
      if (e.key === 'Escape') { setAbierto(false); boton.current?.focus(); }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const items = [...raiz.current.querySelectorAll('[role="menuitem"]')];
        const k = items.indexOf(document.activeElement);
        items[(k + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
        e.preventDefault();
      }
    };
    document.addEventListener('pointerdown', fuera);
    document.addEventListener('keydown', tecla);
    requestAnimationFrame(() => raiz.current?.querySelector('[role="menuitem"]')?.focus());
    return () => { document.removeEventListener('pointerdown', fuera); document.removeEventListener('keydown', tecla); };
  }, [abierto]);

  const hacer = f => () => { setAbierto(false); f(); };
  const nombre = perfil?.nombre || 'Estudiante';

  return (
    <div className="usuario" ref={raiz}>
      <button ref={boton} type="button" className={'usuario-btn' + (profe ? ' es-profe' : '')} aria-haspopup="menu" aria-expanded={abierto}
        onClick={() => setAbierto(v => !v)} title={`${nombre} · NV ${nv} · ${xp} EXP`}>
        <Avatar tamano={2} color={profe ? 'amarillo' : 'azul'} titulo="" />
        <span className="usuario-datos">
          <span className="usuario-nombre">{nombre.split(' ')[0]}</span>
          <span className="usuario-nivel"><b>NV {nv}</b><span className="exp-barra" aria-hidden="true"><i style={{ width: pct + '%' }} /></span></span>
        </span>
        {profe && <span className="usuario-rol">PROFE</span>}
        <span className="usuario-flecha" aria-hidden="true">▾</span>
      </button>

      {abierto && (
        <div className="usuario-menu rpg-ventana" role="menu" aria-label="Menú de usuario">
          <div className="usuario-cab">
            <strong>{nombre}</strong>
            {perfil?.grupo && <small>{perfil.grupo}</small>}
            <div className="usuario-progreso">
              <span>NV {nv} · {xp} EXP</span>
              <span className="exp-barra" role="progressbar" aria-label={`Progreso del mundo ${mundo}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}><i style={{ width: pct + '%' }} /></span>
              <small>Mundo {mundo}: {pct}%</small>
            </div>
          </div>

          {recompensas.length > 0 && (
            <div className="usuario-insignias" aria-label="Recompensas">
              {recompensas.map(m => <button key={m.id} type="button" className="modulo-badge" role="menuitem" title={`Obtenido en «${m.titulo}». Ver en el Códice.`} onClick={hacer(onCodice)}>✦ {m.recompensa.split(' · ')[0]}</button>)}
            </div>
          )}

          <div className="usuario-grupo">
            <button type="button" role="menuitem" onClick={hacer(onAvance)}><span aria-hidden="true">📊</span> Mi avance <small>capítulos, cargar, cambiar de estudiante</small></button>
            <button type="button" role="menuitem" onClick={async () => { setAviso('Preparando…'); try { await onDescargar(); setAviso('✔ Descargado'); } catch (e) { setAviso('No se pudo: ' + e.message); } setTimeout(() => setAviso(''), 2500); }}>
              <span aria-hidden="true">⬇</span> Descargar mi avance <small>{aviso || 'el entregable (.json)'}</small>
            </button>
          </div>

          {profe && (
            <div className="usuario-grupo profe">
              <span className="usuario-titulo">Modo profesor</span>
              <button type="button" role="menuitem" onClick={hacer(onPanel)}><span aria-hidden="true">🎓</span> Panel de la clase <small>métricas, indicios y CSV</small></button>
              <button type="button" role="menuitem" onClick={hacer(onSalirProfe)}><span aria-hidden="true">↩</span> Salir del modo profesor</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
