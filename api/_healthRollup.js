// Server-side wrapper del rollup HRV nocturno.
// - Consulta health_samples de un usuario en la ventana nocturna de una fecha.
// - Computa el FuenteReloj usando funciones puras de src/lib/hrvRollup.js.
// - Merge en usuarios/{uid}/mediciones/{fechaISO}.fuentes.reloj sin tocar
//   camara/subjetivo/resumen. Crea el doc si no existe (solo con reloj —
//   los readers deben tolerar camara/subjetivo faltantes).
//
// Consumido por: api/health-data.js (inline post-batch) y api/health-rollup.js (cron).

import './_firebaseAdmin.js';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { calcularRollupNocturno, ventanaNocturnaMs, diasAfectadosPorBatch } from '../src/lib/hrvRollup.js';

const DEFAULT_TZ = 'America/Argentina/Buenos_Aires';

async function fetchTimezone(db, uid) {
  const snap = await db.collection('usuarios').doc(uid).get();
  return snap.exists ? (snap.data().timezone || DEFAULT_TZ) : DEFAULT_TZ;
}

async function fetchSamplesEnRango(db, uid, desdeMs, hastaMs) {
  const snap = await db.collection('usuarios').doc(uid)
    .collection('health_samples')
    .where('timestamp', '>=', desdeMs)
    .where('timestamp', '<', hastaMs)
    .get();
  return snap.docs.map((d) => d.data());
}

/**
 * Recalcula el rollup para (uid, fechaISO) y escribe el resultado.
 * Idempotente: llamarlo dos veces produce el mismo estado final.
 *
 * @param {Object} args
 * @param {import('firebase-admin/firestore').Firestore} args.db
 * @param {string} args.uid
 * @param {string} args.fechaISO
 * @param {string} [args.timezone]
 * @returns {Promise<Object>} el FuenteReloj escrito
 */
export async function rollupDia({ db, uid, fechaISO, timezone = null }) {
  const tz = timezone ?? await fetchTimezone(db, uid);
  const { desdeMs, hastaMs } = ventanaNocturnaMs(fechaISO, tz);
  const samples = await fetchSamplesEnRango(db, uid, desdeMs, hastaMs);
  const rollup = calcularRollupNocturno({ samples, timezone: tz, fechaISO });
  const rollupConAudit = { ...rollup, calculadoEn: FieldValue.serverTimestamp() };

  const ref = db.collection('usuarios').doc(uid).collection('mediciones').doc(fechaISO);
  const snap = await ref.get();
  if (snap.exists) {
    // Update SOLO el path fuentes.reloj — no tocamos camara/subjetivo/resumen.
    await ref.update({ 'fuentes.reloj': rollupConAudit });
  } else {
    // Doc nuevo — solo escribimos fuentes.reloj. Cámara/subjetivo/resumen
    // los llenará el flujo del participante después.
    await ref.set({ fecha: fechaISO, fuentes: { reloj: rollupConAudit } });
  }
  return rollup;
}

/**
 * Dado un batch de samples entrantes, re-rolluppea todos los días cuyo
 * rollup pudiera cambiar. Over-computes ligeramente por seguridad.
 *
 * @param {Object} args
 * @param {import('firebase-admin/firestore').Firestore} args.db
 * @param {string} args.uid
 * @param {Array<{ timestamp: number }>} args.samples
 * @param {string} [args.timezone]
 * @returns {Promise<{ dias: string[], errors: Array<{ dia: string, error: string }> }>}
 */
export async function rollupDiasAfectados({ db, uid, samples, timezone = null }) {
  const tz = timezone ?? await fetchTimezone(db, uid);
  const dias = [...diasAfectadosPorBatch(samples, tz)];
  const errors = [];
  for (const dia of dias) {
    try {
      await rollupDia({ db, uid, fechaISO: dia, timezone: tz });
    } catch (err) {
      errors.push({ dia, error: err.message });
    }
  }
  return { dias, errors };
}

export { DEFAULT_TZ };

export function getDb() {
  return getFirestore();
}
