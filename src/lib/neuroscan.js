// Client-side glue para el módulo externo NeuroScan (neuroscan.vercel.app).
// Dos piezas:
//   - abrirNeuroScan(currentUser, tipo): mintea custom token vía /api,
//     arma la URL con uid+tipo+token y redirige.
//   - useEvaluacionReturn(): hook que detecta ?evaluacion=completa al
//     volver de NeuroScan, lee la medición del día de Firestore, y limpia
//     el query param para que un refresh no re-dispare.

import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

const NEUROSCAN_URL = import.meta.env.VITE_NEUROSCAN_URL || 'https://neuroscan.vercel.app';

/** @type {ReadonlyArray<'inicial'|'semanal'|'final'>} */
const TIPOS_VALIDOS = ['inicial', 'semanal', 'final'];

/**
 * Abre NeuroScan pasándole uid + tipo + custom token en la URL.
 * @param {import('firebase/auth').User} currentUser
 * @param {'inicial'|'semanal'|'final'} tipo
 */
export async function abrirNeuroScan(currentUser, tipo) {
  if (!currentUser) throw new Error('No hay usuario en sesión');
  if (!TIPOS_VALIDOS.includes(tipo)) {
    throw new Error(`tipo debe ser uno de: ${TIPOS_VALIDOS.join(', ')}`);
  }

  const idToken = await currentUser.getIdToken();
  const res = await fetch('/api/mint-neuroscan-token', {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(`No se pudo mintear token para NeuroScan (${res.status}): ${msg}`);
  }
  const { token } = await res.json();

  const url = new URL(NEUROSCAN_URL);
  url.searchParams.set('uid', currentUser.uid);
  url.searchParams.set('tipo', tipo);
  url.searchParams.set('token', token);
  window.location.href = url.toString();
}

/**
 * Hook: si venimos con ?evaluacion=completa, lee la medición de hoy
 * de usuarios/{uid}/mediciones/{fechaISO} y la expone.
 *
 * @returns {{
 *   evaluacion: import('../types/biometrics.js').Medicion | null,
 *   loading: boolean,
 *   error: Error | null,
 *   dismiss: () => void
 * }}
 */
export function useEvaluacionReturn() {
  const { currentUser } = useAuth();
  const [state, setState] = useState({ evaluacion: null, loading: false, error: null });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('evaluacion') !== 'completa' || !currentUser) return;

    // Limpiamos la URL de una vez, para que refresh o back no re-dispare.
    const clean = new URL(window.location.href);
    clean.searchParams.delete('evaluacion');
    window.history.replaceState({}, '', clean.toString());

    // No seteamos loading:true acá: Firestore normalmente resuelve en <300ms
    // (el doc lo acaba de escribir NeuroScan), y evitamos el warning de
    // react-hooks/set-state-in-effect. El modal queda oculto hasta que la
    // promise resuelve, en vez de mostrar un flash de "cargando…".
    const fecha = new Date().toISOString().split('T')[0];
    const ref = doc(db, 'usuarios', currentUser.uid, 'mediciones', fecha);
    getDoc(ref)
      .then((snap) => {
        if (!snap.exists()) throw new Error('No encontré tu medición del día');
        setState({ evaluacion: snap.data(), loading: false, error: null });
      })
      .catch((err) => setState({ evaluacion: null, loading: false, error: err }));
  }, [currentUser]);

  const dismiss = () => setState({ evaluacion: null, loading: false, error: null });
  return { ...state, dismiss };
}
