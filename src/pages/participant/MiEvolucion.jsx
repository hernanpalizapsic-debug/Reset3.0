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
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { abrirNeuroScan } from '../../lib/neuroscan';
import { phrasesFromMedicion, formatFecha } from '../../lib/interpretaciones';

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
const chartCard = {
  background: '#fff', border: '1px solid #dee2e6', borderRadius: 12,
  padding: '16px 8px 8px', margin: '16px 0',
};
const chartTitleStyle = {
  margin: '0 8px 12px', fontSize: 12, fontWeight: 700, color: '#495057',
  textTransform: 'uppercase', letterSpacing: 1,
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

// ---------- tendencia ----------

const CONF_RANK = { Ninguna: 0, Baja: 1, Media: 2, Alta: 3 };

/** "2026-06-16" → "16/06". Para eje X del gráfico. */
function fechaCorta(iso) {
  if (!iso) return '';
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

/**
 * Arma la serie para recharts. Cada punto tiene los 3 valores (o null si
 * no aplica). connectNulls={false} en cada Line hace que los gaps queden
 * visibles como interrupciones de línea, en vez de forzar una línea recta
 * entre puntos válidos separados por un hueco.
 */
function buildChartData(medicionesAsc) {
  return medicionesAsc.map((m) => {
    const camara = m?.fuentes?.camara;
    const disponible = !!camara?.disponible;
    const oculomotor = camara?.oculomotor;
    const hrv = camara?.hrv;
    return {
      fecha: fechaCorta(m.fecha),
      parpadeo:
        disponible && oculomotor?.blinkRate != null ? oculomotor.blinkRate : null,
      estabilidad:
        disponible && oculomotor?.headStability != null ? oculomotor.headStability : null,
      pulso:
        disponible && hrv?.ok && hrv.bpm != null ? hrv.bpm : null,
    };
  });
}

function GraficoTendencia({ mediciones }) {
  // Con menos de 2 puntos válidos no hay tendencia que mostrar.
  const data = buildChartData(mediciones);
  const validos = data.filter(
    (d) => d.parpadeo != null || d.estabilidad != null || d.pulso != null
  );
  if (validos.length < 2) return null;

  const hayPulso = data.some((d) => d.pulso != null);

  const tooltipFormatter = (value, name) => {
    if (name === 'Parpadeo') return [`${value}/min`, name];
    if (name === 'Estabilidad postural') return [Number(value).toFixed(2), name];
    if (name === 'Pulso') return [`${value} BPM`, name];
    return [value, name];
  };

  return (
    <div style={chartCard}>
      <p style={chartTitleStyle}>Cómo evolucionan tus métricas</p>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
          <XAxis
            dataKey="fecha"
            tick={{ fontSize: 11, fill: '#868e96' }}
            tickMargin={6}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fill: '#868e96' }}
            width={32}
            domain={[0, 'dataMax + 2']}
          />
          {hayPulso && (
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11, fill: '#868e96' }}
              width={32}
              domain={['dataMin - 5', 'dataMax + 5']}
            />
          )}
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: '1px solid #dee2e6',
              fontSize: 12,
            }}
            formatter={tooltipFormatter}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 6 }}
            iconType="circle"
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="parpadeo"
            name="Parpadeo"
            stroke="#1c7ed6"
            strokeWidth={2}
            connectNulls={false}
            dot={{ r: 3, strokeWidth: 0, fill: '#1c7ed6' }}
            activeDot={{ r: 5 }}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="estabilidad"
            name="Estabilidad postural"
            stroke="#37b24d"
            strokeWidth={2}
            connectNulls={false}
            dot={{ r: 3, strokeWidth: 0, fill: '#37b24d' }}
            activeDot={{ r: 5 }}
          />
          {hayPulso && (
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="pulso"
              name="Pulso"
              stroke="#e64980"
              strokeWidth={2}
              connectNulls={false}
              dot={{ r: 3, strokeWidth: 0, fill: '#e64980' }}
              activeDot={{ r: 5 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
      <p style={{ margin: '4px 12px 0', fontSize: 10, color: '#adb5bd' }}>
        Parpadeo y estabilidad en el eje izquierdo. Pulso en el eje derecho (solo si hay dato).
      </p>
    </div>
  );
}

function calcularTendencia(medicionesAsc) {
  const validas = medicionesAsc.filter(
    (m) => m?.fuentes?.camara?.hrv?.ok === true && m.fuentes.camara.hrv.bpm != null
  );
  if (validas.length < 2) return null;
  const primera = validas[0];
  const ultima = validas[validas.length - 1];
  const bpm1 = primera.fuentes.camara.hrv.bpm;
  const bpm2 = ultima.fuentes.camara.hrv.bpm;
  const delta = bpm2 - bpm1;
  const absDelta = Math.abs(delta);
  const f1 = formatFecha(primera.fecha);
  const f2 = formatFecha(ultima.fecha);

  let bpmLinea;
  if (absDelta < 2) {
    bpmLinea = `Entre tus ${validas.length} mediciones con pulso claro, tu ritmo cardíaco se mantuvo estable alrededor de ${bpm2} BPM.`;
  } else if (delta < 0) {
    bpmLinea = `Entre tu primera evaluación (${f1}) y la última (${f2}), tu pulso en reposo bajó de ${bpm1} a ${bpm2} BPM.`;
  } else {
    bpmLinea = `Entre tu primera evaluación (${f1}) y la última (${f2}), tu pulso en reposo subió de ${bpm1} a ${bpm2} BPM.`;
  }

  const c1 = CONF_RANK[primera.fuentes.camara.hrv.confidence];
  const c2 = CONF_RANK[ultima.fuentes.camara.hrv.confidence];
  let confLinea = null;
  if (c1 != null && c2 != null && c1 !== c2) {
    const dir = c2 > c1 ? 'mejoró' : 'bajó';
    confLinea = `La confianza de la medición ${dir} (${primera.fuentes.camara.hrv.confidence} → ${ultima.fuentes.camara.hrv.confidence}).`;
  }

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

  const tendencia = calcularTendencia(mediciones);
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
