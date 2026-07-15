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
    // extra del cliente (defense in depth) — solo escribimos las conocidas.
    // Cada ítem tiene su propia lista de options (el ISI mezcla escalas
    // distintas por ítem), así que validamos value ∈ item.options[i].value.
    const respFiltrado = {};
    for (const inst of ASSESSMENT_INSTRUMENTS) {
      if (inst.licensed === false) continue; // saltado en el flujo del cliente
      const r = respuestas[inst.key];
      if (!Array.isArray(r) || r.length !== inst.items.length) {
        return res.status(400).json({
          error: 'invalid_respuestas',
          instrumento: inst.key,
          message: `Se esperaba array de ${inst.items.length} respuestas para ${inst.key}.`,
        });
      }
      for (let i = 0; i < r.length; i++) {
        const v = r[i];
        const allowed = inst.items[i].options.map((o) => o.value);
        if (!Number.isInteger(v) || !allowed.includes(v)) {
          return res.status(400).json({
            error: 'invalid_value',
            instrumento: inst.key,
            item: inst.items[i].id,
            message: `Valor "${v}" no está en las opciones válidas del ítem ${inst.items[i].id}.`,
          });
        }
      }
      respFiltrado[inst.key] = r;
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
