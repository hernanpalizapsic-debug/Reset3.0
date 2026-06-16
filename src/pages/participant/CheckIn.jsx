import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase/config';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';

const preguntas = [
  {
    id: 'cuerpo',
    titulo: '¿Cómo sentís tu cuerpo ahora mismo?',
    icono: '🫀',
    opciones: [
      { label: 'Tenso, activado o inquieto', simpatico: 2, dorsal: 0 },
      { label: 'Pesado, sin energía o adormecido', simpatico: 0, dorsal: 2 },
      { label: 'Relajado, presente o cómodo', simpatico: 0, dorsal: 0 },
    ],
  },
  {
    id: 'respiracion',
    titulo: '¿Cómo es tu respiración en este momento?',
    icono: '🌬️',
    opciones: [
      { label: 'Rápida o en el pecho', simpatico: 2, dorsal: 0 },
      { label: 'Superficial, apenas la noto', simpatico: 0, dorsal: 1 },
      { label: 'Fluida y profunda', simpatico: 0, dorsal: 0 },
    ],
  },
  {
    id: 'mente',
    titulo: '¿Cómo está tu mente?',
    icono: '🧠',
    opciones: [
      { label: 'Acelerada, rumiante o dispersa', simpatico: 2, dorsal: 0 },
      { label: 'Nublada, lenta o vacía', simpatico: 0, dorsal: 2 },
      { label: 'Clara, enfocada o tranquila', simpatico: 0, dorsal: 0 },
    ],
  },
  {
    id: 'exhalacion',
    titulo: 'Hacé una exhalación lenta. ¿Qué notás?',
    icono: '💨',
    opciones: [
      { label: 'Me resulta incómoda o la contengo', simpatico: 1, dorsal: 0 },
      { label: 'No produce ningún cambio', simpatico: 0, dorsal: 1 },
      { label: 'Me alivia o relaja un poco', simpatico: 0, dorsal: 0 },
    ],
  },
];

const resultados = {
  simpatico: {
    id: 'simpatico',
    label: 'Simpático',
    emoji: '⚡',
    color: '#FF6B6B',
    bg: '#FFF0F0',
    descripcion:
      'Tu sistema nervioso está en modo de activación. El sistema de lucha o huida está activo: hay tensión, aceleración o alerta. Es una respuesta natural ante el estrés.',
    tecnica: {
      nombre: 'Respiración 4-8',
      razon: 'La exhalación prolongada activa el freno vagal y reduce la activación simpática.',
      path: '/practica',
    },
  },
  dorsal: {
    id: 'dorsal',
    label: 'Dorsal Vagal',
    emoji: '🌊',
    color: '#6B9BD2',
    bg: '#F0F5FF',
    descripcion:
      'Tu sistema nervioso está en modo de cierre o colapso. Hay desconexión, pesadez o falta de energía. El sistema activó su freno de emergencia.',
    tecnica: {
      nombre: 'Atención Alternada',
      razon: 'Alternar entre foco externo e interno ayuda a re-activar el sistema sin sobreestimularlo.',
      path: '/practica',
    },
  },
  ventral: {
    id: 'ventral',
    label: 'Ventral Vagal',
    emoji: '🌿',
    color: '#51CF66',
    bg: '#F0FFF4',
    descripcion:
      'Tu sistema nervioso está en equilibrio. Estás en el estado óptimo de regulación: conectado, presente y con capacidad de respuesta flexible.',
    tecnica: {
      nombre: 'Cualquier técnica',
      razon: 'Desde el estado ventral podés explorar cualquier práctica para profundizar la regulación.',
      path: '/practica',
    },
  },
};

function detectarEstado(respuestas) {
  let puntosSim = 0;
  let puntosDor = 0;
  preguntas.forEach((p) => {
    const opcion = respuestas[p.id];
    if (opcion) {
      puntosSim += opcion.simpatico;
      puntosDor += opcion.dorsal;
    }
  });
  if (puntosSim === 0 && puntosDor === 0) return { estado: 'ventral', puntosSim, puntosDor };
  if (puntosSim > puntosDor) return { estado: 'simpatico', puntosSim, puntosDor };
  if (puntosDor > puntosSim) return { estado: 'dorsal', puntosSim, puntosDor };
  // empate: ventral si puntos bajos, sino mirar cuál llegó primero
  return { estado: puntosSim <= 1 ? 'ventral' : 'simpatico', puntosSim, puntosDor };
}

