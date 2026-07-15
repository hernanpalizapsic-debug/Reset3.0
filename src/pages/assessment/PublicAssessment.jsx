// Página pública /assessment/:token — sin auth Firebase.
//
// Orquesta la máquina de estados del flujo del ejecutivo:
//   loading → (error | intro) → running(0..N-1) → submitting → done
//
// Los cuestionarios licensed:false se saltean silenciosamente.
// Toda la comunicación con Firestore va por /api/assessment/*.

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ASSESSMENT_INSTRUMENTS } from '../../lib/instruments';
import { getAssessment, submitAssessment } from '../../lib/assessment-api';
import Cuestionario from '../../components/assessment/Cuestionario';
import Gracias from './Gracias';

// ---------- estilos ----------

const centered = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
  textAlign: 'center',
};
const introCard = {
  maxWidth: 480,
  background: '#fff',
  border: '1px solid #dee2e6',
  borderRadius: 16,
  padding: '32px 24px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
};
const btnPrimary = {
  marginTop: 24,
  padding: '14px 28px',
  fontSize: 15,
  fontWeight: 600,
  border: 'none',
  borderRadius: 10,
  background: '#37b24d',
  color: '#fff',
  cursor: 'pointer',
};
const errorColor = { color: '#c92a2a' };
const mutedColor = { color: '#868e96' };

// ---------- copy de estados de error ----------

const ERROR_COPY = {
  not_found: {
    icon: '🔗',
    title: 'Link no encontrado',
    text: 'Este link no existe o fue eliminado. Contactá con quien te lo envió para pedir uno nuevo.',
  },
  expired: {
    icon: '⏰',
    title: 'Link expirado',
    text: 'Este link superó su fecha límite. Contactá con quien te lo envió para generar uno nuevo.',
  },
  already_completed: {
    icon: '✅',
    title: 'Ya respondiste este assessment',
    text: 'Este link ya fue usado. Si necesitás volver a hacerlo, contactá con quien te lo envió.',
  },
};

function fallbackError(err) {
  return {
    icon: '⚠️',
    title: 'No pudimos cargar el assessment',
    text: err.message || 'Ocurrió un problema al abrir tu link. Intentalo de nuevo más tarde.',
  };
}

// ---------- componente ----------

