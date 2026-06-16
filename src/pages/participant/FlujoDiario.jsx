import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase/config';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { fases } from '../../utils/contenidoFases';
import AudioPlayer from '../../components/shared/AudioPlayer';
import { getAudioSemanal, AUDIOS } from '../../utils/audiosData';

/* ===== Somatic test data ===== */
const preguntas = [
  {
    id: 'cuerpo', icono: '🫀',
    titulo: '¿Cómo sentís tu cuerpo ahora mismo?',
    opciones: [
      { label: 'Tenso, activado o inquieto', simpatico: 2, dorsal: 0 },
      { label: 'Pesado, sin energía o adormecido', simpatico: 0, dorsal: 2 },
      { label: 'Relajado, presente o cómodo', simpatico: 0, dorsal: 0 },
    ],
  },
  {
    id: 'respiracion', icono: '🌬️',
    titulo: '¿Cómo es tu respiración?',
    opciones: [
      { label: 'Rápida o en el pecho', simpatico: 2, dorsal: 0 },
      { label: 'Superficial, apenas la noto', simpatico: 0, dorsal: 1 },
      { label: 'Fluida y profunda', simpatico: 0, dorsal: 0 },
    ],
  },
  {
    id: 'mente', icono: '🧠',
    titulo: '¿Cómo está tu mente?',
    opciones: [
      { label: 'Acelerada, rumiante o dispersa', simpatico: 2, dorsal: 0 },
      { label: 'Nublada, lenta o vacía', simpatico: 0, dorsal: 2 },
      { label: 'Clara, enfocada o tranquila', simpatico: 0, dorsal: 0 },
    ],
  },
  {
    id: 'exhalacion', icono: '💨',
    titulo: 'Hacé una exhalación lenta. ¿Qué notás?',
    opciones: [
      { label: 'Me resulta incómoda o la contengo', simpatico: 1, dorsal: 0 },
      { label: 'No produce ningún cambio', simpatico: 0, dorsal: 1 },
      { label: 'Me alivia o relaja un poco', simpatico: 0, dorsal: 0 },
    ],
  },
];

function detectarEstado(respuestas) {
  let s = 0, d = 0;
  preguntas.forEach((p) => {
    if (respuestas[p.id]) { s += respuestas[p.id].simpatico; d += respuestas[p.id].dorsal; }
  });
  if (s === 0 && d === 0) return { estado: 'ventral', puntosSim: s, puntosDor: d };
  if (s > d) return { estado: 'simpatico', puntosSim: s, puntosDor: d };
  if (d > s) return { estado: 'dorsal', puntosSim: s, puntosDor: d };
  return { estado: s <= 1 ? 'ventral' : 'simpatico', puntosSim: s, puntosDor: d };
}

/* ===== Estado config ===== */
const estadoInfo = {
  simpatico: { emoji: '⚡', label: 'Simpático', color: '#FF6B6B', bg: '#FFF0F0' },
  dorsal:    { emoji: '🌊', label: 'Dorsal Vagal', color: '#6B9BD2', bg: '#F0F5FF' },
  ventral:   { emoji: '🌿', label: 'Ventral Vagal', color: '#51CF66', bg: '#F0FFF4' },
};

