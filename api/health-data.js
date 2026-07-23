// GET /api/health-data — devuelve las últimas 30 muestras del usuario autenticado.
// POST /api/health-data — recibe { sourceDevice, samples: [...] } y las persiste en
//   usuarios/{uid}/health_samples/{dataType}_{timestamp} vía batch idempotente.
//
// Auth: Firebase ID token en header Authorization: Bearer <token>.
// CORS: allowlist explícito (resetejecutivo.app, reset30.vercel.app, localhost dev,
//       Capacitor/Ionic). Preflight OPTIONS responde 204.

import './_firebaseAdmin.js';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { rollupDiasAfectados } from './_healthRollup.js';

const ALLOWED_ORIGINS = new Set([
  'https://resetejecutivo.app',
  'https://reset30.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5177',
  'http://localhost:3000',
  'capacitor://localhost',
  'ionic://localhost',
]);

// Whitelist de dataTypes aceptados. Extender acá conforme aparezcan nuevas fuentes.
const VALID_DATA_TYPES = new Set([
  'hrv_rmssd',
  'hrv_sdnn',
  'heart_rate',
  'heart_rate_resting',
  'steps',
  'sleep_duration',
  'sleep_efficiency',
  'active_energy',
  'blood_oxygen',
  'respiratory_rate',
  'body_temperature',
]);

const MAX_SAMPLES_PER_REQUEST = 400; // Firestore batch soporta 500; dejamos margen.
const MAX_STRING_LEN = 128;
const MAX_DEVICE_SLUG_LEN = 64;

// Sanitiza sourceDevice para usarlo dentro del doc id de Firestore.
// Firestore doc ids: no vacíos, no contienen '/', no pueden ser '.'/'..',
// no pueden empezar con '__' (reservado), max 1500 bytes.
// Colapsamos todo lo no [A-Za-z0-9._-] a '-', comprimimos dashes,
// trimmeamos '-' de las puntas, y capamos a MAX_DEVICE_SLUG_LEN.
// Devuelve null si el slug queda vacío o inválido.
function slugifyDeviceId(raw) {
  if (typeof raw !== 'string') return null;
  let slug = raw
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_DEVICE_SLUG_LEN);
  if (!slug) return null;
  if (slug === '.' || slug === '..') return null;
  if (slug.startsWith('__')) slug = slug.replace(/^_+/, '');
  return slug || null;
}

function setCors(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '600');
}

async function verifyBearer(req) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  try {
    return await getAdminAuth().verifyIdToken(match[1].trim());
  } catch {
    return null;
  }
}

function validateSample(s) {
  if (!s || typeof s !== 'object') return 'sample_not_object';
  if (typeof s.dataType !== 'string' || !VALID_DATA_TYPES.has(s.dataType)) return 'invalid_dataType';
  if (!Number.isInteger(s.timestamp) || s.timestamp <= 0) return 'invalid_timestamp';
  if (typeof s.value !== 'number' || !Number.isFinite(s.value)) return 'invalid_value';
  if (typeof s.unit !== 'string' || !s.unit.length || s.unit.length > MAX_STRING_LEN) return 'invalid_unit';
  // deviceModel: opcional. Modelo/nombre del wearable de origen (sourceName del
  // plugin de salud). Covariable de calidad de dato para informes; a propósito
  // NO participa del doc ID para no romper la idempotencia por timestamp.
  if (s.deviceModel !== undefined) {
    if (typeof s.deviceModel !== 'string' || !s.deviceModel.length || s.deviceModel.length > MAX_STRING_LEN) {
      return 'invalid_deviceModel';
    }
  }
  return null;
}

export default async function handler(req, res) {
  setCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST, OPTIONS');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const decoded = await verifyBearer(req);
  if (!decoded?.uid) return res.status(401).json({ error: 'unauthorized' });

  try {
    const db = getFirestore();
    const samplesCol = db.collection('usuarios').doc(decoded.uid).collection('health_samples');

    if (req.method === 'POST') {
      const { sourceDevice, samples } = req.body || {};

      if (typeof sourceDevice !== 'string' || !sourceDevice.length || sourceDevice.length > MAX_STRING_LEN) {
        return res.status(400).json({ error: 'invalid_sourceDevice' });
      }
      const deviceSlug = slugifyDeviceId(sourceDevice);
      if (!deviceSlug) {
        return res.status(400).json({ error: 'invalid_sourceDevice', message: 'sourceDevice no produce un slug válido para Firestore doc id' });
      }
      if (!Array.isArray(samples) || samples.length === 0) {
        return res.status(400).json({ error: 'invalid_samples', message: 'samples must be a non-empty array' });
      }
      if (samples.length > MAX_SAMPLES_PER_REQUEST) {
        return res.status(413).json({ error: 'too_many_samples', max: MAX_SAMPLES_PER_REQUEST });
      }
      for (let i = 0; i < samples.length; i++) {
        const err = validateSample(samples[i]);
        if (err) return res.status(400).json({ error: err, index: i });
      }

      const batch = db.batch();
      const recibidoEn = FieldValue.serverTimestamp();
      for (const s of samples) {
        // ID compuesto: {dataType}_{sourceDeviceSlug}_{timestamp}.
        // Evita colisión entre dispositivos distintos que reportan el mismo instante.
        const docId = `${s.dataType}_${deviceSlug}_${s.timestamp}`;
        batch.set(samplesCol.doc(docId), {
          dataType: s.dataType,
          timestamp: s.timestamp,
          value: s.value,
          unit: s.unit,
          sourceDevice, // valor original, sin sanitizar
          ...(s.deviceModel !== undefined && { deviceModel: s.deviceModel }),
          recibidoEn,
        });
      }
      await batch.commit();

      // Rollup inline: recalcula fuentes.reloj de los días tocados por este batch.
      // Idempotente. Si falla, los samples ya quedaron persistidos y el cron
      // nightly como safety net los recuperará — no bloqueamos la respuesta.
      let rollup = null;
      try {
        rollup = await rollupDiasAfectados({ db, uid: decoded.uid, samples });
      } catch (err) {
        console.error('[health-data] rollup fallo (samples ya persistidos)', err);
      }

      return res.status(200).json({
        success: true,
        count: samples.length,
        ...(rollup && { rollup: { dias: rollup.dias, errores: rollup.errors } }),
      });
    }

    // GET
    const snap = await samplesCol.orderBy('timestamp', 'desc').limit(30).get();
    const samples = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        dataType: data.dataType,
        timestamp: data.timestamp,
        value: data.value,
        unit: data.unit,
        sourceDevice: data.sourceDevice,
        ...(data.deviceModel !== undefined && { deviceModel: data.deviceModel }),
      };
    });
    return res.status(200).json({ samples, count: samples.length });
  } catch (err) {
    console.error('[health-data] error', err);
    return res.status(500).json({ error: 'internal', message: err.message });
  }
}
