import { useState } from 'react';
import { fases, tecnicas } from '../../utils/contenidoFases';

export default function Contenido() {
  const [tab, setTab] = useState('fases');
  const [faseAbierta, setFaseAbierta] = useState(null);

  return (
    <div className="page-container">
      <h1>Contenido del programa</h1>

      <div className="tabs">
        <button
          className={`tab ${tab === 'fases' ? 'activo' : ''}`}
          onClick={() => setTab('fases')}
        >
          Fases del programa
        </button>
        <button
          className={`tab ${tab === 'tecnicas' ? 'activo' : ''}`}
          onClick={() => setTab('tecnicas')}
        >
          Técnicas
        </button>
      </div>

      {tab === 'fases' && (
        <div className="fases-lista">
          {fases.map((f) => (
            <div key={f.semana} className="fase-item">
              <div
                className="fase-header"
                onClick={() => setFaseAbierta(faseAbierta === f.semana ? null : f.semana)}
              >
                <div>
                  <span className="semana-badge">Semana {f.semana}</span>
                  <h3>{f.nombre}</h3>
                </div>
                <span>{faseAbierta === f.semana ? '▲' : '▼'}</span>
              </div>
              {faseAbierta === f.semana && (
                <div className="fase-contenido">
                  <p>{f.descripcion}</p>
                  <h4>Temas de la semana:</h4>
                  <ul>
                    {f.temas.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'tecnicas' && (
        <div className="tecnicas-contenido">
          {tecnicas.map((t) => (
            <div key={t.id} className="tecnica-detalle">
              <div className="tecnica-detalle-header">
                <h3>{t.nombre}</h3>
                <span className="duracion-badge">{t.duracion} min</span>
              </div>
              <p className="tecnica-desc">{t.descripcion}</p>
              <h4>Instrucciones:</h4>
              <ol>
                {t.instrucciones.map((inst, i) => (
                  <li key={i}>{inst}</li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