/* ===== Protocolo 4R ===== */
const protocolo = {
  simpatico: {
    regular: {
      icono: '🌬️',
      nombre: 'Respiración 4-8',
      instruccion: 'Inhala contando hasta 4. Exhala lentamente contando hasta 8. Repetí 5 veces. Sentí el efecto en tu cuerpo.',
      razon: 'La exhalación prolongada activa el freno vagal y reduce la activación.',
    },
    ancla: 'Apoyá los pies en el suelo. Sentí el peso de tu cuerpo. Nombrá en silencio 3 cosas que podés ver ahora mismo.',
    reducirQ: '¿Qué podés sacar de tu lista de hoy? ¿Qué no es urgente?',
    resolverQ: '¿Qué necesita un pequeño paso concreto hoy?',
    timerSug: 12,
    timerLabel: 'Calma activa',
  },
  dorsal: {
    regular: {
      icono: '👁️',
      nombre: 'Atención Alternada',
      instruccion: 'Por 30 segundos, enfocá tu atención afuera (sonidos, colores). Por 30 segundos, enfocala adentro (respiración, sensaciones). Alterná 4 ciclos.',
      razon: 'Alternar entre foco externo e interno re-activa el sistema sin sobreestimularlo.',
    },
    ancla: 'Mové suavemente las manos y los pies. Notá la temperatura del aire en tu piel. Buscá el sonido más lejano que podás escuchar.',
    reducirQ: '¿Qué expectativa te está pesando hoy?',
    resolverQ: '¿Hay algo muy pequeño y concreto que podrías hacer para moverte un poco?',
    timerSug: 15,
    timerLabel: 'Movimiento suave o descanso consciente',
  },
  ventral: {
    regular: {
      icono: '🤲',
      nombre: 'Ganchos de Cook',
      instruccion: 'Cruzá el tobillo derecho sobre la rodilla izquierda. Cruzá el brazo izquierdo sobre el derecho y enlazá los dedos. Respirá 2-3 minutos.',
      razon: 'Desde el estado ventral, esta postura profundiza la integración y la calma.',
    },
    ancla: 'Notá algo que te genera bienestar ahora mismo — una sensación, un sonido, una luz. Quedáte un momento con eso.',
    reducirQ: '¿Qué podés elegir no hacer hoy, desde un lugar de cuidado propio?',
    resolverQ: '¿Qué querés sostener o profundizar hoy?',
    timerSug: 10,
    timerLabel: 'Práctica libre',
  },
};

/* ===== Citas por semana ===== */
const citasPorSemana = [
  ['El primer paso no es la calma. Es reconocer dónde estás.', 'Nombrar el estado ya es regulación.', 'No hay nada que arreglar. Solo que notar.'],
  ['Observar sin juzgar ya es una forma de soltar.', 'No tenés que resolver el estado. Solo notarlo.', 'La activación no es el enemigo. Es información.'],
  ['El cuerpo sabe volver. Solo necesita espacio.', 'La regulación no es control. Es permitir.', 'Volver al centro no es debilidad. Es práctica.'],
  ['Ya no buscás la calma afuera. La reconocés adentro.', 'La flexibilidad es la meta. No la perfección.', 'Cada retorno es la práctica misma.'],
];

