import { useEffect, useRef } from 'react';
import { Flecha } from './UmlPanel.jsx';
import { resaltar } from '../util/resaltar.js';

/* Guía de consulta: los seis tipos de relación UML, la multiplicidad y las interfaces */
const RELACIONES = [
  { tipo: 'dependencia', nombre: 'Dependencia', lee: 'A usa a B', fuerza: 1, java: 'void reparar(Herramienta h) { ... }', como: 'B aparece como parámetro, variable local o con new, pero A no lo guarda en un atributo.', taller: 'Robot ┄┄> Herramienta', de: 'Robot', a: 'Herram.' },
  { tipo: 'asociacion', nombre: 'Asociación', lee: 'A conoce a B', fuerza: 2, java: 'private Operario responsable;', como: 'A guarda en un atributo una referencia a un B que existe por su cuenta.', taller: 'Robot ──> 0..1 Operario', de: 'Robot', a: 'Operario' },
  { tipo: 'agregacion', nombre: 'Agregación', lee: 'A tiene B, sin ser su dueño', fuerza: 3, java: 'private ArrayList<Robot> miembros;\nvoid agregar(Robot r) { miembros.add(r); }', como: 'A reúne varios B que recibe ya creados. Si A desaparece, los B siguen existiendo y pueden estar en otro A.', taller: 'Cuadrilla ◇── 0..* Robot', de: 'Cuadr.', a: 'Robot' },
  { tipo: 'composicion', nombre: 'Composición', lee: 'A está hecho de B y es su dueño', fuerza: 4, java: 'private final Bateria bateria;\npublic Robot() { bateria = new Bateria(100); }', como: 'A crea sus B y no los comparte. Si A desaparece, sus B también.', taller: 'Robot ◆── 1 Bateria', de: 'Robot', a: 'Bateria' },
  { tipo: 'herencia', nombre: 'Herencia (generalización)', lee: 'A es un B', fuerza: null, java: 'class RobotVolador extends Robot { ... }', como: 'A recibe los atributos y métodos de B y puede redefinirlos. Llega en el Mundo 5.', taller: 'RobotVolador ──▷ Robot', de: 'Volador', a: 'Robot' },
  { tipo: 'realizacion', nombre: 'Realización (interfaz)', lee: 'A cumple el contrato B', fuerza: null, java: 'class Robot implements Recargable { ... }', como: 'A promete tener todos los métodos que declara la interfaz B.', taller: 'Robot ┄┄▷ Recargable', de: 'Robot', a: 'Recarg.' },
];
const MULT = [['1', 'exactamente uno', 'cada robot tiene una batería'], ['0..1', 'ninguno o uno', 'un robot tiene como máximo un responsable'], ['0..*', 'cero o muchos (también se escribe *)', 'una cuadrilla tiene muchos robots, o ninguno'], ['1..*', 'al menos uno', 'una planta con al menos una cuadrilla'], ['2..4', 'entre 2 y 4', 'un dron con 2 a 4 hélices']];

export default function Guia({ tema, onTema, onCerrar }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.focus();
    const k = e => { if (e.key === 'Escape') onCerrar(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onCerrar]);
  return (
    <div className="modal-fondo" role="dialog" aria-modal="true" aria-labelledby="guia-t" onClick={e => { if (e.target === e.currentTarget) onCerrar(); }}>
      <div className="modal guia" ref={ref} tabIndex={-1}>
        <header className="guia-head">
          <h2 id="guia-t">Guía del taller</h2>
          <div className="tabs-guia" role="tablist">
            <button type="button" role="tab" aria-selected={tema === 'relaciones'} onClick={() => onTema('relaciones')}>Relaciones</button>
            <button type="button" role="tab" aria-selected={tema === 'interfaces'} onClick={() => onTema('interfaces')}>Interfaces</button>
          </div>
          <button type="button" className="btn-mini" onClick={onCerrar}>Cerrar</button>
        </header>
        <div className="guia-cuerpo">{tema === 'interfaces' ? <Interfaces /> : <Relaciones />}</div>
      </div>
    </div>
  );
}

