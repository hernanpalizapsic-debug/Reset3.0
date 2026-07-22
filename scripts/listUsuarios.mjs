// Read-only. Lista todos los docs en /usuarios con los campos relevantes
// para revisar antes de la migración de aprobación manual.
//
// Uso: node scripts/listUsuarios.mjs

import admin from 'firebase-admin';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

function loadEnv() {
  const env = {};
  for (const name of ['.env.local', '.env']) {
    const p = path.join(rootDir, name);
    if (!existsSync(p)) continue;
    readFileSync(p, 'utf8').split('\n').forEach((line) => {
      const idx = line.indexOf('=');
      if (idx < 1) return;
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim().replace(/^"|"$/g, '');
      env[key] = val;
    });
  }
  return env;
}

const env = loadEnv();
const projectId = env.FIREBASE_PROJECT_ID;
const clientEmail = env.FIREBASE_CLIENT_EMAIL;
const privateKey = env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error('❌ Faltan FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL o FIREBASE_PRIVATE_KEY en .env.local');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
});

async function run() {
  const snap = await admin.firestore().collection('usuarios').get();
  const rows = snap.docs.map((d) => {
    const data = d.data();
    const creadoEn = data.creadoEn?.toDate?.() ?? data.creadoEn;
    return {
      uid: d.id,
      email: data.email ?? '(sin email)',
      nombre: [data.nombre, data.apellido].filter(Boolean).join(' ') || '(sin nombre)',
      rol: data.rol ?? 'participante',
      diaInicio: data.diaInicio ?? '-',
      creadoEn: creadoEn ? new Date(creadoEn).toISOString() : '-',
      aprobado: data.aprobado ?? '(no seteado)',
      estadoAprobacion: data.estadoAprobacion ?? '(no seteado)',
    };
  });
  rows.sort((a, b) => (a.creadoEn > b.creadoEn ? 1 : -1));
  console.log(`Total docs en /usuarios: ${rows.length}\n`);
  rows.forEach((r, i) => {
    console.log(`${i + 1}. ${r.email}`);
    console.log(`   nombre: ${r.nombre}`);
    console.log(`   rol: ${r.rol}   diaInicio: ${r.diaInicio}   creadoEn: ${r.creadoEn}`);
    console.log(`   aprobado: ${r.aprobado}   estadoAprobacion: ${r.estadoAprobacion}`);
    console.log(`   uid: ${r.uid}`);
    console.log('');
  });
}

run().catch((err) => { console.error('❌', err.message); process.exit(1); });