/* ===== TIC — Un Ojo x Vez (simple) ===== */
function TICBlock({ onDone }) {
  const [seg, setSeg] = useState(60);
  const timerRef = useRef(null);
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; });

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSeg((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          onDoneRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const progreso = ((60 - seg) / 60) * 100;
  const listoVisible = seg <= 50; // disponible después de 10 segundos

  function salir() {
    clearInterval(timerRef.current);
    onDoneRef.current();
  }

  return (
    <div className="tic-container">
      <div className="tic-barra-track">
        <div className="tic-barra-fill" style={{ width: `${progreso}%` }} />
      </div>
      <h2 className="tic-titulo">Un ojo por vez</h2>
      <p className="tic-subtitulo">Esto ayuda al cerebro a integrar lo que trabajaste.</p>
      <p className="tic-instruccion">
        Quedáte con lo que sentís.<br />
        Tapate un ojo → observá.<br />
        Cambiá de ojo → observá.<br />
        Repetí al menos 6 veces, a tu ritmo.
      </p>
      <div className="tic-ojos">
        <div className="tic-ojo tic-ojo-izq" />
        <div className="tic-ojo tic-ojo-der" />
      </div>
      {listoVisible && (
        <button className="btn btn-outline tic-btn-listo" onClick={salir}>
          Listo
        </button>
      )}
    </div>
  );
}

/* ===== Respirá screen (2 s auto-advance) ===== */
function RespiraScreen({ onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="page-container centrado">
      <p className="respira-texto">Respirá...</p>
    </div>
  );
}

/* ===== Component ===== */
export default function FlujoDiario() {
  const { currentUser } = useAuth();
  const hoy = new Date().toISOString().split('T')[0];

  const [paso, setPaso] = useState('loading');
  const [checkinPaso, setCheckinPaso] = useState(0);
  const [textoManana, setTextoManana] = useState('');
  const [respuestaManana, setRespuestaManana] = useState('');
  const [respuestas, setRespuestas] = useState({});
  const [resultado, setResultado] = useState(null);
  const [respuestaEstado, setRespuestaEstado] = useState('');
  const [reducir, setReducir] = useState('');
  const [resolver, setResolver] = useState('');
  const [timerMin, setTimerMin] = useState(null);
  const [timerSec, setTimerSec] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [iaLoading, setIaLoading] = useState(false);
  const [citaIA, setCitaIA] = useState(null);
  const [registroExistente, setRegistroExistente] = useState(null);
  const [userData, setUserData] = useState(null);
  const timerRef = useRef(null);

  // Check for existing record and load user data
  useEffect(() => {
    async function init() {
      try {
        const [snapReg, snapUser] = await Promise.all([
          getDoc(doc(db, 'registros', `${currentUser.uid}_${hoy}`)),
          getDoc(doc(db, 'usuarios', currentUser.uid)),
        ]);
        if (snapUser.exists()) setUserData(snapUser.data());
        if (snapReg.exists() && snapReg.data()?.tipo === 'flujo_diario') {
          setRegistroExistente(snapReg.data());
          setPaso('completado');
        } else {
          setPaso('manana_input');
        }
      } catch {
        setPaso('manana_input');
      }
    }
    init();
  }, [currentUser.uid, hoy]);

  // Timer countdown
  useEffect(() => {
    if (timerActive && timerSec > 0) {
      timerRef.current = setInterval(() => {
        setTimerSec((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setTimerActive(false);
            setPaso('respira');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [timerActive]);

  function calcularSemana() {
    if (!userData?.diaInicio) return 1;
    const diff = Math.floor((new Date() - new Date(userData.diaInicio)) / (1000 * 60 * 60 * 24));
    const dia = Math.min(Math.max(diff + 1, 1), 28);
    return Math.min(Math.ceil(dia / 7), 4);
  }

  async function llamarIA(tipo, contenido, estadoVal) {
    setIaLoading(true);
    try {
      const resp = await fetch('/api/ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, contenido, estado: estadoVal }),
      });
      if (!resp.ok) {
        const err = await resp.text();
        console.error(`[IA ${tipo}] HTTP ${resp.status}:`, err);
        return '';
      }
      const data = await resp.json();
      if (!data.respuesta) console.warn(`[IA ${tipo}] Respuesta vacía:`, data);
      return data.respuesta ?? '';
    } catch (err) {
      console.error(`[IA ${tipo}] Error de red:`, err);
      return '';
    } finally {
      setIaLoading(false);
    }
  }

  async function avanzarManana() {
    setPaso('manana_ia');
    if (!textoManana.trim()) return;
    setIaLoading(true);
    try {
      const resp = await fetch('/api/ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'manana', contenido: textoManana }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setRespuestaManana(data.respuesta ?? '');
      } else {
        console.error('[IA manana] HTTP', resp.status, await resp.text());
      }
    } catch (err) {
      console.error('[IA manana] Error de red:', err);
    } finally {
      setIaLoading(false);
    }
  }

  function elegirOpcion(opcion) {
    const nuevas = { ...respuestas, [preguntas[checkinPaso].id]: opcion };
    setRespuestas(nuevas);
    if (checkinPaso < preguntas.length - 1) {
      setTimeout(() => setCheckinPaso(checkinPaso + 1), 200);
    } else {
      const det = detectarEstado(nuevas);
      setResultado(det);
      setTimeout(() => iniciarEstadoIA(det), 200);
    }
  }

  async function iniciarEstadoIA(det) {
    setPaso('estado_ia');
    const r = await llamarIA('estado', textoManana, det.estado);
    setRespuestaEstado(r);
  }

  function iniciarTimer(minutos) {
    setTimerMin(minutos);
    setTimerSec(minutos * 60);
    setTimerActive(true);
    setPaso('protocolo_soltar_timer');
  }

  function getCitaFallback() {
    const semana = calcularSemana();
    const citas = citasPorSemana[semana - 1] ?? citasPorSemana[0];
    return citas[new Date().getDay() % citas.length];
  }

  async function iniciarCita() {
    setPaso('cita');
    setCitaIA(null);
    const r = await llamarIA('cita', textoManana, resultado?.estado ?? 'ventral');
    setCitaIA(r || getCitaFallback());
  }

  async function guardarYCerrar() {
    const cita = citaIA || getCitaFallback();
    const datos = {
      uid: currentUser.uid,
      fecha: hoy,
      tipo: 'flujo_diario',
      textoManana,
      respuestaIA_manana: respuestaManana,
      estado: resultado?.estado ?? 'ventral',
      respuestaIA_estado: respuestaEstado,
      puntuacion: { simpatico: resultado?.puntosSim ?? 0, dorsal: resultado?.puntosDor ?? 0 },
      reducir,
      resolver,
      timerMin,
      notas: [reducir, resolver].filter(Boolean).join(' / '),
      cita,
      timestamp: new Date(),
    };
    await setDoc(doc(db, 'registros', `${currentUser.uid}_${hoy}`), datos);
    setRegistroExistente(datos);
    setPaso('completado');
  }

  /* ===== RENDERS ===== */

  if (paso === 'loading') {
    return <div className="page-container centrado"><div className="ia-loading-spinner" /></div>;
  }

  // Already completed today
  if (paso === 'completado') {
    const est = estadoInfo[registroExistente?.estado] ?? estadoInfo.ventral;
    return (
      <div className="page-container centrado">
        <div className="completada-card" style={{ borderTop: `4px solid ${est.color}` }}>
          <span className="big-emoji">{est.emoji}</span>
          <h2>Flujo completado</h2>
          <p style={{ color: est.color, fontWeight: 700, fontSize: 16, margin: '6px 0 4px' }}>
            {est.label}
          </p>
          {registroExistente?.cita && (
            <p className="cita-completada">"{registroExistente.cita}"</p>
          )}
          <button className="btn btn-outline" style={{ marginTop: 16 }} onClick={() => {
            setRegistroExistente(null);
            setPaso('manana_input');
            setCheckinPaso(0);
            setRespuestas({});
            setResultado(null);
            setTextoManana('');
            setRespuestaManana('');
            setRespuestaEstado('');
            setReducir('');
            setResolver('');
            setCitaIA(null);
          }}>
            Repetir flujo
          </button>
        </div>
      </div>
    );
  }

  /* Step 1: Morning text input */
  if (paso === 'manana_input') {
    return (
      <div className="page-container">
        <div className="flujo-paso-header">
          <span className="flujo-paso-num">Momento mañana</span>
          <div className="flujo-progreso-dots">
            {['manana','checkin','protocolo','cierre'].map((s, i) => (
              <div key={s} className={`flujo-dot ${i === 0 ? 'activo' : ''}`} />
            ))}
          </div>
        </div>
        <div className="flujo-pregunta-card">
          <span className="flujo-icono">🌅</span>
          <h2>Desde dónde comenzás hoy</h2>
          <p className="flujo-desc">Escribí lo que notás en este momento. Sin elaborar, lo que emerja.</p>
        </div>
        <div className="form-group">
          <textarea
            value={textoManana}
            onChange={(e) => setTextoManana(e.target.value)}
            placeholder="¿Cómo llegás a este día? ¿Qué notás en tu cuerpo, en tu mente?"
            rows={4}
            className="flujo-textarea"
          />
        </div>
        <button className="btn btn-primary btn-full" onClick={avanzarManana}>
          Continuar →
        </button>
        {!textoManana.trim() && (
          <p className="flujo-skip-hint">Podés continuar sin escribir nada.</p>
        )}
      </div>
    );
  }

  /* Step 2: AI response to morning text */
  if (paso === 'manana_ia') {
    return (
      <div className="page-container">
        <div className="flujo-paso-header">
          <span className="flujo-paso-num">Momento mañana</span>
          <div className="flujo-progreso-dots">
            {['manana','checkin','protocolo','cierre'].map((s, i) => (
              <div key={s} className={`flujo-dot ${i === 0 ? 'activo' : ''}`} />
            ))}
          </div>
        </div>
        {iaLoading ? (
          <div className="flujo-ia-loading">
            <div className="ia-loading-spinner" />
            <p>Escuchando...</p>
          </div>
        ) : (
          <>
            {textoManana && (
              <div className="flujo-texto-propio">
                <p>"{textoManana}"</p>
              </div>
            )}
            {respuestaManana && (
              <p className="manana-ia-respuesta">{respuestaManana}</p>
            )}
            <button
              className="btn btn-primary btn-full"
              style={{ marginTop: 24 }}
              onClick={() => setPaso('checkin')}
            >
              Continuar al check-in →
            </button>
          </>
        )}
      </div>
    );
  }

  /* Step 3: Somatic check-in */
  if (paso === 'checkin') {
    const pregunta = preguntas[checkinPaso];
    const progreso = (checkinPaso / preguntas.length) * 100;
    return (
      <div className="page-container">
        <div className="flujo-paso-header">
          <span className="flujo-paso-num">Check-in somático</span>
          <div className="flujo-progreso-dots">
            {['manana','checkin','protocolo','cierre'].map((s, i) => (
              <div key={s} className={`flujo-dot ${i === 1 ? 'activo' : ''}`} />
            ))}
          </div>
        </div>
        <div className="test-progreso">
          <div className="test-progreso-barra" style={{ width: `${progreso}%` }} />
        </div>
        <p className="test-contador">{checkinPaso + 1} / {preguntas.length}</p>
        <div className="test-pregunta-card">
          <span className="test-icono">{pregunta.icono}</span>
          <h2 className="test-pregunta-titulo">{pregunta.titulo}</h2>
        </div>
        <div className="test-opciones">
          {pregunta.opciones.map((op, i) => (
            <button
              key={i}
              className="test-opcion-btn"
              onClick={() => elegirOpcion(op)}
            >
              {op.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* Step 4: AI message for detected state */
  if (paso === 'estado_ia') {
    const est = resultado ? estadoInfo[resultado.estado] : null;
    return (
      <div className="page-container">
        <div className="flujo-paso-header">
          <span className="flujo-paso-num">Tu estado</span>
          <div className="flujo-progreso-dots">
            {['manana','checkin','protocolo','cierre'].map((s, i) => (
              <div key={s} className={`flujo-dot ${i === 1 ? 'activo' : ''}`} />
            ))}
          </div>
        </div>
        {est && (
          <div className="flujo-estado-card" style={{ borderColor: est.color, background: est.bg }}>
            <span className="flujo-estado-emoji">{est.emoji}</span>
            <h2 style={{ color: est.color }}>{est.label}</h2>
            <p className="flujo-micro-edu">
              {resultado.estado === 'simpatico' && 'Tu sistema está en alerta. Vamos a regularlo.'}
              {resultado.estado === 'dorsal' && 'Tu sistema está en baja energía. Vamos a reactivarlo suavemente.'}
              {resultado.estado === 'ventral' && 'Tu sistema está en calma. Buen momento para actuar.'}
            </p>
            <div className="puntuacion-barra" style={{ margin: '12px 0' }}>
              <div className="puntuacion-item">
                <span style={{ color: '#FF6B6B' }}>⚡</span>
                <div className="mini-barra">
                  <div className="mini-barra-fill sim" style={{ width: `${Math.min((resultado.puntosSim ?? 0) * 14, 100)}%` }} />
                </div>
              </div>
              <div className="puntuacion-item">
                <span style={{ color: '#6B9BD2' }}>🌊</span>
                <div className="mini-barra">
                  <div className="mini-barra-fill dor" style={{ width: `${Math.min((resultado.puntosDor ?? 0) * 14, 100)}%` }} />
                </div>
              </div>
            </div>
          </div>
        )}
        {iaLoading ? (
          <div className="flujo-ia-loading">
            <div className="ia-loading-spinner" />
            <p>Un momento...</p>
          </div>
        ) : (
          <>
            {respuestaEstado && (
              <div className="flujo-ia-respuesta">
                <span className="flujo-ia-icono">🧠</span>
                <p>{respuestaEstado}</p>
              </div>
            )}
            <button
              className="btn btn-primary btn-full"
              style={{ marginTop: 24 }}
              onClick={() => setPaso('protocolo_regular')}
            >
              Comenzar protocolo →
            </button>
          </>
        )}
      </div>
    );
  }

  const prot = resultado ? protocolo[resultado.estado] : protocolo.ventral;

  /* Step 5: REGULAR - technique */
  if (paso === 'protocolo_regular') {
    return (
      <div className="page-container">
        <div className="flujo-paso-header">
          <span className="flujo-paso-num">Protocolo · REGULAR</span>
          <div className="flujo-progreso-dots">
            {['manana','checkin','protocolo','cierre'].map((s, i) => (
              <div key={s} className={`flujo-dot ${i === 2 ? 'activo' : ''}`} />
            ))}
          </div>
        </div>
        <div className="protocolo-card protocolo-regular">
          <span className="protocolo-icono">{prot.regular.icono}</span>
          <h2>{prot.regular.nombre}</h2>
          {resultado?.estado === 'dorsal' && (
            <p className="flujo-micro-edu">Alternar foco externo e interno ayuda a regular sin sobrecargar.</p>
          )}
          <p className="protocolo-instruccion">{prot.regular.instruccion}</p>
          <p className="protocolo-razon">{prot.regular.razon}</p>
        </div>
        <button className="btn btn-primary btn-full" onClick={() => setPaso('protocolo_ancla')}>
          Listo →
        </button>
      </div>
    );
  }

  /* Step 6: Activar ancla */
  if (paso === 'protocolo_ancla') {
    return (
      <div className="page-container">
        <div className="flujo-paso-header">
          <span className="flujo-paso-num">Protocolo · ANCLA</span>
          <div className="flujo-progreso-dots">
            {['manana','checkin','protocolo','cierre'].map((s, i) => (
              <div key={s} className={`flujo-dot ${i === 2 ? 'activo' : ''}`} />
            ))}
          </div>
        </div>
        <div className="protocolo-card protocolo-ancla">
          <span className="protocolo-icono">⚓</span>
          <h2>Activar ancla</h2>
          <p className="protocolo-instruccion">
            Volvé al ancla que instalaste en el audio inicial.<br />
            Hacé el gesto, palabra o foco interno que usaste.<br />
            No lo fuerces. Solo activalo y notá qué cambia.
          </p>
        </div>
        <button className="btn btn-primary btn-full" onClick={() => setPaso('protocolo_reducir')}>
          Hecho →
        </button>
        <button
          className="btn-ancla-recordar"
          title="Reproducí el audio maestro para recordar tu ancla"
          onClick={() => {}}
        >
          🔊 Recordar ancla
        </button>
      </div>
    );
  }

  /* Step 7: REDUCIR */
  if (paso === 'protocolo_reducir') {
    return (
      <div className="page-container">
        <div className="flujo-paso-header">
          <span className="flujo-paso-num">Protocolo · REDUCIR</span>
          <div className="flujo-progreso-dots">
            {['manana','checkin','protocolo','cierre'].map((s, i) => (
              <div key={s} className={`flujo-dot ${i === 2 ? 'activo' : ''}`} />
            ))}
          </div>
        </div>
        <div className="protocolo-card protocolo-reducir">
          <span className="protocolo-icono">✂️</span>
          <h2>{prot.reducirQ}</h2>
        </div>
        <div className="form-group">
          <textarea
            value={reducir}
            onChange={(e) => setReducir(e.target.value)}
            placeholder="Escribí lo que venga..."
            rows={3}
            className="flujo-textarea"
          />
        </div>
        <button className="btn btn-primary btn-full" onClick={() => setPaso('protocolo_resolver')}>
          Continuar →
        </button>
      </div>
    );
  }

  /* Step 8: RESOLVER */
  if (paso === 'protocolo_resolver') {
    return (
      <div className="page-container">
        <div className="flujo-paso-header">
          <span className="flujo-paso-num">Protocolo · RESOLVER</span>
          <div className="flujo-progreso-dots">
            {['manana','checkin','protocolo','cierre'].map((s, i) => (
              <div key={s} className={`flujo-dot ${i === 2 ? 'activo' : ''}`} />
            ))}
          </div>
        </div>
        <div className="protocolo-card protocolo-resolver">
          <span className="protocolo-icono">🎯</span>
          <h2>{prot.resolverQ}</h2>
        </div>
        <div className="form-group">
          <textarea
            value={resolver}
            onChange={(e) => setResolver(e.target.value)}
            placeholder="Escribí lo que venga..."
            rows={3}
            className="flujo-textarea"
          />
        </div>
        <button className="btn btn-primary btn-full" onClick={() => setPaso('protocolo_bilateral')}>
          Continuar →
        </button>
      </div>
    );
  }

  /* Step 9-A: BILATERAL */
  if (paso === 'protocolo_bilateral') {
    return (
      <div className="page-container">
        <div className="flujo-paso-header">
          <span className="flujo-paso-num">Protocolo · INTEGRAR</span>
          <div className="flujo-progreso-dots">
            {['manana','checkin','protocolo','cierre'].map((s, i) => (
              <div key={s} className={`flujo-dot ${i === 2 ? 'activo' : ''}`} />
            ))}
          </div>
        </div>
        <TICBlock onDone={() => setPaso('protocolo_soltar_config')} />
      </div>
    );
  }

  /* Step 9: SOLTAR - timer config */
  if (paso === 'protocolo_soltar_config') {
    const semana = calcularSemana();
    const audioSemanal = getAudioSemanal(semana);
    const audioMaestro = AUDIOS.find((a) => a.especial);
    const audioSoltar = audioSemanal ?? audioMaestro;

    return (
      <div className="page-container">
        <div className="flujo-paso-header">
          <span className="flujo-paso-num">Protocolo · SOLTAR</span>
          <div className="flujo-progreso-dots">
            {['manana','checkin','protocolo','cierre'].map((s, i) => (
              <div key={s} className={`flujo-dot ${i === 2 ? 'activo' : ''}`} />
            ))}
          </div>
        </div>
        <div className="protocolo-card protocolo-soltar">
          <span className="protocolo-icono">🕊️</span>
          <h2>SOLTAR</h2>
          <p className="flujo-micro-edu">El cuerpo integra mejor cuando dejás de intervenir.</p>
          <p className="protocolo-instruccion">
            {prot.timerLabel}. Dejá que el cuerpo integre lo que trabajaste.
          </p>
        </div>
        <div className="flujo-audio-soltar">
          <p className="flujo-audio-soltar-label">🎧 Acompañá la práctica con audio</p>
          <div className="flujo-audio-soltar-info">
            <strong>{audioSoltar.titulo}</strong>
            <span>{audioSoltar.descripcion}</span>
          </div>
          <AudioPlayer src={audioSoltar.src} />
        </div>
        <p className="flujo-timer-label">¿Cuánto tiempo tenés?</p>
        <div className="flujo-timer-opciones">
          <button
            className={`flujo-timer-btn ${prot.timerSug === 10 ? 'sugerido' : ''}`}
            onClick={() => iniciarTimer(10)}
          >
            10 min
            {prot.timerSug === 10 && <span className="sugerido-tag">sugerido</span>}
          </button>
          <button
            className={`flujo-timer-btn ${prot.timerSug === 12 ? 'sugerido' : ''}`}
            onClick={() => iniciarTimer(12)}
          >
            12 min
            {prot.timerSug === 12 && <span className="sugerido-tag">sugerido</span>}
          </button>
          <button
            className={`flujo-timer-btn ${prot.timerSug === 15 ? 'sugerido' : ''}`}
            onClick={() => iniciarTimer(15)}
          >
            15 min
            {prot.timerSug === 15 && <span className="sugerido-tag">sugerido</span>}
          </button>
        </div>
        <button className="btn btn-outline btn-full" style={{ marginTop: 12 }} onClick={iniciarCita}>
          Saltear este paso
        </button>
      </div>
    );
  }

  /* Step 10: SOLTAR - timer active */
  if (paso === 'protocolo_soltar_timer') {
    const mins = Math.floor(timerSec / 60);
    const secs = timerSec % 60;
    const totalSec = (timerMin ?? 10) * 60;
    const progreso = ((totalSec - timerSec) / totalSec) * 100;
    return (
      <div className="page-container centrado">
        <div className="flujo-timer-container">
          <div className="flujo-timer-ring">
            <svg viewBox="0 0 100 100" className="flujo-timer-svg">
              <circle cx="50" cy="50" r="44" fill="none" stroke="#DEE2E6" strokeWidth="6" />
              <circle
                cx="50" cy="50" r="44" fill="none" stroke="#51CF66" strokeWidth="6"
                strokeDasharray="276.46" strokeDashoffset={276.46 * (1 - progreso / 100)}
                strokeLinecap="round" transform="rotate(-90 50 50)"
                style={{ transition: 'stroke-dashoffset 1s linear' }}
              />
            </svg>
            <div className="flujo-timer-inner">
              <span className="flujo-timer-display">
                {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
              </span>
              <span className="flujo-timer-sub">SOLTAR</span>
            </div>
          </div>
          <p className="flujo-timer-instruccion">Cerrá los ojos. Dejá que el cuerpo integre.</p>
          <button className="btn btn-outline" onClick={() => { clearInterval(timerRef.current); setTimerActive(false); setPaso('respira'); }}>
            Terminar antes
          </button>
        </div>
      </div>
    );
  }

  /* Step 10-B: Respirá (2 s auto-advance) */
  if (paso === 'respira') {
    return <RespiraScreen onDone={iniciarCita} />;
  }

  /* Step 11: Closing quote (IA-generated) */
  if (paso === 'cita') {
    const semana = calcularSemana();
    const faseActual = fases[semana - 1];
    return (
      <div className="page-container centrado">
        <div className="flujo-cita-card">
          <span className="flujo-cita-semana">Semana {semana} · {faseActual?.nombre}</span>
          {citaIA === null ? (
            <div className="flujo-ia-loading" style={{ padding: '24px 0' }}>
              <div className="ia-loading-spinner" />
            </div>
          ) : (
            <>
              <blockquote className="flujo-cita-texto">"{citaIA}"</blockquote>
              <button className="btn btn-primary btn-full" onClick={guardarYCerrar}>
                Cerrar el flujo del día ✓
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return null;
}
