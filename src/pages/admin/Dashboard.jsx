import { useEffect, useState } from 'react';
import { db } from '../../firebase/config';
import {
  collection, onSnapshot, query, orderBy,
  where, getDocs,
} from 'firebase/firestore';
import HistorialParticipante from './HistorialParticipante';

const estadoColor = {
  simpatico: '#FF6B6B',
  dorsal: '#6B9BD2',
  ventral: '#51CF66',
};
const estadoLabel = {
  simpatico: '⚡ Simpático',
  dorsal: '🌊 Dorsal',
  ventral: '🌿 Ventral',
};

function calcularDiaPrograma(diaInicio) {
  if (!diaInicio) return 1;
  const inicio = new Date(diaInicio);
  const hoy = new Date();
  const diff = Math.floor((hoy - inicio) / (1000 * 60 * 60 * 24));
  return Math.min(Math.max(diff + 1, 1), 28);
}

// Usa diaInicio como fallback en vez de devolver 999
function diasSinActividad(registros, uid, diaInicio) {
  const fechas = registros
    .filter((r) => r.uid === uid)
    .map((r) => r.fecha)
    .sort()
    .reverse();

  const fechaReferencia = fechas.length > 0 ? fechas[0] : diaInicio;
  if (!fechaReferencia) return 0;

  const ref = new Date(fechaReferencia);
  const hoy = new Date();
  return Math.max(Math.floor((hoy - ref) / (1000 * 60 * 60 * 24)), 0);
}

