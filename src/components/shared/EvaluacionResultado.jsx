// Modal auto-mount que muestra el resultado de la evaluación biométrica
// cuando el user vuelve de NeuroScan con ?evaluacion=completa.
// Se monta una sola vez en App.jsx; el hook decide si render o null.

import { useEvaluacionReturn } from '../../lib/neuroscan';

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
  const { fuentes, resumen } = evaluacion;
  const camara = fuentes?.camara;
  const subjetivo = fuentes?.subjetivo;
  const hrv = camara?.hrv;

  return (
    <>
      <h2 style={{ margin: '0 0 4px', color: '#37b24d', fontSize: 22 }}>
        Tu evaluación biométrica
      </h2>
      <p style={{ margin: '0 0 20px', color: '#868e96', fontSize: 13 }}>
        {evaluacion.fecha}
      </p>

      {camara?.disponible && hrv?.ok && (
        <p style={{ fontSize: 15, color: '#212529', margin: '12px 0' }}>
          Pulso promedio: <b>{hrv.bpm} BPM</b>
          {hrv.confidence && (
            <span style={{ color: '#868e96', fontSize: 13 }}>
              {' '}(confianza {hrv.confidence.toLowerCase()})
            </span>
          )}
        </p>
      )}

      {resumen?.indiceCompuesto != null && (
        <p style={{ fontSize: 15, color: '#212529', margin: '12px 0' }}>
          Índice compuesto: <b>{resumen.indiceCompuesto}/100</b>
        </p>
      )}

      {subjetivo && (
        <p style={{ fontSize: 14, color: '#495057', margin: '12px 0', lineHeight: 1.6 }}>
          Cómo te sentiste: tensión <b>{subjetivo.tension?.toLowerCase()}</b>,
          {' '}energía <b>{subjetivo.energia?.toLowerCase()}</b>,
          {' '}fatiga <b>{subjetivo.fatiga?.toLowerCase()}</b>.
        </p>
      )}

      <p style={{ fontSize: 12, color: '#adb5bd', marginTop: 20, borderTop: '1px solid #dee2e6', paddingTop: 12 }}>
        Datos objetivos medidos localmente. Es una referencia intra-sesión, no un valor clínico absoluto.
      </p>
    </>
  );
}