export default function CheckIn() {
  const { currentUser } = useAuth();
  const [paso, setPaso] = useState(0); // 0-3 preguntas, 4 = resultado
  const [respuestas, setRespuestas] = useState({});
  const [resultado, setResultado] = useState(null);
  const [notas, setNotas] = useState('');
  const [guardado, setGuardado] = useState(false);
  const [registroExistente, setRegistroExistente] = useState(null);
  const hoy = new Date().toISOString().split('T')[0];

  useEffect(() => {
    async function verificar() {
      const snap = await getDoc(doc(db, 'registros', `${currentUser.uid}_${hoy}`));
      if (snap.exists()) setRegistroExistente(snap.data());
    }
    verificar();
  }, [currentUser.uid, hoy]);

  function elegirOpcion(opcion) {
    const nuevasRespuestas = { ...respuestas, [preguntas[paso].id]: opcion };
    setRespuestas(nuevasRespuestas);

    if (paso < preguntas.length - 1) {
      setTimeout(() => setPaso(paso + 1), 220);
    } else {
      const { estado, puntosSim, puntosDor } = detectarEstado(nuevasRespuestas);
      setResultado({ ...resultados[estado], puntosSim, puntosDor });
      setTimeout(() => setPaso(preguntas.length), 220);
    }
  }

  async function guardar() {
    const datos = {
      uid: currentUser.uid,
      fecha: hoy,
      estado: resultado.id,
      notas,
      puntuacion: { simpatico: resultado.puntosSim, dorsal: resultado.puntosDor },
      respuestas: Object.fromEntries(
        Object.entries(respuestas).map(([k, v]) => [k, v.label])
      ),
      timestamp: new Date(),
    };
    await setDoc(doc(db, 'registros', `${currentUser.uid}_${hoy}`), datos);
    setGuardado(true);
    setRegistroExistente(datos);
  }

  function reiniciar() {
    setPaso(0);
    setRespuestas({});
    setResultado(null);
    setNotas('');
    setGuardado(false);
    setRegistroExistente(null);
  }

  // Ya tiene registro guardado
  if (guardado || (registroExistente && paso === 0 && Object.keys(respuestas).length === 0)) {
    const est = resultados[registroExistente?.estado] || resultado;
    return (
      <div className="page-container centrado">
        <div className="completada-card" style={{ borderTop: `4px solid ${est?.color}` }}>
          <span className="big-emoji">{est?.emoji}</span>
          <h2>Check-in de hoy</h2>
          <p style={{ color: est?.color, fontWeight: 700, fontSize: 17, marginBottom: 4 }}>
            {est?.label}
          </p>
          <p style={{ fontSize: 13, marginBottom: 20 }}>{est?.descripcion}</p>
          {registroExistente?.notas && (
            <p className="notas-preview">"{registroExistente.notas}"</p>
          )}
          <button className="btn btn-outline" onClick={reiniciar}>
            Hacer de nuevo
          </button>
        </div>
      </div>
    );
  }

  // Preguntas del test
  if (paso < preguntas.length) {
    const pregunta = preguntas[paso];
    const progreso = ((paso) / preguntas.length) * 100;

    return (
      <div className="page-container">
        <h1>Test somático</h1>

        <div className="test-progreso">
          <div className="test-progreso-barra" style={{ width: `${progreso}%` }} />
        </div>
        <p className="test-contador">{paso + 1} / {preguntas.length}</p>

        <div className="test-pregunta-card">
          <span className="test-icono">{pregunta.icono}</span>
          <h2 className="test-pregunta-titulo">{pregunta.titulo}</h2>
        </div>

        <div className="test-opciones">
          {pregunta.opciones.map((opcion, i) => {
            const seleccionada = respuestas[pregunta.id]?.label === opcion.label;
            return (
              <button
                key={i}
                className={`test-opcion-btn ${seleccionada ? 'seleccionada' : ''}`}
                onClick={() => elegirOpcion(opcion)}
              >
                {opcion.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Resultado del test
  if (paso === preguntas.length && resultado) {
    return (
      <div className="page-container">
        <h1>Tu estado hoy</h1>

        <div className="resultado-card" style={{ borderColor: resultado.color, backgroundColor: resultado.bg }}>
          <span className="resultado-emoji">{resultado.emoji}</span>
          <h2 style={{ color: resultado.color }}>{resultado.label}</h2>
          <p className="resultado-desc">{resultado.descripcion}</p>

          <div className="puntuacion-barra">
            <div className="puntuacion-item">
              <span style={{ color: '#FF6B6B' }}>⚡ Simpático</span>
              <div className="mini-barra">
                <div className="mini-barra-fill sim" style={{ width: `${Math.min(resultado.puntosSim * 14, 100)}%` }} />
              </div>
              <span className="puntuacion-num">{resultado.puntosSim}</span>
            </div>
            <div className="puntuacion-item">
              <span style={{ color: '#6B9BD2' }}>🌊 Dorsal</span>
              <div className="mini-barra">
                <div className="mini-barra-fill dor" style={{ width: `${Math.min(resultado.puntosDor * 14, 100)}%` }} />
              </div>
              <span className="puntuacion-num">{resultado.puntosDor}</span>
            </div>
          </div>
        </div>

        <div className="tecnica-recomendada">
          <p className="tecnica-rec-label">Técnica recomendada</p>
          <div className="tecnica-rec-card">
            <div>
              <h3>{resultado.tecnica.nombre}</h3>
              <p>{resultado.tecnica.razon}</p>
            </div>
            <Link to={resultado.tecnica.path} className="btn btn-primary">
              Practicar →
            </Link>
          </div>
        </div>

        {!guardado && (
          <>
            <div className="form-group">
              <label>¿Algo que quieras anotar? (opcional)</label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="¿Qué notás? ¿Qué pasó hoy?"
                rows={3}
              />
            </div>
            <button className="btn btn-primary btn-full" onClick={guardar}>
              Guardar check-in
            </button>
          </>
        )}
      </div>
    );
  }

  return null;
}
