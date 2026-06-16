import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { AUDIOS } from '../../utils/audiosData';
import AudioPlayer from '../../components/shared/AudioPlayer';

function calcularSemana(diaInicio) {
  if (!diaInicio) return 1;
  const diff = Math.floor((new Date() - new Date(diaInicio)) / (1000 * 60 * 60 * 24));
  return Math.min(Math.ceil(Math.min(diff + 1, 28) / 7), 4);
}

export default function Audios() {
  const { currentUser } = useAuth();
  const [semana, setSemana] = useState(null);

  useEffect(() => {
    let resuelto = false;

    // Fallback: si Firestore no responde en 5 s, mostrar con semana 1
    const timeout = setTimeout(() => {
      if (!resuelto) { resuelto = true; setSemana(1); }
    }, 5000);

    getDoc(doc(db, 'usuarios', currentUser.uid))
      .then((snap) => {
        if (!resuelto) {
          resuelto = true;
          setSemana(snap.exists() ? calcularSemana(snap.data().diaInicio) : 1);
        }
      })
      .catch(() => {
        if (!resuelto) { resuelto = true; setSemana(1); }
      })
      .finally(() => clearTimeout(timeout));
  }, [currentUser.uid]);

  if (semana === null) {
    return <div className="page-container centrado"><div className="ia-loading-spinner" /></div>;
  }

  const maestro = AUDIOS.find((a) => a.especial);
  const programaAudios = AUDIOS.filter((a) => !a.especial);

  return (
    <div className="page-container">
      <div className="audios-header">
        <h1>Audios</h1>
        <p className="subtitulo">Herramientas sonoras del programa.</p>
      </div>

      {/* Ejercicio Maestro — siempre disponible */}
      <div className="audio-maestro-card">
        <div className="audio-maestro-badge">Siempre disponible</div>
        <div className="audio-card-top">
          <span className="audio-card-icon">🎧</span>
          <div>
            <h3>{maestro.titulo}</h3>
            <p>{maestro.descripcion}</p>
          </div>
        </div>
        <AudioPlayer src={maestro.src} dark />
      </div>

      {/* Audios del programa */}
      <div className="audios-seccion-titulo">Audios del programa</div>
      <div className="audios-lista">
        {programaAudios.map((audio) => {
          const desbloqueado = semana >= audio.semanaMinima;
          return (
            <div
              key={audio.id}
              className={`audio-card ${desbloqueado ? 'desbloqueado' : 'bloqueado'} ${audio.nocturno ? 'nocturno' : ''}`}
            >
              <div className="audio-card-top">
                <span className="audio-card-icon">
                  {desbloqueado ? (audio.nocturno ? '🌙' : '🎵') : '🔒'}
                </span>
                <div>
                  <h3>{audio.titulo}</h3>
                  <p>{audio.descripcion}</p>
                  {!desbloqueado && (
                    <span className="audio-semana-badge">
                      Disponible en Semana {audio.semanaMinima}
                    </span>
                  )}
                </div>
              </div>
              {desbloqueado && <AudioPlayer src={audio.src} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
