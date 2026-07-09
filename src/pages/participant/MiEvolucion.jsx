// Pantalla "Mi Evolución" — historial completo de evaluaciones biométricas.
//
// Estructura:
//   1. Header
//   2. Tarjeta de tendencia (si hay >=2 mediciones con hrv.ok=true)
//   3. Timeline (más reciente arriba, cada item colapsable con las cards
//      de phrasesFromMedicion)
//   Estado vacío: mensaje + CTA que abre NeuroScan tipo='inicial'.

import { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { abrirNeuroScan } from '../../lib/neuroscan';
import { phrasesFromMedicion, formatFecha } from '../../lib/interpretaciones';
import { calcularTendencia } from '../../lib/tendencia';
import GraficoTendencia from '../../components/shared/GraficoTendencia';

// ---------- estilos ----------

const cardBase = {
  background: '#f8f9fa', border: '1px solid #dee2e6',
  borderRadius: 12, padding: 14, margin: '12px 0',
};
const cardTitleStyle = {
  margin: '0 0 6px', fontSize: 14, fontWeight: 600, color: '#212529',
  display: 'flex', alignItems: 'center', gap: 8,
};
const cardTextStyle = { margin: 0, fontSize: 13, color: '#495057', lineHeight: 1.5 };
const trendCard = {
  background: 'linear-gradient(135deg, #e7f5ff 0%, #d0ebff 100%)',
  border: '1px solid #a5d8ff', borderRadius: 16, padding: 18, margin: '16px 0',
};
const trendTitleStyle = {
  margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#1864ab',
  textTransform: 'uppercase', letterSpacing: 1,
};
const trendTextStyle = { margin: '0 0 4px', fontSize: 14, color: '#212529', lineHeight: 1.5 };

const timelineItem = {
  background: '#fff', border: '1px solid #dee2e6',
  borderRadius: 12, margin: '10px 0', overflow: 'hidden',
};
const timelineHeader = {
  padding: '14px 16px', display: 'flex', alignItems: 'center',
  justifyContent: 'space-between', gap: 12, cursor: 'pointer',
  background: 'none', border: 'none', width: '100%', textAlign: 'left',
  fontFamily: 'inherit',
};
const badge = {
  fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
  padding: '3px 8px', borderRadius: 6, background: '#e7f5ff', color: '#1864ab',
};
const timelineBody = { padding: '0 16px 16px', borderTop: '1px solid #f1f3f5' };

const btnPrimario = {
  background: '#37b24d', color: '#fff', border: 'none', borderRadius: 8,
  padding: '12px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
};
const btnDisabled = { opacity: 0.6, cursor: 'not-allowed' };

// ---------- labels ----------

const TIPO_LABELS = {
  inicial: 'Inicial',
  semanal: 'Semanal',
  cierre: 'Cierre',
  final: 'Cierre', // alias legacy
};

// ---------- tendencia (fraseo) ----------

/**
 * Formatea la tendencia raw (de src/lib/tendencia.js) en frases en segunda
 * persona ("tu pulso", "tus mediciones"). Mantiene el fraseo original de
 * la implementación inline previa al extract.
 */
function frasearTendenciaSelf(t) {
  const f1 = formatFecha(t.primeraFecha);
  const f2 = formatFecha(t.ultimaFecha);
  let bpmLinea;
  if (t.direction === 'estable') {
    bpmLinea = `Entre tus ${t.count} mediciones con pulso claro, tu ritmo cardíaco se mantuvo estable alrededor de ${t.bpm2} BPM.`;
  } else if (t.direction === 'baja') {
    bpmLinea = `Entre tu primera evaluación (${f1}) y la última (${f2}), tu pulso en reposo bajó de ${t.bpm1} a ${t.bpm2} BPM.`;
  } else {
    bpmLinea = `Entre tu primera evaluación (${f1}) y la última (${f2}), tu pulso en reposo subió de ${t.bpm1} a ${t.bpm2} BPM.`;
  }
  const confLinea = t.confChange
    ? `La confianza de la medición ${t.confChange.direction === 'mejoro' ? 'mejoró' : 'bajó'} (${t.confChange.from} → ${t.confChange.to}).`
    : null;
  return { bpmLinea, confLinea };
}

// ---------- componente ----------

export default function MiEvolucion() {
  const { currentUser } = useAuth();
  const [mediciones, setMediciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandidas, setExpandidas] = useState(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!currentUser?.uid) return;
    let cancelled = false;
    async function cargar() {
      try {
        const q = query(
          collection(db, 'usuarios', currentUser.uid, 'mediciones'),
          orderBy('fecha', 'asc')
        );
        const snap = await getDocs(q);
        if (cancelled) return;
        setMediciones(snap.docs.map((d) => d.data()));
      } catch (e) {
        if (!cancelled) setError(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    cargar();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.uid]);

  const toggle = (fecha) => {
    setExpandidas((prev) => {
      const next = new Set(prev);
      if (next.has(fecha)) next.delete(fecha);
      else next.add(fecha);
      return next;
    });
  };

  const handleComenzar = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await abrirNeuroScan(currentUser, 'inicial');
    } catch (e) {
      setError(e);
      setSubmitting(false);
    }
  };

  const tendenciaRaw = calcularTendencia(mediciones);
  const tendencia = tendenciaRaw ? frasearTendenciaSelf(tendenciaRaw) : null;
  const displayAsc = mediciones;
  const displayDesc = [...mediciones].reverse();

  return (
    <div className="page-container">
      <div className="welcome-header">
        <h1>Mi Evolución</h1>
        <p style={{ margin: '4px 0 0', color: '#868e96', fontSize: 13 }}>
          Tu historial de evaluaciones biométricas.
        </p>
      </div>

      {loading && (
        <p style={{ color: '#868e96', fontSize: 13, textAlign: 'center', marginTop: 30 }}>
          Cargando tus evaluaciones…
        </p>
      )}

      {!loading && error && !mediciones.length && (
        <div style={cardBase}>
          <p style={{ ...cardTextStyle, color: '#c92a2a' }}>
            No pudimos cargar tu historial. {error.message || ''}
          </p>
        </div>
      )}

      {!loading && !error && displayAsc.length === 0 && (
        <div style={{ ...cardBase, textAlign: 'center', padding: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🌱</div>
          <h3 style={{ margin: '0 0 8px', fontSize: 16, color: '#212529' }}>
            Todavía no hiciste tu evaluación inicial
          </h3>
          <p style={{ ...cardTextStyle, marginBottom: 18 }}>
            Antes de arrancar tu programa, medimos tu estado actual. Esto
            personaliza tu experiencia y te permite ver tu evolución real al
            final de los 28 días.
          </p>
          <button
            onClick={handleComenzar}
            disabled={submitting}
            style={{ ...btnPrimario, ...(submitting ? btnDisabled : {}) }}
          >
            {submitting ? 'Abriendo…' : 'Comenzar evaluación'}
          </button>
          {error && (
            <p style={{ marginTop: 8, fontSize: 12, color: '#c92a2a' }}>
              {error.message || 'No se pudo abrir la evaluación'}
            </p>
          )}
        </div>
      )}

      {!loading && displayAsc.length >= 2 && (
        <GraficoTendencia mediciones={displayAsc} />
      )}

      {!loading && displayAsc.length > 0 && tendencia && (
        <div style={trendCard}>
          <p style={trendTitleStyle}>📈 Cómo venís</p>
          <p style={trendTextStyle}>{tendencia.bpmLinea}</p>
          {tendencia.confLinea && <p style={trendTextStyle}>{tendencia.confLinea}</p>}
        </div>
      )}

      {!loading && displayAsc.length > 0 && (
        <div>
          {displayDesc.map((m) => {
            const abierta = expandidas.has(m.fecha);
            const tipoLabel = TIPO_LABELS[m.tipo];
            const cards = phrasesFromMedicion(m);
            return (
              <div key={m.fecha} style={timelineItem}>
                <button
                  style={timelineHeader}
                  onClick={() => toggle(m.fecha)}
                  aria-expanded={abierta}
                >
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#212529' }}>
                      {formatFecha(m.fecha)}
                    </div>
                    {tipoLabel && (
                      <span style={{ ...badge, display: 'inline-block', marginTop: 4 }}>
                        {tipoLabel}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: 20, color: '#868e96' }}>
                    {abierta ? '▴' : '▾'}
                  </span>
                </button>
                {abierta && (
                  <div style={timelineBody}>
                    {cards.length === 0 && (
                      <p style={{ ...cardTextStyle, marginTop: 12 }}>
                        Esta evaluación no tiene datos interpretables.
                      </p>
                    )}
                    {cards.map((c, i) => (
                      <div key={i} style={cardBase}>
                        <h3 style={cardTitleStyle}>
                          <span aria-hidden="true">{c.icon}</span> {c.title}
                        </h3>
                        <p style={cardTextStyle}>{c.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loading && displayAsc.length > 0 && (
        <p
          style={{
            fontSize: 12,
            color: '#adb5bd',
            marginTop: 20,
            borderTop: '1px solid #dee2e6',
            paddingTop: 12,
          }}
        >
          Datos objetivos medidos localmente durante cada sesión. Sirven para
          ver tu evolución a lo largo del programa, no como valor clínico
          absoluto.
        </p>
      )}
    </div>
  );
}
