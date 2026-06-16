import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase/config';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const preguntasNoche = [
  '¿Qué momento del día querés reconocer, aunque haya sido difícil?',
  '¿Qué notó tu cuerpo hoy que tu mente tardó en ver?',
  '¿Qué dejás ir antes de dormir?',
  '¿Hubo un momento de conexión hoy, aunque pequeño?',
  '¿Qué estado tuvo más presencia en tu cuerpo durante el día?',
  '¿Hay algo que necesita ser nombrado antes de cerrar el día?',
  '¿Cómo llegás al descanso?',
];

const invitacionesVentral = [
  'Antes de dormir: apoyá una mano en el pecho. Sentí 3 respiraciones. No hay nada que resolver esta noche.',
  'Invitación: notá el peso de tu cuerpo en la cama o silla. Permití que se suelte un poco más con cada exhalación.',
  'Para el descanso: nombrá en silencio 3 cosas que estuvieron bien hoy, aunque sean muy pequeñas.',
];

function MiniAudioNocturno({ url }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play(); setPlaying(true); }
  }

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => setPlaying(false);
    audio.addEventListener('ended', onEnded);
    return () => audio.removeEventListener('ended', onEnded);
  }, []);

  return (
    <div className="noche-audio-banner">
      <audio ref={audioRef} src={url} preload="none" />
      <span className="noche-audio-icono">🎧</span>
      <div className="noche-audio-info">
        <strong>Audio Nocturno</strong>
        <span>Acompañate mientras cerrás el día</span>
      </div>
      <button className="noche-audio-btn" onClick={togglePlay}>
        {playing ? '⏸' : '▶'}
      </button>
    </div>
  );
}

export default function MomentoNoche() {
  const { currentUser } = useAuth();
  const hoy = new Date().toISOString().split('T')[0];

  const [paso, setPaso] = useState('loading');
  const [texto, setTexto] = useState('');
  const [respuestaIA, setRespuestaIA] = useState('');
  const [iaLoading, setIaLoading] = useState(false);
  const [registroExistente, setRegistroExistente] = useState(null);
  const [semanaActual, setSemanaActual] = useState(0);

  const pregunta = preguntasNoche[new Date().getDay() % preguntasNoche.length];
  const invitacion = invitacionesVentral[new Date().getDay() % invitacionesVentral.length];

  useEffect(() => {
    async function init() {
      try {
        const [snapReg, snapUser] = await Promise.all([
          getDoc(doc(db, 'registros', `${currentUser.uid}_${hoy}_noche`)),
          getDoc(doc(db, 'usuarios', currentUser.uid)),
        ]);

        if (snapUser.exists()) {
          const diaInicio = snapUser.data().diaInicio;
          const diff = diaInicio
            ? Math.floor((new Date() - new Date(diaInicio)) / (1000 * 60 * 60 * 24))
            : 0;
          const dia = Math.min(diff + 1, 28);
          const semana = Math.min(Math.ceil(dia / 7), 4);
          setSemanaActual(semana);

        }

        if (snapReg.exists()) {
          setRegistroExistente(snapReg.data());
          setPaso('completado');
        } else {
          setPaso('input');
        }
      } catch {
        setPaso('input');
      }
    }
    init();
  }, [currentUser.uid, hoy]);

  async function continuar() {
    if (!texto.trim()) {
      setPaso('ia');
      return;
    }
    setPaso('ia');
    setIaLoading(true);
    try {
      const resp = await fetch('/api/ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'noche', contenido: texto }),
      });
      const data = await resp.json();
      setRespuestaIA(data.respuesta ?? '');
    } catch {
      setRespuestaIA('');
    } finally {
      setIaLoading(false);
    }
  }

  async function guardar() {
    const datos = {
      uid: currentUser.uid,
      fecha: hoy,
      tipo: 'noche',
      textoNoche: texto,
      respuestaIA_noche: respuestaIA,
      timestamp: new Date(),
    };
    await setDoc(doc(db, 'registros', `${currentUser.uid}_${hoy}_noche`), datos);
    setRegistroExistente(datos);
    setPaso('completado');
  }

  if (paso === 'loading') {
    return <div className="page-container centrado"><div className="ia-loading-spinner" /></div>;
  }

  if (paso === 'completado') {
    return (
      <div className="page-container centrado">
        <div className="completada-card noche-completada">
          <span className="big-emoji">🌙</span>
          <h2>Noche registrada</h2>
          {registroExistente?.textoNoche && (
            <p className="notas-preview">"{registroExistente.textoNoche}"</p>
          )}
          {registroExistente?.respuestaIA_noche && (
            <div className="flujo-ia-respuesta" style={{ marginTop: 12 }}>
              <span className="flujo-ia-icono">🧠</span>
              <p>{registroExistente.respuestaIA_noche}</p>
            </div>
          )}
          <p className="noche-invitacion">{invitacion}</p>
          <button className="btn btn-outline" style={{ marginTop: 16 }} onClick={() => {
            setRegistroExistente(null);
            setTexto('');
            setRespuestaIA('');
            setPaso('input');
          }}>
            Escribir de nuevo
          </button>
        </div>
      </div>
    );
  }

  if (paso === 'input') {
    return (
      <div className="page-container">
        <div className="noche-header">
          <span className="noche-icono">🌙</span>
          <h1>Momento noche</h1>
          <p className="subtitulo">Un espacio para cerrar el día.</p>
        </div>
        {semanaActual >= 3 && <MiniAudioNocturno url="/audios/audio-nocturno.mp3" />}
        <div className="noche-pregunta-card">
          <p>{pregunta}</p>
        </div>
        <div className="form-group">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escribí lo que venga. Sin filtro."
            rows={5}
            className="flujo-textarea"
          />
        </div>
        <button className="btn btn-primary btn-full" onClick={continuar}>
          Continuar →
        </button>
        {!texto.trim() && (
          <p className="flujo-skip-hint">Podés continuar sin escribir.</p>
        )}
      </div>
    );
  }

  if (paso === 'ia') {
    return (
      <div className="page-container">
        <div className="noche-header">
          <span className="noche-icono">🌙</span>
          <h1>Momento noche</h1>
        </div>
        {iaLoading ? (
          <div className="flujo-ia-loading">
            <div className="ia-loading-spinner" />
            <p>Escuchando...</p>
          </div>
        ) : (
          <>
            {texto && (
              <div className="flujo-texto-propio">
                <p>"{texto}"</p>
              </div>
            )}
            {respuestaIA && (
              <div className="flujo-ia-respuesta">
                <span className="flujo-ia-icono">🧠</span>
                <p>{respuestaIA}</p>
              </div>
            )}
            <div className="noche-invitacion-card">
              <span className="noche-invitacion-icono">🌿</span>
              <p>{invitacion}</p>
            </div>
            <button className="btn btn-primary btn-full" style={{ marginTop: 20 }} onClick={guardar}>
              Cerrar el día ✓
            </button>
          </>
        )}
      </div>
    );
  }

  return null;
}
