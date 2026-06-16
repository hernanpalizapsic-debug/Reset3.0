import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase/config';
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc,
} from 'firebase/firestore';

export default function Notas() {
  const { currentUser } = useAuth();
  const [notas, setNotas] = useState([]);
  const [nueva, setNueva] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'notas'),
      where('uid', '==', currentUser.uid),
      orderBy('creadoEn', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setNotas(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [currentUser.uid]);

  async function guardar() {
    if (!nueva.trim()) return;
    setGuardando(true);
    await addDoc(collection(db, 'notas'), {
      uid: currentUser.uid,
      texto: nueva.trim(),
      creadoEn: new Date(),
    });
    setNueva('');
    setGuardando(false);
  }

  async function eliminar(id) {
    await deleteDoc(doc(db, 'notas', id));
  }

  function formatFecha(ts) {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  return (
    <div className="page-container">
      <h1>Mis notas</h1>
      <p className="subtitulo">Registrá tus observaciones e insights del proceso</p>

      <div className="nueva-nota-card">
        <textarea
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
          placeholder="Escribí una nueva nota..."
          rows={4}
        />
        <button
          className="btn btn-primary"
          onClick={guardar}
          disabled={guardando || !nueva.trim()}
        >
          {guardando ? 'Guardando...' : 'Guardar nota'}
        </button>
      </div>

      <div className="notas-lista">
        {notas.length === 0 && (
          <p className="empty-state">Aún no tenés notas. ¡Empezá a registrar tus insights!</p>
        )}
        {notas.map((n) => (
          <div key={n.id} className="nota-item">
            <p>{n.texto}</p>
            <div className="nota-footer">
              <span className="nota-fecha">{formatFecha(n.creadoEn)}</span>
              <button className="btn-delete" onClick={() => eliminar(n.id)}>
                🗑
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
