import { useEffect, useRef } from 'react';

const estadoColor = { simpatico: '#FF6B6B', dorsal: '#6B9BD2', ventral: '#51CF66' };
const estadoLabel = { simpatico: '⚡ Simpático', dorsal: '🌊 Dorsal', ventral: '🌿 Ventral' };
const estadoEmoji = { simpatico: '⚡', dorsal: '🌊', ventral: '🌿' };

function calcularDia(diaInicio) {
  if (!diaInicio) return 1;
  const diff = Math.floor((new Date() - new Date(diaInicio)) / (1000 * 60 * 60 * 24));
  return Math.min(Math.max(diff + 1, 1), 28);
}

function formatFecha(f) {
  if (!f) return '';
  const [y, m, d] = f.split('-');
  return `${d}/${m}/${y}`;
}

export default function HistorialParticipante({ participante, registros, onClose }) {
  const overlayRef = useRef();

  function handleOverlayClick(e) {
    if (e.target === overlayRef.current) onClose();
  }

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Separate morning and night records
  const mañanaRegs = registros.filter((r) => !r.fecha?.endsWith('_noche') && r.tipo !== 'noche');
  const nocheRegs = registros.filter((r) => r.tipo === 'noche');

  const sorted = [...mañanaRegs].sort((a, b) => (a.fecha > b.fecha ? -1 : 1));
  const diaActual = calcularDia(participante.diaInicio);
  const semana = Math.min(Math.ceil(diaActual / 7), 4);

  const dist = sorted.reduce((acc, r) => {
    if (r.estado) acc[r.estado] = (acc[r.estado] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="historial-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className="historial-panel">
        <div className="historial-header">
          <div>
            <h2>{[participante.nombre, participante.apellido].filter(Boolean).join(' ')}</h2>
            <span className="participante-email">{participante.email}</span>
          </div>
          <button className="historial-close" onClick={onClose}>✕</button>
        </div>

        {/* Resumen */}
        <div className="historial-resumen">
          <div className="hist-stat">
            <span className="hist-stat-num">Día {diaActual}/28</span>
            <span className="hist-stat-label">Progreso</span>
          </div>
          <div className="hist-stat">
            <span className="hist-stat-num">Semana {semana}</span>
            <span className="hist-stat-label">Fase</span>
          </div>
          <div className="hist-stat">
            <span className="hist-stat-num">{sorted.length}</span>
            <span className="hist-stat-label">Check-ins</span>
          </div>
          <div className="hist-stat">
            <span className="hist-stat-num">
              {sorted.length > 0
                ? Math.round((sorted.length / diaActual) * 100) + '%'
                : '0%'}
            </span>
            <span className="hist-stat-label">Adherencia</span>
          </div>
        </div>

        {/* Distribución de estados */}
        {sorted.length > 0 && (
          <div className="hist-dist">
            {['simpatico', 'dorsal', 'ventral'].map((e) => (
              <div key={e} className="hist-dist-item">
                <span style={{ color: estadoColor[e] }}>
                  {estadoEmoji[e]} {dist[e] || 0}
                </span>
                <div className="hist-dist-barra">
                  <div
                    style={{
                      width: `${((dist[e] || 0) / sorted.length) * 100}%`,
                      background: estadoColor[e],
                      height: '100%',
                      borderRadius: 4,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Historial de flujos diarios */}
        <h3 className="historial-section-title">Flujos del día</h3>
        <div className="historial-lista">
          {sorted.length === 0 && <p className="empty-state">Sin registros aún.</p>}
          {sorted.map((r) => (
            <div key={r.id} className="hist-item">
              <div className="hist-item-fecha">{formatFecha(r.fecha)}</div>
              <div className="hist-item-body">
                {r.estado && (
                  <span
                    className="estado-tag"
                    style={{
                      backgroundColor: estadoColor[r.estado] + '22',
                      color: estadoColor[r.estado],
                    }}
                  >
                    {estadoLabel[r.estado]}
                  </span>
                )}
                {/* Conversación mañana */}
                {r.textoManana && (
                  <div className="hist-conv-row">
                    <span className="hist-conv-autor">🙋</span>
                    <p className="hist-item-nota">"{r.textoManana}"</p>
                  </div>
                )}
                {r.respuestaIA_manana && (
                  <div className="hist-conv-row">
                    <span className="hist-conv-autor">🧠</span>
                    <p className="hist-item-nota">{r.respuestaIA_manana}</p>
                  </div>
                )}
                {/* Mensaje de estado IA */}
                {r.respuestaIA_estado && (
                  <div className="hist-conv-row hist-estado-ia">
                    <span className="hist-conv-autor">💬</span>
                    <p className="hist-item-nota">{r.respuestaIA_estado}</p>
                  </div>
                )}
                {/* Reducir / Resolver */}
                {r.reducir && (
                  <p className="hist-item-nota">✂️ {r.reducir}</p>
                )}
                {r.resolver && (
                  <p className="hist-item-nota">🎯 {r.resolver}</p>
                )}
                {/* Legacy notas */}
                {!r.textoManana && r.notas && (
                  <p className="hist-item-nota">"{r.notas}"</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Momentos noche */}
        {nocheRegs.length > 0 && (
          <>
            <h3 className="historial-section-title" style={{ marginTop: 16 }}>Momentos noche</h3>
            <div className="historial-lista">
              {[...nocheRegs].sort((a, b) => (a.fecha > b.fecha ? -1 : 1)).map((r) => (
                <div key={r.id} className="hist-item">
                  <div className="hist-item-fecha">{formatFecha(r.fecha?.replace('_noche', ''))}</div>
                  <div className="hist-item-body">
                    {r.textoNoche && (
                      <div className="hist-conv-row">
                        <span className="hist-conv-autor">🙋</span>
                        <p className="hist-item-nota">"{r.textoNoche}"</p>
                      </div>
                    )}
                    {r.respuestaIA_noche && (
                      <div className="hist-conv-row">
                        <span className="hist-conv-autor">🧠</span>
                        <p className="hist-item-nota">{r.respuestaIA_noche}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