export default function Dashboard() {
  const [usuarios, setUsuarios] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [notasMap, setNotasMap] = useState({});   // uid → nota más reciente
  const [filtro, setFiltro] = useState('todos');
  const [historialUid, setHistorialUid] = useState(null);
  const hoy = new Date().toISOString().split('T')[0];

  // Usuarios y registros en tiempo real
  useEffect(() => {
    const unsubUsuarios = onSnapshot(
      query(collection(db, 'usuarios'), orderBy('creadoEn', 'desc')),
      (snap) => setUsuarios(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => console.error('[Admin] Error leyendo usuarios:', err.code, err.message)
    );
    const unsubRegistros = onSnapshot(
      collection(db, 'registros'),
      (snap) => setRegistros(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => console.error('[Admin] Error leyendo registros:', err.code, err.message)
    );
    return () => { unsubUsuarios(); unsubRegistros(); };
  }, []);

  // Notas más recientes por usuario (carga única, se refresca cuando cambian usuarios)
  useEffect(() => {
    async function cargarNotas() {
      const participantes = usuarios.filter((u) => u.rol === 'participante');
      if (participantes.length === 0) return;

      const mapa = {};
      await Promise.all(
        participantes.map(async (u) => {
          try {
            const q = query(
              collection(db, 'notas'),
              where('uid', '==', u.id),
              orderBy('creadoEn', 'desc')
            );
            const snap = await getDocs(q);
            if (!snap.empty) {
              mapa[u.id] = snap.docs[0].data().texto;
            }
          } catch { /* sin notas o sin índice aún */ }
        })
      );
      setNotasMap(mapa);
    }
    cargarNotas();
  }, [usuarios]);

  const participantes = usuarios.filter((u) => u.rol === 'participante');

  // For display of morning-specific data (state, AI conversation)
  const registrosDiurnos = registros.filter((r) => r.tipo !== 'noche');

  // Activity = any record for today (morning, old check-in, or night)
  const participantesFiltrados = participantes.filter((u) => {
    const hizoPractica = registros.some((r) => r.uid === u.id && r.fecha === hoy);
    const dias = diasSinActividad(registros, u.id, u.diaInicio);
    if (filtro === 'activos') return hizoPractica;
    if (filtro === 'inactivos') return !hizoPractica;
    if (filtro === 'alerta') return dias >= 2;
    return true;
  });

  const totalActivos = participantes.filter((u) =>
    registros.some((r) => r.uid === u.id && r.fecha === hoy)
  ).length;
  const totalAlerta = participantes.filter(
    (u) => diasSinActividad(registros, u.id, u.diaInicio) >= 2
  ).length;

  const historialParticipante = historialUid
    ? participantes.find((u) => u.id === historialUid)
    : null;

  return (
    <div className="page-container">
      <h1>Panel de administración</h1>
      <p className="subtitulo">Reset 3.0 — Seguimiento en tiempo real</p>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-number">{participantes.length}</span>
          <span className="stat-label">Participantes</span>
        </div>
        <div className="stat-card success">
          <span className="stat-number">{totalActivos}</span>
          <span className="stat-label">Activos hoy</span>
        </div>
        <div className="stat-card warning">
          <span className="stat-number">{totalAlerta}</span>
          <span className="stat-label">En alerta</span>
        </div>
      </div>

      <div className="filtros">
        {['todos', 'activos', 'inactivos', 'alerta'].map((f) => (
          <button
            key={f}
            className={`filtro-btn ${filtro === f ? 'activo' : ''}`}
            onClick={() => setFiltro(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="participantes-lista">
        {participantesFiltrados.length === 0 && (
          <p className="empty-state">No hay participantes en este filtro.</p>
        )}
        {participantesFiltrados.map((u) => {
          const registrosUsuario = registrosDiurnos
            .filter((r) => r.uid === u.id)
            .sort((a, b) => (a.fecha > b.fecha ? -1 : 1));

          const registroHoy = registrosUsuario.find((r) => r.fecha === hoy);
          const ultimoRegistro = registrosUsuario[0];
          const nocheHoy = registros.find((r) => r.uid === u.id && r.fecha === hoy && r.tipo === 'noche');
          const dias = diasSinActividad(registros, u.id, u.diaInicio);
          const enAlerta = dias >= 2;
          const diaActual = calcularDiaPrograma(u.diaInicio);
          const semana = Math.min(Math.ceil(diaActual / 7), 4);
          const totalCheckins = registrosUsuario.length;
          const notaReciente = notasMap[u.id];

          return (
            <div key={u.id} className={`participante-card ${enAlerta ? 'en-alerta' : ''}`}>

              {/* Cabecera */}
              <div className="participante-header">
                <div className="participante-info">
                  <h3>{[u.nombre, u.apellido].filter(Boolean).join(' ')}</h3>
                  <span className="participante-email">{u.email}</span>
                </div>
                <div className="participante-estado">
                  {registroHoy ? (
                    <span className="badge badge-success">✓ Hoy</span>
                  ) : enAlerta ? (
                    <span className="badge badge-alerta">⚠ {dias}d sin actividad</span>
                  ) : (
                    <span className="badge badge-pending">Pendiente hoy</span>
                  )}
                </div>
              </div>

              {/* Métricas del programa */}
              <div className="prog-metricas">
                <div className="prog-metrica">
                  <span className="prog-metrica-valor">Día {diaActual}/28</span>
                  <span className="prog-metrica-label">Progreso</span>
                </div>
                <div className="prog-metrica">
                  <span className="prog-metrica-valor">Semana {semana}</span>
                  <span className="prog-metrica-label">Fase actual</span>
                </div>
                <div className="prog-metrica">
                  <span className="prog-metrica-valor">{totalCheckins}</span>
                  <span className="prog-metrica-label">Check-ins</span>
                </div>
              </div>

              {/* Estado del último check-in */}
              {ultimoRegistro && (
                <div className="registro-detalle" style={{ marginTop: 8 }}>
                  <span className="ultimo-label">
                    {registroHoy ? 'Hoy:' : `Último (${ultimoRegistro.fecha}):`}
                  </span>
                  <span
                    className="estado-tag"
                    style={{
                      backgroundColor: estadoColor[ultimoRegistro.estado] + '22',
                      color: estadoColor[ultimoRegistro.estado],
                    }}
                  >
                    {estadoLabel[ultimoRegistro.estado]}
                  </span>
                </div>
              )}

              {/* Conversación mañana IA */}
              {registroHoy?.textoManana && (
                <p className="notas-preview">🌅 "{registroHoy.textoManana}"</p>
              )}
              {registroHoy?.respuestaIA_estado && (
                <p className="notas-preview" style={{ fontStyle: 'normal', color: '#495057' }}>
                  🧠 {registroHoy.respuestaIA_estado}
                </p>
              )}
              {/* Noche */}
              {nocheHoy && (
                <div className="nota-reciente-row" style={{ borderLeftColor: '#6B9BD2' }}>
                  <span className="nota-reciente-icon">🌙</span>
                  <span className="nota-reciente-texto">
                    {nocheHoy.textoNoche ? `"${nocheHoy.textoNoche}"` : 'Noche registrada'}
                  </span>
                </div>
              )}
              {/* Legacy notas */}
              {!registroHoy?.textoManana && registroHoy?.notas && (
                <p className="notas-preview">"{registroHoy.notas}"</p>
              )}

              {/* Nota personal más reciente */}
              {notaReciente && (
                <div className="nota-reciente-row">
                  <span className="nota-reciente-icon">📝</span>
                  <span className="nota-reciente-texto">"{notaReciente}"</span>
                </div>
              )}

              {/* Alerta */}
              {enAlerta && (
                <div className="alerta-banner">
                  ⚠️ {u.nombre} lleva {dias} días sin registrar actividad
                </div>
              )}

              {/* Botón historial */}
              <button
                className="btn-historial"
                onClick={() => setHistorialUid(u.id)}
              >
                Ver historial completo →
              </button>
            </div>
          );
        })}
      </div>

      {/* Modal historial */}
      {historialParticipante && (
        <HistorialParticipante
          participante={historialParticipante}
          registros={registros.filter((r) => r.uid === historialParticipante.id)}
          onClose={() => setHistorialUid(null)}
        />
      )}
    </div>
  );
}
