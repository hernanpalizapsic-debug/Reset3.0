import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { fases } from '../../utils/contenidoFases';
import { Link } from 'react-router-dom';

const estadoColor = { simpatico: '#FF6B6B', dorsal: '#6B9BD2', ventral: '#51CF66' };
const estadoLabel = { simpatico: '⚡ Simpático', dorsal: '🌊 Dorsal', ventral: '🌿 Ventral' };

export default function Inicio() {
  const { currentUser } = useAuth();
  const [userData, setUserData] = useState(null);
  const [registroHoy, setRegistroHoy] = useState(null);
  const [registroNoche, setRegistroNoche] = useState(null);
  const hoy = new Date().toISOString().split('T')[0];

  useEffect(() => {
    async function cargar() {
      const [snapUser, snapReg, snapNoche] = await Promise.all([
        getDoc(doc(db, 'usuarios', currentUser.uid)),
        getDoc(doc(db, 'registros', `${currentUser.uid}_${hoy}`)),
        getDoc(doc(db, 'registros', `${currentUser.uid}_${hoy}_noche`)),
      ]);
      if (snapUser.exists()) setUserData(snapUser.data());
      if (snapReg.exists()) setRegistroHoy(snapReg.data());
      if (snapNoche.exists()) setRegistroNoche(snapNoche.data());
    }
    cargar();
  }, [currentUser.uid, hoy]);

  function calcularDia() {
    if (!userData?.diaInicio) return 1;
    const diff = Math.floor((new Date() - new Date(userData.diaInicio)) / (1000 * 60 * 60 * 24));
    return Math.min(diff + 1, 28);
  }

  const diaActual = calcularDia();
  const semanaActual = Math.min(Math.ceil(diaActual / 7), 4);
  const faseActual = fases[semanaActual - 1];
  const flujoCompletado = registroHoy?.tipo === 'flujo_diario';
  const nocheCompletada = !!registroNoche;

  return (
    <div className="page-container">
      <div className="welcome-header">
        <h1>Hola, {userData?.nombre?.split(' ')[0] || 'hola'} 👋</h1>
        <div className="dia-badge">Día {diaActual}/28</div>
      </div>

      <div className="progress-bar-container">
        <div className="progress-bar" style={{ width: `${(diaActual / 28) * 100}%` }} />
      </div>

      <div className="fase-card">
        <div className="fase-semana">Semana {semanaActual}</div>
        <h2>{faseActual?.nombre}</h2>
        <p>{faseActual?.descripcion}</p>
      </div>

      {/* Flujo diario */}
      {flujoCompletado ? (
        <div className="inicio-flujo-card done">
          <div className="inicio-flujo-info">
            <span className="inicio-flujo-icon">✅</span>
            <div>
              <strong>Flujo del día completado</strong>
              {registroHoy?.estado && (
                <p style={{ color: estadoColor[registroHoy.estado], fontSize: 13, marginTop: 2 }}>
                  {estadoLabel[registroHoy.estado]}
                </p>
              )}
            </div>
          </div>
          <Link to="/flujo" className="btn btn-outline" style={{ fontSize: 13, padding: '6px 14px' }}>
            Ver →
          </Link>
        </div>
      ) : (
        <Link to="/flujo" className="inicio-comenzar-btn">
          <span>🌅</span>
          <div>
            <strong>Comenzar el día</strong>
            <p>Flujo diario · ~20 min</p>
          </div>
          <span className="inicio-comenzar-arrow">→</span>
        </Link>
      )}

      {/* Momento noche */}
      {nocheCompletada ? (
        <div className="inicio-flujo-card done" style={{ marginTop: 10 }}>
          <div className="inicio-flujo-info">
            <span className="inicio-flujo-icon">🌙</span>
            <div><strong>Noche registrada</strong></div>
          </div>
          <Link to="/noche" className="btn btn-outline" style={{ fontSize: 13, padding: '6px 14px' }}>
            Ver →
          </Link>
        </div>
      ) : (
        <Link to="/noche" className="inicio-noche-btn">
          <span>🌙</span>
          <span>Momento noche</span>
          <span className="inicio-comenzar-arrow">→</span>
        </Link>
      )}

      <div className="acciones-grid" style={{ marginTop: 20 }}>
        <Link to="/audios" className="accion-card">
          <span className="accion-icon">🎧</span>
          <span>Audios</span>
        </Link>
        <Link to="/contenido" className="accion-card">
          <span className="accion-icon">📚</span>
          <span>Contenido</span>
        </Link>
        <Link to="/notas" className="accion-card">
          <span className="accion-icon">📝</span>
          <span>Mis notas</span>
        </Link>
      </div>
    </div>
  );
}
