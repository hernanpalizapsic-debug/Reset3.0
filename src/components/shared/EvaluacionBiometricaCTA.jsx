// CTA para invitar al participante a hacer la evaluación biométrica
// (día 1 inicial, check-ins semanales, día 28 cierre). Se monta en Inicio.jsx.
//
// Estados:
//   - `null` si el día actual no cae en una ventana de check-in
//   - CTA "prominent" (día 1 y 28+) o "compact" (días 7-9, 14-16, 21-23)
//   - Bloque verde "✓ completada" si ya existe una medición con
//     fuentes.camara.disponible = true dentro del rango de fechas del check-in.

import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { abrirNeuroScan } from '../../lib/neuroscan';

/**
 * Ventanas de check-in del programa de 28 días.
 * Si dia cae en un rango, se muestra el bloque con ese tipo/variant.
 * `dias: [inicio, fin]` es inclusivo; fin `null` = abierto hacia adelante.
 */
const RANGOS = [
  { dias: [1, 1],     tipo: 'inicial', variant: 'prominent' },
  { dias: [7, 9],     tipo: 'semanal', variant: 'compact' },
  { dias: [14, 16],   tipo: 'semanal', variant: 'compact' },
  { dias: [21, 23],   tipo: 'semanal', variant: 'compact' },
  { dias: [28, null], tipo: 'cierre',  variant: 'prominent' },
];

function determinarCheckIn(dia) {
  return (
    RANGOS.find(({ dias: [d0, d1] }) => dia >= d0 && (d1 === null || dia <= d1)) || null
  );
}

/**
 * Convierte "día N del programa" → fecha ISO ("YYYY-MM-DD"), en UTC.
 * `diaInicio` puede ser string ISO o Firestore Timestamp (según cómo lo
 * guarde el resto del sistema).
 */
function fechaDelDia(diaInicio, n) {
  if (!diaInicio || n == null) return null;
  const base = diaInicio?.toDate ? diaInicio.toDate() : new Date(diaInicio);
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + n - 1);
  return d.toISOString().split('T')[0];
}

const COPIA = {
  inicial: {
    titulo: 'Medí tu sistema nervioso antes de empezar',
    texto:
      'Esta evaluación registra tu estado inicial. Al final de los 28 días vas a poder comparar y ver tu evolución real.',
    boton: 'Comenzar evaluación',
  },
  semanal: {
    titulo: 'Check-in semanal',
    texto: 'Registrá cómo está tu sistema nervioso hoy.',
    boton: 'Hacer check-in',
  },
  cierre: {
    titulo: 'Evaluación de cierre',
    texto:
      'Completá la evaluación final para ver tu transformación en estos 28 días.',
    boton: 'Ver mi evolución',
  },
};

/** Convierte ISO "YYYY-MM-DD" a "DD/MM/YYYY" sin issues de timezone. */
function formatearFecha(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

const S = {
  prominent: {
    background: 'linear-gradient(135deg, #e7f5ff 0%, #d0ebff 100%)',
    border: '1px solid #a5d8ff',
    borderRadius: 16,
    padding: 20,
    margin: '16px 0',
  },
  compact: {
    background: '#f8f9fa',
    border: '1px solid #dee2e6',
    borderRadius: 12,
    padding: 14,
    margin: '12px 0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  titProm: { margin: '0 0 8px', fontSize: 16, fontWeight: 600, color: '#1864ab' },
  titComp: { margin: 0, fontSize: 14, fontWeight: 600, color: '#495057' },
  txtProm: { margin: '0 0 14px', fontSize: 13, color: '#495057', lineHeight: 1.5 },
  txtComp: { margin: '2px 0 0', fontSize: 12, color: '#868e96', lineHeight: 1.4 },
  btn: {
    background: '#1c7ed6', color: '#fff', border: 'none', borderRadius: 8,
    fontWeight: 600, cursor: 'pointer',
  },
  btnProm: { padding: '10px 18px', fontSize: 14 },
  btnComp: { padding: '6px 14px', fontSize: 13, whiteSpace: 'nowrap' },
  btnDisabled: { opacity: 0.6, cursor: 'not-allowed' },
  err: { marginTop: 8, fontSize: 12, color: '#c92a2a' },
};

export default function EvaluacionBiometricaCTA({ dia, diaInicio, currentUser }) {
  const [mediciones, setMediciones] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const cfg = determinarCheckIn(dia);
    if (!cfg || !diaInicio || !currentUser?.uid) return;
    const [d0, d1] = cfg.dias;
    const fInicio = fechaDelDia(diaInicio, d0);
    // Rango abierto (cierre): usamos un centinela lexicográficamente máximo.
    const fFin = d1 !== null ? fechaDelDia(diaInicio, d1) : '9999-12-31';
    if (!fInicio) return;
    let cancelled = false;
    const q = query(
      collection(db, 'usuarios', currentUser.uid, 'mediciones'),
      where('__name__', '>=', fInicio),
      where('__name__', '<=', fFin)
    );
    getDocs(q)
      .then((snap) => {
        if (cancelled) return;
        setMediciones(snap.docs.map((d) => d.data()));
      })
      .catch(() => {
        // Fetch silencioso — si falla mostramos el CTA optimistamente.
      });
    return () => {
      cancelled = true;
    };
  }, [dia, diaInicio, currentUser?.uid]);

  const cfg = determinarCheckIn(dia);
  if (!cfg) return null;

  const completada = mediciones.find((m) => m.fuentes?.camara?.disponible === true);
  const copia = COPIA[cfg.tipo];

  if (completada) {
    return (
      <div className="inicio-flujo-card done" style={{ margin: '16px 0' }}>
        <div className="inicio-flujo-info">
          <span className="inicio-flujo-icon">✅</span>
          <div>
            <strong>✓ Evaluación completada</strong>
            <p style={{ fontSize: 12, color: '#495057', margin: '2px 0 0' }}>
              {formatearFecha(completada.fecha)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleAbrir = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await abrirNeuroScan(currentUser, cfg.tipo);
      // Si arrancó la navegación, no volvemos a este componente.
    } catch (e) {
      setError(e?.message || 'No se pudo abrir la evaluación');
      setSubmitting(false);
    }
  };

  if (cfg.variant === 'compact') {
    return (
      <div style={S.compact}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={S.titComp}>{copia.titulo}</p>
          <p style={S.txtComp}>{copia.texto}</p>
        </div>
        <button
          onClick={handleAbrir}
          disabled={submitting}
          style={{ ...S.btn, ...S.btnComp, ...(submitting ? S.btnDisabled : {}) }}
        >
          {submitting ? 'Abriendo…' : copia.boton}
        </button>
        {error && <p style={S.err}>{error}</p>}
      </div>
    );
  }

  return (
    <div style={S.prominent}>
      <h3 style={S.titProm}>{copia.titulo}</h3>
      <p style={S.txtProm}>{copia.texto}</p>
      <button
        onClick={handleAbrir}
        disabled={submitting}
        style={{ ...S.btn, ...S.btnProm, ...(submitting ? S.btnDisabled : {}) }}
      >
        {submitting ? 'Abriendo…' : copia.boton}
      </button>
      {error && <p style={S.err}>{error}</p>}
    </div>
  );
}
