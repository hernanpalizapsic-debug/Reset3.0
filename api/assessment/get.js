// GET /api/assessment/get?token=xxx
//
// Valida un token de assessment y devuelve metadata segura (empresa,
// nombre ejecutivo, fecha expira). NO devuelve email ni respuestas ni
// scores — el ejecutivo solo necesita saber qué empresa lo mandó y
// cuánto tiene.
//
// Errores:
//   404 not_found         — el token no existe
//   410 expired           — el token expiró
//   409 already_completed — ya se respondió una vez

import '../_firebaseAdmin.js';
import { getFirestore } from 'firebase-admin/firestore';

export default async function handler(req, res) {
  const token = req.query?.token;
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'missing_token' });
  }

  try {
    const db = getFirestore();
    const snap = await db.collection('assessments').doc(token).get();
    if (!snap.exists) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Este link no existe o fue eliminado.',
      });
    }
    const data = snap.data();
    const now = Date.now();
    const expMs = data.expiraEn?.toMillis?.();
    if (expMs && now > expMs) {
      return res.status(410).json({
        error: 'expired',
        message: 'Este link expiró.',
      });
    }
    if (data.estado === 'completado') {
      return res.status(409).json({
        error: 'already_completed',
        message: 'Este assessment ya fue respondido.',
      });
    }
    return res.status(200).json({
      empresa: data.empresa,
      ejecutivoNombre: data.ejecutivoNombre,
      creadoEn: data.creadoEn?.toMillis?.() ?? null,
      expiraEn: expMs ?? null,
    });
  } catch (err) {
    console.error('assessment/get error:', err);
    return res.status(500).json({ error: 'internal', message: err.message });
  }
}
