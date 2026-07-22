// POST /api/admin/approve-user
//
// Body: { uid: string, action: 'aprobar' | 'rechazar' }
//
// - Auth: Firebase ID token en header Authorization: Bearer <token>
// - Solo el admin (whitelist por email, alineado con firestore.rules isAdmin())
//   puede llamar este endpoint. Cualquier otro caller devuelve 403.
// - Escribe aprobado + estadoAprobacion + fechaAprobacion/fechaRechazo +
//   aprobadoPor en usuarios/{uid} usando Admin SDK (bypass de rules).

import '../_firebaseAdmin.js';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';

const ADMIN_EMAILS = new Set(['hernanpaliza.psic@gmail.com']);

async function verifyAdmin(req) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  try {
    const decoded = await getAdminAuth().verifyIdToken(match[1].trim());
    if (!ADMIN_EMAILS.has(decoded.email?.toLowerCase())) return null;
    return decoded;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const admin = await verifyAdmin(req);
  if (!admin) return res.status(403).json({ error: 'forbidden' });

  const { uid, action } = req.body || {};
  if (typeof uid !== 'string' || !uid.length) {
    return res.status(400).json({ error: 'invalid_uid' });
  }
  if (action !== 'aprobar' && action !== 'rechazar') {
    return res.status(400).json({ error: 'invalid_action', message: 'action debe ser "aprobar" o "rechazar"' });
  }

  try {
    const db = getFirestore();
    const ref = db.collection('usuarios').doc(uid);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'user_not_found' });

    const now = FieldValue.serverTimestamp();
    const update = { aprobadoPor: admin.uid };
    if (action === 'aprobar') {
      update.aprobado = true;
      update.estadoAprobacion = 'aprobado';
      update.fechaAprobacion = now;
    } else {
      update.aprobado = false;
      update.estadoAprobacion = 'rechazado';
      update.fechaRechazo = now;
    }
    await ref.update(update);

    return res.status(200).json({ success: true, uid, action });
  } catch (err) {
    console.error('[admin/approve-user] error', err);
    return res.status(500).json({ error: 'internal', message: err.message });
  }
}
