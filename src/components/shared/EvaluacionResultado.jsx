// Modal auto-mount que muestra el resultado de la evaluación biométrica
// cuando el user vuelve de NeuroScan con ?evaluacion=completa.
// Se monta una sola vez en App.jsx; el hook decide si render o null.
//
// Interpretación por tarjeta: las funciones phrase* son un port adaptado
// de neuroscanbio/src/ui.js (mismas frases, mismo criterio, sin lenguaje
// técnico visible). Leen del shape Firestore (fuentes.camara.*) en vez
// del shape plano de computeMetrics().

import { useEvaluacionReturn } from '../../lib/neuroscan';

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

// ---------- helpers ----------

function formatFecha(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// ---------- phrases (port de neuroscanbio/src/ui.js) ----------

function phraseHRV(hrv) {
  if (!hrv || !hrv.ok) {
    const detected = hrv?.beatsDetected;
    return {
      icon: '❤️',
      title: 'Pulso',
      text: `No pudimos medir tu pulso con suficiente claridad esta vez${
        detected != null ? ` (se detectaron ${detected} latidos posibles)` : ''
      }. Probá apoyar el dedo con más firmeza, cubriendo bien la cámara y el flash, sin moverlo.`,
    };
  }
  let text = `Tu corazón late en promedio ${hrv.bpm} veces por minuto. `;
  if (hrv.confidence === 'Alta') {
    if (hrv.rmssd > 50)
      text += 'La variación entre tus latidos es alta — un patrón típicamente asociado a un estado más relajado y con buena capacidad de recuperación.';
    else if (hrv.rmssd < 20)
      text += 'La variación entre tus latidos es baja — un patrón típicamente asociado a un estado de mayor activación o alerta.';
    else
      text += 'La variación entre tus latidos está en un rango intermedio, compatible con un estado equilibrado.';
  } else {
    text += 'La medición tiene confianza media: sirve como referencia, pero conviene repetirla para confirmar la tendencia.';
  }
  return { icon: '❤️', title: 'Pulso y ritmo cardíaco', text };
}

function phraseBlink(oculomotor) {
  const rate = oculomotor?.blinkRate;
  if (rate == null) return null;
  let text;
  if (rate < 8)
    text = `Parpadeaste poco durante la prueba (${rate}/min). Esto puede indicar concentración intensa o fatiga ocular acumulada.`;
  else if (rate > 25)
    text = `Parpadeaste con frecuencia alta (${rate}/min), lo cual a veces se asocia a cansancio visual o irritación.`;
  else
    text = `Tu frecuencia de parpadeo (${rate}/min) está en un rango típico de alerta relajada.`;
  return { icon: '👁️', title: 'Parpadeo', text };
}

function phraseSaccade(oculomotor) {
  const err = oculomotor?.saccadeTrackError;
  if (err == null) return null;
  let text;
  if (err < 5)
    text = 'Seguiste el punto en pantalla con buena precisión — tu coordinación visual estuvo fina durante la prueba.';
  else if (err < 12)
    text = 'Tu seguimiento visual fue aceptable, con cierta dispersión — normal si hubo distracción momentánea.';
  else
    text = 'Hubo bastante dispersión al seguir el punto, lo que puede reflejar fatiga visual o dificultad para mantener el foco en este momento.';
  return { icon: '🎯', title: 'Seguimiento visual', text };
}

function phrasePLR(plr) {
  if (!plr || !plr.ok) {
    return {
      icon: '💡',
      title: 'Reacción pupilar a la luz',
      text: 'No pudimos medir la reacción de tu pupila al destello con suficiente confianza esta vez (depende mucho del color de ojos y la luz ambiente). No es un problema, simplemente no se reporta un dato sin respaldo.',
    };
  }
  return {
    icon: '💡',
    title: 'Reacción pupilar a la luz',
    text: `Tu pupila se contrajo un ${plr.constriction}% al recibir el destello de luz, en ${plr.latency} milisegundos. Esta reacción refleja, hasta cierto punto, la capacidad de respuesta automática de tu sistema nervioso ante un estímulo.`,
  };
}

function phraseHead(oculomotor) {
  const stab = oculomotor?.headStability;
  if (stab == null) return null;
  let text;
  if (stab < 1.5)
    text = 'Mantuviste la cabeza muy estable durante la prueba, señal de buen control postural en este momento.';
  else if (stab < 4)
    text = 'Tu estabilidad postural fue normal, con pequeños movimientos esperables.';
  else
    text = 'Hubo bastante movimiento de cabeza durante la prueba, lo que a veces acompaña a estados de mayor inquietud o activación.';
  return { icon: '🧍', title: 'Estabilidad postural', text };
}

function phraseSubjetivo(subjetivo) {
  if (!subjetivo) return null;
  // Fraseo natural para las 3 dimensiones del quiz.
  const t = { Baja: 'tensión baja', Moderada: 'tensión moderada', Alta: 'tensión alta' }[subjetivo.tension];
  const e = { Poca: 'poca energía', Normal: 'energía normal', Mucha: 'mucha energía' }[subjetivo.energia];
  const f = { No: 'sin fatiga ocular', Algo: 'algo de fatiga ocular', Bastante: 'bastante fatiga ocular' }[subjetivo.fatiga];
  const parts = [t, e, f].filter(Boolean);
  if (!parts.length) return null;
  return {
    icon: '💭',
    title: 'Cómo te sentiste',
    text: `Reportaste ${parts.join(', ')}.`,
  };
}

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
  const camara = evaluacion.fuentes?.camara;
  const oculomotor = camara?.oculomotor;
  const subjetivo = evaluacion.fuentes?.subjetivo;
  const camaraDisponible = !!camara?.disponible;

  const cards = camaraDisponible
    ? [
        phraseHRV(camara?.hrv),
        phraseBlink(oculomotor),
        phraseSaccade(oculomotor),
        phrasePLR(camara?.plr),
        phraseHead(oculomotor),
        phraseSubjetivo(subjetivo),
      ].filter(Boolean)
    : [phraseSubjetivo(subjetivo)].filter(Boolean);

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
