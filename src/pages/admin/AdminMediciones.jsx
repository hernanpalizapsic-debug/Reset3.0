// Vista admin de mediciones biométricas.
//
// Layout master-detail:
//   - Sidebar: lista de participantes (nombre + email)
//   - Detail: gráfico + tendencia textual + timeline de mediciones,
//     cada item con dos secciones cuando expandido:
//       (a) "Lo que vio el usuario" — phrasesFromMedicion (compartidas)
//       (b) "Detalle técnico" — <details> con JSON completo del doc
//
// Reglas: admin lee cualquier usuarios/{uid}/mediciones — ya cubierto por
// el rule `allow read: if isOwner(uid) || isAdmin()` en /mediciones/{fecha}.

import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, onSnapshot, orderBy, query } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { db } from '../../firebase/config';
import { phrasesFromMedicion, formatFecha } from '../../lib/interpretaciones';
import { calcularTendencia } from '../../lib/tendencia';
import GraficoTendencia from '../../components/shared/GraficoTendencia';

// ---------- estilos ----------

const backLinkStyle = {
  display: 'inline-block',
  marginBottom: 12,
  fontSize: 13,
  color: '#495057',
  textDecoration: 'none',
};

const layoutStyle = {
  display: 'flex',
  gap: 16,
  flexWrap: 'wrap',
  marginTop: 16,
};
const sidebarStyle = { flex: '0 0 260px', minWidth: 240 };
const detailStyle = { flex: '1 1 400px', minWidth: 300 };

const sidebarTitleStyle = {
  margin: '0 0 8px',
  fontSize: 11,
  fontWeight: 700,
  color: '#495057',
  textTransform: 'uppercase',
  letterSpacing: 1,
};
const sidebarItem = {
  display: 'block',
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #dee2e6',
  borderRadius: 8,
  background: '#fff',
  cursor: 'pointer',
  textAlign: 'left',
  marginBottom: 6,
  fontFamily: 'inherit',
};
const sidebarItemActive = {
  background: '#e7f5ff',
  border: '1px solid #4dabf7',
};

const cardBase = {
  background: '#f8f9fa',
  border: '1px solid #dee2e6',
  borderRadius: 12,
  padding: 14,
  margin: '12px 0',
};
const cardTitleStyle = {
  margin: '0 0 6px',
  fontSize: 14,
  fontWeight: 600,
  color: '#212529',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};
const cardTextStyle = { margin: 0, fontSize: 13, color: '#495057', lineHeight: 1.5 };

const trendCard = {
  background: 'linear-gradient(135deg, #e7f5ff 0%, #d0ebff 100%)',
  border: '1px solid #a5d8ff',
  borderRadius: 16,
  padding: 18,
  margin: '16px 0',
};
const trendTitleStyle = {
  margin: '0 0 8px',
  fontSize: 12,
  fontWeight: 700,
  color: '#1864ab',
  textTransform: 'uppercase',
  letterSpacing: 1,
};
const trendTextStyle = {
  margin: '0 0 4px',
  fontSize: 14,
  color: '#212529',
  lineHeight: 1.5,
};

const timelineItem = {
  background: '#fff',
  border: '1px solid #dee2e6',
  borderRadius: 12,
  margin: '10px 0',
  overflow: 'hidden',
};
const timelineHeader = {
  padding: '14px 16px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  cursor: 'pointer',
  background: 'none',
  border: 'none',
  width: '100%',
  textAlign: 'left',
  fontFamily: 'inherit',
};
const badge = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 0.5,
  textTransform: 'uppercase',
  padding: '3px 8px',
  borderRadius: 6,
  background: '#e7f5ff',
  color: '#1864ab',
};
const timelineBody = { padding: '0 16px 16px', borderTop: '1px solid #f1f3f5' };

const sectionLabel = {
  margin: '14px 0 6px',
  fontSize: 11,
  fontWeight: 700,
  color: '#868e96',
  textTransform: 'uppercase',
  letterSpacing: 1,
};

