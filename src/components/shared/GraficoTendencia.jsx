// Gráfico de tendencia (línea) para el historial biométrico. Compartido
// por MiEvolucion (panel participante) y AdminMediciones (admin).
//
// Series:
//   - Parpadeo (oculomotor.blinkRate)     — eje izquierdo
//   - Estabilidad postural (headStability) — eje izquierdo
//   - Pulso (hrv.bpm)                      — eje derecho, si hay dato
//
// Los gaps (mediciones sin pulso o sin cámara) se dejan visibles
// con connectNulls={false} en cada Line — no se interpola artificial.

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

const chartCard = {
  background: '#fff',
  border: '1px solid #dee2e6',
  borderRadius: 12,
  padding: '16px 8px 8px',
  margin: '16px 0',
};
const chartTitleStyle = {
  margin: '0 8px 12px',
  fontSize: 12,
  fontWeight: 700,
  color: '#495057',
  textTransform: 'uppercase',
  letterSpacing: 1,
};

/** "2026-06-16" → "16/06". Para eje X del gráfico. */
function fechaCorta(iso) {
  if (!iso) return '';
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

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
        disponible && oculomotor?.headStability != null
          ? oculomotor.headStability
          : null,
      pulso: disponible && hrv?.ok && hrv.bpm != null ? hrv.bpm : null,
    };
  });
}

const tooltipFormatter = (value, name) => {
  if (name === 'Parpadeo') return [`${value}/min`, name];
  if (name === 'Estabilidad postural') return [Number(value).toFixed(2), name];
  if (name === 'Pulso') return [`${value} BPM`, name];
  return [value, name];
};

/**
 * @param {{mediciones: import('../../types/biometrics').Medicion[]}} props
 *   `mediciones` debe estar ordenado ASCENDENTE por fecha.
 */
export default function GraficoTendencia({ mediciones }) {
  const data = buildChartData(mediciones);
  const validos = data.filter(
    (d) => d.parpadeo != null || d.estabilidad != null || d.pulso != null
  );
  if (validos.length < 2) return null;

  const hayPulso = data.some((d) => d.pulso != null);

  return (
    <div style={chartCard}>
      <p style={chartTitleStyle}>Cómo evolucionan las métricas</p>
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
        Parpadeo y estabilidad en el eje izquierdo. Pulso en el eje derecho (solo
        si hay dato).
      </p>
    </div>
  );
}
