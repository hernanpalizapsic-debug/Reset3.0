import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase/config';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

// Envuelve una promise con un timeout para evitar colgar indefinidamente
function withTimeout(promise, ms, fallback) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  async function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  async function register(email, password, nombre, apellido) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, 'usuarios', cred.user.uid), {
      email,
      nombre,
      apellido: apellido || '',
      rol: 'participante',
      diaInicio: new Date().toISOString().split('T')[0],
      creadoEn: new Date(),
    });
    return cred;
  }

  async function logout() {
    setUserRole(null);
    return signOut(auth);
  }

  const ADMIN_EMAILS = ['hernanpaliza.psic@gmail.com'];

  async function fetchRole(uid, email) {
    // Fallback inmediato por email conocido — no depende de Firestore
    if (ADMIN_EMAILS.includes(email?.toLowerCase())) return 'admin';

    const firestorePromise = getDoc(doc(db, 'usuarios', uid))
      .then((snap) => (snap.exists() ? snap.data().rol ?? 'participante' : 'participante'))
      .catch(() => 'participante');

    // Si Firestore no responde en 6 segundos, continuamos con 'participante'
    return withTimeout(firestorePromise, 6000, 'participante');
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          const rol = await fetchRole(user.uid, user.email);
          setCurrentUser(user);
          setUserRole(rol);
        } else {
          setCurrentUser(null);
          setUserRole(null);
        }
      } catch {
        // Si onAuthStateChanged falla por completo, desbloqueamos igual
        setCurrentUser(null);
        setUserRole(null);
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, userRole, login, register, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