const detailsBox = {
  background: '#212529',
  border: '1px solid #343a40',
  borderRadius: 8,
  padding: '10px 12px',
  margin: '8px 0 4px',
};
const detailsSummary = {
  fontSize: 12,
  fontWeight: 600,
  color: '#adb5bd',
  cursor: 'pointer',
  userSelect: 'none',
};
const detailsPre = {
  margin: '10px 0 0',
  fontSize: 11,
  color: '#e9ecef',
  fontFamily: 'ui-monospace, "Cascadia Code", Menlo, monospace',
  lineHeight: 1.5,
  overflowX: 'auto',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
};

// ---------- labels ----------

const TIPO_LABELS = {
  inicial: 'Inicial',
  semanal: 'Semanal',
  cierre: 'Cierre',
  final: 'Cierre', // alias legacy
};

// ---------- helper: fraseo tendencia en 3a persona (admin) ----------

function frasearTendenciaAdmin(t, nombre) {
  const sujeto = nombre || 'El participante';
  const posesivo = nombre ? `de ${nombre}` : 'del participante';
  const f1 = formatFecha(t.primeraFecha);
  const f2 = formatFecha(t.ultimaFecha);
  let bpmLinea;
  if (t.direction === 'estable') {
    bpmLinea = `En las ${t.count} mediciones con pulso claro, el ritmo cardíaco ${posesivo} se mantuvo estable alrededor de ${t.bpm2} BPM.`;
  } else if (t.direction === 'baja') {
    bpmLinea = `Entre la primera evaluación (${f1}) y la última (${f2}), el pulso en reposo ${posesivo} bajó de ${t.bpm1} a ${t.bpm2} BPM.`;
  } else {
    bpmLinea = `Entre la primera evaluación (${f1}) y la última (${f2}), el pulso en reposo ${posesivo} subió de ${t.bpm1} a ${t.bpm2} BPM.`;
  }
  const confLinea = t.confChange
    ? `La confianza ${dirLabel(t.confChange.direction)} (${t.confChange.from} → ${t.confChange.to}).`
    : null;
  // sujeto solo se referencia para no romper si nombre viene vacío
  return { bpmLinea, confLinea, sujeto };
}
function dirLabel(dir) { return dir === 'mejoro' ? 'mejoró' : 'bajó'; }

// ---------- componente ----------