function Relaciones() {
  return (
    <>
      <p className="guia-lead">Dos clases se relacionan cuando una necesita a la otra. UML distingue seis formas, y la diferencia está en <strong>cuánto dependen</strong> una de la otra y <strong>quién es dueño de quién</strong>.</p>
      <div className="tabla-scroll">
        <table className="guia-tabla">
          <thead><tr><th>Relación</th><th>Se lee</th><th>Notación UML</th><th>En Java</th><th>En el taller</th></tr></thead>
          <tbody>
            {RELACIONES.map(r => (
              <tr key={r.tipo}>
                <td><strong>{r.nombre}</strong>{r.fuerza && <span className="fuerza" aria-label={`fuerza ${r.fuerza} de 4`}>{'■'.repeat(r.fuerza)}<span className="tenue">{'■'.repeat(4 - r.fuerza)}</span></span>}</td>
                <td>{r.lee}</td>
                <td><Flecha tipo={r.tipo} ancho={70} de={r.de} a={r.a} /></td>
                <td><pre className="mini-code"><code dangerouslySetInnerHTML={{ __html: resaltar(r.java) }} /></pre><small>{r.como}</small></td>
                <td><code>{r.taller}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3>De la más débil a la más fuerte</h3>
      <p>Dependencia, asociación, agregación y composición forman una escala. Para elegir, hazte tres preguntas en orden:</p>
      <ol className="guia-pasos">
        <li>¿A guarda a B en un atributo? Si no, es <strong>dependencia</strong>.</li>
        <li>¿Es una relación de todo y partes? Si no, es <strong>asociación</strong>.</li>
        <li>¿A crea sus partes y nadie más las tiene? Si sí, es <strong>composición</strong>; si las recibe ya hechas, es <strong>agregación</strong>.</li>
      </ol>
      <p className="nota">Entre asociación y agregación la frontera depende de la intención del diseño. El taller usa una regla fija para poder revisarla: una colección de objetos recibidos desde afuera es agregación; una sola referencia, asociación.</p>
      <h3>Multiplicidad</h3>
      <p>Los números en los extremos de una línea dicen cuántos objetos participan.</p>
      <table className="guia-tabla compacta">
        <thead><tr><th>Se escribe</th><th>Significa</th><th>Ejemplo</th></tr></thead>
        <tbody>{MULT.map(([m, s, e]) => <tr key={m}><td><code>{m}</code></td><td>{s}</td><td>{e}</td></tr>)}</tbody>
      </table>
    </>
  );
}

function Interfaces() {
  return (
    <>
      <p className="guia-lead">Una <strong>interfaz</strong> es un contrato: dice qué sabe hacer un objeto, sin decir cómo. Es como un enchufe: a la estación de carga no le importa qué aparato conectas, solo que tenga la forma correcta.</p>
      <pre className="ejemplo"><code dangerouslySetInnerHTML={{ __html: resaltar('public interface Recargable {\n    void recargar();\n    int nivel();\n}\n\npublic class Linterna implements Recargable {\n    private int pila;\n    public void recargar() { pila = 100; }\n    public int nivel() { return pila; }\n}') }} /></pre>
      <h3>Reglas</h3>
      <ul className="guia-reglas">
        <li>Sus métodos son <code>public</code> y no tienen cuerpo: cada clase escribe el suyo.</li>
        <li>No guarda estado: solo puede tener constantes (<code>static final</code>).</li>
        <li>No se puede hacer <code>new Recargable()</code>: se crean objetos de las clases que la implementan.</li>
        <li>Una clase puede implementar varias: <code>implements Recargable, Movible</code>.</li>
        <li>Una variable de tipo interfaz solo deja usar los métodos del contrato, aunque el objeto real tenga más.</li>
        <li>Al llamar <code>r.recargar()</code> se ejecuta la versión del objeto real: eso es polimorfismo.</li>
      </ul>
      <h3>En UML</h3>
      <p>La caja lleva <code>«interface»</code> sobre el nombre, y la clase que la implementa se une con una <strong>realización</strong>: línea punteada con triángulo vacío.</p>
      <Flecha tipo="realizacion" ancho={90} de="Linterna" a="Recargable" />
      <h3>Interfaz o clase abstracta</h3>
      <table className="guia-tabla compacta">
        <thead><tr><th></th><th>Interfaz</th><th>Clase abstracta (Mundo 5)</th></tr></thead>
        <tbody>
          <tr><td>Expresa</td><td>Qué sabe hacer: «se puede recargar»</td><td>Qué es: «es un robot»</td></tr>
          <tr><td>Atributos</td><td>Solo constantes</td><td>Sí, con estado</td></tr>
          <tr><td>Cuántas por clase</td><td>Varias</td><td>Una sola (<code>extends</code>)</td></tr>
          <tr><td>Métodos con cuerpo</td><td>Solo <code>default</code> (Java 8+)</td><td>Sí</td></tr>
        </tbody>
      </table>
      <h3>Interfaces que Java ya trae</h3>
      <p><code>Comparable&lt;T&gt;</code> para ordenar, <code>List&lt;T&gt;</code> para listas y <code>Runnable</code> para tareas. Cuando tu clase las implementa, la biblioteca de Java puede trabajar con ella sin conocerla.</p>
    </>
  );
}
