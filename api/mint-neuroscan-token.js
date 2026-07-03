// Vercel serverless: mintea un Firebase custom token para pasarle a
// NeuroScan (neuroscan.vercel.app). NeuroScan hace signInWithCustomToken()
// y así puede escribir en usuarios/{uid}/mediciones sin necesidad de
// que el user se loguee dos veces.
//
// Flujo:
//   client (Reset 3.0) →  POST /api/mint-neuroscan-token
//                         Authorization: Bearer <firebase ID token>
//   server (aquí)     →  verifyIdToken(idToken) → uid
//                     →  createCustomToken(uid) → customToken
//                     →  { token, uid }
//
// El custom token expira en 1h. En la práctica se consume una vez y
// se cambia por un ID token en NeuroScan, así que no queda flotando.

import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import './_firebaseAdmin.js'; // dispara initAdmin()

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }

  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!idToken) return res.status(401).json({ error: 'Falta Authorization: Bearer <token>' });

  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    const customToken = await getAdminAuth().createCustomToken(decoded.uid);
    return res.json({ token: customToken, uid: decoded.uid });
  } catch (err) {
    console.error('mint-neuroscan-token error:', err);
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}
