// Smoke test de firestore.rules contra el emulador.
// Requiere: emulador corriendo (npx firebase-tools emulators:start --only firestore --project=demo-reset30).
// Correr: node scripts/test-rules.mjs

import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { setDoc, getDoc, updateDoc, doc } from 'firebase/firestore';

const PROJECT_ID = 'demo-reset30';
const OWNER_UID = 'user-alice';
const OTHER_UID = 'user-bob';
const FECHA = '2026-06-16';

const medicionValida = {
  fecha: FECHA,
  fuentes: {
    reloj: { disponible: false, dispositivo: null, hrv_rmssd_nocturno: null, fechaSueno: null, confianza: 'Ninguna' },
    camara: { disponible: true, hrv: { ok: true, bpm: 72 }, oculomotor: null, plr: null, confianza_general: 'Media' },
    subjetivo: { tension: 'Moderada', energia: 'Normal', fatiga: 'No' },
  },
  resumen: { fuentePrincipal: 'camara', indiceCompuesto: 65, tendenciaSemana: 'sin_datos' },
};

const results = [];
function record(name, expected, actual, err) {
  const pass = expected === actual;
  results.push({ name, expected, actual, pass, err: err?.message ?? null });
  const tag = pass ? '✔' : '✘';
  console.log(`${tag} ${name}  (expected ${expected}, got ${actual})${err && !pass ? `\n    ↳ ${err.message}` : ''}`);
}

async function run(label, expected, fn) {
  try {
    if (expected === 'allow') {
      await assertSucceeds(fn());
      record(label, 'allow', 'allow');
    } else {
      await assertFails(fn());
      record(label, 'deny', 'deny');
    }
  } catch (err) {
    record(label, expected, expected === 'allow' ? 'deny' : 'allow', err);
  }
}

const env = await initializeTestEnvironment({
  projectId: PROJECT_ID,
  firestore: {
    host: '127.0.0.1',
    port: 8080,
    rules: readFileSync('firestore.rules', 'utf8'),
  },
});

const ownerDb = env.authenticatedContext(OWNER_UID).firestore();
const otherDb = env.authenticatedContext(OTHER_UID).firestore();

const ownerMedRef = doc(ownerDb, `usuarios/${OWNER_UID}/mediciones/${FECHA}`);
const otherMedRef = doc(otherDb, `usuarios/${OWNER_UID}/mediciones/${FECHA}`);
const ownerDispRef = doc(ownerDb, `usuarios/${OWNER_UID}/dispositivos/fitbit-1`);

// 1. Owner crea medición válida — debe pasar.
await run('owner crea medición válida', 'allow', () =>
  setDoc(ownerMedRef, medicionValida)
);

// 2. Otro usuario intenta leer medición del owner — debe rechazar.
await run('otro user lee medición ajena', 'deny', () =>
  getDoc(otherMedRef)
);

// 3. Owner intenta crear medición con fecha distinta al docId — debe rechazar.
await run('create con fecha mismatch', 'deny', () => {
  const ref = doc(ownerDb, `usuarios/${OWNER_UID}/mediciones/2026-06-17`);
  return setDoc(ref, { ...medicionValida, fecha: '2099-01-01' });
});

// 4. Owner intenta crear sin bloque fuentes — debe rechazar.
await run('create sin fuentes', 'deny', () => {
  const ref = doc(ownerDb, `usuarios/${OWNER_UID}/mediciones/2026-06-18`);
  return setDoc(ref, { fecha: '2026-06-18', resumen: medicionValida.resumen });
});

// 5. Owner intenta crear con fuentes.reloj.disponible=true (el cliente "se inventa" datos del wearable) — debe rechazar.
await run('create con reloj.disponible=true', 'deny', () => {
  const ref = doc(ownerDb, `usuarios/${OWNER_UID}/mediciones/2026-06-19`);
  const bad = JSON.parse(JSON.stringify(medicionValida));
  bad.fecha = '2026-06-19';
  bad.fuentes.reloj.disponible = true;
  bad.fuentes.reloj.hrv_rmssd_nocturno = 42;
  return setDoc(ref, bad);
});

// 6. Owner actualiza la medición del paso 1 cambiando fuentes.reloj — debe rechazar.
await run('update tocando fuentes.reloj', 'deny', () =>
  updateDoc(ownerMedRef, {
    'fuentes.reloj.disponible': true,
    'fuentes.reloj.hrv_rmssd_nocturno': 50,
  })
);

// 7. Owner actualiza solo fuentes.subjetivo — debe pasar (no toca reloj).
await run('update solo subjetivo', 'allow', () =>
  updateDoc(ownerMedRef, { 'fuentes.subjetivo.tension': 'Alta' })
);

// 8. Owner intenta escribir en dispositivos — debe rechazar (read-only desde cliente).
await run('client escribe en dispositivos', 'deny', () =>
  setDoc(ownerDispRef, { proveedor: 'fitbit', conectado: true })
);

// 9. Admin SDK (bypass de rules) puebla dispositivos, después owner lo lee.
await env.withSecurityRulesDisabled(async (adminCtx) => {
  const adminRef = doc(adminCtx.firestore(), `usuarios/${OWNER_UID}/dispositivos/fitbit-1`);
  await setDoc(adminRef, {
    proveedor: 'fitbit',
    conectado: true,
    ultimaSincronizacion: '2026-06-16T03:00:00Z',
    expiraToken: '2026-06-23T00:00:00Z',
    scopeOtorgado: 'heartrate sleep',
  });
});
await run('owner lee dispositivos (poblado por admin)', 'allow', () =>
  getDoc(ownerDispRef)
);

await env.cleanup();

const passed = results.filter((r) => r.pass).length;
const failed = results.length - passed;
console.log(`\n=== ${passed}/${results.length} passed${failed ? ` · ${failed} FAILED` : ''} ===`);
process.exit(failed === 0 ? 0 : 1);
