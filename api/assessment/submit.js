// POST /api/assessment/submit
//
// Body: { token: string, respuestas: { pss10?, isi?, claridad? } }
//
// - Valida token (existe, no expirado, no completado)
// - Valida shape de respuestas contra ASSESSMENT_INSTRUMENTS (largo,
//   escala en rango) para cada instrumento licensed
// - Corre scoreAssessment SERVER-SIDE (el cliente NO envía scores —
//   evita tampering)
// - Escribe respuestas + scores + estado='completado' con updated timestamp
// - Devuelve los scores calculados

import '../_firebaseAdmin.js';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { ASSESSMENT_INSTRUMENTS } from '../../src/lib/instruments.js';
import { scoreAssessment } from '../../src/lib/scoring.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }

  const { token, respuestas } = req.body || {};
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'missing_token' });
  }
  if (!respuestas || typeof respuestas !== 'object') {
    return res.status(400).json({ error: 'missing_respuestas' });
  }

  try {
    const db = getFirestore();
    const ref = db.collection('assessments').doc(token);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'not_found' });
    const data = snap.data();

    const now = Date.now();
    const expMs = data.expiraEn?.toMillis?.();
    if (expMs && now > expMs) return res.status(410).json({ error: 'expired' });
    if (data.estado === 'completado') {
      return res.status(409).json({ error: 'already_completed' });
    }

    // Validar respuestas contra los instrumentos licensed. Ignoramos entradas
    // extra del cliente (defense in depth) — solo escribimos las 3 conocidas.
    const respFiltrado = {};
    for (const inst of ASSESSMENT_INSTRUMENTS) {
      if (inst.licensed === false) continue; // el flujo del cliente ya salteó éste
      const r = respuestas[inst.id];
      if (!Array.isArray(r) || r.length !== inst.items.length) {
        return res.status(400).json({
          error: 'invalid_respuestas',
          instrumento: inst.id,
          message: `Se esperaba array de ${inst.items.length} respuestas para ${inst.id}.`,
        });
      }
      for (const v of r) {
        if (
          typeof v !== 'number' ||
          !Number.isFinite(v) ||
          v < inst.escala.min ||
          v > inst.escala.max
        ) {
          return res.status(400).json({
            error: 'invalid_value',
            instrumento: inst.id,
            message: `Valores deben ser números en [${inst.escala.min}, ${inst.escala.max}].`,
          });
        }
      }
      respFiltrado[inst.id] = r;
    }

    const scores = scoreAssessment(respFiltrado);

    await ref.update({
      respuestas: respFiltrado,
      scores,
      estado: 'completado',
      completadoEn: FieldValue.serverTimestamp(),
    });

    return res.status(200).json({ ok: true, scores });
  } catch (err) {
    console.error('assessment/submit error:', err);
    return res.status(500).json({ error: 'internal', message: err.message });
  }
}