export default function PublicAssessment() {
  const { token } = useParams();
  const [phase, setPhase] = useState('loading');
  const [assessment, setAssessment] = useState(null);
  const [error, setError] = useState(null);
  const [instrIndex, setInstrIndex] = useState(0);
  const [respuestasSoFar, setRespuestasSoFar] = useState({});
  const [submitErr, setSubmitErr] = useState(null);

  // Instrumentos que realmente vamos a mostrar (skipping licensed:false).
  const activos = useMemo(
    () => ASSESSMENT_INSTRUMENTS.filter((i) => i.licensed !== false),
    []
  );

  useEffect(() => {
    if (!token) {
      setPhase('error');
      setError({ code: 'missing_token', message: 'Falta el token en la URL.' });
      return;
    }
    let cancelled = false;
    getAssessment(token)
      .then((data) => {
        if (cancelled) return;
        setAssessment(data);
        setPhase('intro');
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err);
        setPhase('error');
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function submit(respuestas) {
    setPhase('submitting');
    setSubmitErr(null);
    try {
      await submitAssessment(token, respuestas);
      setPhase('done');
    } catch (err) {
      setSubmitErr(err);
      setPhase('submit_error');
    }
  }

  function handleInstrumentComplete(respArr) {
    const inst = activos[instrIndex];
    // Uso inst.key (no inst.id) — la shape de instruments.js usa `key` como
    // identificador semántico ('pss10' | 'isi' | 'claridad'). scoreAssessment
    // espera ese mismo nombre.
    const nextResp = { ...respuestasSoFar, [inst.key]: respArr };
    setRespuestasSoFar(nextResp);
    if (instrIndex + 1 >= activos.length) {
      submit(nextResp);
    } else {
      setInstrIndex(instrIndex + 1);
    }
  }

  // ---------- render por fase ----------

  if (phase === 'loading') {
    return (
      <div style={centered}>
        <p style={mutedColor}>Cargando tu assessment…</p>
      </div>
    );
  }

  if (phase === 'error') {
    const copy = error?.code && ERROR_COPY[error.code]
      ? ERROR_COPY[error.code]
      : fallbackError(error || {});
    return (
      <div style={centered}>
        <div style={introCard}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>{copy.icon}</div>
          <h1 style={{ margin: '0 0 12px', fontSize: 22, color: '#212529' }}>
            {copy.title}
          </h1>
          <p style={{ margin: 0, color: '#495057', lineHeight: 1.6 }}>{copy.text}</p>
        </div>
      </div>
    );
  }

  if (phase === 'intro') {
    if (activos.length === 0) {
      // Caso raro: todos los instrumentos son licensed:false.
      return (
        <div style={centered}>
          <div style={introCard}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🚧</div>
            <h1 style={{ margin: '0 0 12px', fontSize: 22 }}>
              Assessment todavía no disponible
            </h1>
            <p style={{ margin: 0, color: '#495057', lineHeight: 1.6 }}>
              Los cuestionarios se están terminando de preparar. Volvé más
              tarde con el mismo link.
            </p>
          </div>
        </div>
      );
    }
    const totalItems = activos.reduce((s, i) => s + i.items.length, 0);
    const minutos = Math.max(3, Math.round(totalItems * 0.15));
    return (
      <div style={centered}>
        <div style={introCard}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>👋</div>
          <h1 style={{ margin: '0 0 8px', fontSize: 22, color: '#212529' }}>
            Hola{assessment?.ejecutivoNombre ? <>, {assessment.ejecutivoNombre.split(' ')[0]}</> : ''}
          </h1>
          <p style={{ margin: '0 0 16px', color: '#495057', lineHeight: 1.6 }}>
            {assessment?.empresa ? (
              <><b>{assessment.empresa}</b> te compartió un breve assessment.</>
            ) : (
              'Te compartieron un breve assessment.'
            )}{' '}
            Vas a responder {activos.length} cuestionario{activos.length === 1 ? '' : 's'} corto{activos.length === 1 ? '' : 's'} — te lleva unos <b>{minutos} minutos</b>.
          </p>
          <p style={{ margin: 0, color: '#868e96', fontSize: 13 }}>
            Tus respuestas son confidenciales y se comparten solo con el equipo
            que gestiona el programa.
          </p>
          <button style={btnPrimary} onClick={() => setPhase('running')}>
            Comenzar
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'running') {
    const inst = activos[instrIndex];
    return (
      // key={inst.key} fuerza a React a desmontar + remontar Cuestionario
      // cuando cambiamos de instrumento. Sin esto, el estado interno (idx,
      // respuestas) del instrumento anterior queda vivo y rompe si el
      // siguiente tiene menos ítems (ej. idx=9 de PSS-10 → items[9]
      // undefined cuando el próximo es ISI con 7 ítems).
      <Cuestionario
        key={inst.key}
        instrumento={inst}
        subheader={`${instrIndex + 1} / ${activos.length}`}
        onComplete={handleInstrumentComplete}
      />
    );
  }

  if (phase === 'submitting') {
    return (
      <div style={centered}>
        <p style={mutedColor}>Enviando tus respuestas…</p>
      </div>
    );
  }

  if (phase === 'submit_error') {
    return (
      <div style={centered}>
        <div style={introCard}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
          <h1 style={{ margin: '0 0 12px', fontSize: 22 }}>
            No pudimos enviar tus respuestas
          </h1>
          <p style={{ margin: '0 0 6px', color: '#495057', lineHeight: 1.6 }}>
            Ocurrió un problema guardando tus respuestas. Podés reintentar sin
            perder lo que ya respondiste.
          </p>
          {submitErr?.message && (
            <p style={{ margin: '4px 0 0', fontSize: 12, ...errorColor }}>
              {submitErr.message}
            </p>
          )}
          <button
            style={btnPrimary}
            onClick={() => submit(respuestasSoFar)}
          >
            Reintentar envío
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'done') {
    return <Gracias empresa={assessment?.empresa} />;
  }

  return null;
}
