import admin from 'firebase-admin';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

// Leer .env.local manualmente
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
const projectId     = env.FIREBASE_PROJECT_ID;
const clientEmail   = env.FIREBASE_CLIENT_EMAIL;
const privateKey    = env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error('❌ Faltan FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL o FIREBASE_PRIVATE_KEY en .env.local');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
});

const EMAIL = 'hernanpaliza.psic@gmail.com';

async function run() {
  // 1. Buscar UID por email en Firebase Auth
  const user = await admin.auth().getUserByEmail(EMAIL);
  console.log(`✓ UID encontrado: ${user.uid}`);

  // 2. Actualizar campo rol en Firestore
  await admin.firestore().collection('usuarios').doc(user.uid).update({ rol: 'admin' });
  console.log(`✓ Campo rol actualizado a 'admin' para ${EMAIL}`);

  // 3. Verificar
  const snap = await admin.firestore().collection('usuarios').doc(user.uid).get();
  console.log('  Documento actual:', snap.data());
}

run().catch((err) => { console.error('❌', err.message); process.exit(1); });
