import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase/config';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  sendEmailVerification,
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

const ADMIN_EMAILS = ['hernanpaliza.psic@gmail.com'];

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const [aprobado, setAprobado] = useState(false);
  const [estadoAprobacion, setEstadoAprobacion] = useState('pendiente');
  const [loading, setLoading] = useState(true);

  async function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  async function register(email, password, nombre, apellido) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    // Fire and forget: si falla el envío inicial, el usuario podrá reenviar desde /verificar-email
    sendEmailVerification(cred.user).catch(() => {});
    // Detección de TZ del browser con fallback a Buenos Aires. Guardarlo en el
    // user doc permite al rollup HRV agrupar samples por día LOCAL del usuario.
    const timezone =
      Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Argentina/Buenos_Aires';
    await setDoc(doc(db, 'usuarios', cred.user.uid), {
      email,
      nombre,
      apellido: apellido || '',
      rol: 'participante',
      diaInicio: new Date().toISOString().split('T')[0],
      creadoEn: new Date(),
      timezone,
      // Gate de aprobación manual — inmutables desde cliente por firestore.rules.
      aprobado: false,
      estadoAprobacion: 'pendiente',
    });
    return cred;
  }

  async function resendVerificationEmail() {
    if (!auth.currentUser) throw new Error('No hay sesión activa.');
    await sendEmailVerification(auth.currentUser);
  }

  // Recarga el user desde Firebase (para detectar cuando ya verificó su email)
  // y re-lee el perfil de Firestore (para detectar cuando el admin aprobó).
  async function refreshUser() {
    if (!auth.currentUser) return { verified: false, aprobado: false };
    await auth.currentUser.reload();
    const verified = !!auth.currentUser.emailVerified;
    setEmailVerified(verified);
    const profile = await fetchUserProfile(auth.currentUser.uid, auth.currentUser.email);
    setUserRole(profile.rol);
    setAprobado(profile.aprobado);
    setEstadoAprobacion(profile.estadoAprobacion);
    return { verified, aprobado: profile.aprobado };
  }

  async function logout() {
    setUserRole(null);
    setEmailVerified(false);
    setAprobado(false);
    setEstadoAprobacion('pendiente');
    return signOut(auth);
  }

  async function fetchUserProfile(uid, email) {
    // Admin: bypass total (no requiere Firestore).
    if (ADMIN_EMAILS.includes(email?.toLowerCase())) {
      return { rol: 'admin', aprobado: true, estadoAprobacion: 'aprobado' };
    }

    const firestorePromise = getDoc(doc(db, 'usuarios', uid))
      .then((snap) => {
        if (!snap.exists()) {
          return { rol: 'participante', aprobado: false, estadoAprobacion: 'pendiente' };
        }
        const data = snap.data();
        return {
          rol: data.rol ?? 'participante',
          aprobado: data.aprobado === true,
          estadoAprobacion: data.estadoAprobacion ?? (data.aprobado === true ? 'aprobado' : 'pendiente'),
        };
      })
      .catch(() => ({ rol: 'participante', aprobado: false, estadoAprobacion: 'pendiente' }));

    return withTimeout(firestorePromise, 6000, { rol: 'participante', aprobado: false, estadoAprobacion: 'pendiente' });
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          const profile = await fetchUserProfile(user.uid, user.email);
          setCurrentUser(user);
          setUserRole(profile.rol);
          setAprobado(profile.aprobado);
          setEstadoAprobacion(profile.estadoAprobacion);
          setEmailVerified(!!user.emailVerified);
        } else {
          setCurrentUser(null);
          setUserRole(null);
          setEmailVerified(false);
          setAprobado(false);
          setEstadoAprobacion('pendiente');
        }
      } catch {
        // Si onAuthStateChanged falla por completo, desbloqueamos igual
        setCurrentUser(null);
        setUserRole(null);
        setEmailVerified(false);
        setAprobado(false);
        setEstadoAprobacion('pendiente');
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userRole,
        emailVerified,
        aprobado,
        estadoAprobacion,
        login,
        register,
        logout,
        resendVerificationEmail,
        refreshUser,
        loading,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
}
