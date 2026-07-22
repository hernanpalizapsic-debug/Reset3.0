// Migración one-shot: marca aprobado:true a los users existentes
// para no bloquearlos cuando se active el gate de aprobación manual.
//
// Uso:
//   node scripts/migrateAprobados.mjs --dry-run   ← preview, no escribe
//   node scripts/migrateAprobados.mjs --apply     ← ejecuta la escritura
//
// UIDs excluidos (quedan como pendientes/rechazados): editar EXCLUIR_UIDS abajo.

import admin from 'firebase-admin';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

// UIDs que NO se aprueban en la migración (los dejamos como pendientes).
// Editar con la lista real. Los emails están al lado como referencia.
const EXCLUIR_UIDS = new Set([
  'SDimwExPGKXbsUARSza7icksQcV2', // #14 hernanpaliza.psoc+test1@gmail.com
  'lbe6fmf7oicb3msvPui1BAo5QUH3', // #15 diagtest-noadmin-2026a@example.com
  'gR56JCxuAZaA89D8WRuKZGzxV2T2', // #16 proyectomanus1@gmail.com
]);

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

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const apply = args.has('--apply');

if (!dryRun && !apply) {
  console.error('❌ Pasar --dry-run o --apply');
  process.exit(1);
}

async function run() {
  const db = admin.firestore();
  const snap = await db.collection('usuarios').get();
  const modo = dryRun ? '[DRY-RUN]' : '[APPLY]';

  const aAprobar = [];
  const aExcluir = [];

  for (const doc of snap.docs) {
    const data = doc.data();
    if (EXCLUIR_UIDS.has(doc.id)) {
      aExcluir.push({ uid: doc.id, email: data.email });
      continue;
    }
    // Si ya está aprobado, no re-escribir (idempotencia).
    if (data.aprobado === true) {
      console.log(`  ~ skip (ya aprobado): ${data.email}`);
      continue;
    }
    aAprobar.push({ uid: doc.id, email: data.email, rol: data.rol });
  }

  console.log(`${modo} A aprobar: ${aAprobar.length} users`);
  aAprobar.forEach((u, i) => console.log(`   ${i + 1}. ${u.email} (${u.rol})`));
  console.log(`\n${modo} Excluidos (quedan pendientes): ${aExcluir.length} users`);
  aExcluir.forEach((u, i) => console.log(`   ${i + 1}. ${u.email}`));

  if (dryRun) {
    console.log('\n✓ Dry-run terminado. Nada escrito.');
    return;
  }

  const fechaAprobacion = admin.firestore.FieldValue.serverTimestamp();
  const batch = db.batch();
  for (const u of aAprobar) {
    batch.update(db.collection('usuarios').doc(u.uid), {
      aprobado: true,
      estadoAprobacion: 'aprobado',
      fechaAprobacion,
      aprobadoPor: 'migracion-inicial',
    });
  }
  // Los excluidos también reciben estadoAprobacion='pendiente' explícito
  // para que el admin UI los muestre en la sección de pendientes.
  for (const u of aExcluir) {
    batch.update(db.collection('usuarios').doc(u.uid), {
      aprobado: false,
      estadoAprobacion: 'pendiente',
    });
  }
  await batch.commit();
  console.log(`\n✓ Migración aplicada: ${aAprobar.length} aprobados, ${aExcluir.length} marcados como pendientes.`);
}

run().catch((err) => { console.error('❌', err.message); process.exit(1); });
