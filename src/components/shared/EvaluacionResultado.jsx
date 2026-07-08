// Modal auto-mount que muestra el resultado de la evaluación biométrica
// cuando el user vuelve de NeuroScan con ?evaluacion=completa.
// Se monta una sola vez en App.jsx; el hook decide si render o null.
//
// La lógica de interpretación (phrase*) vive en src/lib/interpretaciones.js,
// compartida con MiEvolucion.jsx.

import { useEvaluacionReturn } from '../../lib/neuroscan';
import { phrasesFromMedicion, formatFecha } from '../../lib/interpretaciones';

// ---------- estilos ----------

const overlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000, padding: 16,
};
const modal = {
  background: '#fff', borderRadius: 16, padding: 24,
  maxWidth: 480, width: '100%', position: 'relative',
  boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
  maxHeight: '90vh', overflowY: 'auto',
};
const closeBtn = {
  position: 'absolute', top: 8, right: 12,
  background: 'none', border: 'none', fontSize: 24,
  cursor: 'pointer', color: '#868e96', lineHeight: 1,
};
const card = {
  background: '#f8f9fa', border: '1px solid #dee2e6',
  borderRadius: 12, padding: 14, margin: '12px 0',
};
const cardTitle = {
  margin: '0 0 6px', fontSize: 14, fontWeight: 600, color: '#212529',
  display: 'flex', alignItems: 'center', gap: 8,
};
const cardText = { margin: 0, fontSize: 13, color: '#495057', lineHeight: 1.5 };

// ---------- componente ----------

export default function EvaluacionResultado() {
  const { evaluacion, loading, error, dismiss } = useEvaluacionReturn();

  if (!loading && !evaluacion && !error) return null;

  return (
    <div style={overlay} onClick={dismiss} role="dialog" aria-modal="true">
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <button style={closeBtn} onClick={dismiss} aria-label="Cerrar">×</button>
        {loading && <p style={{ color: '#495057' }}>Cargando tu evaluación…</p>}
        {error && (
          <p style={{ color: '#c92a2a' }}>
            No pudimos cargar tu evaluación: {error.message}
          </p>
        )}
        {evaluacion && <Resumen evaluacion={evaluacion} />}
      </div>
    </div>
  );
}

function Resumen({ evaluacion }) {
  const camaraDisponible = !!evaluacion.fuentes?.camara?.disponible;
  const cards = phrasesFromMedicion(evaluacion);

  return (
    <>
      <h2 style={{ margin: '0 0 4px', color: '#37b24d', fontSize: 22 }}>
        Tu evaluación biométrica
      </h2>
      <p style={{ margin: '0 0 20px', color: '#868e96', fontSize: 13 }}>
        {formatFecha(evaluacion.fecha)}
      </p>

      {!camaraDisponible && (
        <div style={card}>
          <p style={cardText}>
            La medición con cámara no se completó esta vez.
            Podés repetir la evaluación más tarde.
          </p>
        </div>
      )}

      {cards.map((c, i) => (
        <div key={i} style={card}>
          <h3 style={cardTitle}>
            <span aria-hidden="true">{c.icon}</span> {c.title}
          </h3>
          <p style={cardText}>{c.text}</p>
        </div>
      ))}

      <p style={{ fontSize: 12, color: '#adb5bd', marginTop: 20, borderTop: '1px solid #dee2e6', paddingTop: 12 }}>
        Datos objetivos medidos localmente. Es una referencia intra-sesión, no un valor clínico absoluto.
      </p>
    </>
  );
}
