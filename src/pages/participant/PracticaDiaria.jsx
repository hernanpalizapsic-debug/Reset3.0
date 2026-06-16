import { useState, useEffect, useRef } from 'react';
import { tecnicas } from '../../utils/contenidoFases';

export default function PracticaDiaria() {
  const [tecnicaActiva, setTecnicaActiva] = useState(null);
  const [paso, setPaso] = useState(0);
  const [timer, setTimer] = useState(0);
  const [corriendo, setCorriendo] = useState(false);
  const [completada, setCompletada] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (corriendo) {
      intervalRef.current = setInterval(() => {
        setTimer((t) => {
          if (t <= 1) {
            clearInterval(intervalRef.current);
            setCorriendo(false);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [corriendo]);

  function iniciarTecnica(t) {
    setTecnicaActiva(t);
    setPaso(0);
    setTimer(t.duracion * 60);
    setCorriendo(false);
    setCompletada(false);
  }

  function iniciarTimer() {
    setCorriendo(true);
  }

  function pausar() {
    setCorriendo(false);
    clearInterval(intervalRef.current);
  }

  function finalizar() {
    setCorriendo(false);
    clearInterval(intervalRef.current);
    setCompletada(true);
  }

  function volver() {
    setTecnicaActiva(null);
    setCompletada(false);
  }

  const minutos = Math.floor(timer / 60).toString().padStart(2, '0');
  const segundos = (timer % 60).toString().padStart(2, '0');

  if (completada) {
    return (
      <div className="page-container centrado">
        <div className="completada-card">
          <span className="big-emoji">🌿</span>
          <h2>¡Técnica completada!</h2>
          <p>Tomá un momento para notar cómo se siente tu cuerpo ahora.</p>
          <button className="btn btn-primary" onClick={volver}>
            Volver a las técnicas
          </button>
        </div>
      </div>
    );
  }

  if (tecnicaActiva) {
    return (
      <div className="page-container">
        <button className="btn-back" onClick={volver}>← Volver</button>
        <h2 className="tecnica-titulo">{tecnicaActiva.nombre}</h2>
        <p className="tecnica-desc">{tecnicaActiva.descripcion}</p>

        <div className="timer-display">
          <span>{minutos}:{segundos}</span>
        </div>

        <div className="timer-controles">
          {!corriendo ? (
            <button className="btn btn-primary" onClick={iniciarTimer}>
              {timer === tecnicaActiva.duracion * 60 ? '▶ Iniciar' : '▶ Continuar'}
            </button>
          ) : (
            <button className="btn btn-secondary" onClick={pausar}>⏸ Pausar</button>
          )}
          <button className="btn btn-success" onClick={finalizar}>✓ Completar</button>
        </div>

        <div className="instrucciones-card">
          <h3>Instrucciones</h3>
          <ol>
            {tecnicaActiva.instrucciones.map((inst, i) => (
              <li
                key={i}
                className={i === paso ? 'paso-activo' : ''}
                onClick={() => setPaso(i)}
              >
                {inst}
              </li>
            ))}
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1>Práctica diaria</h1>
      <p className="subtitulo">Seleccioná una técnica para comenzar</p>
      <div className="tecnicas-grid">
        {tecnicas.map((t) => (
          <div key={t.id} className="tecnica-card" onClick={() => iniciarTecnica(t)}>
            <div className="tecnica-header">
              <h3>{t.nombre}</h3>
              <span className="duracion-badge">{t.duracion} min</span>
            </div>
            <p>{t.descripcion}</p>
            <button className="btn btn-outline">Comenzar →</button>
          </div>
        ))}
      </div>
    </div>
  );
}
