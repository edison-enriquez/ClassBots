import { useEffect, useState } from 'react';

/* Escena de los retos de Kotlin: un teléfono que muestra la pantalla REAL del estudiante.
   La captura la toma el juez del servidor con Robolectric (Compose dibujado sin emulador).
   Al tocarla se abre en grande. */
export default function TelefonoAndroid({ captura, evaluando, nivel }) {
  const [grande, setGrande] = useState(false);
  useEffect(() => { if (!captura) setGrande(false); }, [captura]);
  useEffect(() => {
    if (!grande) return undefined;
    const tecla = e => { if (e.key === 'Escape') setGrande(false); };
    addEventListener('keydown', tecla);
    return () => removeEventListener('keydown', tecla);
  }, [grande]);
  const cola = evaluando && evaluando.posicion > 1;
  return (
    <div className="android-escena">
      <div className="android-lado" aria-hidden="true">
        <span className="android-rotulo">MODELO</span><small>datos y reglas</small>
        <span className="android-rotulo">CONTROLADOR</span><small>traduce los toques</small>
        <span className="android-rotulo vista">VISTA</span><small>tu pantalla →</small>
      </div>
      <div className={`android-telefono${evaluando ? ' trabajando' : ''}`}>
        <div className="android-camara" />
        <div className="android-pantalla">
          {captura && (
            <button type="button" className="android-ver" onClick={() => setGrande(true)} title="Ver en grande">
              <img src={captura} alt={`Captura de tu pantalla: ${nivel.titulo}`} draggable="false" />
            </button>
          )}
          {!captura && !evaluando && <p>Pulsa <b>Ejecutar</b>: el juez compila tu app y te muestra aquí cómo se ve.</p>}
          {evaluando && (
            <div className="android-cargando" role="status">
              <div className="android-barra"><i /></div>
              <p>{cola ? `En la fila: ${evaluando.posicion - 1} antes que tú` : evaluando.estado === 'corriendo' ? 'Compilando y probando…' : 'Enviando al juez…'}</p>
            </div>
          )}
        </div>
      </div>
      {grande && captura && (
        <div className="android-grande" role="dialog" aria-modal="true" aria-label="Tu pantalla en grande" onClick={() => setGrande(false)}>
          <img src={captura} alt={`Captura de tu pantalla: ${nivel.titulo}`} />
          <span>Toca fuera o pulsa Esc para cerrar</span>
        </div>
      )}
    </div>
  );
}
