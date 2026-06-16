/**
 * Despliega firestore.rules usando la Firebase Management REST API.
 */
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
const projectId = env.FIREBASE_PROJECT_ID || env.VITE_FIREBASE_PROJECT_ID;
if (!projectId) { console.error('❌ No se encontró FIREBASE_PROJECT_ID'); process.exit(1); }

// Obtener access token usando firebase-admin
import admin from 'firebase-admin';

const clientEmail = env.FIREBASE_CLIENT_EMAIL;
const privateKey  = env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey }) });

const rulesContent = readFileSync(path.join(rootDir, 'firestore.rules'), 'utf8');

async function deploy() {
  const token = await admin.app().options.credential.getAccessToken();
  const accessToken = token.access_token;

  // 1. Crear nueva versión del ruleset
  const createRes = await fetch(
    `https://firebaserules.googleapis.com/v1/projects/${projectId}/rulesets`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: { files: [{ name: 'firestore.rules', content: rulesContent }] },
      }),
    }
  );
  const ruleset = await createRes.json();
  if (!createRes.ok) { console.error('❌ Error creando ruleset:', ruleset); process.exit(1); }
  console.log('✓ Ruleset creado:', ruleset.name);

  // 2. Aplicar al release de producción
  const releaseRes = await fetch(
    `https://firebaserules.googleapis.com/v1/projects/${projectId}/releases/cloud.firestore`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ release: { name: `projects/${projectId}/releases/cloud.firestore`, rulesetName: ruleset.name } }),
    }
  );
  const release = await releaseRes.json();
  if (!releaseRes.ok) { console.error('❌ Error aplicando release:', release); process.exit(1); }
  console.log('✓ Reglas de Firestore desplegadas correctamente.');
  console.log('  Ruleset activo:', release.rulesetName);
}

deploy().catch((err) => { console.error('❌', err.message); process.exit(1); });
