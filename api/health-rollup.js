// GET /api/health-rollup — cron endpoint.
//
// Safety net del rollup inline. Corre a las 11:00 UTC (08:00 UTC-3) todos los
// días y re-computa el rollup del día anterior para cada usuario. Idempotente
// — si el inline ya escribió el día, este cron reescribe lo mismo.
//
// Autenticación: Vercel Cron manda header `Authorization: Bearer <CRON_SECRET>`
// si la env var está seteada. En dev/manual, sin CRON_SECRET, permite cualquier
// llamada (útil para debuggear). En prod, si la env var existe, la exige.

import './_firebaseAdmin.js';
import { rollupDia, DEFAULT_TZ, getDb } from './_healthRollup.js';

function fechaAyerEnTz(tz) {
  const ahora = new Date();
  const ahoraLocal = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(ahora);
  const y = Number(ahoraLocal.find((p) => p.type === 'year').value);
  const m = Number(ahoraLocal.find((p) => p.type === 'month').value);
  const d = Number(ahoraLocal.find((p) => p.type === 'day').value);
  const ayer = new Date(Date.UTC(y, m - 1, d));
  ayer.setUTCDate(ayer.getUTCDate() - 1);
  const yy = ayer.getUTCFullYear();
  const mm = String(ayer.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(ayer.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export default async function handler(req, res) {
  // Cron secret check — si está configurado, exigirlo.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const header = req.headers.authorization || '';
    if (header !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'unauthorized' });
    }
  }

  try {
    const db = getDb();
    const snap = await db.collection('usuarios').get();
    const resultados = [];
    for (const doc of snap.docs) {
      const data = doc.data();
      const uid = doc.id;
      const tz = data.timezone || DEFAULT_TZ;
      const fecha = fechaAyerEnTz(tz);
      try {
        const rollup = await rollupDia({ db, uid, fechaISO: fecha, timezone: tz });
        resultados.push({
          uid,
          fecha,
          tz,
          disponible: rollup.disponible,
          nSamples: rollup.nSamples,
          confianza: rollup.confianza,
        });
      } catch (err) {
        console.error(`[health-rollup] error en uid=${uid} fecha=${fecha}`, err);
        resultados.push({ uid, fecha, tz, error: err.message });
      }
    }
    return res.status(200).json({
      success: true,
      totalUsuarios: resultados.length,
      resultados,
    });
  } catch (err) {
    console.error('[health-rollup] fallo general', err);
    return res.status(500).json({ error: 'internal', message: err.message });
  }
}