export default function AdminMediciones() {
  const [participantes, setParticipantes] = useState([]);
  const [selectedUid, setSelectedUid] = useState(null);
  const [mediciones, setMediciones] = useState([]);
  const [loadingMediciones, setLoadingMediciones] = useState(false);
  const [error, setError] = useState(null);
  const [expandidas, setExpandidas] = useState(new Set());

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'usuarios'), orderBy('creadoEn', 'desc')),
      (snap) => {
        const arr = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((u) => u.rol === 'participante');
        setParticipantes(arr);
      },
      (err) => {
        console.error('[AdminMediciones] usuarios:', err.code, err.message);
        setError(err);
      }
    );
    return unsub;
  }, []);

  useEffect(() => {
    if (!selectedUid) {
      setMediciones([]);
      setExpandidas(new Set());
      return;
    }
    let cancelled = false;
    setLoadingMediciones(true);
    setError(null);
    async function cargar() {
      try {
        const q = query(
          collection(db, 'usuarios', selectedUid, 'mediciones'),
          orderBy('fecha', 'asc')
        );
        const snap = await getDocs(q);
        if (!cancelled) {
          setMediciones(snap.docs.map((d) => d.data()));
          setExpandidas(new Set());
        }
      } catch (e) {
        if (!cancelled) setError(e);
      } finally {
        if (!cancelled) setLoadingMediciones(false);
      }
    }
    cargar();
    return () => {
      cancelled = true;
    };
  }, [selectedUid]);

  const toggle = (fecha) =>
    setExpandidas((prev) => {
      const next = new Set(prev);
      if (next.has(fecha)) next.delete(fecha);
      else next.add(fecha);
      return next;
    });

  const seleccionado = participantes.find((u) => u.id === selectedUid) || null;
  const nombreSel = seleccionado
    ? [seleccionado.nombre, seleccionado.apellido].filter(Boolean).join(' ') ||
      seleccionado.email
    : '';
  const primerNombre = seleccionado?.nombre || 'el participante';

  const tendenciaRaw = useMemo(() => calcularTendencia(mediciones), [mediciones]);
  const tendencia = useMemo(
    () => (tendenciaRaw ? frasearTendenciaAdmin(tendenciaRaw, seleccionado?.nombre) : null),
    [tendenciaRaw, seleccionado?.nombre]
  );
  const displayDesc = useMemo(() => [...mediciones].reverse(), [mediciones]);

  return (
    <div className="page-container">
      <Link to="/admin" style={backLinkStyle}>
        ← Volver al Dashboard
      </Link>
      <h1>Mediciones biométricas</h1>
      <p className="subtitulo">Vista de admin — con detalle técnico completo por medición.</p>

      <div style={layoutStyle}>
        {/* Sidebar */}
        <div style={sidebarStyle}>
          <p style={sidebarTitleStyle}>
            Participantes ({participantes.length})
          </p>
          {participantes.length === 0 && (
            <p style={cardTextStyle}>Sin participantes registrados.</p>
          )}
          {participantes.map((u) => {
            const activo = selectedUid === u.id;
            const nombre =
              [u.nombre, u.apellido].filter(Boolean).join(' ') || u.email || '(sin nombre)';
            return (
              <button
                key={u.id}
                onClick={() => setSelectedUid(u.id)}
                style={{ ...sidebarItem, ...(activo ? sidebarItemActive : {}) }}
              >
                <div style={{ fontWeight: 600, fontSize: 14, color: '#212529' }}>
                  {nombre}
                </div>
                {u.email && (
                  <div style={{ fontSize: 11, color: '#868e96', marginTop: 2 }}>
                    {u.email}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Detail */}
        <div style={detailStyle}>
          {!selectedUid && (
            <div style={cardBase}>
              <p style={cardTextStyle}>
                Seleccioná un participante de la lista para ver sus mediciones.
              </p>
            </div>
          )}

          {selectedUid && loadingMediciones && (
            <p style={{ textAlign: 'center', color: '#868e96', marginTop: 24 }}>
              Cargando mediciones…
            </p>
          )}

          {selectedUid && !loadingMediciones && error && (
            <div style={cardBase}>
              <p style={{ ...cardTextStyle, color: '#c92a2a' }}>
                Error cargando mediciones: {error.message || 'desconocido'}
              </p>
            </div>
          )}

          {selectedUid && !loadingMediciones && !error && mediciones.length === 0 && (
            <div style={cardBase}>
              <p style={cardTextStyle}>
                {nombreSel} todavía no tiene mediciones registradas.
              </p>
            </div>
          )}

          {selectedUid && !loadingMediciones && !error && mediciones.length > 0 && (
            <>
              <h2 style={{ margin: '0 0 4px', color: '#212529', fontSize: 20 }}>
                {nombreSel}
              </h2>
              <p style={{ margin: '0 0 12px', color: '#868e96', fontSize: 12 }}>
                {mediciones.length} medici{mediciones.length === 1 ? 'ón' : 'ones'} · orden ascendente
              </p>

              {mediciones.length >= 2 && <GraficoTendencia mediciones={mediciones} />}

              {tendencia && (
                <div style={trendCard}>
                  <p style={trendTitleStyle}>📈 Cómo viene</p>
                  <p style={trendTextStyle}>{tendencia.bpmLinea}</p>
                  {tendencia.confLinea && (
                    <p style={trendTextStyle}>{tendencia.confLinea}</p>
                  )}
                </div>
              )}

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
                          <p style={sectionLabel}>
                            ▸ Lo que vio {primerNombre}
                          </p>
                          {cards.length === 0 && (
                            <p style={cardTextStyle}>Sin datos interpretables.</p>
                          )}
                          {cards.map((c, i) => (
                            <div key={i} style={cardBase}>
                              <h3 style={cardTitleStyle}>
                                <span aria-hidden="true">{c.icon}</span> {c.title}
                              </h3>
                              <p style={cardTextStyle}>{c.text}</p>
                            </div>
                          ))}

                          <p style={sectionLabel}>▸ Detalle técnico (admin)</p>
                          <details style={detailsBox}>
                            <summary style={detailsSummary}>
                              Ver JSON crudo del documento
                            </summary>
                            <pre style={detailsPre}>{JSON.stringify(m, null, 2)}</pre>
                          </details>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
